import { getProvider, ProviderError } from '@/lib/ai';
import { SYSTEM_PROMPT } from '@/lib/prompt';
import { checkRateLimit, clientKey } from '@/lib/rate-limit';
import { errorResponse } from '@/lib/stream';

export const runtime = 'nodejs';

const VOICE_PROMPT = `${SYSTEM_PROMPT}

## Consigne complémentaire pour l'échange oral
Tu es en conversation vocale avec le praticien, pendant ou après une consultation. Tu réponds brièvement — trois à quatre phrases — sans le plan en sept sections, qui n'a de sens qu'à l'écrit. Tu poses une question de clarification quand la demande est trop vague pour être utile. Le praticien reprendra le plan complet à l'écrit s'il en a besoin.`;

/**
 * Émet un jeton éphémère pour la session vocale.
 *
 * C'est ce qui permet au navigateur d'ouvrir le WebSocket temps réel sans
 * jamais détenir la clé API : le jeton est à usage unique, expire en quelques
 * minutes, et son périmètre (modèle, instruction système, voix) est verrouillé
 * ici, côté serveur.
 */
export async function POST(request: Request): Promise<Response> {
  const limit = checkRateLimit(`voice:${clientKey(request)}`);
  if (!limit.allowed) {
    return errorResponse(
      `Trop de sessions demandées. Réessayez dans ${limit.retryAfter} seconde(s).`,
      429,
    );
  }

  try {
    const provider = getProvider();
    if (!provider.createRealtimeToken) {
      return errorResponse(
        `La conversation vocale n'est pas disponible avec ${provider.label}.`,
        501,
      );
    }

    const credentials = await provider.createRealtimeToken(VOICE_PROMPT);
    return new Response(JSON.stringify(credentials), {
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    if (error instanceof ProviderError) {
      return errorResponse(error.message, error.status);
    }
    console.error('[api/realtime/token]', error);
    return errorResponse('Erreur interne du serveur.', 500);
  }
}
