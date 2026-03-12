// ─── Performance-Aware In-Memory Cache ───────────────────────────────────────
// Lightweight LRU-style cache for UI assets, place search results,
// and recommendation results.
//
// NOT cached (per policy):
//   • Map tiles
//   • Real-time navigation routes
//   • User session tokens
//
// All cache instances are module-level singletons (reset on app restart).

const DEV_LOGS = typeof __DEV__ !== 'undefined' && __DEV__;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class MemoryCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private readonly maxEntries: number;
  private readonly defaultTtlMs: number;

  constructor(opts: { maxEntries: number; defaultTtlMs: number }) {
    this.maxEntries = opts.maxEntries;
    this.defaultTtlMs = opts.defaultTtlMs;
  }

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlMs?: number): void {
    // Evict oldest entry when at capacity (insertion-order LRU approximation)
    if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) this.store.delete(oldestKey);
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
    });
    if (DEV_LOGS) console.log(`[Cache] SET "${key}" (${this.store.size}/${this.maxEntries})`);
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}

// ─── Cache instances ──────────────────────────────────────────────────────────

/**
 * Place search results.
 * Keyed by destination + vibes + timeOfDay.
 * TTL: 10 minutes — frequent enough to stay fresh, long enough to avoid API spam.
 */
export const placeSearchCache = new MemoryCache<any[]>({
  maxEntries: 50,
  defaultTtlMs: 10 * 60 * 1000,
});

/**
 * Recommendation results per user.
 * Keyed by user_id.
 * TTL: 5 minutes.
 */
export const recommendationCache = new MemoryCache<any[]>({
  maxEntries: 20,
  defaultTtlMs: 5 * 60 * 1000,
});

/**
 * Resolved photo / asset URLs.
 * Keyed by photo reference string.
 * TTL: 30 minutes — photo URLs are stable within a session.
 */
export const assetCache = new MemoryCache<string>({
  maxEntries: 200,
  defaultTtlMs: 30 * 60 * 1000,
});

// ─── Cache key builders ───────────────────────────────────────────────────────

export function placeSearchCacheKey(
  destination: string,
  vibes: string[],
  timeOfDay?: string
): string {
  const dest = destination.toLowerCase().trim();
  const vibeKey = [...vibes].sort().join(',');
  return `places|${dest}|${vibeKey}|${timeOfDay || ''}`;
}

export function recommendationCacheKey(userId: string): string {
  return `rec|${userId}`;
}

export function assetCacheKey(photoRef: string): string {
  return `asset|${photoRef}`;
}
