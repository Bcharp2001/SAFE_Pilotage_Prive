import { GoogleGenAI, Modality, type Content, type GenerateContentResponse, type Part } from '@google/genai';

import {
  ProviderError,
  type ChatRequest,
  type Citation,
  type LLMProvider,
  type RealtimeCredentials,
  type StreamChunk,
} from './types';

const DEFAULT_TEXT_MODEL = 'gemini-2.5-flash';
const DEFAULT_REASONING_MODEL = 'gemini-2.5-pro';
const DEFAULT_LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview-09-2025';

/** Durée de validité d'un jeton vocal éphémère. */
const TOKEN_TTL_MS = 20 * 60 * 1000;
/** Délai pendant lequel le jeton peut ouvrir une session. */
const TOKEN_SESSION_WINDOW_MS = 2 * 60 * 1000;

function client(apiVersion?: string): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new ProviderError(
      "La clé GEMINI_API_KEY n'est pas configurée sur le serveur.",
      503,
    );
  }
  return new GoogleGenAI(apiVersion ? { apiKey, httpOptions: { apiVersion } } : { apiKey });
}

/** Convertit l'historique applicatif vers le format `Content[]` de Gemini. */
function toContents(request: ChatRequest): Content[] {
  const contents: Content[] = request.history.map((turn) => ({
    role: turn.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: turn.content }],
  }));

  const parts: Part[] = [];
  for (const doc of request.documents ?? []) {
    parts.push({ inlineData: { mimeType: doc.mimeType, data: doc.data } });
  }
  // Le texte est placé après les pièces jointes : Gemini suit mieux la
  // consigne quand elle referme le message plutôt qu'elle ne l'ouvre.
  parts.push({ text: request.message });

  contents.push({ role: 'user', parts });
  return contents;
}

function extractCitations(response: GenerateContentResponse): Citation[] {
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (!chunks) return [];

  const seen = new Set<string>();
  const citations: Citation[] = [];
  for (const chunk of chunks) {
    const uri = chunk.web?.uri;
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);
    citations.push({ uri, title: chunk.web?.title ?? uri });
  }
  return citations;
}

/** Traduit les erreurs SDK en messages actionnables, sans fuiter la clé. */
function toProviderError(error: unknown): ProviderError {
  if (error instanceof ProviderError) return error;

  const message = error instanceof Error ? error.message : String(error);
  if (/API[_ ]?key|PERMISSION_DENIED|UNAUTHENTICATED/i.test(message)) {
    return new ProviderError("Le serveur n'a pas pu s'authentifier auprès du modèle.", 502);
  }
  if (/quota|RESOURCE_EXHAUSTED|429/i.test(message)) {
    return new ProviderError('Quota du modèle atteint. Réessayez dans quelques instants.', 429);
  }
  if (/SAFETY|blocked/i.test(message)) {
    return new ProviderError(
      "La demande a été bloquée par les filtres de sécurité du modèle. Reformulez sans mention nominative ni détail identifiant.",
      422,
    );
  }
  return new ProviderError("Le modèle n'a pas pu traiter la demande.", 502);
}

async function* stream(
  request: ChatRequest,
  options: { grounded: boolean },
): AsyncIterable<StreamChunk> {
  const model = request.deepReasoning
    ? (process.env.GEMINI_REASONING_MODEL ?? DEFAULT_REASONING_MODEL)
    : (process.env.GEMINI_TEXT_MODEL ?? DEFAULT_TEXT_MODEL);

  let iterator: AsyncGenerator<GenerateContentResponse>;
  try {
    iterator = await client().models.generateContentStream({
      model,
      contents: toContents(request),
      config: {
        systemInstruction: request.system,
        abortSignal: request.signal,
        ...(options.grounded ? { tools: [{ googleSearch: {} }] } : {}),
      },
    });
  } catch (error) {
    throw toProviderError(error);
  }

  // Les sources n'arrivent pas forcément sur le dernier fragment : on les
  // accumule au fil du flux et on les émet une seule fois, à la fin.
  const citations = new Map<string, Citation>();

  try {
    for await (const chunk of iterator) {
      for (const citation of extractCitations(chunk)) {
        citations.set(citation.uri, citation);
      }
      const text = chunk.text;
      if (text) yield { text };
    }
  } catch (error) {
    if (request.signal?.aborted) return;
    throw toProviderError(error);
  }

  if (citations.size > 0) {
    yield { citations: [...citations.values()] };
  }
}

export const geminiProvider: LLMProvider = {
  id: 'gemini',
  label: 'Google Gemini',
  dataRegion: 'Hors Union européenne (Google LLC)',
  euProcessing: false,
  capabilities: {
    nativeDocumentTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'text/plain',
    ],
    webSearch: true,
    realtimeVoice: true,
  },

  streamChat: (request) => stream(request, { grounded: false }),
  streamGroundedSearch: (request) => stream(request, { grounded: true }),

  /**
   * Émet un jeton éphémère à usage unique pour la session vocale.
   *
   * `liveConnectConstraints` verrouille le modèle et l'instruction système
   * côté serveur : même intercepté, le jeton ne permet ni de changer de
   * modèle, ni de réécrire le cadre de sécurité, ni d'ouvrir une seconde
   * session. La clé API, elle, ne quitte jamais le serveur.
   */
  async createRealtimeToken(system: string): Promise<RealtimeCredentials> {
    const model = process.env.GEMINI_LIVE_MODEL ?? DEFAULT_LIVE_MODEL;
    const now = Date.now();
    const expireTime = new Date(now + TOKEN_TTL_MS).toISOString();

    try {
      const token = await client('v1alpha').authTokens.create({
        config: {
          uses: 1,
          expireTime,
          newSessionExpireTime: new Date(now + TOKEN_SESSION_WINDOW_MS).toISOString(),
          liveConnectConstraints: {
            model,
            config: {
              responseModalities: [Modality.AUDIO],
              systemInstruction: system,
              inputAudioTranscription: {},
              outputAudioTranscription: {},
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
            },
          },
          lockAdditionalFields: [],
        },
      });

      if (!token.name) {
        throw new ProviderError("Le service n'a pas renvoyé de jeton de session.", 502);
      }

      return { token: token.name, model, expiresAt: expireTime, apiVersion: 'v1alpha' };
    } catch (error) {
      throw toProviderError(error);
    }
  },
};
