import type { Citation, StreamChunk } from './ai/types';
import { ProviderError } from './ai/types';

/** Événements du canal serveur → client. */
export type StreamEvent =
  | { type: 'text'; value: string }
  | { type: 'citations'; value: Citation[] }
  | { type: 'error'; message: string }
  | { type: 'done' };

const encoder = new TextEncoder();

function encodeEvent(event: StreamEvent): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

/**
 * Convertit un flux de fournisseur en réponse SSE.
 *
 * Une erreur survenue après le premier octet ne peut plus changer le code
 * HTTP : elle est donc émise comme événement `error` dans le flux, que le
 * client affiche à la place d'un message tronqué silencieusement.
 */
export function streamResponse(chunks: AsyncIterable<StreamChunk>): Response {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of chunks) {
          if (chunk.text) controller.enqueue(encodeEvent({ type: 'text', value: chunk.text }));
          if (chunk.citations?.length) {
            controller.enqueue(encodeEvent({ type: 'citations', value: chunk.citations }));
          }
        }
        controller.enqueue(encodeEvent({ type: 'done' }));
      } catch (error) {
        const message =
          error instanceof ProviderError
            ? error.message
            : "Le flux s'est interrompu avant la fin de la réponse.";
        controller.enqueue(encodeEvent({ type: 'error', message }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      Connection: 'keep-alive',
      // Désactive la mise en tampon des proxys nginx, qui casserait le streaming.
      'X-Accel-Buffering': 'no',
    },
  });
}

/** Réponse d'erreur avant ouverture du flux, au format JSON. */
export function errorResponse(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

/**
 * Lit un flux SSE côté navigateur et émet chaque événement.
 *
 * Le découpage réseau ne respecte pas les frontières d'événements : le
 * fragment résiduel est conservé d'une itération à l'autre.
 */
export async function* readStreamEvents(
  response: Response,
  signal?: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const body = response.body;
  if (!body) throw new Error('Réponse sans corps.');

  const reader = body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';

  try {
    while (true) {
      if (signal?.aborted) return;
      const { done, value } = await reader.read();
      if (done) break;

      buffer += value;
      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const raw = buffer.slice(0, boundary).trim();
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf('\n\n');

        if (!raw.startsWith('data:')) continue;
        try {
          yield JSON.parse(raw.slice(5).trim()) as StreamEvent;
        } catch {
          // Événement illisible : on l'ignore plutôt que d'interrompre le flux.
        }
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
}
