const BREVO_API_BASE = 'https://api.brevo.com/v3';
const MEETING_URL = 'https://meet.brevo.com/bertrand-charpilloz-1/rendez-vous-de-30-minutes';
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_MAX = 5;
const rateBuckets = new Map();

const reply = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
};

const clean = (value, max = 300) => String(value || '')
  .replace(/[\u0000-\u001f\u007f]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, max);

const html = value => clean(value, 1600)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const validEmail = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 160;

const allowedOrigin = req => {
  const origin = req.headers.origin;
  if (!origin) return true;
  if (origin === 'https://www.safe-pilotage-prive.fr' || origin === 'https://safe-pilotage-prive.fr') return true;
  if (process.env.VERCEL_ENV !== 'production' && /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;
  if (process.env.NODE_ENV !== 'production' && /^http:\/\/localhost:\d+$/.test(origin)) return true;
  return false;
};

const rateLimited = req => {
  const forwarded = clean(req.headers['x-forwarded-for'] || '', 200).split(',')[0];
  const key = forwarded || clean(req.socket?.remoteAddress || 'unknown', 100);
  const now = Date.now();
  const current = rateBuckets.get(key);
  if (!current || now - current.startedAt > RATE_WINDOW_MS) {
    rateBuckets.set(key, { startedAt: now, count: 1 });
    return false;
  }
  current.count += 1;
  return current.count > RATE_MAX;
};

async function brevo(path, body) {
  const response = await fetch(`${BREVO_API_BASE}${path}`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': process.env.BREVO_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok && response.status !== 204) {
    const detail = await response.json().catch(() => ({}));
    console.error(`[safe-pme] Brevo ${path} ${response.status}`, JSON.stringify(detail));
    throw new Error(`Brevo request failed (${response.status})`);
  }
  return response.status === 204 ? null : response.json().catch(() => null);
}

const row = (label, value) => value
  ? `<tr><td style="padding:7px 12px;color:#6b7785;border-bottom:1px solid #e7ebef;width:34%">${html(label)}</td><td style="padding:7px 12px;color:#071322;border-bottom:1px solid #e7ebef;font-weight:600">${html(value)}</td></tr>`
  : '';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return reply(res, 405, { error: 'Méthode non autorisée.' });
  if (!allowedOrigin(req)) return reply(res, 403, { error: 'Origine non autorisée.' });
  if (!String(req.headers['content-type'] || '').toLowerCase().includes('application/json')) {
    return reply(res, 415, { error: 'Format de requête non accepté.' });
  }
  if (!process.env.BREVO_API_KEY) return reply(res, 503, { error: 'Le formulaire est momentanément indisponible.' });
  if (rateLimited(req)) return reply(res, 429, { error: 'Trop de tentatives. Merci de réessayer dans quelques minutes.' });

  try {
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    if (Buffer.byteLength(raw, 'utf8') > 18000) return reply(res, 413, { error: 'Requête trop volumineuse.' });
    const payload = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

    if (clean(payload.website, 120)) return reply(res, 200, { ok: true });

    const startedAt = Number(payload.startedAt || 0);
    const elapsed = Date.now() - startedAt;
    if (!Number.isFinite(startedAt) || elapsed < 2500 || elapsed > 24 * 60 * 60 * 1000) {
      return reply(res, 400, { error: 'Merci de recharger la page et de réessayer.' });
    }

    const fullName = clean(payload.fullname, 120);
    const [firstName = '', ...lastParts] = fullName.split(' ');
    const lastName = lastParts.join(' ');
    const company = clean(payload.company, 120);
    const email = clean(payload.email, 160).toLowerCase();
    const phone = clean(payload.phone, 40);
    const priority = clean(payload.priority, 100);
    const users = clean(payload.users, 50);
    const documentLocation = clean(payload.documentLocation, 100);
    const message = clean(payload.message, 1200);
    const variant = clean(payload.variant, 50) === 'scan' ? 'scan' : 'consultation';
    const offer = clean(payload.offer, 100) || 'SAFE PME 10 jours';
    const sourcePage = clean(payload.sourcePage, 120) || 'landing-safe-pme';
    const marketingConsent = payload.marketingConsent === true || payload.marketingConsent === 'true';

    if (!fullName || !company || !validEmail(email) || !priority || !users || !documentLocation) {
      return reply(res, 400, { error: 'Merci de compléter les champs obligatoires.' });
    }

    const attribution = {
      utmSource: clean(payload.utmSource, 120),
      utmMedium: clean(payload.utmMedium, 120),
      utmCampaign: clean(payload.utmCampaign, 180),
      utmContent: clean(payload.utmContent, 180),
      utmTerm: clean(payload.utmTerm, 180),
      gclid: clean(payload.gclid, 300),
      gbraid: clean(payload.gbraid, 300),
      wbraid: clean(payload.wbraid, 300),
      pageUrl: clean(payload.pageUrl, 500),
    };

    const senderEmail = process.env.CONTACT_SENDER_EMAIL || 'contact@safe-pilotage-prive.fr';
    const senderName = process.env.CONTACT_SENDER_NAME || 'S.A.F.E. Pilotage Privé';
    const notifyEmail = process.env.CONTACT_NOTIFY_EMAIL || 'bertrand@safe-pilotage-prive.fr';

    const subject = variant === 'scan'
      ? `Demande SAFE Scan — ${company}`
      : `Diagnostic SAFE PME — ${company}`;

    const adminHtml = `
      <div style="font-family:Arial,sans-serif;max-width:720px;margin:auto;color:#071322">
        <div style="background:#071322;color:#fff;padding:22px 26px;border-radius:12px 12px 0 0">
          <div style="font-size:12px;color:#e9b889;text-transform:uppercase;letter-spacing:1px">${html(offer)}</div>
          <h1 style="font-size:24px;margin:7px 0 0">Nouvelle demande ${variant === 'scan' ? 'SAFE Scan' : 'de diagnostic'}</h1>
        </div>
        <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #e7ebef">
          ${row('Nom', fullName)}${row('Entreprise', company)}${row('E-mail', email)}${row('Téléphone', phone)}
          ${row('Priorité', priority)}${row('Utilisateurs', users)}${row('Documents', documentLocation)}${row('Message', message)}
          ${row('Variante', variant)}${row('Source', sourcePage)}${row('UTM source', attribution.utmSource)}
          ${row('UTM medium', attribution.utmMedium)}${row('UTM campaign', attribution.utmCampaign)}${row('UTM content', attribution.utmContent)}
          ${row('UTM term', attribution.utmTerm)}${row('GCLID', attribution.gclid)}${row('GBRAID', attribution.gbraid)}${row('WBRAID', attribution.wbraid)}
          ${row('Consentement actualités', marketingConsent ? 'Oui' : 'Non')}${row('Page', attribution.pageUrl)}
        </table>
        <p style="font-size:12px;color:#6b7785">Répondre directement à cet e-mail écrira au prospect.</p>
      </div>`;

    await brevo('/smtp/email', {
      sender: { email: senderEmail, name: senderName },
      to: [{ email: notifyEmail, name: 'Bertrand Charpilloz' }],
      replyTo: { email, name: fullName },
      subject,
      htmlContent: adminHtml,
    });

    const contactBody = {
      email,
      updateEnabled: true,
      attributes: {
        PRENOM: firstName,
        NOM: lastName,
        TAILLE_ENTREPRISE: users,
        SOURCE_PAGE: sourcePage,
      },
    };
    const listId = Number(process.env.BREVO_LIST_ID || 0);
    if (marketingConsent && listId > 0) contactBody.listIds = [listId];
    try {
      await brevo('/contacts', contactBody);
    } catch (contactError) {
      console.error('[safe-pme] Contact sync failed after notification', contactError.message);
    }

    const confirmationHtml = `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#071322;line-height:1.6">
        <div style="background:#071322;color:#fff;padding:24px 28px;border-radius:12px 12px 0 0">
          <div style="font-size:12px;color:#e9b889;text-transform:uppercase;letter-spacing:1px">S.A.F.E. Pilotage Privé</div>
          <h1 style="font-size:25px;margin:8px 0 0">Votre demande est bien arrivée.</h1>
        </div>
        <div style="padding:26px 28px;border:1px solid #e7ebef;border-top:0;border-radius:0 0 12px 12px">
          <p>Bonjour ${html(firstName)},</p>
          <p>Merci pour votre demande concernant <strong>${html(priority)}</strong>. Aucun document confidentiel n’est nécessaire avant notre premier échange.</p>
          <p>Vous pouvez choisir directement un créneau de 30 minutes&nbsp;:</p>
          <p style="margin:26px 0"><a href="${MEETING_URL}" style="display:inline-block;background:#ce9365;color:#071322;text-decoration:none;font-weight:bold;padding:13px 20px;border-radius:9px">Choisir mon créneau</a></p>
          <p>À bientôt,<br><strong>Bertrand Charpilloz</strong><br>SAFE Pilotage Privé</p>
        </div>
      </div>`;

    try {
      await brevo('/smtp/email', {
        sender: { email: senderEmail, name: senderName },
        to: [{ email, name: fullName }],
        replyTo: { email: notifyEmail, name: 'Bertrand Charpilloz' },
        subject: 'Votre demande SAFE PME est confirmée',
        htmlContent: confirmationHtml,
      });
    } catch (confirmationError) {
      console.error('[safe-pme] Confirmation email failed after notification', confirmationError.message);
    }

    return reply(res, 200, { ok: true });
  } catch (error) {
    console.error('[safe-pme] Lead handler failed', error.message, error.stack);
    return reply(res, 500, { error: 'La demande n’a pas pu être traitée. Merci de réessayer.' });
  }
};
