import { getProviderInfo, ProviderError } from '@/lib/ai';
import { errorResponse } from '@/lib/stream';
import { ACCEPTED_MIME_TYPES, MAX_FILES, MAX_FILE_BYTES } from '@/lib/validation';

export const runtime = 'nodejs';

/**
 * Décrit au client le fournisseur actif et ses limites.
 *
 * L'interface s'y adapte : elle masque les onglets indisponibles, restreint
 * les types de fichiers proposés, et affiche sans détour la région de
 * traitement des données — le praticien doit savoir où part un bilan sanguin
 * avant de le téléverser.
 */
export async function GET(): Promise<Response> {
  try {
    const provider = getProviderInfo();
    return new Response(
      JSON.stringify({
        provider,
        limits: {
          acceptedMimeTypes: ACCEPTED_MIME_TYPES.filter((type) =>
            provider.capabilities.nativeDocumentTypes.includes(type) ||
            (type === 'application/pdf' &&
              provider.capabilities.nativeDocumentTypes.includes('text/plain')),
          ),
          maxFiles: MAX_FILES,
          maxFileBytes: MAX_FILE_BYTES,
        },
      }),
      { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    if (error instanceof ProviderError) {
      return errorResponse(error.message, error.status);
    }
    console.error('[api/config]', error);
    return errorResponse('Erreur interne du serveur.', 500);
  }
}
