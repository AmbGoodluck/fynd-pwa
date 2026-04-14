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

const OSM_TO_GOOGLE_TYPES: Record<string, string[]> = {
  // Amenity
  restaurant: ['restaurant', 'food'],
  cafe: ['cafe', 'food'],
  bar: ['bar', 'night_club'],
  pub: ['bar'],
  fast_food: ['restaurant', 'meal_takeaway', 'food'],
  ice_cream: ['bakery', 'food'],
  bakery: ['bakery', 'food'],
  nightclub: ['night_club', 'bar'],
  library: ['library', 'book_store'],
  arts_centre: ['art_gallery', 'museum'],
  cinema: ['movie_theater'],
  theatre: ['performing_arts_theater'],
  gym: ['gym'],
  fitness_centre: ['gym'],
  pharmacy: ['pharmacy'],
  hospital: ['hospital'],
  police: ['police'],
  bank: ['bank'],
  // Tourism
  museum: ['museum', 'tourist_attraction'],
  gallery: ['art_gallery'],
  viewpoint: ['tourist_attraction', 'natural_feature'],
  attraction: ['tourist_attraction'],
  camp_site: ['campground'],
  hotel: ['lodging'],
  // Leisure
  park: ['park'],
  garden: ['park'],
  nature_reserve: ['park', 'natural_feature'],
  playground: ['park'],
  sports_centre: ['gym'],
  swimming_pool: ['gym'],
  bowling_alley: ['bowling_alley'],
  stadium: ['stadium'],
  // Shop
  supermarket: ['supermarket', 'store'],
  clothes: ['clothing_store', 'store'],
  books: ['book_store', 'store'],
  gift: ['store'],
  antiques: ['store'],
  charity: ['store'],
  second_hand: ['store'],
  mall: ['shopping_mall'],
  coffee: ['cafe'],
};

export const CATEGORY_FALLBACK_PHOTOS: Record<string, string> = {
  restaurant: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600',
  cafe: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600',
  bar: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600',
  park: 'https://images.unsplash.com/photo-1588714477688-cf28a50e94f7?w=600',
  museum: 'https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=600',
  library: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=600',
  gym: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600',
  store: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600',
  hotel: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600',
  movie_theater: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600',
  bakery: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600',
  tourist_attraction: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600',
  natural_feature: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600',
  campground: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600',
  night_club: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=600',
  bowling_alley: 'https://images.unsplash.com/photo-1545232979-8bf68ee9b1af?w=600',
  point_of_interest: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600',
  default: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600',
};

function buildOverpassQuery(lat: number, lng: number, radiusMeters: number): string {
  return `
    [out:json][timeout:30];
    (
      node"amenity"~"restaurant|cafe|bar|pub|fast_food|ice_cream|bakery|food_court|biergarten|nightclub|library|arts_centre|cinema|theatre|community_centre|gym|fitness_centre|pharmacy|hospital|police|bank";
      node"tourism"~"museum|gallery|viewpoint|attraction|picnic_site|camp_site|hotel|motel|hostel|information";
      node"leisure"~"park|garden|nature_reserve|playground|sports_centre|fitness_centre|swimming_pool|golf_course|bowling_alley|stadium";
      node"shop"~"supermarket|convenience|clothes|books|gift|antiques|charity|second_hand|mall|department_store|bakery|coffee";
      way"amenity"~"restaurant|cafe|bar|pub|fast_food|library|arts_centre|cinema|theatre|community_centre|hospital|pharmacy|police";
      way"tourism"~"museum|gallery|attraction|hotel";
      way"leisure"~"park|garden|nature_reserve|sports_centre|stadium";
    );
    out center body;
  `;
}

export async function fetchOSMPlaces(
  lat: number,
  lng: number,
  radiusKm: number = 30,
  cityName: string = '',
): Promise<OSMPlace[]> {
  const radiusMeters = radiusKm * 1000;
  const query = buildOverpassQuery(lat, lng, radiusMeters);
  
  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });
  
  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status}`);
  }
  
  const data = await response.json();
  const elements = data.elements || [];
  
  const seen = new Map<string, OSMPlace>();
  
  for (const el of elements) {
    const tags = el.tags || {};
    const name = tags.name;
    if (!name) continue;
    
    const elLat = el.lat || el.center?.lat;
    const elLng = el.lon || el.center?.lon;
    if (!elLat || !elLng) continue;
    
    const primaryTag = tags.amenity || tags.tourism || tags.leisure || tags.shop || '';
    const googleTypes = OSM_TO_GOOGLE_TYPES[primaryTag] || ['point_of_interest'];
    
    const addrParts = [
      tags['addr:housenumber'],
      tags['addr:street'],
      tags['addr:city'] || cityName,
      tags['addr:state'],
      tags['addr:postcode'],
    ].filter(Boolean);
    const address = addrParts.length > 0 ? addrParts.join(', ') : cityName;
    const city = tags['addr:city'] || cityName;
    
    const openingHours = tags.opening_hours || undefined;
    
    const dedupeKey = name.toLowerCase().trim();
    if (seen.has(dedupeKey)) {
      continue;
    }
    
    seen.set(dedupeKey, {
      osm_id: el.id,
      name,
      lat: elLat,
      lng: elLng,
      amenity: tags.amenity,
      tourism: tags.tourism,
      leisure: tags.leisure,
      shop: tags.shop,
      cuisine: tags.cuisine,
      phone: tags.phone || tags['contact:phone'],
      website: tags.website || tags['contact:website'],
      opening_hours: openingHours,
      address,
      city,
      types: googleTypes,
      rating: undefined,
    });
  }
  
  return Array.from(seen.values());
}

export function getCategoryPhoto(types: string[]): string {
  for (const type of types) {
    if (CATEGORY_FALLBACK_PHOTOS[type]) {
      return CATEGORY_FALLBACK_PHOTOS[type];
    }
  }
  return CATEGORY_FALLBACK_PHOTOS.default;
}

export async function fetchWikimediaPhoto(placeName: string, lat: number, lng: number): Promise<string | null> {
  try {
    const geoUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=geosearch&ggscoord=${lat}|${lng}&ggsradius=500&ggslimit=5&prop=imageinfo&iiprop=url&iiurlwidth=600&format=json&origin=*`;
    
    const response = await fetch(geoUrl);
    if (!response.ok) return null;
    
    const data = await response.json();
    const pages = data.query?.pages;
    if (!pages) return null;
    
    for (const pageId of Object.keys(pages)) {
      const page = pages[pageId];
      const imageInfo = page.imageinfo?.[0];
      if (!imageInfo?.thumburl) continue;
      const url = imageInfo.thumburl;
      if (url.endsWith('.svg') || url.endsWith('.png') || url.includes('icon') || url.includes('logo') || url.includes('map')) continue;
      return url;
    }
    
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(placeName)}&gsrlimit=3&prop=imageinfo&iiprop=url&iiurlwidth=600&format=json&origin=*`;
    
    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) return null;
    
    const searchData = await searchResponse.json();
    const searchPages = searchData.query?.pages;
    if (!searchPages) return null;
    
    for (const pageId of Object.keys(searchPages)) {
      const page = searchPages[pageId];
      const imageInfo = page.imageinfo?.[0];
      if (!imageInfo?.thumburl) continue;
      const url = imageInfo.thumburl;
      if (url.endsWith('.svg') || url.includes('icon') || url.includes('logo')) continue;
      return url;
    }
    
    return null;
  } catch {
    return null;
  }
}

export async function resolvePhoto(
  placeName: string,
  lat: number,
  lng: number,
  types: string[],
): Promise<string[]> {
  const wikimedia = await fetchWikimediaPhoto(placeName, lat, lng);
  if (wikimedia) {
    return [wikimedia, getCategoryPhoto(types)];
  }
  return [getCategoryPhoto(types)];
}

export function parseOSMHours(osmHours: string | undefined): {
  open_now?: boolean;
  weekday_text?: string[];
} | undefined {
  if (!osmHours) return undefined;
  return {
    weekday_text: [osmHours],
  };
}