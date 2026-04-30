import AsyncStorage from '@react-native-async-storage/async-storage';
import { generatePlaceDescription } from './openaiService';
import { FALLBACK_IMAGE } from '../constants';

// ══════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════

export interface FyndPlace {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  city: string;
  types: string[];
  phone?: string;
  website?: string;
  opening_hours_raw?: string;
  is_open?: boolean;
  photo_urls: string[];
  ai_description?: string;
  known_for?: string[];
  vibe?: string;
  cuisine?: string;
  distance_meters?: number;
  food_types?: string[];
  categories_raw?: string[];
}

export interface CityCache {
  city_name: string;
  lat: number;
  lng: number;
  fetched_at: number;
  places: FyndPlace[];
  ai_generated: boolean;
}

// ══════════════════════════════════════════════════════════
// HERE API CONFIG
// ══════════════════════════════════════════════════════════

const HERE_API_KEY = process.env.EXPO_PUBLIC_HERE_API_KEY || '';
const HERE_DISCOVER_URL = 'https://discover.search.hereapi.com/v1/discover';
const HERE_BROWSE_URL = 'https://browse.search.hereapi.com/v1/browse';

console.log('[HERE] API Key present:', !!HERE_API_KEY, 'Key length:', HERE_API_KEY.length);

// ══════════════════════════════════════════════════════════
// CATEGORY STOCK PHOTOS (fallback — HERE has no photo API on free tier)
// ══════════════════════════════════════════════════════════

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
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600',
  ],
  museum: [
    'https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=600',
  ],
  library: [
    'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=600',
  ],
  gym: [
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600',
  ],
  store: [
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600',
  ],
  bakery: [
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600',
  ],
  hotel: [
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600',
  ],
  hospital: [
    'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600',
  ],
  pharmacy: [
    'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=600',
  ],
  tourist_attraction: [
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600',
    'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=600',
  ],
  natural_feature: [
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600',
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600',
  ],
  night_club: [
    'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=600',
  ],
  default: [
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600',
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600',
  ],
};

function getPhotoForPlace(types: string[], index: number): string[] {
  for (const type of types) {
    const photos = CATEGORY_PHOTOS[type];
    if (photos && photos.length > 0) return [photos[index % photos.length]];
  }
  const fb = CATEGORY_PHOTOS.default;
  return [fb[index % fb.length]];
}

// ══════════════════════════════════════════════════════════
// HERE CATEGORY → GOOGLE-STYLE TYPE MAPPING
// ══════════════════════════════════════════════════════════

function mapHereCategoriesToTypes(categories: any[]): string[] {
  const types: string[] = [];
  for (const cat of categories) {
    const id = cat.id || '';
    const name = (cat.name || '').toLowerCase();

    if (id.startsWith('100-1000-0001')) types.push('restaurant');
    if (id.startsWith('100-1000-0000')) types.push('restaurant');
    if (id.startsWith('100-1000-0009')) types.push('restaurant', 'fast_food');
    if (id.startsWith('100-1100'))      types.push('cafe');
    if (id.startsWith('100-1000-0002')) types.push('restaurant');

    if (id.startsWith('200-2000-0011')) types.push('bar');
    if (id.startsWith('200-2000-0368')) types.push('bar', 'night_club');
    if (id.startsWith('200-2000'))      types.push('bar');
    if (id.startsWith('200-2200'))      types.push('night_club');

    if (id.startsWith('300-3000')) types.push('tourist_attraction');
    if (id.startsWith('300-3100')) types.push('museum');
    if (id.startsWith('300-3200')) types.push('art_gallery');

    if (id.startsWith('350-3500')) types.push('library');
    if (id.startsWith('350-3510')) types.push('performing_arts_theater');
    if (id.startsWith('350-3520')) types.push('movie_theater');

    if (id.startsWith('400-4100')) types.push('park');
    if (id.startsWith('400-4300')) types.push('natural_feature');

    if (id.startsWith('500-5000')) types.push('lodging');
    if (id.startsWith('500-5100')) types.push('lodging');

    if (id.startsWith('550-5510')) types.push('gym');
    if (id.startsWith('550-5520')) types.push('gym');

    if (id.startsWith('600-6100')) types.push('store');
    if (id.startsWith('600-6200')) types.push('store', 'clothing_store');
    if (id.startsWith('600-6300')) types.push('store', 'book_store');
    if (id.startsWith('600-6900')) types.push('store');
    if (id.startsWith('600-6950')) types.push('shopping_mall');

    if (id.startsWith('700-7300')) types.push('gas_station');
    if (id.startsWith('700-7400')) types.push('parking');
    if (id.startsWith('700-7600')) types.push('atm');
    if (id.startsWith('700-7800')) types.push('bank');

    if (id.startsWith('800-8000')) types.push('hospital');
    if (id.startsWith('800-8100')) types.push('pharmacy');
    if (id.startsWith('800-8200')) types.push('police');

    if (name.includes('coffee') || name.includes('café') || name.includes('cafe')) types.push('cafe');
    if (name.includes('bakery') || name.includes('pastry')) types.push('bakery');
    if (name.includes('pizza'))                             types.push('restaurant');
    if (name.includes('park'))                              types.push('park');
    if (name.includes('trail') || name.includes('hiking'))  types.push('natural_feature');
    if (name.includes('grocery') || name.includes('supermarket')) types.push('supermarket');
  }

  const unique = [...new Set(types)];
  return unique.length > 0 ? unique : ['point_of_interest'];
}

// ══════════════════════════════════════════════════════════
// HERE RESPONSE → FyndPlace
// ══════════════════════════════════════════════════════════

function parseHereItem(item: any, index: number, fallbackCity: string): FyndPlace {
  const categories = item.categories || [];
  const types = mapHereCategoriesToTypes(categories);
  const address = item.address || {};
  const position = item.position || {};
  const contacts = item.contacts?.[0] || {};
  const hours = item.openingHours?.[0] || {};
  const foodTypes = (item.foodTypes || []).map((f: any) => f.name).filter(Boolean);

  let phone: string | undefined;
  if (contacts.phone?.[0]) {
    const p = contacts.phone[0];
    phone = typeof p === 'string' ? p : p.value;
  }

  let website: string | undefined;
  if (contacts.www?.[0]) {
    const w = contacts.www[0];
    website = typeof w === 'string' ? w : w.value;
  }

  const hoursText = hours.text ? hours.text.join('; ') : undefined;

  return {
    id: `here_${item.id}`,
    name: item.title || '',
    lat: position.lat || 0,
    lng: position.lng || 0,
    address: address.label || [address.street, address.city, address.stateCode].filter(Boolean).join(', ') || fallbackCity,
    city: address.city || fallbackCity,
    types,
    phone,
    website,
    opening_hours_raw: hoursText,
    is_open: hours.isOpen,
    photo_urls: getPhotoForPlace(types, index),
    cuisine: foodTypes.join(', ') || undefined,
    distance_meters: item.distance,
    food_types: foodTypes,
    categories_raw: categories.map((c: any) => c.name),
  };
}

// ══════════════════════════════════════════════════════════
// HERE PLACES FETCH — DISCOVER ENDPOINT
// ══════════════════════════════════════════════════════════

export async function fetchPlacesFromHERE(
  lat: number,
  lng: number,
  radiusKm: number = 30,
  cityName: string = '',
  query?: string,
): Promise<FyndPlace[]> {
  if (!HERE_API_KEY) {
    console.error('[HERE] No API key — cannot fetch places');
    return [];
  }

  try {
    const searchQuery = query || 'restaurant,cafe,bar,park,museum,shop,entertainment';
    const radiusM = Math.min(radiusKm * 1000, 50000);
    const url = `${HERE_DISCOVER_URL}?at=${lat},${lng}&q=${encodeURIComponent(searchQuery)}&limit=50&in=circle:${lat},${lng};r=${radiusM}&apiKey=${HERE_API_KEY}`;

    console.log('[HERE] Fetching:', url.replace(HERE_API_KEY, 'KEY_HIDDEN'));

    const response = await fetch(url);
    console.log('[HERE] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[HERE] Error:', response.status, errorText);
      return [];
    }

    const data = await response.json();
    const items = data.items || [];
    console.log('[HERE] Results count:', items.length);

    return items.map((item: any, i: number) => parseHereItem(item, i, cityName));
  } catch (error) {
    console.error('[HERE] Fetch error:', error);
    return [];
  }
}

// ══════════════════════════════════════════════════════════
// HERE BROWSE — CATEGORY-SPECIFIC (ServiceHub)
// ══════════════════════════════════════════════════════════

const SERVICEHUB_HERE_CATEGORIES: Record<string, string> = {
  'Medical':           '800-8000-0159',
  'Currency':          '700-7800',
  'Currency Exchange': '700-7610',
  'Bathrooms':         '900-9300-0360',
  'Public Bathrooms':  '900-9300-0360',
  'Transport':         '400-4100-0036',
  'Police':            '800-8200-0174',
  'Embassy':           '800-8300',
  'ATM':               '700-7600-0116',
  'ATM / Bank':        '700-7600-0116,700-7800',
  'Pharmacy':          '800-8100-0168',
  'Hotel':             '500-5000-0053',
  'Tourist Info':      '300-3000-0023',
  'Gas Station':       '700-7300',
  'Emergency':         '800-8000-0159',
  'Safety':            '800-8200-0174',
};

export async function searchNearbyFree(
  lat: number,
  lng: number,
  category: string,
  radiusKm: number = 10,
): Promise<FyndPlace[]> {
  if (!HERE_API_KEY) return [];

  const hereCatId = SERVICEHUB_HERE_CATEGORIES[category];

  try {
    let url: string;
    if (hereCatId) {
      url = `${HERE_BROWSE_URL}?at=${lat},${lng}&categories=${hereCatId}&limit=15&in=circle:${lat},${lng};r=${radiusKm * 1000}&apiKey=${HERE_API_KEY}`;
    } else {
      url = `${HERE_DISCOVER_URL}?at=${lat},${lng}&q=${encodeURIComponent(category)}&limit=15&apiKey=${HERE_API_KEY}`;
    }

    console.log('[HERE ServiceHub] Fetching category:', category);
    const response = await fetch(url);
    if (!response.ok) return [];

    const data = await response.json();
    return (data.items || []).map((item: any, i: number) => parseHereItem(item, i, ''));
  } catch (e) {
    console.error('[HERE ServiceHub] Error:', e);
    return [];
  }
}

// ══════════════════════════════════════════════════════════
// CHAIN DETECTION
// ══════════════════════════════════════════════════════════

const CHAIN_KEYWORDS = [
  'mcdonald', 'burger king', 'wendy', 'taco bell', 'subway', 'domino',
  'pizza hut', 'papa john', 'little caesars', 'sonic', 'arby', 'hardee',
  'chick-fil-a', 'popeyes', 'kfc', 'dunkin', 'starbucks', 'red lobster',
  'olive garden', 'applebee', 'chili', 'ihop', 'denny', 'waffle house',
  'cracker barrel', 'dollar general', 'dollar tree', 'walmart', 'target',
  'walgreens', 'cvs', 'save-a-lot', 'aldi', 'kroger', 'shell', 'bp',
  'speedway', 'circle k', 'marathon', 'valero', 'buffalo wild wings',
  'hooters', 'cicis', 'outback', 'golden corral', 'panera', 'chipotle',
  'five guys', 'zaxby', 'cookout', 'firehouse sub', 'jersey mike',
  'jimmy john', 'panda express', 'raising cane', 'wingstop',
  "sonny's barbecue", "logan's roadhouse", 'tropical smoothie',
];

function isChain(name: string): boolean {
  const lower = name.toLowerCase();
  return CHAIN_KEYWORDS.some(c => lower.includes(c));
}

// ══════════════════════════════════════════════════════════
// CACHE (AsyncStorage)
// ══════════════════════════════════════════════════════════

const CACHE_VERSION = 'v4_here';
const CACHE_PREFIX = `fynd_${CACHE_VERSION}_`;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getCacheKey(lat: number, lng: number): string {
  return `${CACHE_PREFIX}${Math.round(lat * 10) / 10}_${Math.round(lng * 10) / 10}`;
}

async function getCachedCity(lat: number, lng: number): Promise<CityCache | null> {
  try {
    const raw = await AsyncStorage.getItem(getCacheKey(lat, lng));
    if (!raw) return null;
    const cache: CityCache = JSON.parse(raw);
    if (Date.now() - cache.fetched_at > CACHE_TTL_MS) return null;
    return cache;
  } catch { return null; }
}

async function setCachedCity(lat: number, lng: number, cache: CityCache): Promise<void> {
  try { await AsyncStorage.setItem(getCacheKey(lat, lng), JSON.stringify(cache)); } catch {}
}

async function updateCachedCityPlaces(lat: number, lng: number, places: FyndPlace[]): Promise<void> {
  const cache = await getCachedCity(lat, lng);
  if (!cache) return;
  cache.places = places;
  cache.ai_generated = true;
  await setCachedCity(lat, lng, cache);
}

async function clearOldCaches() {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const oldKeys = allKeys.filter(k => k.startsWith('fynd_') && !k.startsWith(CACHE_PREFIX));
    if (oldKeys.length > 0) {
      await AsyncStorage.multiRemove(oldKeys);
      console.log('[Cache] Cleared', oldKeys.length, 'old cache entries');
    }
  } catch {}
}
clearOldCaches();

// ══════════════════════════════════════════════════════════
// AI DESCRIPTIONS (background)
// ══════════════════════════════════════════════════════════

async function addAIDescriptions(places: FyndPlace[], cityName: string): Promise<FyndPlace[]> {
  const toGen = places.slice(0, 40);
  const rest = places.slice(40);
  const enriched: FyndPlace[] = [];

  for (let i = 0; i < toGen.length; i += 5) {
    const batch = toGen.slice(i, i + 5);
    const results = await Promise.allSettled(batch.map(async (place) => {
      if (place.ai_description) return place;
      try {
        const extraContext = [
          place.food_types?.length ? `Cuisine: ${place.food_types.join(', ')}` : '',
          place.categories_raw?.length ? `Category: ${place.categories_raw.join(', ')}` : '',
          place.is_open !== undefined ? `Currently: ${place.is_open ? 'Open' : 'Closed'}` : '',
        ].filter(Boolean).join('. ');

        const result = await generatePlaceDescription(
          place.name,
          place.address,
          cityName,
          place.types,
          undefined,
          undefined,
          extraContext || undefined,
        );
        if (result) {
          return { ...place, ai_description: result.description, known_for: result.knownFor, vibe: result.vibe };
        }
      } catch {}
      return place;
    }));

    for (const r of results) {
      enriched.push(r.status === 'fulfilled' ? r.value : batch[enriched.length % batch.length]);
    }
    if (i + 5 < toGen.length) await new Promise(r => setTimeout(r, 200));
  }

  return [...enriched, ...rest];
}

// ══════════════════════════════════════════════════════════
// FILTER AND SORT
// ══════════════════════════════════════════════════════════

function filterAndSort(
  places: FyndPlace[],
  vibeFilter: string[],
  excludeTypes: string[],
  limit: number,
): FyndPlace[] {
  let filtered = places.filter(p => !p.types.some(t => excludeTypes.includes(t)));

  filtered.sort((a, b) => {
    const aChain = isChain(a.name) ? 1 : 0;
    const bChain = isChain(b.name) ? 1 : 0;
    return aChain - bChain;
  });

  if (vibeFilter.length > 0) {
    const tokens = vibeFilter
      .flatMap(v => v.toLowerCase().replace(/_/g, ' ').split(/[^a-z0-9]+/g))
      .filter(t => t.length >= 3);

    if (tokens.length > 0) {
      const scored = filtered.map(p => {
        const hay = [
          p.name, ...(p.types || []), p.cuisine || '', p.vibe || '',
          p.ai_description || '', ...(p.known_for || []),
          ...(p.food_types || []), ...(p.categories_raw || []),
        ].join(' ').toLowerCase();
        let score = 0;
        for (const t of tokens) { if (hay.includes(t)) score++; }
        return { place: p, score };
      });

      scored.sort((a, b) => {
        const aChain = isChain(a.place.name) ? 1 : 0;
        const bChain = isChain(b.place.name) ? 1 : 0;
        if (aChain !== bChain) return aChain - bChain;
        return b.score - a.score || a.place.name.localeCompare(b.place.name);
      });

      filtered = scored.map(s => s.place);
    }
  }

  return filtered.slice(0, limit);
}

// ══════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ══════════════════════════════════════════════════════════

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
    excludeTypes = ['atm', 'gas_station', 'parking', 'bank', 'supermarket', 'convenience_store'],
    limit = 50,
  } = options || {};

  const cached = await getCachedCity(lat, lng);
  if (cached && cached.places.length > 0) {
    console.log('[Places] Serving from cache:', cached.places.length, 'places for', cached.city_name);
    if (generateAI && !cached.ai_generated) {
      addAIDescriptions(cached.places, cityName)
        .then(enriched => updateCachedCityPlaces(lat, lng, enriched))
        .catch(console.error);
    }
    return filterAndSort(cached.places, vibeFilter, excludeTypes, limit);
  }

  console.log('[Places] Cache miss — fetching from HERE for', cityName);

  const queries = [
    'restaurant,cafe,food',
    'bar,pub,nightlife,entertainment',
    'park,museum,gallery,attraction',
    'shop,store,shopping',
    'library,gym,fitness',
  ];

  const allPlaces: FyndPlace[] = [];
  const seenIds = new Set<string>();

  for (const query of queries) {
    const results = await fetchPlacesFromHERE(lat, lng, radiusKm, cityName, query);
    for (const place of results) {
      if (!seenIds.has(place.id)) {
        seenIds.add(place.id);
        allPlaces.push(place);
      }
    }
    await new Promise(r => setTimeout(r, 200));
  }

  console.log('[Places] HERE returned total:', allPlaces.length, 'unique places');
  if (allPlaces.length === 0) return [];

  await setCachedCity(lat, lng, {
    city_name: cityName,
    lat, lng,
    fetched_at: Date.now(),
    places: allPlaces,
    ai_generated: false,
  });

  if (generateAI) {
    addAIDescriptions(allPlaces, cityName)
      .then(enriched => updateCachedCityPlaces(lat, lng, enriched))
      .catch(console.error);
  }

  return filterAndSort(allPlaces, vibeFilter, excludeTypes, limit);
}

// ══════════════════════════════════════════════════════════
// REVERSE GEOCODE
// ══════════════════════════════════════════════════════════

export async function reverseGeocodeFree(lat: number, lng: number): Promise<string> {
  if (HERE_API_KEY) {
    try {
      const url = `https://revgeocode.search.hereapi.com/v1/revgeocode?at=${lat},${lng}&apiKey=${HERE_API_KEY}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const addr = data.items?.[0]?.address;
        if (addr) return addr.city || addr.town || addr.county || 'My Location';
      }
    } catch {}
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10&addressdetails=1`;
    const response = await fetch(url, { headers: { 'User-Agent': 'FyndApp/1.0' } });
    if (!response.ok) return 'My Location';
    const data = await response.json();
    return data.address?.city || data.address?.town || data.address?.village || data.address?.county || 'My Location';
  } catch { return 'My Location'; }
}

// ══════════════════════════════════════════════════════════
// PLACE RESULT MAPPER (backward compatibility)
// ══════════════════════════════════════════════════════════

export function fyndPlaceToPlaceResult(place: FyndPlace): any {
  return {
    placeId: place.id,
    name: place.name,
    address: place.address,
    rating: undefined,
    description: place.ai_description || place.cuisine || place.types[0]?.replace(/_/g, ' ') || '',
    photoRef: '',
    photoUrl: place.photo_urls[0] || FALLBACK_IMAGE,
    photoUrls: place.photo_urls,
    coordinates: { lat: place.lat, lng: place.lng },
    category: place.types[0]?.replace(/_/g, ' ') || 'place',
    types: place.types,
    city: place.city,
    matchedTags: place.known_for?.slice(0, 2),
    opening_hours: place.opening_hours_raw ? { weekday_text: [place.opening_hours_raw] } : undefined,
    distance_meters: place.distance_meters,
    is_open: place.is_open,
  };
}

// ══════════════════════════════════════════════════════════
// LEGACY EXPORTS (kept for interface compatibility)
// ══════════════════════════════════════════════════════════

export function getCategoryPhoto(_types: string[]): string { return FALLBACK_IMAGE; }
export const CATEGORY_FALLBACK_PHOTOS: Record<string, string> = {};

export async function resolvePhoto(
  _placeName: string, _lat: number, _lng: number, _types: string[],
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
