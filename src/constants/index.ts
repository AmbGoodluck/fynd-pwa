/**
 * Fynd — App-wide constants
 *
 * Centralises values that are reused across multiple screens, components, or
 * services so that there is a single source of truth for each one.
 */

// ── Images ───────────────────────────────────────────────────────────────────

/**
 * Generic travel fallback used when a place has no photo from the Places API.
 * Keeping a single constant prevents the same URL from drifting across files
 * (different `?w=` sizes, typos, etc.).
 */
export const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800';

// ── Timing ───────────────────────────────────────────────────────────────────

/** Milliseconds to delay before considering a long-press a drag gesture. */
export const LONG_PRESS_DELAY_MS = 350;

// ── Map ──────────────────────────────────────────────────────────────────────

/** Default location fallback when device location is unavailable. */
export const DEFAULT_LAT = 40.7128;  // New York City
export const DEFAULT_LNG = -74.006;

// ── Limits ───────────────────────────────────────────────────────────────────

/** Maximum stops shown on the MapScreen route sidebar. */
export const MAX_ROUTE_STOPS = 20;
