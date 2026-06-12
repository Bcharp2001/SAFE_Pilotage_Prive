const BREVO_API_BASE = 'https://api.brevo.com/v3';

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
};

const clean = (value, fallback = '') =>
  String(value || fallback)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

async function brevoRequest(path, body) {
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
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Brevo API error ${response.status}`);
  }

  return response.status === 204 ? null : response.json();
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.safe-pilotage-prive.fr');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  if (!process.env.BREVO_API_KEY) return json(res, 500, { error: 'Brevo is not configured' });

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const firstname = clean(payload.firstname || payload.firstName);
    const lastname = clean(payload.lastname || payload.lastName);
    const email = clean(payload.email).toLowerCase();
    const size = clean(payload.size || payload.companySize || payload.taille);
    const department = clean(payload.department || payload.dept || payload.departement);
    const sourcePage = clean(payload.sourcePage, 'site');
    const confirmTemplate = clean(payload.confirmTemplate, 'default');

    if (!isValidEmail(email)) return json(res, 400, { error: 'Invalid email' });

    const listId = Number(process.env.BREVO_LIST_ID || 3);
    const adminTemplateId = Number(process.env.BREVO_ADMIN_TEMPLATE_ID || 5);
    const defaultConfirmTemplateId = Number(process.env.BREVO_CONFIRM_TEMPLATE_ID || 2);
    const professionConfirmTemplateId = Number(
      process.env.BREVO_PROFESSION_CONFIRM_TEMPLATE_ID || 6,
    );
    const odysseusTemplateId = Number(process.env.BREVO_ODYSSEUS_TEMPLATE_ID || 0);
    const confirmTemplateId =
      confirmTemplate === 'odysseus'   ? (odysseusTemplateId || defaultConfirmTemplateId) :
      confirmTemplate === 'profession' ? professionConfirmTemplateId :
      defaultConfirmTemplateId;
    const adminEmail = process.env.CONTACT_ADMIN_EMAIL || 'contact@safe-pilotage-prive.fr';
    const senderEmail = process.env.CONTACT_SENDER_EMAIL || 'contact@safe-pilotage-prive.fr';
    const senderName = process.env.CONTACT_SENDER_NAME || 'S.A.F.E. Pilotage Privé';

    const attributes = {
      TAILLE_ENTREPRISE: size,
      DEPARTEMENT: department,
      SOURCE_PAGE: sourcePage,
    };
    if (firstname) attributes.PRENOM = firstname;
    if (lastname) attributes.NOM = lastname;

    await brevoRequest('/contacts', {
      email,
      listIds: [listId],
      updateEnabled: true,
      attributes,
    });

    const adminParams = {
      PRENOM: firstname || 'Non renseigné',
      NOM: lastname || 'Non renseigné',
      EMAIL: email,
      TAILLE: size,
      DEPT: department,
      TAILLE_ENTREPRISE: size,
      DEPARTEMENT: department,
      SOURCE_PAGE: sourcePage,
    };

    await brevoRequest('/smtp/email', {
      to: [{ email: adminEmail, name: 'Admin S.A.F.E.' }],
      sender: { email: senderEmail, name: senderName },
      templateId: adminTemplateId,
      params: adminParams,
    });

    await brevoRequest('/smtp/email', {
      to: [{ email, name: `${firstname} ${lastname}`.trim() || email }],
      sender: { email: senderEmail, name: senderName },
      templateId: confirmTemplateId,
      params: {
        PRENOM: firstname,
        NOM: lastname,
        TAILLE: size,
        DEPT: department,
        TAILLE_ENTREPRISE: size,
        DEPARTEMENT: department,
      },
    });

    return json(res, 200, { ok: true });
  } catch (error) {
    console.error('Contact form error:', error);
    return json(res, 500, { error: 'Unable to process contact request' });
  }
};
