/**
 * Google Analytics 4 avec Consentement Strict - Landing Business IA
 * 
 * Configuration:
 * - Deux propriétés GA4 authentiques créées UI (compte bertrandcharpilloz)
 * - Property ID: 563216487
 * - Stream 1: mon-business-ia-prive.fr → G-4NLJXHDV0M
 * - Stream 2: mon-ia-pro-prive.fr → G-72J4FXPW10
 * 
 * Comportement:
 * - Aucun chargement avant consentement (mode strict)
 * - Aucun appel sur localhost/preview/vercel ou safe-pilotage-prive.fr
 * - Refus = pas de cookies, pas de chargement GA
 * - Acceptance = chargement uniquement sur hostnames autorisés
 * - Choix conservé ~6 mois
 * - Retrait accessible, arrête collecte et supprime cookies
 */

(function() {
  'use strict';

  // Configuration hostnames → Measurement IDs
  const GA_CONFIG = {
    'mon-business-ia-prive.fr': 'G-4NLJXHDV0M',
    'www.mon-business-ia-prive.fr': 'G-4NLJXHDV0M',
    'mon-ia-pro-prive.fr': 'G-72J4FXPW10',
    'www.mon-ia-pro-prive.fr': 'G-72J4FXPW10'
  };

  // Clé de stockage du consentement
  const CONSENT_KEY = 'landing_analytics_consent';
  const CONSENT_EXPIRY_DAYS = 180; // ~6 mois

  // État du consentement
  let consentGiven = false;
  let measurementId = null;

  /**
   * Vérifie si le hostname actuel est autorisé
   */
  function isAuthorizedHostname() {
    const hostname = window.location.hostname;
    return GA_CONFIG.hasOwnProperty(hostname);
  }

  /**
   * Récupère le Measurement ID pour le hostname actuel
   */
  function getMeasurementId() {
    const hostname = window.location.hostname;
    return GA_CONFIG[hostname] || null;
  }

  /**
   * Lit le consentement stocké
   */
  function getStoredConsent() {
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      if (!stored) return null;
      
      const data = JSON.parse(stored);
      const now = Date.now();
      
      // Vérifier expiration
      if (data.expiry && now > data.expiry) {
        localStorage.removeItem(CONSENT_KEY);
        return null;
      }
      
      return data.consent === true;
    } catch (e) {
      return null;
    }
  }

  /**
   * Stocke le choix de consentement
   */
  function storeConsent(consent) {
    try {
      const expiry = Date.now() + (CONSENT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
      const data = {
        consent: consent,
        timestamp: Date.now(),
        expiry: expiry
      };
      localStorage.setItem(CONSENT_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Erreur stockage consentement:', e);
    }
  }

  /**
   * Supprime les cookies Google Analytics
   */
  function deleteGACookies() {
    const cookies = document.cookie.split(';');
    const gaCookieNames = ['_ga', '_gid', '_gat', '_gat_gtag_'];
    
    cookies.forEach(cookie => {
      const cookieName = cookie.split('=')[0].trim();
      
      // Supprimer cookies GA exacts ou préfixés
      const isGACookie = gaCookieNames.some(prefix => 
        cookieName === prefix || cookieName.startsWith(prefix)
      );
      
      if (isGACookie) {
        // Supprimer pour domain actuel et parent
        const domains = [
          '',
          '.' + window.location.hostname,
          '.' + window.location.hostname.split('.').slice(-2).join('.')
        ];
        
        domains.forEach(domain => {
          document.cookie = cookieName + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + domain;
        });
      }
    });
  }

  /**
   * Charge Google Analytics 4
   */
  function loadGA4() {
    if (!measurementId || !isAuthorizedHostname()) {
      console.log('[GA4] Hostname non autorisé ou ID manquant');
      return;
    }

    // Créer et charger le script gtag.js
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
    document.head.appendChild(script);

    // Initialiser gtag
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.gtag = gtag;

    // Configuration consentement par défaut (refusé)
    gtag('consent', 'default', {
      'analytics_storage': 'granted',
      'ad_storage': 'denied',
      'ad_user_data': 'denied',
      'ad_personalization': 'denied',
      'functionality_storage': 'granted',
      'security_storage': 'granted'
    });

    // Initialiser GA4
    gtag('js', new Date());
    gtag('config', measurementId, {
      'anonymize_ip': true,
      'allow_google_signals': false,
      'cookie_flags': 'SameSite=Strict;Secure',
      'cookie_expires': 180 * 24 * 60 * 60 // 6 mois en secondes
    });

    console.log('[GA4] Chargé:', measurementId);
  }

  /**
   * Envoie un événement personnalisé
   */
  function trackEvent(eventName, eventParams) {
    if (!consentGiven || !window.gtag) {
      console.log('[GA4] Événement ignoré (pas de consentement):', eventName);
      return;
    }
    
    window.gtag('event', eventName, eventParams || {});
    console.log('[GA4] Événement envoyé:', eventName, eventParams);
  }

  /**
   * Affiche la bannière de consentement
   */
  function showConsentBanner() {
    const banner = document.getElementById('consent-banner');
    if (banner) {
      banner.style.display = 'block';
      banner.setAttribute('aria-hidden', 'false');
    }
  }

  /**
   * Masque la bannière de consentement
   */
  function hideConsentBanner() {
    const banner = document.getElementById('consent-banner');
    if (banner) {
      banner.style.display = 'none';
      banner.setAttribute('aria-hidden', 'true');
    }
  }

  /**
   * Gère l'acceptation du consentement
   */
  function handleAccept() {
    consentGiven = true;
    storeConsent(true);
    hideConsentBanner();
    
    // Charger GA4 si hostname autorisé
    if (isAuthorizedHostname()) {
      loadGA4();
    }
  }

  /**
   * Gère le refus du consentement
   */
  function handleRefuse() {
    consentGiven = false;
    storeConsent(false);
    hideConsentBanner();
    
    // Supprimer cookies existants
    deleteGACookies();
    
    console.log('[GA4] Consentement refusé - pas de chargement');
  }

  /**
   * Gère le retrait du consentement
   */
  function handleWithdraw() {
    consentGiven = false;
    localStorage.removeItem(CONSENT_KEY);
    deleteGACookies();
    
    // Désactiver GA si chargé
    if (window.gtag) {
      window['ga-disable-' + measurementId] = true;
    }
    
    alert('Votre consentement a été retiré. Les cookies ont été supprimés et la collecte de données est arrêtée.');
    console.log('[GA4] Consentement retiré');
  }

  /**
   * Initialisation
   */
  function init() {
    // Vérifier hostname autorisé
    if (!isAuthorizedHostname()) {
      console.log('[GA4] Hostname non autorisé - pas de GA:', window.location.hostname);
      return;
    }

    // Récupérer Measurement ID
    measurementId = getMeasurementId();
    if (!measurementId) {
      console.error('[GA4] Measurement ID non trouvé pour:', window.location.hostname);
      return;
    }

    // Vérifier consentement stocké
    const storedConsent = getStoredConsent();
    
    if (storedConsent === true) {
      // Consentement déjà donné
      consentGiven = true;
      loadGA4();
    } else if (storedConsent === false) {
      // Consentement déjà refusé
      consentGiven = false;
      console.log('[GA4] Consentement précédemment refusé');
    } else {
      // Pas de consentement stocké - afficher bannière
      showConsentBanner();
    }

    // Attacher les événements
    const acceptBtn = document.getElementById('consent-accept');
    const refuseBtn = document.getElementById('consent-refuse');
    const withdrawLink = document.getElementById('consent-withdraw');

    if (acceptBtn) acceptBtn.addEventListener('click', handleAccept);
    if (refuseBtn) refuseBtn.addEventListener('click', handleRefuse);
    if (withdrawLink) withdrawLink.addEventListener('click', function(e) {
      e.preventDefault();
      handleWithdraw();
    });
  }

  /**
   * Tracking des clics CTA Cal.com
   */
  function initCTATracking() {
    // Attendre que le DOM soit chargé
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', attachCTAListeners);
    } else {
      attachCTAListeners();
    }
  }

  function attachCTAListeners() {
    // Trouver tous les liens Cal.com
    const ctaLinks = document.querySelectorAll('a[href*="cal.com"]');
    
    ctaLinks.forEach((link, index) => {
      link.addEventListener('click', function() {
        // Track seulement si consentement donné
        if (consentGiven && window.gtag) {
          trackEvent('clic_cta_cal', {
            'event_category': 'engagement',
            'event_label': 'cta_reservation',
            'cta_position': index + 1,
            'non_interaction': false
          });
        }
      });
    });
    
    console.log('[GA4] Tracking CTA attaché:', ctaLinks.length, 'liens');
  }

  // API publique
  window.LandingAnalytics = {
    trackEvent: trackEvent,
    withdraw: handleWithdraw,
    getConsentStatus: function() {
      return consentGiven;
    },
    isAuthorized: isAuthorizedHostname
  };

  // Initialiser au chargement
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      init();
      initCTATracking();
    });
  } else {
    init();
    initCTATracking();
  }
})();
