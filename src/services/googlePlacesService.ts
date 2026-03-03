const API_KEY = "AIzaSyAXJbrM6TImUPguLUnXUNKUkPzTdXKV53c";
const BASE = 'https://maps.googleapis.com/maps/api/place';

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
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

export async function searchPlacesByVibe(destination: string, vibes: string[], originLat = 0, originLng = 0): Promise<PlaceResult[]> {
  try {
    function mapPlace(p: any): PlaceResult {
      return {
        placeId: p.place_id,
        name: p.name,
        address: p.formatted_address,
        rating: p.rating || 4.0,
        description: p.editorial_summary?.overview || p.types?.[0]?.replace(/_/g, ' ') || '',
        photoRef: p.photos?.[0]?.photo_reference || '',
        photoUrl: p.photos?.[0]?.photo_reference
          ? `${BASE}/photo?maxwidth=400&photo_reference=${p.photos[0].photo_reference}&key=${API_KEY}`
          : 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400',
        coordinates: { lat: p.geometry.location.lat, lng: p.geometry.location.lng },
        category: p.types?.[0]?.replace(/_/g, ' ') || 'place',
        city: destination,
        distanceKm: haversineKm(originLat, originLng, p.geometry.location.lat, p.geometry.location.lng) || Math.floor(Math.random() * 20) + 1,
        walkMinutes: Math.round((haversineKm(originLat, originLng, p.geometry.location.lat, p.geometry.location.lng) || 5) * 12),
      };
    }

    const keywords1 = vibes.slice(0, 3).join(' ');
    const keywords2 = vibes.length > 3 ? vibes.slice(3, 6).join(' ') : 'attractions';

    const query1 = `${keywords1} in ${destination}`;
    const query2 = `best ${keywords2} places to visit in ${destination}`;

    const urls = [
      `${BASE}/textsearch/json?query=${encodeURIComponent(query1)}&key=${API_KEY}`,
      `${BASE}/textsearch/json?query=${encodeURIComponent(query2)}&key=${API_KEY}`,
    ];

    console.log('Google Places queries:', query1, '|', query2);

    const results = await Promise.allSettled(urls.map(url => fetch(url).then(r => r.json())));

    const seen = new Set<string>();
    const combined: PlaceResult[] = [];

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.status === 'OK' && result.value.results) {
        console.log('Google Places batch count:', result.value.results.length);
        for (const p of result.value.results) {
          if (!seen.has(p.place_id)) {
            seen.add(p.place_id);
            combined.push(mapPlace(p));
          }
        }
      }
    }

    console.log('Google Places total unique results:', combined.length);
    return combined.slice(0, 30);
  } catch (e) {
    console.log('Google Places error:', e);
    return [];
  }
}

export function getPhotoUrl(photoRef: string, maxWidth = 400): string {
  if (!photoRef) return 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400';
  return `${BASE}/photo?maxwidth=${maxWidth}&photo_reference=${photoRef}&key=${API_KEY}`;
}

export async function searchNearby(lat: number, lng: number, type: string): Promise<PlaceResult[]> {
  try {
    const typeMap: Record<string, string> = {
      Medical: 'hospital',
      'Currency Exchange': 'bank',
      'Public Bathrooms': 'point_of_interest',
      Transport: 'transit_station',
      Police: 'police',
    };
    const googleType = typeMap[type] || 'point_of_interest';
    const url = `${BASE}/nearbysearch/json?location=${lat},${lng}&radius=2000&type=${googleType}&key=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.results) return [];
    return data.results.slice(0, 8).map((p: any) => ({
      placeId: p.place_id,
      name: p.name,
      address: p.vicinity,
      rating: p.rating || 0,
      description: '',
      photoRef: p.photos?.[0]?.photo_reference || '',
      photoUrl: p.photos?.[0]?.photo_reference
        ? `${BASE}/photo?maxwidth=400&photo_reference=${p.photos[0].photo_reference}&key=${API_KEY}`
        : 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400',
      coordinates: { lat: p.geometry.location.lat, lng: p.geometry.location.lng },
      category: type,
      city: '',
    }));
  } catch (e) {
    console.log('Nearby search error:', e);
    return [];
  }
}
