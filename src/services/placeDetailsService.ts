import { collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { fetchPlaceDetails, PlaceDetails, PlaceResult } from './googlePlacesService';
import { generatePlaceDescription } from './openaiService';
import { FALLBACK_IMAGE } from '../constants';

/**
 * Query Firestore cache for suggested places by city and vibes.
 */
export async function getCachedSuggestedPlaces(
  city: string,
  vibes: string[],
  maxResults: number = 40,
): Promise<any[]> {
  // TEMPORARILY DEACTIVATED: Bypass cache to force direct API calls
  return [];

  try {
    const snap = await getDocs(collection(db, 'place_details_cache'));
    if (snap.empty) return [];
    
    const allPlaces = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
    
    // Filter by city — check if the place's city or formatted_address contains the destination
    const cityLower = city.toLowerCase().split(',')[0].trim();
    // If no city is provided, the cache cannot be used. Fall back to API.
    if (!cityLower) return [];
    const cityFiltered = allPlaces.filter(p => {
        const pCity = (p.city || '').toLowerCase();
        const pAddr = (p.formatted_address || '').toLowerCase();
        return pCity.includes(cityLower) || pAddr.includes(cityLower);
    });
    
    if (cityFiltered.length === 0) return [];
    
    // Filter out non-exploration place types
    const excluded = ['gas_station', 'convenience_store', 'atm', 'car_wash', 'car_repair', 'parking', 'storage', 'insurance_agency', 'real_estate_agency', 'funeral_home'];
    const cleaned = cityFiltered.filter(p => {
      const types = p.types || [];
      return !types.some((t: string) => excluded.includes(t));
    });
    
    // Score by vibe match
    const vibeTokens = vibes.flatMap(v => String(v).toLowerCase().split(/[^a-z0-9]+/g)).filter(t => t.length >= 3);
    
    const scored = cleaned.map(p => {
      let score = 0;
      if (vibeTokens.length > 0) {
        const haystack = [
          ...(p.types || []),
          p.ai_description || '',
          (p.known_for || []).join(' '),
          p.vibe || '',
          p.place_name || '',
        ].join(' ').toLowerCase();
        for (const token of vibeTokens) {
          if (haystack.includes(token)) score += 1;
        }
      }
      return { ...p, _score: score };
    });
    
    // Only keep places that actually matched at least one vibe token (if vibes were provided)
    const vibeMatched = vibeTokens.length > 0 ? scored.filter(p => p._score > 0) : scored;
    
    // Sort: vibe match first, then rating
    vibeMatched.sort((a, b) => {
      if (b._score !== a._score) return b._score - a._score;
      return (b.rating || 0) - (a.rating || 0);
    });
    
    // Map to PlaceResult shape expected by SuggestedPlacesScreen
    return vibeMatched.slice(0, maxResults).map(p => ({
      placeId: p.place_id || p.id,
      name: p.place_name || '',
      address: p.formatted_address || '',
      rating: p.rating || 4.0,
      description: p.ai_description || p.editorial_summary || p.types?.[0]?.replace(/_/g, ' ') || '',
      photoRef: '',
      photoUrl: (p.photo_urls && p.photo_urls.length > 0) ? p.photo_urls[0] : FALLBACK_IMAGE,
      photoUrls: p.photo_urls || [],
      coordinates: { lat: p.lat || 0, lng: p.lng || 0 },
      category: p.types?.[0]?.replace(/_/g, ' ') || 'place',
      types: p.types || [],
      city: p.city || city,
      distanceKm: undefined,
      walkMinutes: undefined,
      matchedTags: (p.known_for || []).slice(0, 2),
      opening_hours: p.opening_hours || undefined,
    }));
  } catch (e) {
    console.warn('[getCachedSuggestedPlaces] error:', e);
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
  // TEMPORARILY DEACTIVATED: Bypass cache to force direct API calls
  return null;

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
  // TEMPORARILY DEACTIVATED
  return;

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
  basicInfo?: { name: string; address: string; city: string; types: string[]; rating?: number; priceLevel?: number }
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
  // TEMPORARILY DEACTIVATED
  return;

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
