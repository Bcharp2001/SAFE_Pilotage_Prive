const FALLBACK_URL = '/landing/safe-pme-scan?checkout=indisponible#diagnostic';

const isAllowedStripeUrl = value => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && ['buy.stripe.com', 'checkout.stripe.com'].includes(url.hostname);
  } catch (_) {
    return false;
  }
};

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ error: 'Méthode non autorisée.' }));
  }

  const checkoutUrl = process.env.STRIPE_SAFE_SCAN_PAYMENT_LINK || '';
  res.statusCode = 302;
  res.setHeader('Location', isAllowedStripeUrl(checkoutUrl) ? checkoutUrl : FALLBACK_URL);
  return res.end();
};
