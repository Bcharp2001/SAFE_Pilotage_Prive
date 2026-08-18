import { extractText } from 'unpdf';

import { ProviderError, type DocumentPart, type LLMProvider } from './ai/types';

/**
 * Adapte les pièces jointes aux capacités réelles du fournisseur actif.
 *
 * - Type géré nativement (Gemini avec un PDF, par exemple) : transmis tel quel.
 * - PDF vers un modèle textuel : le texte est extrait côté serveur puis
 *   transmis en `text/plain`.
 * - Image vers un modèle textuel : refus explicite. Le silence serait pire —
 *   le modèle répondrait sans jamais avoir vu le document.
 */
export async function adaptDocuments(
  documents: DocumentPart[],
  provider: LLMProvider,
): Promise<DocumentPart[]> {
  const native = new Set(provider.capabilities.nativeDocumentTypes);
  const adapted: DocumentPart[] = [];

  for (const document of documents) {
    if (native.has(document.mimeType)) {
      adapted.push(document);
      continue;
    }

    if (document.mimeType === 'application/pdf' && native.has('text/plain')) {
      adapted.push(await pdfToText(document));
      continue;
    }

    throw new ProviderError(
      `Le fournisseur ${provider.label} ne peut pas analyser « ${document.name} » (${document.mimeType}). ` +
        'Convertissez le document en PDF ou en texte, ou basculez sur un fournisseur multimodal.',
      415,
    );
  }

  return adapted;
}

async function pdfToText(document: DocumentPart): Promise<DocumentPart> {
  let text: string;
  try {
    const bytes = new Uint8Array(Buffer.from(document.data, 'base64'));
    ({ text } = await extractText(bytes, { mergePages: true }));
  } catch {
    throw new ProviderError(
      `Le PDF « ${document.name} » n'a pas pu être lu. S'il s'agit d'un scan, il ne contient pas de couche texte.`,
      422,
    );
  }

  if (text.trim().length < 20) {
    throw new ProviderError(
      `Le PDF « ${document.name} » ne contient aucun texte exploitable — il s'agit probablement d'un scan image. ` +
        'Utilisez un fournisseur multimodal ou passez le document à l’OCR au préalable.',
      422,
    );
  }

  return {
    name: document.name,
    mimeType: 'text/plain',
    data: Buffer.from(text, 'utf8').toString('base64'),
  };
}
