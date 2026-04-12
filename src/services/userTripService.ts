import { supabase } from './supabase';
import { Timestamp } from 'firebase/firestore';
import type { RecentTrip } from '../types/recentTrip';
import type { Place } from '../store/useTripStore';
import type { ItineraryDoc } from './database';

/**
 * Convert a Firestore ItineraryDoc (from the `itineraries` collection) into
 * a RecentTrip shape used by useRecentTripStore and HomeScreen/SavedScreen.
 * city = destination from CreateTripScreen step 1.
 */
export function mapItineraryToRecentTrip(doc: ItineraryDoc): RecentTrip {
  const createdAt =
    doc.createdAt instanceof Timestamp
      ? doc.createdAt.toDate().toISOString()
      : new Date().toISOString();
  return {
    trip_id: doc.id ?? `itinerary-${Date.now()}`,
    user_id: doc.userId,
    city: doc.destination,
    places: (doc.stops ?? []).map((s) => ({
      id: s.placeId,
      name: s.placeName,
      description: s.shortDescription || '',
      address: '',
      rating: s.rating ?? 0,
      image: s.imageUrl || '',
      coordinate: {
        latitude: s.latitude ?? 0,
        longitude: s.longitude ?? 0,
      },
    })) as Place[],
    created_at: createdAt,
    last_accessed: createdAt,
    is_shared: false,
  };
}

const USER_TRIPS_COL = 'user_trips';

// Stable hash for duplicate detection: join sorted place IDs
function placesHash(places: Place[]): string {
  return [...places].map((p) => p.id).sort().join('|');
}

function newTripId(): string {
  return `trip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Persist an itinerary to Firestore under `user_trips`.
 *
 * Duplicate detection: if a document already exists with the same
 * user_id + city + place IDs, update its last_accessed instead of
 * creating a new document.
 *
 * Offline: Firestore queues the write when offline and syncs on reconnect.
 */
export async function saveUserTrip(
  params: Omit<RecentTrip, 'trip_id' | 'created_at' | 'last_accessed'>
): Promise<RecentTrip> {
  const hash = placesHash(params.places);

  const { data: match, error: fetchError } = await supabase
    .from(USER_TRIPS_COL)
    .select('*')
    .eq('user_id', params.user_id)
    .eq('city', params.city);

  if (!fetchError && match && match.length > 0) {
    const existing = match.find((d: any) => placesHash(d.places || []) === hash);
    if (existing) {
      const now = new Date().toISOString();
      await supabase
        .from(USER_TRIPS_COL)
        .update({ last_accessed: now })
        .eq('trip_id', existing.trip_id);
      return { ...(existing as RecentTrip), last_accessed: now };
    }
  }

  const now = new Date().toISOString();
  const trip: RecentTrip = {
    ...params,
    trip_id: newTripId(),
    created_at: now,
    last_accessed: now,
  };

  const { error } = await supabase
    .from(USER_TRIPS_COL)
    .insert(trip);
  
  if (error) throw error;
  return trip;
}

/**
 * Delete a trip document from user_trips by its trip_id (document ID).
 */
export async function deleteUserTrip(tripId: string): Promise<void> {
  const { error } = await supabase
    .from(USER_TRIPS_COL)
    .delete()
    .eq('trip_id', tripId);
  if (error) throw error;
}

/**
 * Fetch the 20 most recently accessed trips for a user.
 * Ordered by last_accessed descending.
 */
export async function getUserTrips(userId: string): Promise<RecentTrip[]> {
  const { data, error } = await supabase
    .from(USER_TRIPS_COL)
    .select('*')
    .eq('user_id', userId)
    .order('last_accessed', { ascending: false })
    .limit(20);

  if (error) throw error;
  return (data || []) as RecentTrip[];
}
