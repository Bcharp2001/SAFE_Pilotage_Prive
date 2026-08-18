import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { checkRateLimit, clientKey, resetRateLimits } from '@/lib/rate-limit';

describe('checkRateLimit', () => {
  beforeEach(() => {
    resetRateLimits();
    vi.useFakeTimers();
    process.env.RATE_LIMIT_REQUESTS = '3';
    process.env.RATE_LIMIT_WINDOW_SECONDS = '60';
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.RATE_LIMIT_REQUESTS;
    delete process.env.RATE_LIMIT_WINDOW_SECONDS;
  });

  it('autorise jusqu’à la limite puis refuse', () => {
    expect(checkRateLimit('ip').allowed).toBe(true);
    expect(checkRateLimit('ip').allowed).toBe(true);
    expect(checkRateLimit('ip').allowed).toBe(true);

    const refused = checkRateLimit('ip');
    expect(refused.allowed).toBe(false);
    expect(refused.retryAfter).toBeGreaterThan(0);
  });

  it('décompte les requêtes restantes', () => {
    expect(checkRateLimit('ip').remaining).toBe(2);
    expect(checkRateLimit('ip').remaining).toBe(1);
    expect(checkRateLimit('ip').remaining).toBe(0);
  });

  it('cloisonne les compteurs par clé', () => {
    checkRateLimit('a');
    checkRateLimit('a');
    checkRateLimit('a');

    expect(checkRateLimit('a').allowed).toBe(false);
    expect(checkRateLimit('b').allowed).toBe(true);
  });

  it('rouvre la fenêtre une fois expirée', () => {
    for (let i = 0; i < 3; i += 1) checkRateLimit('ip');
    expect(checkRateLimit('ip').allowed).toBe(false);

    vi.advanceTimersByTime(60_001);
    expect(checkRateLimit('ip').allowed).toBe(true);
  });

  it('retombe sur les valeurs par défaut si la configuration est absurde', () => {
    process.env.RATE_LIMIT_REQUESTS = 'zéro';
    resetRateLimits();

    for (let i = 0; i < 20; i += 1) {
      expect(checkRateLimit('ip').allowed).toBe(true);
    }
    expect(checkRateLimit('ip').allowed).toBe(false);
  });
});

describe('clientKey', () => {
  it('retient la première adresse de la chaîne de proxys', () => {
    const request = new Request('https://exemple.fr', {
      headers: { 'x-forwarded-for': '203.0.113.7, 70.41.3.18' },
    });
    expect(clientKey(request)).toBe('203.0.113.7');
  });

  it('bascule sur x-real-ip puis sur une valeur de repli', () => {
    expect(clientKey(new Request('https://exemple.fr', { headers: { 'x-real-ip': '198.51.100.4' } })))
      .toBe('198.51.100.4');
    expect(clientKey(new Request('https://exemple.fr'))).toBe('inconnu');
  });
});
