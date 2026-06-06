// ============================================================================
//  SAFE Pilotage Privé — Route serverless Vercel
//  Inscription contact + emails transactionnels via Brevo
//
//  Sécurité : la clé API Brevo reste dans les variables d'environnement Vercel
//  (BREVO_API_KEY), jamais dans le code client.
//
//  Variables d'environnement requises (à configurer dans Vercel → Settings → Env) :
//    BREVO_API_KEY          (obligatoire)  Clé API Brevo (commence par xkeysib-)
//    BREVO_SENDER_EMAIL     (obligatoire)  Ex: contact@safe-pilotage-prive.fr
//    BREVO_SENDER_NAME      (optionnel)    Défaut: "S.A.F.E. Pilotage Privé"
//    BREVO_ADMIN_EMAIL      (optionnel)    Défaut: BREVO_SENDER_EMAIL
//    BREVO_ADMIN_TPL_ID     (optionnel)    Template Brevo notif admin (défaut 5)
//    BREVO_CONFIRM_TPL_ID   (optionnel)    Template Brevo confirmation prospect (défaut 2)
//    BREVO_BOOK_TPL_ID      (optionnel)    Template Brevo livraison du livre (défaut 6)
//    BREVO_LIST_DEMO        (optionnel)    Liste contacts demande démo (défaut 3)
//    BREVO_LIST_BOOK        (optionnel)    Liste contacts lead magnet livre (défaut 4)
//
//  Payload attendu (JSON POST) :
//    {
//      "type": "demo" | "book",            // type de capture
//      "email": "prospect@example.com",    // obligatoire
//      "firstname": "Jean",                // optionnel
//      "lastname": "Dupont",               // optionnel
//      "taille": "10-50",                  // optionnel (demo)
//      "departement": "Direction",          // optionnel (demo)
//      "source": "index.html",             // optionnel — page d'origine
//      "consent": true                      // obligatoire (RGPD)
//    }
//
//  Réponses :
//    200 { ok: true, downloadUrl?: "/livre-murmurait-ia.pdf" }
//    400 { ok: false, error: "..." }
//    500 { ok: false, error: "..." }
// ============================================================================

const BREVO_API = 'https://api.brevo.com/v3';

// Anti-bot minimal — on accepte ce User-Agent, on bloque les requêtes vides
function isLikelyBot(req) {
  const ua = (req.headers['user-agent'] || '').toLowerCase();
  if (!ua) return true;
  // bloque les bots évidents
  const blocked = ['curl/', 'wget/', 'python-requests', 'go-http-client', 'libwww-perl'];
  return blocked.some(b => ua.includes(b));
}

function isValidEmail(email) {
  return typeof email === 'string'
      && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      && email.length < 254;
}

function sanitize(str, max = 100) {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, max).replace(/[<>]/g, '');
}

async function brevo(endpoint, body, apiKey) {
  const res = await fetch(BREVO_API + endpoint, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok && res.status !== 204) {
    let detail = '';
    try { detail = JSON.stringify(await res.json()); } catch (_) {}
    throw new Error(`Brevo ${endpoint} HTTP ${res.status}: ${detail}`);
  }
  return res.status === 204 ? {} : res.json();
}

module.exports = async function handler(req, res) {
  // CORS — autorise seulement le même origine (Vercel sert le HTML)
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Méthode non autorisée' });
  }

  if (isLikelyBot(req)) {
    return res.status(400).json({ ok: false, error: 'Requête refusée' });
  }

  // Récupère le payload (Vercel parse automatiquement le JSON)
  const body = req.body || {};
  const type = body.type === 'book' ? 'book' : 'demo';
  const email = sanitize(body.email, 254).toLowerCase();
  const firstname = sanitize(body.firstname, 60);
  const lastname = sanitize(body.lastname, 60);
  const taille = sanitize(body.taille, 40);
  const departement = sanitize(body.departement, 60);
  const source = sanitize(body.source, 80) || 'unknown';
  const consent = body.consent === true;

  if (!isValidEmail(email)) {
    return res.status(400).json({ ok: false, error: 'Adresse email invalide' });
  }
  if (!consent) {
    return res.status(400).json({ ok: false, error: 'Consentement RGPD requis' });
  }

  // Config env (accepte plusieurs noms de variables pour souplesse)
  const apiKey = process.env.BREVO_API_KEY
              || process.env.BREVO_API_KEY_V2
              || process.env.CLE_API_BREVO_V2
              || process.env.CLE_API_BREVO;
  if (!apiKey) {
    console.error('Aucune clé API Brevo trouvée. Variables tentées: BREVO_API_KEY, BREVO_API_KEY_V2, CLE_API_BREVO_V2, CLE_API_BREVO');
    return res.status(500).json({ ok: false, error: 'Service indisponible. Contactez-nous à contact@safe-pilotage-prive.fr' });
  }
  const senderEmail = process.env.BREVO_SENDER_EMAIL
                   || process.env.BREVO_SENDER_EMAIL_V2
                   || 'contact@safe-pilotage-prive.fr';
  const senderName = process.env.BREVO_SENDER_NAME || 'S.A.F.E. Pilotage Privé';
  const adminEmail = process.env.BREVO_ADMIN_EMAIL || senderEmail;
  const adminTplId = parseInt(process.env.BREVO_ADMIN_TPL_ID || '5', 10);
  const confirmTplId = parseInt(process.env.BREVO_CONFIRM_TPL_ID || '2', 10);
  const bookTplId = parseInt(process.env.BREVO_BOOK_TPL_ID || process.env.BREVO_BOOK_TPL_ID_V2 || '15', 10);
  const listDemo = parseInt(process.env.BREVO_LIST_DEMO || '3', 10);
  const listBook = parseInt(process.env.BREVO_LIST_BOOK || process.env.BREVO_LIST_BOOK_V2 || '8', 10);

  const listId = type === 'book' ? listBook : listDemo;
  const sourceTag = type === 'book' ? `book:${source}` : `demo:${source}`;

  try {
    // 1) Création / mise à jour du contact dans Brevo
    const attributes = {
      SOURCE_PAGE: sourceTag,
      CAPTURE_TYPE: type,
    };
    if (firstname) attributes.PRENOM = firstname;
    if (lastname) attributes.NOM = lastname;
    if (taille) attributes.TAILLE_ENTREPRISE = taille;
    if (departement) attributes.DEPARTEMENT = departement;

    await brevo('/contacts', {
      email,
      listIds: [listId],
      updateEnabled: true,
      attributes,
    }, apiKey);

    // 2) Email au prospect (livre OU confirmation démo)
    const senderObj = { email: senderEmail, name: senderName };
    const toProspect = [{ email, name: (firstname + ' ' + lastname).trim() || email }];

    if (type === 'book') {
      // Template "livraison du livre" — DOIT contenir le lien {{params.DOWNLOAD_URL}}
      await brevo('/smtp/email', {
        to: toProspect,
        sender: senderObj,
        templateId: bookTplId,
        params: {
          PRENOM: firstname || '',
          DOWNLOAD_URL: 'https://www.safe-pilotage-prive.fr/livre-murmurait-ia.pdf',
        },
      }, apiKey);
    } else {
      await brevo('/smtp/email', {
        to: toProspect,
        sender: senderObj,
        templateId: confirmTplId,
        params: {
          PRENOM: firstname || '',
          TAILLE_ENTREPRISE: taille,
          DEPARTEMENT: departement,
        },
      }, apiKey);
    }

    // 3) Notification admin (best-effort — si elle échoue, le prospect ne doit pas voir d'erreur)
    try {
      await brevo('/smtp/email', {
        to: [{ email: adminEmail, name: 'Admin S.A.F.E.' }],
        sender: senderObj,
        templateId: adminTplId,
        params: {
          PRENOM: firstname || 'Non renseigné',
          NOM: lastname || 'Non renseigné',
          EMAIL: email,
          TAILLE_ENTREPRISE: taille || '-',
          DEPARTEMENT: departement || '-',
          SOURCE_PAGE: sourceTag,
          CAPTURE_TYPE: type,
        },
      }, apiKey);
    } catch (notifyErr) {
      console.error('Notif admin échouée (non bloquant):', notifyErr.message);
    }

    const response = { ok: true };
    if (type === 'book') {
      // Téléchargement direct possible après l'inscription
      response.downloadUrl = '/livre-murmurait-ia.pdf';
    }
    return res.status(200).json(response);

  } catch (err) {
    console.error('brevo-subscribe error:', err.message);
    return res.status(500).json({
      ok: false,
      error: 'Une erreur est survenue. Contactez-nous à contact@safe-pilotage-prive.fr',
    });
  }
};
