import { describe, expect, it } from 'vitest';

import type { StreamChunk } from '@/lib/ai/types';
import { ProviderError } from '@/lib/ai/types';
import { readStreamEvents, streamResponse, type StreamEvent } from '@/lib/stream';

async function* chunks(values: StreamChunk[]): AsyncIterable<StreamChunk> {
  for (const value of values) yield value;
}

function sseResponse(body: string): Response {
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(body));
        controller.close();
      },
    }),
  );
}

/** Découpe le corps à des positions arbitraires, comme le fait le réseau. */
function chunkedResponse(body: string, sizes: number[]): Response {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        let offset = 0;
        for (const size of sizes) {
          controller.enqueue(encoder.encode(body.slice(offset, offset + size)));
          offset += size;
        }
        if (offset < body.length) controller.enqueue(encoder.encode(body.slice(offset)));
        controller.close();
      },
    }),
  );
}

async function collect(response: Response): Promise<StreamEvent[]> {
  const events: StreamEvent[] = [];
  for await (const event of readStreamEvents(response)) events.push(event);
  return events;
}

describe('streamResponse', () => {
  it('émet le texte, les sources puis la fin de flux', async () => {
    const response = streamResponse(
      chunks([
        { text: 'Bonjour ' },
        { text: 'praticien.' },
        { citations: [{ uri: 'https://exemple.fr', title: 'Étude' }] },
      ]),
    );

    expect(response.headers.get('Content-Type')).toContain('text/event-stream');
    expect(await collect(response)).toEqual([
      { type: 'text', value: 'Bonjour ' },
      { type: 'text', value: 'praticien.' },
      { type: 'citations', value: [{ uri: 'https://exemple.fr', title: 'Étude' }] },
      { type: 'done' },
    ]);
  });

  it("convertit une erreur du fournisseur en événement, le flux étant déjà ouvert", async () => {
    async function* failing(): AsyncIterable<StreamChunk> {
      yield { text: 'Début' };
      throw new ProviderError('Quota du modèle atteint.');
    }

    expect(await collect(streamResponse(failing()))).toEqual([
      { type: 'text', value: 'Début' },
      { type: 'error', message: 'Quota du modèle atteint.' },
    ]);
  });

  it("masque le détail d'une erreur inattendue", async () => {
    async function* failing(): AsyncIterable<StreamChunk> {
      throw new Error('ENOTFOUND interne-db.local');
    }

    const events = await collect(streamResponse(failing()));
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      type: 'error',
      message: "Le flux s'est interrompu avant la fin de la réponse.",
    });
  });
});

describe('readStreamEvents', () => {
  it('réassemble un événement scindé entre deux paquets réseau', async () => {
    const body = 'data: {"type":"text","value":"Chardon-Marie"}\n\ndata: {"type":"done"}\n\n';
    // Coupure au milieu du JSON du premier événement.
    const events = await collect(chunkedResponse(body, [20, 15]));

    expect(events).toEqual([
      { type: 'text', value: 'Chardon-Marie' },
      { type: 'done' },
    ]);
  });

  it('ignore un événement illisible sans interrompre le flux', async () => {
    const body = 'data: {ceci n\'est pas du JSON}\n\ndata: {"type":"done"}\n\n';
    expect(await collect(sseResponse(body))).toEqual([{ type: 'done' }]);
  });

  it('ignore les lignes qui ne portent pas de données', async () => {
    const body = ': battement\n\ndata: {"type":"done"}\n\n';
    expect(await collect(sseResponse(body))).toEqual([{ type: 'done' }]);
  });
});
