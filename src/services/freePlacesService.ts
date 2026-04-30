/**
 * freePlacesService.ts
 *
 * Places service powered by Foursquare Places API (100M+ POIs, real photos, ratings).
 *
 * Architecture:
 *   User opens app → Foursquare API fetch
 *                 → OpenAI AI descriptions (background, first visit only)
 *
 * No OSM/Overpass. No Google Places for discovery.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { generatePlaceDescription } from './openaiService';
import { FALLBACK_IMAGE } from '../constants';

// ── Cache clearing on module load ─────────────────────────────────────────────

async function clearOldCaches() {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const fyndKeys = allKeys.filter(k => k.startsWith('fynd_'));
    if (fyndKeys.length > 0) {
      await AsyncStorage.multiRemove(fyndKeys);
      console.log('[freePlaces] Cleared', fyndKeys.length, 'old cache entries');
    }
  } catch {}
}
clearOldCaches();

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FyndPlace {
  id: string;                        // "fsq_{fsq_id}"
  name: string;
  lat: number;
  lng: number;
  address: string;
  city: string;
  types: string[];                   // Google-style type names for compatibility
  phone?: string;
  website?: string;
  opening_hours_raw?: string;
  photo_urls: string[];              // Foursquare real photos or FALLBACK_IMAGE
  ai_description?: string;
  known_for?: string[];
  vibe?: string;
  cuisine?: string;
  osm_tags?: Record<string, string>; // Kept for interface compatibility (unused)
  rating?: number;                   // 0-5 scale (Foursquare 0-10 → /2)
  fsq_tips?: string;
  distance_meters?: number;
}

export interface CityCache {
  city_name: string;
  lat: number;
  lng: number;
  fetched_at: number;
  places: FyndPlace[];
  ai_generated: boolean;
}

/** Legacy export — some callers may reference this; now just returns FALLBACK_IMAGE */
export function getCategoryPhoto(_types: string[]): string {
  return FALLBACK_IMAGE;
}

/** Legacy export */
export const CATEGORY_FALLBACK_PHOTOS: Record<string, string> = {};

// ── Foursquare API ────────────────────────────────────────────────────────────

const FSQ_API_KEY = process.env.EXPO_PUBLIC_FOURSQUARE_API_KEY || '';
const FSQ_BASE_URL = 'https://api.foursquare.com/v3';

const fsqHeaders = {
  'Authorization': `Bearer ${FSQ_API_KEY}`,
  'Accept': 'application/json',
};

export const FSQ_CATEGORIES: Record<string, string> = {
  restaurant: '13065', cafe: '13032', coffee: '13032', bar: '13003',
  bakery: '13002', fast_food: '13145', ice_cream: '13046', dessert: '13040',
  brunch: '13065', night_club: '10032', lounge: '13025', brewery: '13029',
  park: '16032', trail: '16038', garden: '16019', nature: '16027',
  campground: '16004', beach: '16001', lake: '16024', playground: '16033',
  museum: '10027', art_gallery: '10004', theater: '10024',
  store: '17000', thrift: '17088', mall: '17114', bookstore: '17018',
  hospital: '15014', pharmacy: '15027', police: '12072', bank: '11002',
  atm: '11001', gas_station: '19007', bus_station: '19042', gym: '18021',
  library: '12054', hotel: '19014', coworking: '11068',
};

const SERVICEHUB_FSQ_CATEGORIES: Record<string, string> = {
  'Medical':           '15014,15000',
  'Currency':          '11002,11001',
  'Currency Exchange': '11002,11001',
  'Public Bathrooms':  '12000',
  'Transport':         '19042,19043,19040',
  'Police':            '12072',
  'Embassy':           '12032',
  'ATM':               '11001',
  'ATM / Bank':        '11001,11002',
  'Pharmacy':          '15027',
  'Hotel':             '19014,19009',
  'Tourist Info':      '16000',
  'Gas Station':       '19007',
  'Emergency':         '15014,12072',
  'Safety':            '12072',
};

function formatFoursquareHours(hours: any): string | undefined {
  if (!hours?.display) return undefined;
  return hours.display;
}

export async function fetchPlacesFromFoursquare(
  lat: number,
  lng: number,
  radiusKm: number = 30,
  cityName: string = '',
  categories?: string[],
): Promise<FyndPlace[]> {
  console.log('[FSQ] API Key present:', !!FSQ_API_KEY, 'Key length:', FSQ_API_KEY.length);

  if (!FSQ_API_KEY) {
    console.error('[FSQ] NO API KEY — cannot fetch places');
    return [];
  }

  try {
    const params = new URLSearchParams({
      ll: `${lat},${lng}`,
      radius: `${Math.min(radiusKm * 1000, 50000)}`,
      limit: '50',
      sort: 'RELEVANCE',
      fields: 'fsq_id,name,location,categories,distance,geocodes,hours,tel,website,rating,photos,tips,price,popularity',
    });

    if (categories && categories.length > 0) {
      params.set('categories', categories.join(','));
    }

    const url = `${FSQ_BASE_URL}/places/search?${params.toString()}`;
    console.log('[FSQ] Fetching URL:', url);

    const response = await fetch(url, { headers: fsqHeaders });
    console.log('[FSQ] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[FSQ] Error response:', response.status, errorText);
      return [];
    }

    const data = await response.json();
    console.log('[FSQ] Results count:', data.results?.length || 0);

    const results = data.results || [];

    return results.map((place: any) => {
      const photos = (place.photos || []).map((p: any) =>
        `${p.prefix}${p.width || 600}x${p.height || 400}${p.suffix}`
      );

      const types = (place.categories || []).map((cat: any) =>
        (cat.short_name || cat.name || '').toLowerCase().replace(/\s+/g, '_')
      );

      const broadTypes: string[] = [];
      for (const cat of place.categories || []) {
        const catId = String(cat.id);
        if (catId.startsWith('130')) broadTypes.push('restaurant', 'food');
        if (catId.startsWith('100')) broadTypes.push('bar', 'night_club');
        if (catId.startsWith('160')) broadTypes.push('park', 'natural_feature');
        if (catId.startsWith('170')) broadTypes.push('store');
        if (catId.startsWith('150')) broadTypes.push('hospital');
        if (catId.startsWith('180')) broadTypes.push('gym');
        if (catId.startsWith('120')) broadTypes.push('library', 'point_of_interest');
        if (catId.startsWith('190')) broadTypes.push('lodging');
        if (catId === '13032') broadTypes.push('cafe');
        if (catId === '13003') broadTypes.push('bar');
        if (catId === '10027') broadTypes.push('museum', 'tourist_attraction');
        if (catId === '10004') broadTypes.push('art_gallery');
      }

      const allTypes = [...new Set([...types, ...broadTypes])];
      if (allTypes.length === 0) allTypes.push('point_of_interest');

      const loc = place.location || {};
      const address = loc.formatted_address ||
        [loc.address, loc.locality, loc.region, loc.postcode].filter(Boolean).join(', ') ||
        cityName;

      const tipText = place.tips?.[0]?.text || '';

      return {
        id: `fsq_${place.fsq_id}`,
        name: place.name || '',
        lat: place.geocodes?.main?.latitude || lat,
        lng: place.geocodes?.main?.longitude || lng,
        address,
        city: loc.locality || loc.region || cityName,
        types: allTypes,
        phone: place.tel,
        website: place.website,
        opening_hours_raw: formatFoursquareHours(place.hours),
        photo_urls: photos.length > 0 ? photos : [FALLBACK_IMAGE],
        cuisine: (place.categories || []).map((c: any) => c.short_name || c.name).join(', '),
        rating: place.rating ? Math.round(place.rating) / 2 : undefined,
        fsq_tips: tipText || undefined,
        distance_meters: place.distance,
      } as FyndPlace;
    });
  } catch (error) {
    console.error('[FSQ] Fetch error:', error);
    return [];
  }
}

// ── AsyncStorage Cache ────────────────────────────────────────────────────────

const CACHE_VERSION = 'v2_fsq';
const CACHE_PREFIX = `fynd_${CACHE_VERSION}_`;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getCacheKey(lat: number, lng: number): string {
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
  const toGen = places.slice(0, 40);
  const rest = places.slice(40);
  const enriched: FyndPlace[] = [];

  for (let i = 0; i < toGen.length; i += 5) {
    const batch = toGen.slice(i, i + 5);
    const results = await Promise.allSettled(
      batch.map(async (place) => {
        if (place.ai_description) return place;
        try {
          const extraContext = [
            place.fsq_tips ? `User tip: "${place.fsq_tips}"` : '',
            place.rating    ? `Rating: ${place.rating}/5`       : '',
            place.cuisine   ? `Cuisine: ${place.cuisine}`       : '',
          ].filter(Boolean).join('. ');

          const result = await generatePlaceDescription(
            place.name,
            place.address,
            cityName,
            place.types,
            place.rating ? place.rating * 2 : undefined,
            undefined,
            extraContext || undefined,
          );
          if (result) {
            return { ...place, ai_description: result.description, known_for: result.knownFor, vibe: result.vibe };
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

    if (i + 5 < toGen.length) {
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

// ── Vibe → type synonyms ──────────────────────────────────────────────────────

const VIBE_SYNONYMS: Record<string, string[]> = {
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
  photography:    ['natural_feature', 'tourist_attraction', 'park', 'art_gallery'],
  music:          ['night_club', 'bar', 'performing_arts_theater'],
  concert:        ['night_club', 'performing_arts_theater'],
  venue:          ['night_club', 'performing_arts_theater', 'bar'],
  festival:       ['tourist_attraction', 'park'],
  entertainment:  ['movie_theater', 'night_club', 'performing_arts_theater', 'bowling_alley'],
  nightlife:      ['bar', 'night_club'],
  nightclub:      ['night_club'],
  lounge:         ['bar', 'night_club'],
  pub:            ['bar'],
  dining:         ['restaurant', 'food'],
  restaurant:     ['restaurant', 'food'],
  food:           ['restaurant', 'cafe', 'bakery', 'food'],
  cafe:           ['cafe'],
  coffee:         ['cafe'],
  bakery:         ['bakery'],
  shopping:       ['store', 'shopping_mall', 'clothing_store'],
  boutique:       ['store', 'clothing_store'],
  market:         ['store', 'shopping_mall'],
  mall:           ['shopping_mall'],
  wellness:       ['gym'],
  yoga:           ['gym'],
  spa:            ['gym'],
  sports:         ['gym', 'stadium'],
  stadium:        ['stadium'],
  recreation:     ['park', 'gym', 'bowling_alley'],
  hotel:          ['lodging'],
  lodging:        ['lodging'],
};

function expandVibeTokens(vibeFilter: string[]): string[] {
  const rawTokens = vibeFilter
    .flatMap(v => v.toLowerCase().split(/[^a-z0-9]+/g))
    .filter(t => t.length >= 3);

  const expanded = new Set<string>(rawTokens);
  for (const token of rawTokens) {
    const mapped = VIBE_SYNONYMS[token];
    if (mapped) {
      for (const t of mapped) expanded.add(t.replace(/_/g, ' '));
      for (const t of mapped) expanded.add(t);
    }
  }
  return Array.from(expanded);
}

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
      score += 3;
    } else if (placeTypes.some(t => t.includes(token) || token.includes(t))) {
      score += 2;
    } else if (textHaystack.includes(token)) {
      score += 1;
    }
  }
  return score;
}

// ── Chain Detection ───────────────────────────────────────────────────────────

const CHAIN_KEYWORDS = [
  'mcdonald', 'burger king', 'wendy', 'taco bell', 'subway', 'domino',
  'pizza hut', 'papa john', 'little caesars', 'sonic', 'arby', 'hardee',
  'chick-fil-a', 'popeyes', 'kfc', 'dunkin', 'starbucks', 'red lobster',
  'olive garden', 'applebee', "chili's", 'ihop', 'denny', 'waffle house',
  'cracker barrel', 'dollar general', 'dollar tree', 'walmart', 'target',
  'walgreens', 'cvs', 'save-a-lot', 'aldi', 'kroger', 'shell', 'bp',
  'speedway', 'circle k', 'marathon', 'valero',
  'outback', 'golden corral', 'panera', 'chipotle', 'five guys', "zaxby's",
  'cook out', 'firehouse subs', "jersey mike's", "jimmy john's",
  'panda express', "raising cane's", 'wingstop', 'tropical smoothie', 'smoothie king',
];

function isChain(name: string): boolean {
  const lower = name.toLowerCase();
  return CHAIN_KEYWORDS.some(c => lower.includes(c));
}

// ── Filter & Sort ─────────────────────────────────────────────────────────────

const MIN_VIBE_RESULTS = 8;

function filterAndSort(
  places: FyndPlace[],
  vibeFilter: string[],
  excludeTypes: string[],
  limit: number,
  originLat?: number,
  originLng?: number,
  maxDistanceKm?: number,
): FyndPlace[] {
  let filtered = places.filter(p => !p.types.some(t => excludeTypes.includes(t)));

  if (originLat !== undefined && originLng !== undefined && maxDistanceKm) {
    const nearby = filtered.filter(p => haversineKm(originLat, originLng, p.lat, p.lng) <= maxDistanceKm);
    if (nearby.length >= 3) {
      filtered = nearby;
    }
  }

  if (vibeFilter.length > 0) {
    const tokens = expandVibeTokens(vibeFilter);

    if (tokens.length > 0) {
      const scored = filtered.map(p => ({ place: p, score: scorePlace(p, tokens) }));

      scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.place.name.localeCompare(b.place.name);
      });

      const matching = scored.filter(s => s.score > 0);
      filtered = matching.length >= MIN_VIBE_RESULTS
        ? matching.map(s => s.place)
        : scored.map(s => s.place);
    }
  }

  filtered.sort((a, b) => {
    const aChain = isChain(a.name) ? 1 : 0;
    const bChain = isChain(b.name) ? 1 : 0;
    return aChain - bChain;
  });

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
    excludeTypes = ['atm', 'convenience_store', 'gas_station', 'supermarket', 'fast_food', 'meal_takeaway', 'fuel', 'car_wash', 'car_repair', 'parking', 'bank', 'pharmacy'],
    limit = 60,
  } = options || {};

  // ALWAYS fetch from Foursquare — no cache for now
  console.log('[freePlaces] Fetching from Foursquare for', cityName, 'at', lat, lng);
  const places = await fetchPlacesFromFoursquare(lat, lng, radiusKm, cityName);
  console.log('[freePlaces] Foursquare returned', places.length, 'places');

  if (places.length === 0) return [];

  if (generateAI) {
    addAIDescriptions(places, cityName).then(() => {}).catch(console.error);
  }

  return filterAndSort(places, vibeFilter, excludeTypes, limit, lat, lng, radiusKm);
}

// ── PlaceResult Mapper ────────────────────────────────────────────────────────

export function fyndPlaceToPlaceResult(place: FyndPlace): any {
  return {
    placeId: place.id,
    name: place.name,
    address: place.address,
    rating: place.rating,
    description: place.ai_description || place.cuisine || place.types[0]?.replace(/_/g, ' ') || '',
    photoRef: '',
    photoUrl: place.photo_urls[0] || FALLBACK_IMAGE,
    photoUrls: place.photo_urls,
    coordinates: { lat: place.lat, lng: place.lng },
    category: place.types[0]?.replace(/_/g, ' ') || 'place',
    types: place.types,
    city: place.city,
    matchedTags: place.known_for?.slice(0, 2),
    opening_hours: place.opening_hours_raw
      ? { weekday_text: [place.opening_hours_raw] }
      : undefined,
    distance_meters: place.distance_meters,
  };
}

// ── ServiceHub Free Search ────────────────────────────────────────────────────

export async function searchNearbyFree(
  lat: number,
  lng: number,
  category: string,
  radiusKm: number = 10,
): Promise<FyndPlace[]> {
  const fsqCats = SERVICEHUB_FSQ_CATEGORIES[category];
  if (!fsqCats || !FSQ_API_KEY) return [];

  try {
    const params = new URLSearchParams({
      ll: `${lat},${lng}`,
      radius: `${Math.min(radiusKm * 1000, 50000)}`,
      categories: fsqCats,
      limit: '15',
      sort: 'DISTANCE',
      fields: 'fsq_id,name,location,categories,distance,geocodes,tel,website,photos,hours',
    });

    const url = `${FSQ_BASE_URL}/places/search?${params.toString()}`;
    const response = await fetch(url, { headers: fsqHeaders });

    if (!response.ok) {
      console.error('[ServiceHub] Foursquare error:', response.status);
      return [];
    }

    const data = await response.json();
    const results: FyndPlace[] = (data.results || []).map((place: any) => {
      const photos = (place.photos || []).map((p: any) =>
        `${p.prefix}${p.width || 600}x${p.height || 400}${p.suffix}`
      );
      const loc = place.location || {};
      const types = (place.categories || []).map((c: any) =>
        (c.short_name || c.name || '').toLowerCase().replace(/\s+/g, '_')
      );
      return {
        id: `fsq_${place.fsq_id}`,
        name: place.name || '',
        lat: place.geocodes?.main?.latitude || lat,
        lng: place.geocodes?.main?.longitude || lng,
        address: loc.formatted_address || [loc.address, loc.locality].filter(Boolean).join(', ') || '',
        city: loc.locality || '',
        types: types.length > 0 ? types : ['point_of_interest'],
        phone: place.tel,
        website: place.website,
        opening_hours_raw: formatFoursquareHours(place.hours),
        photo_urls: photos.length > 0 ? photos : [FALLBACK_IMAGE],
        distance_meters: place.distance,
      } as FyndPlace;
    });

    return results;
  } catch (e) {
    console.error('[ServiceHub] Foursquare error:', e);
    return [];
  }
}

// ── Reverse Geocode (Nominatim — free) ───────────────────────────────────────

export async function reverseGeocodeFree(lat: number, lng: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10&addressdetails=1`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'FyndApp/1.0 (contact@fyndplaces.com)' },
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

// ── Legacy helpers ────────────────────────────────────────────────────────────

export async function resolvePhoto(
  _placeName: string,
  _lat: number,
  _lng: number,
  _types: string[],
): Promise<string[]> {
  return [FALLBACK_IMAGE];
}

export function parseOSMHours(osmHours: string | undefined): {
  open_now?: boolean;
  weekday_text?: string[];
} | undefined {
  if (!osmHours) return undefined;
  return { weekday_text: [osmHours] };
}
