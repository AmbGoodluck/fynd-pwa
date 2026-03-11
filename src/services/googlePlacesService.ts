import { Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';

const WEB_PROXY_FALLBACK = 'https://fynd-api.jallohosmanamadu311.workers.dev';
const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || 'AIzaSyAXJbrM6TImUPguLUnXUNKUkPzTdXKV53c';
const PROXY = ((process.env.EXPO_PUBLIC_OPENAI_PROXY || '').replace(/\/$/, '')) || WEB_PROXY_FALLBACK;
const GOOGLE_BASE = 'https://maps.googleapis.com/maps/api/place';
const FALLBACK_IMG = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400';
const DEV_LOGS = typeof __DEV__ !== 'undefined' && __DEV__;

// Place types that typically require advance booking
const REQUIRES_BOOKING = new Set([
  'lodging', 'museum', 'amusement_park', 'spa', 'movie_theater',
  'night_club', 'stadium', 'bowling_alley', 'casino', 'zoo',
  'aquarium', 'art_gallery', 'campground',
]);

function getBookingUrl(placeId: string, types: string[]): string | undefined {
  if (types.some(t => REQUIRES_BOOKING.has(t))) {
    return `https://www.google.com/maps/place/?q=place_id:${placeId}`;
  }
  return undefined;
}

// On web, all Google Places requests go through our Cloudflare Worker to avoid CORS.
// On native (Android/iOS), we call Google directly (no CORS restriction).
const isWeb = Platform.OS === 'web';

function redactKey(url: string): string {
  return url.replace(/([?&]key=)[^&]+/i, '$1[redacted]');
}

function debugLog(...args: any[]) {
  if (DEV_LOGS) console.log(...args);
}

function debugWarn(...args: any[]) {
  if (DEV_LOGS) console.warn(...args);
}

// Debug only in development so production devices are not spammed.
debugLog(`[Places] Module loaded: platform=${Platform.OS} isWeb=${isWeb} PROXY="${PROXY}" API_KEY_PRESENT="${API_KEY ? 'yes' : 'no'}"`);

export interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
  rating: number;
  description: string;
  photoRef: string;
  photoUrl: string;
  coordinates: { lat: number; lng: number };
  distanceKm?: number;
  walkMinutes?: number;
  bookingUrl?: string;
  category?: string;
  city?: string;
  types?: string[];
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/** Build a text-search URL based on platform */
function textSearchUrl(queryStr: string): string {
  if (isWeb && PROXY) {
    return `${PROXY}/api/places/textsearch?query=${encodeURIComponent(queryStr)}`;
  }
  return `${GOOGLE_BASE}/textsearch/json?query=${encodeURIComponent(queryStr)}&key=${API_KEY}`;
}

/** Build a nearby-search URL based on platform */
function nearbySearchUrl(lat: number, lng: number, type: string): string {
  if (isWeb && PROXY) {
    return `${PROXY}/api/places/nearbysearch?location=${lat},${lng}&radius=2000&type=${encodeURIComponent(type)}`;
  }
  return `${GOOGLE_BASE}/nearbysearch/json?location=${lat},${lng}&radius=2000&type=${encodeURIComponent(type)}&key=${API_KEY}`;
}

/** Build a photo URL based on platform (web → proxy hides key, native → direct) */
export function getPhotoUrl(photoRef: string, maxWidth = 320): string {
  if (!photoRef) return FALLBACK_IMG;
  if (isWeb && PROXY) {
    return `${PROXY}/api/places/photo?photo_reference=${encodeURIComponent(photoRef)}&maxwidth=${maxWidth}`;
  }
  return `${GOOGLE_BASE}/photo?maxwidth=${maxWidth}&photo_reference=${encodeURIComponent(photoRef)}&key=${API_KEY}`;
}

export async function searchPlacesByVibe(
  destination: string,
  vibes: string[],
  originLat = 0,
  originLng = 0,
  maxDistanceKm?: number
): Promise<PlaceResult[]> {
  function toErrorMessage(reason: unknown): string {
    if (reason instanceof Error) return reason.message;
    try {
      return JSON.stringify(reason);
    } catch {
      return String(reason);
    }
  }

  try {
    const startedAt = Date.now();
    Sentry.addBreadcrumb({
      category: 'perf.places',
      message: 'places_fetch_start',
      level: 'info',
      data: { destination, vibesCount: vibes.length, platform: Platform.OS },
    });

    const hasOrigin = originLat !== 0 && originLng !== 0;

    function mapPlace(p: any): PlaceResult {
      const ref = p.photos?.[0]?.photo_reference || '';
      const dist = hasOrigin
        ? haversineKm(originLat, originLng, p.geometry.location.lat, p.geometry.location.lng)
        : undefined;
      const placeTypes = Array.isArray(p.types) ? p.types : [];
      return {
        placeId: p.place_id,
        name: p.name,
        address: p.formatted_address || p.vicinity || destination || 'Unknown area',
        rating: p.rating || 4.0,
        description: p.editorial_summary?.overview || p.types?.[0]?.replace(/_/g, ' ') || '',
        photoRef: ref,
        photoUrl: ref ? getPhotoUrl(ref) : FALLBACK_IMG,
        coordinates: { lat: p.geometry.location.lat, lng: p.geometry.location.lng },
        category: p.types?.[0]?.replace(/_/g, ' ') || 'place',
        types: placeTypes,
        city: destination || 'Nearby',
        distanceKm: dist,
        walkMinutes: typeof dist === 'number' ? Math.round(dist * 12) : undefined,
        bookingUrl: getBookingUrl(p.place_id, placeTypes),
      };
    }

    const safeDestination = destination?.trim() || 'near me';
    const safeVibes = vibes.length > 0 ? vibes : ['attractions', 'landmarks', 'food'];
    const keywords1 = safeVibes.slice(0, 3).join(' ');
    const keywords2 = safeVibes.length > 3 ? safeVibes.slice(3, 6).join(' ') : 'attractions';

    const query1 = `${keywords1} in ${safeDestination}`;
    const query2 = `best ${keywords2} places to visit in ${safeDestination}`;

    const urls = [textSearchUrl(query1), textSearchUrl(query2)];

    debugLog(`[Places] platform=${Platform.OS} proxy=${isWeb && PROXY ? 'yes' : 'no'}`);
    debugLog('[Places] queries:', query1, '|', query2);
    debugLog('[Places] urls:', urls.map(redactKey));

    const results = await Promise.allSettled(urls.map(async url => {
      debugLog('[Places] fetching:', redactKey(url).substring(0, 160));
      const r = await fetch(url);
      debugLog('[Places] response status:', r.status, r.statusText);
      const data = await r.json();
      debugLog('[Places] response data status:', data.status, 'results:', data.results?.length || 0);
      return data;
    }));

    const hadFulfilledResponse = results.some(r => r.status === 'fulfilled');

    const seen = new Set<string>();
    const combined: PlaceResult[] = [];

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const data = result.value;
        if (data.status === 'OK' && data.results) {
          debugLog('[Places] batch count:', data.results.length);
          for (const p of data.results) {
            if (!seen.has(p.place_id)) {
              seen.add(p.place_id);
              combined.push(mapPlace(p));
            }
          }
        } else if (data.status && data.status !== 'ZERO_RESULTS') {
          debugWarn('[Places] API status:', data.status, data.error_message);
          Sentry.captureMessage(`Google Places API error: ${data.status}`, {
            level: 'error',
            extra: { status: data.status, error_message: data.error_message, destination, vibes, platform: Platform.OS },
          });
        } else if (data.status === 'ZERO_RESULTS') {
          debugLog('[Places] ZERO_RESULTS for query');
        }
      } else {
        debugWarn('[Places] fetch rejected:', result.reason);
        Sentry.captureException(result.reason, {
          tags: { context: 'searchPlacesByVibe.fetch', platform: Platform.OS },
          extra: { destination, vibes, proxy: PROXY, isWeb },
        });
      }
    }

    if (combined.length === 0 && hasOrigin) {
      debugLog('[Places] Falling back to nearby search by coordinates');
      const nearbyTypes = ['tourist_attraction', 'restaurant', 'cafe'];
      const nearbyResults = await Promise.allSettled(
        nearbyTypes.map(type => fetch(nearbySearchUrl(originLat, originLng, type)).then(r => r.json()))
      );

      for (const result of nearbyResults) {
        if (result.status !== 'fulfilled') continue;
        const data = result.value;
        if (data?.status !== 'OK' || !Array.isArray(data.results)) continue;
        for (const p of data.results) {
          if (!seen.has(p.place_id)) {
            seen.add(p.place_id);
            combined.push(mapPlace(p));
          }
        }
      }
      debugLog('[Places] nearby fallback count:', combined.length);
    }

    if (!hadFulfilledResponse) {
      const reasons = results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map(r => toErrorMessage(r.reason))
        .join(' | ');
      throw new Error(`All Places requests failed: ${reasons}`);
    }

    // Strict preference filtering:
    // 1) place must semantically match selected vibe keywords
    // 2) if origin exists, place must be inside selected distance radius
    const vibeTokens = Array.from(
      new Set(
        (safeVibes || [])
          .flatMap(v => String(v).toLowerCase().split(/[^a-z0-9]+/g))
          .filter(t => t.length >= 3)
      )
    );

    const filteredByVibe = combined.filter(p => {
      if (vibeTokens.length === 0) return true;
      const haystack = [
        p.name,
        p.description,
        p.category,
        p.address,
        ...(p.types || []),
      ]
        .join(' ')
        .toLowerCase();
      return vibeTokens.some(token => haystack.includes(token));
    });

    const strictDistanceKm = typeof maxDistanceKm === 'number' && maxDistanceKm > 0
      ? maxDistanceKm
      : null;

    const strictlyFiltered = hasOrigin && strictDistanceKm
      ? filteredByVibe.filter(p => typeof p.distanceKm === 'number' && p.distanceKm <= strictDistanceKm)
      : filteredByVibe;

    const durationMs = Date.now() - startedAt;
    Sentry.addBreadcrumb({
      category: 'perf.places',
      message: 'places_fetch_end',
      level: 'info',
      data: {
        durationMs,
        resultCount: strictlyFiltered.length,
        preFilterCount: combined.length,
        hasOrigin,
        maxDistanceKm: strictDistanceKm,
        platform: Platform.OS,
      },
    });
    debugLog('[Places] total unique results:', combined.length, 'strictly filtered:', strictlyFiltered.length);
    return strictlyFiltered.slice(0, 30);
  } catch (e) {
    debugWarn('[Places] searchPlacesByVibe error:', e);
    Sentry.captureException(e, {
      tags: { context: 'searchPlacesByVibe', platform: Platform.OS },
      extra: { destination, vibes, proxy: PROXY, isWeb },
    });
    throw e;
  }
}

export async function searchNearby(lat: number, lng: number, type: string): Promise<PlaceResult[]> {
  try {
    const typeMap: Record<string, string> = {
      Medical: 'hospital',
      'Currency Exchange': 'bank',
      'Public Bathrooms': 'point_of_interest',
      Transport: 'transit_station',
      Police: 'police',
      Embassy: 'embassy',
      ATM: 'atm',
      Pharmacy: 'pharmacy',
      Hotel: 'lodging',
      'Tourist Info': 'tourist_attraction',
    };
    const googleType = typeMap[type] || 'point_of_interest';
    const url = nearbySearchUrl(lat, lng, googleType);
    const res = await fetch(url);
    const data = await res.json();
    if (!data.results) return [];
    return data.results.slice(0, 8).map((p: any) => {
      const ref = p.photos?.[0]?.photo_reference || '';
      return {
        placeId: p.place_id,
        name: p.name,
        address: p.vicinity,
        rating: p.rating || 0,
        description: '',
        photoRef: ref,
        photoUrl: ref ? getPhotoUrl(ref) : FALLBACK_IMG,
        coordinates: { lat: p.geometry.location.lat, lng: p.geometry.location.lng },
        category: type,
        city: '',
      };
    });
  } catch (e) {
    debugWarn('[Places] Nearby search error:', e);
    Sentry.captureException(e, { tags: { context: 'searchNearby', platform: Platform.OS }, extra: { lat, lng, type } });
    return [];
  }
}

/** Reverse-geocode coordinates to a city name. Works on all platforms. */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    let url: string;
    if (isWeb && PROXY) {
      url = `${PROXY}/api/places/geocode?latlng=${lat},${lng}`;
    } else {
      url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${API_KEY}`;
    }
    const res = await fetch(url);
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      const comps = data.results[0].address_components || [];
      const city = comps.find((c: any) => c.types.includes('locality'));
      const region = comps.find((c: any) => c.types.includes('administrative_area_level_1'));
      return city?.long_name || region?.long_name || data.results[0].formatted_address?.split(',')[0] || 'My Location';
    }
    return 'My Location';
  } catch (e) {
    debugWarn('[Places] reverseGeocode error:', e);
    return 'My Location';
  }
}

export interface AutocompleteSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

/**
 * Returns location auto-complete suggestions as user types.
 * Uses (regions) type filter to return cities, states/regions, and countries.
 */
export async function autocompletePlaces(input: string): Promise<AutocompleteSuggestion[]> {
  if (!input || input.trim().length < 2) return [];
  try {
    let url: string;
    if (isWeb && PROXY) {
      url = `${PROXY}/api/places/autocomplete?input=${encodeURIComponent(input)}&types=(regions)`;
    } else {
      url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=(regions)&key=${API_KEY}`;
    }
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== 'OK' || !Array.isArray(data.predictions)) return [];
    return data.predictions.slice(0, 5).map((p: any) => ({
      placeId: p.place_id,
      description: p.description,
      mainText: p.structured_formatting?.main_text || p.description.split(',')[0],
      secondaryText: p.structured_formatting?.secondary_text || '',
    }));
  } catch (e) {
    debugWarn('[Places] autocomplete error:', e);
    return [];
  }
}
