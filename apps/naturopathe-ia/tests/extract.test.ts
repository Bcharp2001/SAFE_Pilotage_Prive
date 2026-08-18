import { describe, expect, it } from 'vitest';

import type { DocumentPart, LLMProvider } from '@/lib/ai/types';
import { ProviderError } from '@/lib/ai/types';
import { adaptDocuments } from '@/lib/extract';

function provider(nativeDocumentTypes: string[]): LLMProvider {
  return {
    id: 'test',
    label: 'Fournisseur de test',
    dataRegion: 'Test',
    euProcessing: true,
    capabilities: { nativeDocumentTypes, webSearch: false, realtimeVoice: false },
    async *streamChat() {
      throw new Error('non utilisé');
    },
  };
}

const pdf: DocumentPart = {
  name: 'bilan.pdf',
  mimeType: 'application/pdf',
  data: Buffer.from('%PDF-1.4 factice').toString('base64'),
};

const image: DocumentPart = {
  name: 'irm.png',
  mimeType: 'image/png',
  data: Buffer.from('png factice').toString('base64'),
};

describe('adaptDocuments', () => {
  it('transmet sans transformation les types gérés nativement', async () => {
    const multimodal = provider(['application/pdf', 'image/png']);
    await expect(adaptDocuments([pdf, image], multimodal)).resolves.toEqual([pdf, image]);
  });

  it('refuse une image face à un modèle textuel, plutôt que de la passer sous silence', async () => {
    await expect(adaptDocuments([image], provider(['text/plain']))).rejects.toThrow(ProviderError);
    await expect(adaptDocuments([image], provider(['text/plain']))).rejects.toThrow(/irm\.png/);
  });

  it('signale un PDF sans couche texte au lieu de renvoyer un contenu vide', async () => {
    // Le PDF est factice : l'extraction ne produira rien d'exploitable.
    await expect(adaptDocuments([pdf], provider(['text/plain']))).rejects.toThrow(ProviderError);
  });

  it('ne fait rien sans pièce jointe', async () => {
    await expect(adaptDocuments([], provider(['text/plain']))).resolves.toEqual([]);
  });
});
