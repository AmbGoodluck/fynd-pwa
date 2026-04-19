/**
 * freePlacesService.ts
 *
 * Zero-cost places service replacing Google Places API + Firestore place caching.
 *
 * Architecture:
 *   User opens app → AsyncStorage local cache → (miss) → Overpass API (FREE)
 *                 → OpenAI AI descriptions ($0.01/city, first visit only)
 *                 → write to AsyncStorage
 *
 * No Firestore collections for places. No Google Places for discovery.
 * Everything lives on the user's device after the first fetch.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { generatePlaceDescription } from './openaiService';
import { FALLBACK_IMAGE } from '../constants';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FyndPlace {
  id: string;                     // "osm_{osm_id}"
  name: string;
  lat: number;
  lng: number;
  address: string;
  city: string;
  types: string[];                // Google-style type names for compatibility
  phone?: string;
  website?: string;
  opening_hours_raw?: string;     // Raw OSM hours string e.g. "Mo-Fr 09:00-17:00"
  photo_urls: string[];           // Category stock photos
  ai_description?: string;        // Generated on first visit
  known_for?: string[];
  vibe?: string;
  cuisine?: string;
  osm_tags: Record<string, string>; // Raw OSM tags for extra context
}

export interface CityCache {
  city_name: string;
  lat: number;
  lng: number;
  fetched_at: number;             // Unix timestamp
  places: FyndPlace[];
  ai_generated: boolean;          // Whether AI descriptions have been added
}

// ── Legacy OSMPlace type (kept for backwards compat with citySeedService) ─────

export interface OSMPlace {
  osm_id: number;
  name: string;
  lat: number;
  lng: number;
  amenity?: string;
  tourism?: string;
  leisure?: string;
  shop?: string;
  cuisine?: string;
  phone?: string;
  website?: string;
  opening_hours?: string;
  address: string;
  city: string;
  types: string[];
  rating?: number;
}

// ── Category Stock Photos ─────────────────────────────────────────────────────

const CATEGORY_PHOTOS: Record<string, string[]> = {
  restaurant: [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600',
  ],
  cafe: [
    'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600',
    'https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=600',
    'https://images.unsplash.com/photo-1559496417-e7f25cb247f3?w=600',
  ],
  bar: [
    'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600',
    'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=600',
  ],
  park: [
    'https://images.unsplash.com/photo-1588714477688-cf28a50e94f7?w=600',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600',
  ],
  museum: [
    'https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=600',
    'https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?w=600',
  ],
  library: [
    'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=600',
    'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600',
  ],
  gym: [
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600',
  ],
  store: [
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600',
    'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=600',
  ],
  bakery: [
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600',
  ],
  hotel: [
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600',
  ],
  movie_theater: [
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600',
  ],
  tourist_attraction: [
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600',
    'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=600',
  ],
  natural_feature: [
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600',
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600',
  ],
  campground: [
    'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600',
  ],
  night_club: [
    'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=600',
  ],
  hospital: [
    'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600',
  ],
  pharmacy: [
    'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=600',
  ],
  police: [
    'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600',
  ],
  bank: [
    'https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=600',
  ],
  default: [
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600',
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600',
  ],
};

// Also export for any code that still references the old constant name
export const CATEGORY_FALLBACK_PHOTOS: Record<string, string> = {
  restaurant: CATEGORY_PHOTOS.restaurant[0],
  cafe: CATEGORY_PHOTOS.cafe[0],
  bar: CATEGORY_PHOTOS.bar[0],
  park: CATEGORY_PHOTOS.park[0],
  museum: CATEGORY_PHOTOS.museum[0],
  library: CATEGORY_PHOTOS.library[0],
  gym: CATEGORY_PHOTOS.gym[0],
  store: CATEGORY_PHOTOS.store[0],
  hotel: CATEGORY_PHOTOS.hotel[0],
  movie_theater: CATEGORY_PHOTOS.movie_theater[0],
  bakery: CATEGORY_PHOTOS.bakery[0],
  tourist_attraction: CATEGORY_PHOTOS.tourist_attraction[0],
  natural_feature: CATEGORY_PHOTOS.natural_feature[0],
  campground: CATEGORY_PHOTOS.campground[0],
  night_club: CATEGORY_PHOTOS.night_club[0],
  bowling_alley: 'https://images.unsplash.com/photo-1545232979-8bf68ee9b1af?w=600',
  point_of_interest: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600',
  default: CATEGORY_PHOTOS.default[0],
};

function getPhotoForPlace(types: string[], placeIndex: number): string[] {
  for (const type of types) {
    const photos = CATEGORY_PHOTOS[type];
    if (photos && photos.length > 0) {
      return [photos[placeIndex % photos.length]];
    }
  }
  const fallback = CATEGORY_PHOTOS.default;
  return [fallback[placeIndex % fallback.length]];
}

/** Legacy helper — returns single photo URL for a type list */
export function getCategoryPhoto(types: string[]): string {
  return getPhotoForPlace(types, 0)[0];
}

// ── OSM Type Map ──────────────────────────────────────────────────────────────

const OSM_TYPE_MAP: Record<string, string[]> = {
  restaurant: ['restaurant', 'food'],
  cafe: ['cafe', 'food'],
  bar: ['bar'],
  pub: ['bar'],
  fast_food: ['restaurant', 'meal_takeaway'],
  ice_cream: ['bakery', 'food'],
  bakery: ['bakery', 'food'],
  food_court: ['restaurant', 'food'],
  biergarten: ['bar'],
  nightclub: ['night_club', 'bar'],
  library: ['library'],
  arts_centre: ['art_gallery', 'museum'],
  cinema: ['movie_theater'],
  theatre: ['performing_arts_theater'],
  community_centre: ['community_center'],
  gym: ['gym'],
  fitness_centre: ['gym'],
  pharmacy: ['pharmacy'],
  hospital: ['hospital'],
  police: ['police'],
  bank: ['bank'],
  atm: ['atm'],
  museum: ['museum', 'tourist_attraction'],
  gallery: ['art_gallery'],
  viewpoint: ['tourist_attraction', 'natural_feature'],
  attraction: ['tourist_attraction'],
  picnic_site: ['park'],
  camp_site: ['campground'],
  hotel: ['lodging'],
  motel: ['lodging'],
  hostel: ['lodging'],
  information: ['tourist_attraction'],
  park: ['park'],
  garden: ['park'],
  nature_reserve: ['park', 'natural_feature'],
  playground: ['park'],
  sports_centre: ['gym'],
  swimming_pool: ['gym'],
  golf_course: ['park'],
  bowling_alley: ['bowling_alley'],
  stadium: ['stadium'],
  supermarket: ['supermarket', 'store'],
  convenience: ['convenience_store', 'store'],
  clothes: ['clothing_store', 'store'],
  books: ['book_store', 'store'],
  gift: ['store'],
  antiques: ['store'],
  charity: ['store'],
  second_hand: ['store'],
  mall: ['shopping_mall'],
  department_store: ['department_store', 'store'],
  coffee: ['cafe'],
  bureau_de_change: ['bank'],
  toilets: ['establishment'],
  bus_station: ['transit_station'],
  bus_stop: ['transit_station'],
  taxi: ['transit_station'],
  railway_station: ['transit_station'],
  embassy: ['local_government_office'],
  fuel: ['gas_station'],
  clinic: ['hospital'],
  doctors: ['hospital'],
};

// ── Overpass API ──────────────────────────────────────────────────────────────

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

function buildOverpassQuery(lat: number, lng: number, radiusMeters: number): string {
  return `
    [out:json][timeout:25];
    (
      node["amenity"~"restaurant|cafe|bar|pub|fast_food|ice_cream|bakery|food_court|biergarten|nightclub|library|arts_centre|cinema|theatre|community_centre|gym|fitness_centre|pharmacy|hospital|police|bank|atm"](around:${radiusMeters},${lat},${lng});
      node["tourism"~"museum|gallery|viewpoint|attraction|picnic_site|camp_site|hotel|motel|hostel|information"](around:${radiusMeters},${lat},${lng});
      node["leisure"~"park|garden|nature_reserve|playground|sports_centre|fitness_centre|swimming_pool|golf_course|bowling_alley|stadium"](around:${radiusMeters},${lat},${lng});
      node["shop"~"supermarket|convenience|clothes|books|gift|antiques|charity|second_hand|mall|department_store|bakery|coffee"](around:${radiusMeters},${lat},${lng});
      way["amenity"~"restaurant|cafe|bar|pub|fast_food|library|arts_centre|cinema|theatre|community_centre|hospital|pharmacy|police"](around:${radiusMeters},${lat},${lng});
      way["tourism"~"museum|gallery|attraction|hotel"](around:${radiusMeters},${lat},${lng});
      way["leisure"~"park|garden|nature_reserve|sports_centre|stadium"](around:${radiusMeters},${lat},${lng});
    );
    out center body;
  `;
}

export async function fetchPlacesFromOSM(
  lat: number,
  lng: number,
  radiusKm: number = 30,
  cityName: string = '',
): Promise<FyndPlace[]> {
  const query = buildOverpassQuery(lat, lng, radiusKm * 1000);

  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!response.ok) throw new Error(`Overpass API error: ${response.status}`);

  const data = await response.json();
  const elements = data.elements || [];

  const seen = new Map<string, boolean>();
  const places: FyndPlace[] = [];

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    const tags = el.tags || {};
    const name = tags.name;
    if (!name) continue;

    const elLat = el.lat || el.center?.lat;
    const elLng = el.lon || el.center?.lon;
    if (!elLat || !elLng) continue;

    const key = name.toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.set(key, true);

    const primaryTag = tags.amenity || tags.tourism || tags.leisure || tags.shop || '';
    const types = OSM_TYPE_MAP[primaryTag] || ['point_of_interest'];

    const addrParts = [
      tags['addr:housenumber'],
      tags['addr:street'],
      tags['addr:city'] || cityName,
      tags['addr:state'],
      tags['addr:postcode'],
    ].filter(Boolean);

    places.push({
      id: `osm_${el.id}`,
      name,
      lat: elLat,
      lng: elLng,
      address: addrParts.length > 0 ? addrParts.join(', ') : cityName,
      city: tags['addr:city'] || cityName,
      types,
      phone: tags.phone || tags['contact:phone'],
      website: tags.website || tags['contact:website'],
      opening_hours_raw: tags.opening_hours,
      photo_urls: getPhotoForPlace(types, i),
      cuisine: tags.cuisine,
      osm_tags: tags,
    });
  }

  return places;
}

/** Legacy export — maps OSMPlace shape from old fetchOSMPlaces calls */
export async function fetchOSMPlaces(
  lat: number,
  lng: number,
  radiusKm: number = 30,
  cityName: string = '',
): Promise<OSMPlace[]> {
  const places = await fetchPlacesFromOSM(lat, lng, radiusKm, cityName);
  return places.map(p => ({
    osm_id: Number(p.id.replace('osm_', '')),
    name: p.name,
    lat: p.lat,
    lng: p.lng,
    amenity: p.osm_tags?.amenity,
    tourism: p.osm_tags?.tourism,
    leisure: p.osm_tags?.leisure,
    shop: p.osm_tags?.shop,
    cuisine: p.cuisine,
    phone: p.phone,
    website: p.website,
    opening_hours: p.opening_hours_raw,
    address: p.address,
    city: p.city,
    types: p.types,
    rating: undefined,
  }));
}

// ── AsyncStorage Cache ────────────────────────────────────────────────────────

const CACHE_PREFIX = 'fynd_city_';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getCacheKey(lat: number, lng: number): string {
  // Round to 1 decimal place — groups nearby coordinates (~10km) to same cache entry
  const roundedLat = Math.round(lat * 10) / 10;
  const roundedLng = Math.round(lng * 10) / 10;
  return `${CACHE_PREFIX}${roundedLat}_${roundedLng}`;
}

export async function getCachedCity(lat: number, lng: number): Promise<CityCache | null> {
  try {
    const key = getCacheKey(lat, lng);
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;

    const cache: CityCache = JSON.parse(raw);

    if (Date.now() - cache.fetched_at > CACHE_TTL_MS) {
      await AsyncStorage.removeItem(key);
      return null;
    }

    return cache;
  } catch {
    return null;
  }
}

export async function setCachedCity(lat: number, lng: number, cache: CityCache): Promise<void> {
  try {
    const key = getCacheKey(lat, lng);
    await AsyncStorage.setItem(key, JSON.stringify(cache));
  } catch {
    // Storage full or unavailable — non-fatal
  }
}

export async function updateCachedCityPlaces(lat: number, lng: number, places: FyndPlace[]): Promise<void> {
  const cache = await getCachedCity(lat, lng);
  if (!cache) return;
  cache.places = places;
  cache.ai_generated = true;
  await setCachedCity(lat, lng, cache);
}

// ── AI Descriptions (background) ─────────────────────────────────────────────

async function addAIDescriptions(places: FyndPlace[], cityName: string): Promise<FyndPlace[]> {
  const toGenerate = places.slice(0, 40);
  const rest = places.slice(40);
  const enriched: FyndPlace[] = [];

  for (let i = 0; i < toGenerate.length; i += 5) {
    const batch = toGenerate.slice(i, i + 5);
    const results = await Promise.allSettled(
      batch.map(async (place) => {
        if (place.ai_description) return place;
        try {
          const result = await generatePlaceDescription(
            place.name,
            place.address,
            cityName,
            place.types,
            undefined,
            undefined,
          );
          if (result) {
            return {
              ...place,
              ai_description: result.description,
              known_for: result.knownFor,
              vibe: result.vibe,
            };
          }
        } catch {
          // AI generation failed — return place without description
        }
        return place;
      })
    );

    for (const result of results) {
      enriched.push(result.status === 'fulfilled' ? result.value : batch[enriched.length % batch.length]);
    }

    if (i + 5 < toGenerate.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  return [...enriched, ...rest];
}

// ── Haversine ─────────────────────────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Vibe → OSM type synonyms ──────────────────────────────────────────────────
// Maps plain-English vibe tokens (from CreateTripScreen keywords) to the
// Google-style type names stored in FyndPlace.types. This lets the scorer
// give a type-level hit even before AI descriptions are generated.

const VIBE_SYNONYMS: Record<string, string[]> = {
  // Nature / outdoors
  outdoor:        ['park', 'natural_feature', 'campground', 'tourist_attraction'],
  outdoors:       ['park', 'natural_feature', 'campground'],
  nature:         ['park', 'natural_feature', 'campground'],
  garden:         ['park', 'natural_feature'],
  trail:          ['park', 'natural_feature'],
  hiking:         ['park', 'natural_feature', 'campground'],
  hike:           ['park', 'natural_feature', 'campground'],
  scenic:         ['natural_feature', 'tourist_attraction', 'park'],
  viewpoint:      ['natural_feature', 'tourist_attraction'],
  campground:     ['campground'],
  adventure:      ['park', 'campground', 'tourist_attraction', 'natural_feature', 'bowling_alley'],
  // Arts / culture
  culture:        ['museum', 'art_gallery', 'tourist_attraction', 'performing_arts_theater'],
  cultural:       ['museum', 'art_gallery', 'tourist_attraction'],
  art:            ['art_gallery', 'museum'],
  gallery:        ['art_gallery'],
  museum:         ['museum', 'tourist_attraction'],
  historical:     ['museum', 'tourist_attraction'],
  historic:       ['museum', 'tourist_attraction'],
  heritage:       ['museum', 'tourist_attraction'],
  landmark:       ['tourist_attraction'],
  monument:       ['tourist_attraction'],
  // Photography
  photography:    ['natural_feature', 'tourist_attraction', 'park', 'art_gallery'],
  // Music / entertainment
  music:          ['night_club', 'bar', 'performing_arts_theater'],
  concert:        ['night_club', 'performing_arts_theater'],
  venue:          ['night_club', 'performing_arts_theater', 'bar'],
  festival:       ['tourist_attraction', 'park'],
  entertainment:  ['movie_theater', 'night_club', 'performing_arts_theater', 'bowling_alley'],
  // Nightlife
  nightlife:      ['bar', 'night_club'],
  nightclub:      ['night_club'],
  lounge:         ['bar', 'night_club'],
  pub:            ['bar'],
  // Food / dining
  dining:         ['restaurant', 'food'],
  restaurant:     ['restaurant', 'food'],
  food:           ['restaurant', 'cafe', 'bakery', 'food'],
  cafe:           ['cafe'],
  coffee:         ['cafe'],
  bakery:         ['bakery'],
  // Shopping
  shopping:       ['store', 'shopping_mall', 'clothing_store'],
  boutique:       ['store', 'clothing_store'],
  market:         ['store', 'shopping_mall'],
  mall:           ['shopping_mall'],
  // Wellness / sports
  wellness:       ['gym'],
  yoga:           ['gym'],
  spa:            ['gym'],
  sports:         ['gym', 'stadium'],
  stadium:        ['stadium'],
  recreation:     ['park', 'gym', 'bowling_alley'],
  // Accommodation
  hotel:          ['lodging'],
  lodging:        ['lodging'],
};

// Expand raw vibe keyword string tokens into a de-duped set that includes
// both the original tokens AND their mapped OSM type synonyms.
function expandVibeTokens(vibeFilter: string[]): string[] {
  const rawTokens = vibeFilter
    .flatMap(v => v.toLowerCase().split(/[^a-z0-9]+/g))
    .filter(t => t.length >= 3);

  const expanded = new Set<string>(rawTokens);
  for (const token of rawTokens) {
    const mapped = VIBE_SYNONYMS[token];
    if (mapped) {
      for (const t of mapped) expanded.add(t.replace(/_/g, ' ')); // "night_club" → "night club" for text match
      for (const t of mapped) expanded.add(t); // keep raw for type comparison
    }
  }
  return Array.from(expanded);
}

// Score a place against the expanded token list.
// Type match (exact) = 3 pts, type match (substring) = 2 pts, text match = 1 pt.
function scorePlace(place: FyndPlace, tokens: string[]): number {
  const placeTypes = (place.types || []).map(t => t.toLowerCase());
  const textHaystack = [
    place.ai_description || '',
    (place.known_for || []).join(' '),
    place.vibe || '',
    place.cuisine || '',
    place.name,
  ].join(' ').toLowerCase();

  let score = 0;
  for (const token of tokens) {
    if (placeTypes.includes(token)) {
      score += 3; // exact type match — strongest signal
    } else if (placeTypes.some(t => t.includes(token) || token.includes(t))) {
      score += 2; // partial type match
    } else if (textHaystack.includes(token)) {
      score += 1; // text / AI description match
    }
  }
  return score;
}

// ── Filter & Sort ─────────────────────────────────────────────────────────────

const MIN_VIBE_RESULTS = 8; // fall back to all places if fewer than this many matches

function filterAndSort(
  places: FyndPlace[],
  vibeFilter: string[],
  excludeTypes: string[],
  limit: number,
  originLat?: number,
  originLng?: number,
  maxDistanceKm?: number,
): FyndPlace[] {
  // 1. Remove utility/non-exploration types
  let filtered = places.filter(p => !p.types.some(t => excludeTypes.includes(t)));

  // 2. Distance cutoff — filter to user's requested radius
  if (originLat !== undefined && originLng !== undefined && maxDistanceKm) {
    const nearby = filtered.filter(p => haversineKm(originLat, originLng, p.lat, p.lng) <= maxDistanceKm);
    // If the radius is very tight and returns almost nothing, relax it gracefully
    if (nearby.length >= 3) {
      filtered = nearby;
    }
  }

  // 3. Vibe scoring — requires matching at least one token to appear in results
  if (vibeFilter.length > 0) {
    const tokens = expandVibeTokens(vibeFilter);

    if (tokens.length > 0) {
      const scored = filtered.map(p => ({ place: p, score: scorePlace(p, tokens) }));

      scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.place.name.localeCompare(b.place.name);
      });

      // Only return places with at least one token match.
      // If not enough match (new city, no AI yet), fall back to full sorted list.
      const matching = scored.filter(s => s.score > 0);
      filtered = matching.length >= MIN_VIBE_RESULTS
        ? matching.map(s => s.place)
        : scored.map(s => s.place);
    }
  }

  return filtered.slice(0, limit);
}

// ── Main Entry Point ──────────────────────────────────────────────────────────

export async function getPlacesForLocation(
  lat: number,
  lng: number,
  cityName: string,
  options?: {
    radiusKm?: number;
    generateAI?: boolean;
    vibeFilter?: string[];
    excludeTypes?: string[];
    limit?: number;
  },
): Promise<FyndPlace[]> {
  const {
    radiusKm = 30,
    generateAI = true,
    vibeFilter = [],
    excludeTypes = ['atm', 'convenience_store', 'gas_station', 'supermarket', 'fast_food', 'meal_takeaway', 'fuel', 'car_wash', 'car_repair', 'parking', 'bank'],
    limit = 60,
  } = options || {};

  // Cache is always populated at full radius (30km) so any smaller radius
  // request can be served from the same cache entry via post-filter.
  const FETCH_RADIUS_KM = 30;

  // 1. Check local cache
  const cached = await getCachedCity(lat, lng);
  if (cached && cached.places.length > 0) {
    if (generateAI && !cached.ai_generated) {
      // Fire-and-forget AI enrichment
      addAIDescriptions(cached.places, cityName).then(async (enriched) => {
        await updateCachedCityPlaces(lat, lng, enriched);
      }).catch(console.error);
    }
    return filterAndSort(cached.places, vibeFilter, excludeTypes, limit, lat, lng, radiusKm);
  }

  // 2. Fetch from OSM at full radius (always 30km for cache completeness)
  const osmPlaces = await fetchPlacesFromOSM(lat, lng, FETCH_RADIUS_KM, cityName);

  if (osmPlaces.length === 0) {
    return [];
  }

  // 3. Save to local cache immediately (without AI descriptions)
  const initialCache: CityCache = {
    city_name: cityName,
    lat,
    lng,
    fetched_at: Date.now(),
    places: osmPlaces,
    ai_generated: false,
  };
  await setCachedCity(lat, lng, initialCache);

  // 4. Generate AI descriptions in the background (don't block UI)
  if (generateAI) {
    addAIDescriptions(osmPlaces, cityName).then(async (enriched) => {
      await updateCachedCityPlaces(lat, lng, enriched);
    }).catch(console.error);
  }

  // 5. Return filtered + sorted results (applying distance cutoff for requested radius)
  return filterAndSort(osmPlaces, vibeFilter, excludeTypes, limit, lat, lng, radiusKm);
}

// ── PlaceResult Mapper ────────────────────────────────────────────────────────

export function fyndPlaceToPlaceResult(place: FyndPlace): any {
  return {
    placeId: place.id,
    name: place.name,
    address: place.address,
    rating: undefined,
    description: place.ai_description || place.types[0]?.replace(/_/g, ' ') || '',
    photoRef: '',
    photoUrl: place.photo_urls[0] || FALLBACK_IMAGE,
    photoUrls: place.photo_urls,
    coordinates: { lat: place.lat, lng: place.lng },
    category: place.types[0]?.replace(/_/g, ' ') || 'place',
    types: place.types,
    city: place.city,
    distanceKm: undefined,
    walkMinutes: undefined,
    matchedTags: place.known_for?.slice(0, 2),
    opening_hours: place.opening_hours_raw
      ? { weekday_text: [place.opening_hours_raw] }
      : undefined,
  };
}

// ── ServiceHub Free Search ────────────────────────────────────────────────────

const SERVICEHUB_OSM_TAGS: Record<string, string> = {
  'Medical':           'hospital|clinic|doctors',
  'Currency Exchange': 'bureau_de_change|bank',
  'Public Bathrooms':  'toilets',
  'Transport':         'bus_station|bus_stop|taxi|railway_station',
  'Police':            'police',
  'Embassy':           'embassy',
  'ATM':               'atm',
  'Pharmacy':          'pharmacy',
  'Hotel':             'hotel|motel|hostel',
  'Tourist Info':      'information',
  'Gas Station':       'fuel',
};

export async function searchNearbyFree(
  lat: number,
  lng: number,
  category: string,
  radiusKm: number = 5,
): Promise<FyndPlace[]> {
  const osmTag = SERVICEHUB_OSM_TAGS[category];
  if (!osmTag) return [];

  const radiusMeters = radiusKm * 1000;
  const query = `
    [out:json][timeout:15];
    node["amenity"~"${osmTag}"](around:${radiusMeters},${lat},${lng});
    out body;
  `;

  try {
    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) return [];
    const data = await response.json();

    return (data.elements || [])
      .filter((el: any) => el.tags?.name)
      .slice(0, 15)
      .map((el: any, i: number) => {
        const tags = el.tags || {};
        const primaryTag = tags.amenity || tags.tourism || '';
        const types = OSM_TYPE_MAP[primaryTag] || ['point_of_interest'];
        return {
          id: `osm_${el.id}`,
          name: tags.name,
          lat: el.lat,
          lng: el.lon,
          address: [tags['addr:street'], tags['addr:city']].filter(Boolean).join(', ') || '',
          city: tags['addr:city'] || '',
          types,
          phone: tags.phone || tags['contact:phone'],
          website: tags.website,
          opening_hours_raw: tags.opening_hours,
          photo_urls: getPhotoForPlace(types, i),
          osm_tags: tags,
        } as FyndPlace;
      });
  } catch {
    return [];
  }
}

// ── Reverse Geocode (Nominatim — free) ───────────────────────────────────────

export async function reverseGeocodeFree(lat: number, lng: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10&addressdetails=1`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'FyndApp/1.0 (contact@fyndplaces.com)' }, // Required by Nominatim TOS
    });
    if (!response.ok) return 'My Location';
    const data = await response.json();
    return (
      data.address?.city ||
      data.address?.town ||
      data.address?.village ||
      data.address?.county ||
      'My Location'
    );
  } catch {
    return 'My Location';
  }
}

// ── Legacy helpers (used by citySeedService — kept for backwards compat) ──────

export async function resolvePhoto(
  _placeName: string,
  _lat: number,
  _lng: number,
  types: string[],
): Promise<string[]> {
  return [getCategoryPhoto(types)];
}

export function parseOSMHours(osmHours: string | undefined): {
  open_now?: boolean;
  weekday_text?: string[];
} | undefined {
  if (!osmHours) return undefined;
  return { weekday_text: [osmHours] };
}
