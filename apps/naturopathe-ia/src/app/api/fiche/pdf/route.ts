import { renderToBuffer } from '@react-pdf/renderer';

import { extractMedicalAlert, ficheFilename, type Fiche } from '@/lib/fiche';
import { FicheDocument } from '@/lib/pdf/FicheDocument';
import { checkRateLimit, clientKey } from '@/lib/rate-limit';
import { errorResponse } from '@/lib/stream';
import { fichePdfSchema, firstIssue } from '@/lib/validation';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Compose la fiche de conseils en PDF.
 *
 * Rien n'est stocké : le document est assemblé en mémoire à partir du corps de
 * la requête et renvoyé immédiatement. Le contenu ne fait l'objet d'aucune
 * journalisation.
 */
export async function POST(request: Request): Promise<Response> {
  const limit = checkRateLimit(`pdf:${clientKey(request)}`);
  if (!limit.allowed) {
    return errorResponse(`Trop de requêtes. Réessayez dans ${limit.retryAfter} seconde(s).`, 429);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return errorResponse('Corps de requête illisible.', 400);
  }

  const parsed = fichePdfSchema.safeParse(payload);
  if (!parsed.success) {
    return errorResponse(firstIssue(parsed.error), 400);
  }

  const fiche: Fiche = parsed.data;
  const alert = extractMedicalAlert(fiche.sections.map((section) => section.body).join('\n'));

  try {
    const buffer = await renderToBuffer(FicheDocument({ fiche, alert }));
    const filename = ficheFilename(fiche, 'pdf');

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[api/fiche/pdf]', error);
    return errorResponse("Le PDF n'a pas pu être composé.", 500);
  }
}
