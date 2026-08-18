import { Mistral } from '@mistralai/mistralai';

import { ProviderError, type ChatRequest, type LLMProvider, type StreamChunk } from './types';

const DEFAULT_MODEL = 'mistral-large-latest';

function client(): Mistral {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    throw new ProviderError("La clé MISTRAL_API_KEY n'est pas configurée sur le serveur.", 503);
  }
  return new Mistral({ apiKey });
}

/**
 * Le delta peut être une chaîne ou une liste de blocs typés selon le modèle.
 * On ne conserve que le texte : les blocs `thinking` sont du raisonnement
 * interne, ils n'ont pas à apparaître dans une fiche remise à un client.
 */
function deltaToText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';

  let text = '';
  for (const chunk of content) {
    if (chunk && typeof chunk === 'object' && 'type' in chunk && chunk.type === 'text') {
      const value = (chunk as { text?: unknown }).text;
      if (typeof value === 'string') text += value;
    }
  }
  return text;
}

function toProviderError(error: unknown): ProviderError {
  if (error instanceof ProviderError) return error;

  const message = error instanceof Error ? error.message : String(error);
  if (/401|unauthorized|api[_ ]?key/i.test(message)) {
    return new ProviderError("Le serveur n'a pas pu s'authentifier auprès du modèle.", 502);
  }
  if (/429|rate limit|capacity/i.test(message)) {
    return new ProviderError('Quota du modèle atteint. Réessayez dans quelques instants.', 429);
  }
  return new ProviderError("Le modèle n'a pas pu traiter la demande.", 502);
}

export const mistralProvider: LLMProvider = {
  id: 'mistral',
  label: 'Mistral AI',
  dataRegion: 'Union européenne (France)',
  euProcessing: true,
  capabilities: {
    // Le modèle est textuel : les PDF sont convertis en texte par
    // `lib/extract.ts` avant l'appel, les images ne sont pas exploitables.
    nativeDocumentTypes: ['text/plain'],
    webSearch: false,
    realtimeVoice: false,
  },

  async *streamChat(request: ChatRequest): AsyncIterable<StreamChunk> {
    const documents = request.documents ?? [];
    const attachments = documents
      .map((doc) => {
        const text = Buffer.from(doc.data, 'base64').toString('utf8');
        return `--- Document joint : ${doc.name} ---\n${text}\n--- Fin du document ---`;
      })
      .join('\n\n');

    const userContent = attachments ? `${attachments}\n\n${request.message}` : request.message;

    let events;
    try {
      events = await client().chat.stream(
        {
          model: process.env.MISTRAL_MODEL ?? DEFAULT_MODEL,
          messages: [
            { role: 'system', content: request.system },
            ...request.history.map((turn) => ({
              role: turn.role as 'user' | 'assistant',
              content: turn.content,
            })),
            { role: 'user', content: userContent },
          ],
        },
        { fetchOptions: { signal: request.signal } },
      );
    } catch (error) {
      throw toProviderError(error);
    }

    try {
      for await (const event of events) {
        const text = deltaToText(event.data.choices[0]?.delta.content);
        if (text) yield { text };
      }
    } catch (error) {
      if (request.signal?.aborted) return;
      throw toProviderError(error);
    }
  },
};
