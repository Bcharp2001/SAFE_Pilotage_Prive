import { getProvider, ProviderError } from '@/lib/ai';
import { adaptDocuments } from '@/lib/extract';
import { SYSTEM_PROMPT } from '@/lib/prompt';
import { checkRateLimit, clientKey } from '@/lib/rate-limit';
import { errorResponse, streamResponse } from '@/lib/stream';
import { chatRequestSchema, firstIssue } from '@/lib/validation';

export const runtime = 'nodejs';
/** Les protocoles longs dépassent la limite par défaut de 10 s. */
export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  const limit = checkRateLimit(clientKey(request));
  if (!limit.allowed) {
    return new Response(
      JSON.stringify({
        error: `Trop de requêtes. Réessayez dans ${limit.retryAfter} seconde(s).`,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Retry-After': String(limit.retryAfter),
        },
      },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return errorResponse('Corps de requête illisible.', 400);
  }

  const parsed = chatRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return errorResponse(firstIssue(parsed.error), 400);
  }

  try {
    const provider = getProvider();
    const documents = await adaptDocuments(parsed.data.documents, provider);

    return streamResponse(
      provider.streamChat({
        system: SYSTEM_PROMPT,
        history: parsed.data.history,
        message: parsed.data.message,
        documents,
        deepReasoning: parsed.data.deepReasoning,
        signal: request.signal,
      }),
    );
  } catch (error) {
    if (error instanceof ProviderError) {
      return errorResponse(error.message, error.status);
    }
    console.error('[api/chat]', error);
    return errorResponse('Erreur interne du serveur.', 500);
  }
}
