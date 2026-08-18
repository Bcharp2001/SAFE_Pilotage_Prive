/**
 * Limitation de débit par adresse IP, en mémoire.
 *
 * Limite connue : sur une plateforme serverless, le compteur est local à
 * l'instance. Il freine l'abus opportuniste et le bouclage accidentel, pas une
 * attaque distribuée. Pour un déploiement en production ouverte, brancher un
 * magasin partagé (Upstash Redis, Vercel KV) derrière la même fonction.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Au-delà de ce nombre d'entrées, on purge les fenêtres expirées. */
const CLEANUP_THRESHOLD = 5_000;

function config(): { limit: number; windowMs: number } {
  const limit = Number.parseInt(process.env.RATE_LIMIT_REQUESTS ?? '', 10);
  const windowSeconds = Number.parseInt(process.env.RATE_LIMIT_WINDOW_SECONDS ?? '', 10);
  return {
    limit: Number.isFinite(limit) && limit > 0 ? limit : 20,
    windowMs: (Number.isFinite(windowSeconds) && windowSeconds > 0 ? windowSeconds : 60) * 1000,
  };
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Secondes à attendre avant la prochaine tentative. */
  retryAfter: number;
}

export function checkRateLimit(key: string): RateLimitResult {
  const { limit, windowMs } = config();
  const now = Date.now();

  if (buckets.size > CLEANUP_THRESHOLD) {
    for (const [id, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(id);
    }
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfter: 0 };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { allowed: true, remaining: limit - bucket.count, retryAfter: 0 };
}

/**
 * Identifie l'appelant. `x-forwarded-for` peut être usurpé hors d'un proxy de
 * confiance ; sur Vercel l'en-tête est réécrit par la plateforme.
 */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim();
  return ip || request.headers.get('x-real-ip') || 'inconnu';
}

/** Réinitialise l'état — réservé aux tests. */
export function resetRateLimits(): void {
  buckets.clear();
}
