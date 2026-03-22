import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import type { RecentTrip } from '../store/useRecentTripStore';
import type { Place } from '../store/useTripStore';

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

  // Query existing trips for this user + city
  const q = query(
    collection(db, USER_TRIPS_COL),
    where('user_id', '==', params.user_id),
    where('city', '==', params.city),
  );
  const snap = await getDocs(q);

  const match = snap.docs.find((d) => {
    const data = d.data() as RecentTrip;
    return placesHash(data.places) === hash;
  });

  if (match) {
    const now = new Date().toISOString();
    await updateDoc(match.ref, { last_accessed: now });
    return { ...(match.data() as RecentTrip), last_accessed: now };
  }

  const now = new Date().toISOString();
  const trip: RecentTrip = {
    ...params,
    trip_id: newTripId(),
    created_at: now,
    last_accessed: now,
  };

  await setDoc(doc(db, USER_TRIPS_COL, trip.trip_id), trip);
  return trip;
}

/**
 * Fetch the 20 most recently accessed trips for a user.
 * Ordered by last_accessed descending.
 */
export async function getUserTrips(userId: string): Promise<RecentTrip[]> {
  const q = query(
    collection(db, USER_TRIPS_COL),
    where('user_id', '==', userId),
    orderBy('last_accessed', 'desc'),
    limit(20),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as RecentTrip);
}
