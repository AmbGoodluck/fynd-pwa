/**
 * bookingDetectionService.ts
 *
 * High-accuracy booking detection for the Fynd "Book Now" button.
 * Ensures Book Now only appears when a reliable booking page exists
 * and always opens the correct business website — never Google Maps.
 */

// ── Section 1: BookingLink data structure ─────────────────────────────────────
export interface BookingLink {
  place_id: string;
  business_name: string;
  booking_url: string;
  booking_platform: string;
  /** verified = passed platform/path detection; unverified = low confidence; rejected = user-reported or blocked */
  verified_status: 'verified' | 'unverified' | 'rejected';
  /** 0–1 confidence score */
  confidence_score: number;
  /** Unix millisecond timestamp */
  last_checked: number;
}

// ── Section 2: Google Maps URL block-list ────────────────────────────────────
const GOOGLE_MAPS_PATTERNS = [
  'maps.google.com',
  'google.com/maps',
  'goo.gl/maps',
] as const;

/** Returns true if the URL is a Google Maps link that must never be used as a booking URL */
export function isGoogleMapsUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return GOOGLE_MAPS_PATTERNS.some(p => lower.includes(p));
}

// ── Section 3: Known booking platforms ──────────────────────────────────────
const BOOKING_PLATFORM_DOMAINS: Record<string, string> = {
  'opentable.com':    'OpenTable',
  'resy.com':         'Resy',
  'eventbrite.com':   'Eventbrite',
  'viator.com':       'Viator',
  'getyourguide.com': 'GetYourGuide',
  'ticketmaster.com': 'Ticketmaster',
};

/** Returns the platform name if the URL belongs to a known booking provider, otherwise null */
export function detectKnownPlatform(url: string): string | null {
  if (!url) return null;
  const lower = url.toLowerCase();
  for (const [domain, name] of Object.entries(BOOKING_PLATFORM_DOMAINS)) {
    if (lower.includes(domain)) return name;
  }
  return null;
}

// ── Section 4: Website booking path detection ────────────────────────────────
const BOOKING_PATHS = [
  '/reserve',
  '/reservations',
  '/book',
  '/booking',
  '/tickets',
  '/buy-tickets',
  '/schedule',
] as const;

/** Returns true if the URL pathname contains a recognised booking path segment */
export function hasBookingPath(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return BOOKING_PATHS.some(path => lower.includes(path));
}

// ── Section 5: Category validation ───────────────────────────────────────────

/** Place categories / Google types that typically require advance booking */
const BOOKABLE_TYPES = new Set([
  // User-facing categories (spec)
  'restaurant', 'tour', 'museum', 'event venue', 'guided activity', 'boat tour', 'theater',
  // Google Places types
  'lodging', 'amusement_park', 'spa', 'movie_theater', 'night_club',
  'stadium', 'bowling_alley', 'casino', 'zoo', 'aquarium', 'art_gallery',
  'campground', 'tourist_attraction',
]);

/** Place categories / Google types that should NEVER show a booking button */
const NON_BOOKABLE_TYPES = new Set([
  // User-facing categories (spec)
  'park', 'beach', 'viewpoint', 'public landmark', 'street art',
  // Google Places types
  'natural_feature', 'locality', 'sublocality', 'neighborhood',
  'political', 'premise', 'route', 'transit_station',
]);

/**
 * Returns true if the place category / types list indicates booking is appropriate.
 * Non-bookable types take priority and block the button.
 */
export function isCategoryBookable(
  category: string | undefined,
  types?: string[],
): boolean {
  const catLower = (category || '').toLowerCase();

  // Explicit non-bookable block
  if (catLower && NON_BOOKABLE_TYPES.has(catLower)) return false;
  if (types?.some(t => NON_BOOKABLE_TYPES.has(t.toLowerCase()))) return false;

  // Explicit bookable match
  if (catLower && BOOKABLE_TYPES.has(catLower)) return true;
  if (types?.some(t => BOOKABLE_TYPES.has(t.toLowerCase()))) return true;

  // Unknown category — conservative: do not show
  return false;
}

// ── Section 6: Confidence scoring + main detection entry-point ───────────────

export interface BookingDetectionResult {
  /** The validated + scored booking link, or null if invalid */
  bookingLink: BookingLink | null;
  /** Whether the Book Now button should be shown */
  showBookNow: boolean;
}

/**
 * Main detection function.
 *
 * Priority order:
 * 1. Use cached result if still valid (confidence ≥ 0.75 and not rejected)
 * 2. Block Google Maps URLs
 * 3. Category validation (skip for known-platform URLs)
 * 4. Score the URL:  platform → 0.95 | booking path → 0.85 | homepage → 0.40
 * 5. Show Book Now only when confidence ≥ 0.75
 */
export function detectBooking(params: {
  placeId: string;
  businessName: string;
  bookingUrl?: string | null;
  category?: string;
  types?: string[];
  cached?: BookingLink | null;
}): BookingDetectionResult {
  const { placeId, businessName, bookingUrl, category, types, cached } = params;

  const noBooking: BookingDetectionResult = { bookingLink: null, showBookNow: false };

  // ── Section 10: Return cached result if valid ────────────────────────────
  if (cached) {
    if (cached.verified_status === 'rejected') return noBooking;
    if (cached.confidence_score >= 0.75) {
      return { bookingLink: cached, showBookNow: true };
    }
  }

  // Validate URL is provided
  if (!bookingUrl || typeof bookingUrl !== 'string' || !bookingUrl.trim()) {
    return noBooking;
  }

  // Validate URL structure (must be http/https)
  let parsed: URL;
  try {
    parsed = new URL(bookingUrl.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return noBooking;
  } catch {
    return noBooking;
  }

  // ── Section 2: Block Google Maps URLs ───────────────────────────────────
  if (isGoogleMapsUrl(bookingUrl)) return noBooking;

  // ── Section 3: Detect known booking platform (skip category check if found)
  const knownPlatform = detectKnownPlatform(bookingUrl);

  // ── Section 5: Category validation (only enforced for non-platform URLs) ─
  if (!knownPlatform && !isCategoryBookable(category, types)) {
    return noBooking;
  }

  // ── Section 6: Confidence scoring ───────────────────────────────────────
  let confidence = 0.40; // homepage-only baseline
  let platform = 'unknown';
  let status: BookingLink['verified_status'] = 'unverified';

  if (knownPlatform) {
    // Known booking platform → highest confidence
    confidence = 0.95;
    platform = knownPlatform;
    status = 'verified';
  } else if (hasBookingPath(bookingUrl)) {
    // Official site with a reservation path → high confidence
    confidence = 0.85;
    platform = 'direct';
    status = 'verified';
  }

  const link: BookingLink = {
    place_id: placeId,
    business_name: businessName,
    booking_url: bookingUrl.trim(),
    booking_platform: platform,
    verified_status: status,
    confidence_score: confidence,
    last_checked: Date.now(),
  };

  return {
    bookingLink: link,
    showBookNow: confidence >= 0.75,
  };
}

// ── Section 9: User feedback helpers ────────────────────────────────────────

/**
 * Apply negative user feedback to a booking link.
 * Reduces confidence by 0.3; marks rejected if confidence drops below 0.75.
 */
export function applyNegativeFeedback(link: BookingLink): BookingLink {
  const updated: BookingLink = {
    ...link,
    confidence_score: Math.max(0, link.confidence_score - 0.3),
    last_checked: Date.now(),
  };
  if (updated.confidence_score < 0.75) {
    updated.verified_status = 'rejected';
  }
  return updated;
}

/**
 * Apply positive user feedback — small confidence boost, capped at 1.0.
 */
export function applyPositiveFeedback(link: BookingLink): BookingLink {
  return {
    ...link,
    confidence_score: Math.min(1, link.confidence_score + 0.05),
    last_checked: Date.now(),
  };
}
