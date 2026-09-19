(() => {
  'use strict';

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const variant = document.documentElement.dataset.offerVariant || 'consultation';

  const track = (event, data = {}) => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, offer_variant: variant, ...data });
  };

  const safeStorage = {
    get(key) {
      try { return sessionStorage.getItem(key); } catch (_) { return null; }
    },
    set(key, value) {
      try { sessionStorage.setItem(key, value); } catch (_) { /* storage may be disabled */ }
    },
  };

  const captureAttribution = () => {
    const params = new URLSearchParams(location.search);
    const mapping = {
      utm_source: 'utmSource',
      utm_medium: 'utmMedium',
      utm_campaign: 'utmCampaign',
      utm_content: 'utmContent',
      utm_term: 'utmTerm',
      gclid: 'gclid',
      gbraid: 'gbraid',
      wbraid: 'wbraid',
    };

    Object.entries(mapping).forEach(([queryName, fieldName]) => {
      const incoming = params.get(queryName);
      if (incoming) safeStorage.set(`safe_${fieldName}`, incoming.slice(0, 300));
      const field = document.querySelector(`[name="${fieldName}"]`);
      if (field) field.value = incoming || safeStorage.get(`safe_${fieldName}`) || '';
    });
  };

  const initVariant = () => {
    const form = $('#safeLeadForm');
    if (form) {
      form.elements.variant.value = variant;
      form.elements.sourcePage.value = variant === 'scan'
        ? 'landing-safe-pme-scan'
        : 'landing-safe-pme-consultation';
      form.elements.startedAt.value = String(Date.now());
    }

    if (variant === 'scan') {
      document.title = 'SAFE Scan — diagnostic IA privé pour PME | SAFE Pilotage Privé';
      const robots = $('meta[name="robots"]');
      if (robots) robots.content = 'noindex,follow';
    }
  };

  const initReveal = () => {
    const items = $$('.reveal');
    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      items.forEach(item => item.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(item => observer.observe(item));
  };

  const initHeader = () => {
    const header = $('[data-header]');
    if (!header) return;
    const update = () => header.classList.toggle('is-scrolled', scrollY > 18);
    update();
    addEventListener('scroll', update, { passive: true });
  };

  const initTabs = () => {
    const tabs = $$('.use-tab');
    const activate = tab => {
      tabs.forEach(item => {
        const selected = item === tab;
        item.classList.toggle('active', selected);
        item.setAttribute('aria-selected', String(selected));
        item.tabIndex = selected ? 0 : -1;
        const panel = document.getElementById(item.getAttribute('aria-controls'));
        if (panel) {
          panel.hidden = !selected;
          panel.classList.toggle('active', selected);
        }
      });
      track('use_case_view', { use_case: tab.dataset.tab });
    };

    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => activate(tab));
      tab.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        let target = index;
        if (event.key === 'ArrowRight') target = (index + 1) % tabs.length;
        if (event.key === 'ArrowLeft') target = (index - 1 + tabs.length) % tabs.length;
        if (event.key === 'Home') target = 0;
        if (event.key === 'End') target = tabs.length - 1;
        activate(tabs[target]);
        tabs[target].focus();
      });
    });
  };

  const initFaq = () => {
    $$('.faq-item button').forEach(button => {
      button.addEventListener('click', () => {
        const isOpen = button.getAttribute('aria-expanded') === 'true';
        button.setAttribute('aria-expanded', String(!isOpen));
        if (!isOpen) track('faq_open', { question: button.textContent.trim().slice(0, 120) });
      });
    });
  };

  const initClickTracking = () => {
    $$('[data-track]').forEach(element => {
      element.addEventListener('click', () => {
        const eventName = element.dataset.track || 'cta_click';
        track(eventName, {
          destination: element.getAttribute('href') || '',
          label: element.textContent.trim().slice(0, 100),
        });
      });
    });
  };

  const setStatus = (type, message) => {
    const status = $('#formStatus');
    if (!status) return;
    status.className = `form-status ${type}`;
    status.textContent = message;
  };

  const validateForm = form => {
    let firstInvalid = null;
    $$('[required]', form).forEach(field => {
      const radioGroupEmpty = field.type === 'radio'
        && !form.querySelector(`input[name="${field.name}"]:checked`);
      const invalid = radioGroupEmpty || !field.checkValidity();
      field.setAttribute('aria-invalid', String(invalid));
      if (invalid && !firstInvalid) firstInvalid = field;
    });
    if (firstInvalid) {
      setStatus('error', 'Merci de compléter les champs obligatoires avant de continuer.');
      const focusTarget = firstInvalid.type === 'radio'
        ? form.querySelector(`input[name="${firstInvalid.name}"]`)
        : firstInvalid;
      focusTarget?.focus();
      return false;
    }
    return true;
  };

  const initForm = () => {
    const form = $('#safeLeadForm');
    const success = $('#formSuccess');
    if (!form || !success) return;

    let started = false;
    form.addEventListener('focusin', () => {
      if (started) return;
      started = true;
      track('form_start');
    });

    form.addEventListener('submit', async event => {
      event.preventDefault();
      setStatus('', '');
      if (!validateForm(form)) return;

      const submit = form.querySelector('button[type="submit"]:not(.variant-scan), button[type="submit"].variant-scan');
      const activeSubmit = variant === 'scan'
        ? $('button[type="submit"].variant-scan', form)
        : $('button[type="submit"].variant-consultation', form);
      const button = activeSubmit || submit;
      const original = button?.innerHTML;
      if (button) {
        button.disabled = true;
        button.textContent = 'Envoi en cours…';
      }

      const data = Object.fromEntries(new FormData(form).entries());
      data.marketingConsent = Boolean(form.elements.marketingConsent.checked);
      data.pageUrl = location.href.slice(0, 500);

      try {
        const response = await fetch('/api/safe-pme-lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(data),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'request_failed');

        track('form_submit_success', { priority: data.priority || '' });
        form.hidden = true;
        success.hidden = false;
        success.focus();
      } catch (error) {
        track('form_submit_error', { error_type: error.message.slice(0, 80) });
        setStatus('error', 'La demande n’a pas pu être envoyée. Vous pouvez réessayer ou écrire à bertrand@safe-pilotage-prive.fr.');
        if (button) {
          button.disabled = false;
          button.innerHTML = original;
        }
      }
    });

    if (new URLSearchParams(location.search).get('checkout') === 'indisponible') {
      setStatus('info', 'Le paiement du SAFE Scan n’est pas encore ouvert. Laissez vos coordonnées : nous vous préviendrons avant toute commande.');
      track('checkout_unavailable');
    }
  };

  const initMobileCta = () => {
    const cta = variant === 'scan'
      ? $('.mobile-cta.variant-scan')
      : $('.mobile-cta.variant-consultation');
    const destination = variant === 'scan' ? $('#safe-scan') : $('#diagnostic');
    if (!cta || !destination || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
      cta.classList.toggle('is-hidden', entry.isIntersecting);
    }, { threshold: 0.08 });
    observer.observe(destination);
  };

  const init = () => {
    initVariant();
    captureAttribution();
    initReveal();
    initHeader();
    initTabs();
    initFaq();
    initClickTracking();
    initForm();
    initMobileCta();
    $$('[data-year]').forEach(node => { node.textContent = String(new Date().getFullYear()); });
    track('landing_view', { page_path: location.pathname });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
