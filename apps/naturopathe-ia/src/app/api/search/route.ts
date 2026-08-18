import { getProvider, ProviderError } from '@/lib/ai';
import { SYSTEM_PROMPT } from '@/lib/prompt';
import { checkRateLimit, clientKey } from '@/lib/rate-limit';
import { errorResponse, streamResponse } from '@/lib/stream';
import { firstIssue, searchRequestSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SEARCH_PROMPT = `${SYSTEM_PROMPT}

## Consigne complémentaire pour cette requête
Tu réponds à partir des sources web consultées. Tu cites les éléments que tu tires des sources et tu distingues explicitement ce qui est étayé par une publication de ce qui relève d'un usage traditionnel. Si les sources se contredisent, tu le dis.`;

export async function POST(request: Request): Promise<Response> {
  const limit = checkRateLimit(clientKey(request));
  if (!limit.allowed) {
    return errorResponse(
      `Trop de requêtes. Réessayez dans ${limit.retryAfter} seconde(s).`,
      429,
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return errorResponse('Corps de requête illisible.', 400);
  }

  const parsed = searchRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return errorResponse(firstIssue(parsed.error), 400);
  }

  try {
    const provider = getProvider();
    if (!provider.streamGroundedSearch) {
      return errorResponse(
        `La recherche sourcée n'est pas disponible avec ${provider.label}.`,
        501,
      );
    }

    return streamResponse(
      provider.streamGroundedSearch({
        system: SEARCH_PROMPT,
        history: [],
        message: parsed.data.message,
        signal: request.signal,
      }),
    );
  } catch (error) {
    if (error instanceof ProviderError) {
      return errorResponse(error.message, error.status);
    }
    console.error('[api/search]', error);
    return errorResponse('Erreur interne du serveur.', 500);
  }
}
