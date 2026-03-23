import type { Place } from '../store/useTripStore';

// ── Firestore document (user_trips collection) ────────────────────────────
// Collection: user_trips
// Security:   read/write requires request.auth.uid == resource.data.user_id
// Indexes:    user_id ASC + last_accessed DESC  (composite, needed for getUserTrips query)
export interface RecentTrip {
  trip_id: string;       // 'trip-{timestamp}-{random}' — document ID
  user_id: string;       // Firebase Auth UID — owner of this trip
  city: string;          // destination name (e.g. "London")
  places: Place[];       // ordered list of stops
  created_at: string;    // ISO string — first time this trip was saved
  last_accessed: string; // ISO string — updated on every "Navigate" tap
  is_shared: boolean;    // true if this trip was also shared as a SharedTrip
}
