/**
 * placeDetailsService.ts
 *
 * Firestore caching functions (readPlaceCache, writePlaceCache, fetchRichPlaceData,
 * getCachedSuggestedPlaces, upsertSearchedPlace) have been removed.
 *
 * Place data is now fetched from Overpass API (free) and cached locally via
 * AsyncStorage in freePlacesService.ts. AI descriptions are generated via
 * openaiService.ts directly from each consumer (PlaceDetailScreen, etc.).
 *
 * This file retains shared type definitions used across the codebase.
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
  placeId: string;
  name: string;
  photoUrl: string;
  photoUrls: string[];
  rating?: number;
  address?: string;
  category?: string;
  aiDescription?: string;
  knownFor?: string[];
  vibe?: string;
  detailsLoading: boolean;
  aiLoading: boolean;
  detailsError?: boolean;
  aiError?: boolean;
}
