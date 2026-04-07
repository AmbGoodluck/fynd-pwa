import { collection, getDocs, limit as fsLimit } from 'firebase/firestore';
import { PlaceResult } from './googlePlacesService';
/**
 * Query Firestore cache for suggested places by city and vibes.
 */
export async function getCachedSuggestedPlaces(
  city: string,
  vibes: string[],
  maxResults: number = 40,
): Promise<PlaceResult[]> {
  try {
    // Fetch up to 200 cached places
    const snap = await getDocs(fsLimit(collection(db, 'place_details_cache'), 200));
    const cityNorm = city.trim().toLowerCase();
    const vibeTokens = vibes.map(v => v.toLowerCase().split(/\s+/)).flat();
    const results: Array<{ place: PlaceDetailsCache; vibeMatches: number }> = [];
    for (const docSnap of snap.docs) {
      const place = docSnap.data() as PlaceDetailsCache;
      // City match: check city or formatted_address includes city string
      const cityField = (place.city || '').toLowerCase();
      const addrField = (place.formatted_address || '').toLowerCase();
      if (
        !cityNorm ||
        cityField.startsWith(cityNorm) ||
        cityNorm.startsWith(cityField) ||
        cityField.includes(cityNorm) ||
        addrField.includes(cityNorm)
      ) {
        // Vibe match: count tokens in types, known_for, vibe, ai_description
        const haystack = [
          ...(place.types || []).map(t => t.toLowerCase()),
          ...(place.known_for || []).map(k => k.toLowerCase()),
          (place.vibe || '').toLowerCase(),
          (place.ai_description || '').toLowerCase(),
        ].join(' ');
        let vibeMatches = 0;
        for (const token of vibeTokens) {
          if (token && haystack.includes(token)) vibeMatches++;
        }
        results.push({ place, vibeMatches });
      }
    }
    // Sort: more vibe matches first, then rating desc
    results.sort((a, b) =>
      b.vibeMatches - a.vibeMatches || (b.place.rating || 0) - (a.place.rating || 0)
    );
    // Map to PlaceResult
    return results.slice(0, maxResults).map(({ place }) => ({
      placeId: place.place_id,
      name: place.place_name,
      address: place.formatted_address,
      rating: place.rating ?? 0,
      description: place.ai_description || place.editorial_summary || '',
      photoRef: '',
      photoUrl: place.photo_urls?.[0] || FALLBACK_IMAGE,
      photoUrls: place.photo_urls,
      coordinates: { lat: place.lat, lng: place.lng },
      category: place.types?.[0]?.replace(/_/g, ' '),
      types: place.types,
      city: place.city,
      matchedTags: (place.known_for || []).slice(0, 2),
      bookingUrl: undefined,
      opening_hours: place.opening_hours,
      business_status: undefined,
    }));
  } catch (e) {
    return [];
  }
}
/**
 * Place Details Service
 *
 * Orchestrates:
 *   1. Instant render with basic data already in hand
 *   2. Firestore cache check (TTL = 7 days)
 *   3. Google Places Details fetch (via proxy / native)
 *   4. OpenAI description generation (via existing Cloudflare Worker proxy)
 *   5. Write-back to Firestore cache
 *
 * All network calls are fire-and-forget from the UI perspective —
 * the detail screen renders immediately with whatever data is available
 * and updates state as richer data arrives.
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { fetchPlaceDetails, PlaceDetails } from './googlePlacesService';
import { generatePlaceDescription } from './openaiService';

export const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface PlaceDetailsCache {
  place_id: string;
  place_name: string;
  formatted_address: string;
  city: string;
  phone?: string;
  website?: string;
  rating?: number;
  price_level?: number;
  opening_hours?: {
    open_now?: boolean;
    weekday_text?: string[];
  };
  photo_urls: string[];
  types: string[];
  ai_description: string;
  known_for: string[];
  vibe: string;
  cached_at: number;
  lat: number;
  lng: number;
  editorial_summary?: string;
  maps_url?: string;
}

export interface RichPlaceData {
  // Basic (always available immediately)
  placeId: string;
  name: string;
  photoUrl: string;
  photoUrls: string[];
  rating?: number;
  address?: string;
  category?: string;
  // Extended (from Google Places / cache)
  details?: PlaceDetails;
  // AI (from OpenAI / cache)
  aiDescription?: string;
  knownFor?: string[];
  vibe?: string;
  // Loading flags
  detailsLoading: boolean;
  aiLoading: boolean;
  detailsError?: boolean;
  aiError?: boolean;
}

/** Read from Firestore cache. Returns null if missing or stale. */
export async function readPlaceCache(placeId: string): Promise<PlaceDetailsCache | null> {
  try {
    const ref = doc(db, 'place_details_cache', placeId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data() as PlaceDetailsCache;
    if (Date.now() - (data.cached_at || 0) > CACHE_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

/** Write combined Google + AI data to Firestore cache. Fire-and-forget safe. */
export async function writePlaceCache(
  placeId: string,
  details: PlaceDetails,
  ai: { description: string; knownFor: string[]; vibe: string },
): Promise<void> {
  try {
    const payload: PlaceDetailsCache = {
      place_id: placeId,
      place_name: details.name,
      formatted_address: details.formattedAddress,
      city: details.city,
      phone: details.phone,
      website: details.website,
      rating: details.rating,
      price_level: details.priceLevel,
      opening_hours: details.openingHours
        ? { open_now: details.openingHours.openNow, weekday_text: details.openingHours.weekdayText }
        : undefined,
      photo_urls: details.photoUrls,
      types: details.types,
      ai_description: ai.description,
      known_for: ai.knownFor,
      vibe: ai.vibe,
      cached_at: Date.now(),
      lat: details.lat,
      lng: details.lng,
      editorial_summary: details.editorialSummary,
      maps_url: details.mapsUrl,
    };
    await setDoc(doc(db, 'place_details_cache', placeId), payload);
  } catch {
    // Cache write failure is non-fatal — the detail screen already has the data
  }
}

/**
 * Fetch rich place data with Firestore caching.
 *
 * Returns `{ details, aiDescription, knownFor, vibe }` or partial data on
 * API failures. Callers should handle null gracefully.
 */
export async function fetchRichPlaceData(
  placeId: string,
  fallbackEditorialSummary?: string,
): Promise<{
  details: PlaceDetails | null;
  aiDescription: string;
  knownFor: string[];
  vibe: string;
}> {
  // 1. Check Firestore cache
  const cached = await readPlaceCache(placeId);
  if (cached) {
    return {
      details: {
        placeId: cached.place_id,
        name: cached.place_name,
        formattedAddress: cached.formatted_address,
        city: cached.city,
        phone: cached.phone,
        website: cached.website,
        rating: cached.rating,
        priceLevel: cached.price_level,
        openingHours: cached.opening_hours
          ? { openNow: cached.opening_hours.open_now, weekdayText: cached.opening_hours.weekday_text }
          : undefined,
        photoUrls: cached.photo_urls || [],
        photoRefs: [],
        types: cached.types || [],
        lat: cached.lat,
        lng: cached.lng,
        editorialSummary: cached.editorial_summary,
        mapsUrl: cached.maps_url,
      },
      aiDescription: cached.ai_description,
      knownFor: cached.known_for || [],
      vibe: cached.vibe || '',
    };
  }

  // 2. Fetch from Google Places API + OpenAI in parallel
  const [details, aiResult] = await Promise.all([
    fetchPlaceDetails(placeId),
    // We need details before calling OpenAI for best results; start with a
    // quick fire-and-forget using whatever basic info we have, then refine.
    Promise.resolve(null),
  ]);

  // 3. Generate AI description now that we have full place details
  let aiDescription = fallbackEditorialSummary || '';
  let knownFor: string[] = [];
  let vibe = '';

  if (details) {
    const aiRes = await generatePlaceDescription(
      details.name,
      details.formattedAddress,
      details.city || details.formattedAddress.split(',')[0],
      details.types,
      details.rating,
      details.priceLevel,
    );
    if (aiRes) {
      aiDescription = aiRes.description;
      knownFor = aiRes.knownFor;
      vibe = aiRes.vibe;
    } else {
      aiDescription = details.editorialSummary || fallbackEditorialSummary || '';
    }

    // 4. Cache the result (non-blocking)
    writePlaceCache(placeId, details, { description: aiDescription, knownFor, vibe });
  }

  return { details, aiDescription, knownFor, vibe };
}

/**
 * Upsert a place discovered via search into the `places` Firestore collection.
 * This grows the database organically from user searches.
 */
export async function upsertSearchedPlace(
  placeId: string,
  details: PlaceDetails,
  tripDestinationCity: string,
  userId?: string,
): Promise<void> {
  try {
    const ref = doc(db, 'places', placeId);
    const existing = await getDoc(ref);
    if (existing.exists()) return;
    await setDoc(ref, {
      place_id: placeId,
      name: details.name,
      formatted_address: details.formattedAddress,
      lat: details.lat,
      lng: details.lng,
      types: details.types,
      rating: details.rating ?? null,
      price_level: details.priceLevel ?? null,
      photo_url: details.photoUrls[0] ?? null,
      city: tripDestinationCity,
      source: 'user_search',
      added_by: userId ?? null,
      created_at: Date.now(),
    });
  } catch {
    // Non-fatal — place already exists or Firestore unavailable
  }
}
