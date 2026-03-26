import type { Timestamp } from 'firebase/firestore';

// ── Firestore document (savedPlaces collection) ────────────────────────────
// Collection: savedPlaces
// Security:   read/write requires request.auth.uid == resource.data.userId
export interface SavedPlaceDoc {
  id?: string;          // Firestore document ID (auto-generated)
  userId: string;       // Firebase Auth UID — owner of this saved place
  placeId: string;      // Google Places ID
  placeName: string;
  shortDescription: string;
  imageUrl: string;
  latitude: number;
  longitude: number;
  rating: number;
  city: string;
  category?: string;
  bookingUrl?: string;
  savedAt: Timestamp;   // server timestamp set on creation
}

// ── App-layer type (in-memory / Zustand) ──────────────────────────────────
export interface SavedPlace {
  placeId: string;
  name: string;
  address: string;
  photoUrl: string;
  rating: number;
  description: string;
  coordinates: { lat: number; lng: number };
  category?: string;
  city?: string;
  bookingUrl?: string;
  types?: string[];
  savedAt: number; // Unix ms timestamp
}

// ── Converters ────────────────────────────────────────────────────────────

export function docToSavedPlace(doc: SavedPlaceDoc): SavedPlace {
  return {
    placeId: doc.placeId,
    name: doc.placeName,
    address: '',
    photoUrl: doc.imageUrl || '',
    rating: doc.rating || 0,
    description: doc.shortDescription || '',
    coordinates: { lat: doc.latitude || 0, lng: doc.longitude || 0 },
    city: doc.city || '',
    category: doc.category,
    bookingUrl: doc.bookingUrl,
    savedAt: doc.savedAt ? (doc.savedAt as any).toMillis?.() ?? Date.now() : Date.now(),
  };
}

export function savedPlaceToDoc(
  userId: string,
  place: Omit<SavedPlace, 'savedAt'>
): Omit<SavedPlaceDoc, 'id' | 'savedAt'> {
  const doc = {
    userId,
    placeId: place.placeId,
    placeName: place.name || '',
    shortDescription: place.description || place.category || '',
    imageUrl: place.photoUrl || '',
    latitude: place.coordinates?.lat || 0,
    longitude: place.coordinates?.lng || 0,
    rating: place.rating || 0,
    city: place.city || '',
    category: place.category,
    bookingUrl: place.bookingUrl,
  };
  // Remove undefined fields (Firestore does not allow them)
  return Object.fromEntries(Object.entries(doc).filter(([_, v]) => v !== undefined));
}
