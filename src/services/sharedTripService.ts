import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { SharedTrip, TripMember, SharedTripPlace, MemberRole } from '../types/sharedTrip';
import {
  trackTripCreated,
  trackTripShared,
  trackTripJoined,
} from './eventTrackingService';

const TRIPS_COL = 'shared_trips';
const MEMBERS_COL = 'trip_members';

// ── UUID generator (no external dep needed) ───────────────────────────────────
function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function nowIso(): string {
  return new Date().toISOString();
}

// ── Create a shared trip ──────────────────────────────────────────────────────
export async function createSharedTrip(params: {
  owner_id: string;
  owner_name: string;
  trip_name: string;
  trip_date: string;
  places: SharedTripPlace[];
}): Promise<SharedTrip> {
  if (params.places.length > 4) {
    throw new Error('TRIP_LIMIT: Trips support up to 4 places.');
  }

  const trip_id = uuid();
  const now = nowIso();

  const trip: SharedTrip = {
    trip_id,
    owner_id: params.owner_id,
    owner_name: params.owner_name,
    trip_name: params.trip_name,
    trip_date: params.trip_date,
    created_at: now,
    places: params.places,
    visibility: 'shared',
    member_count: 1,
  };

  await setDoc(doc(db, TRIPS_COL, trip_id), trip);

  // Add owner as first member
  const ownerMember: TripMember = {
    member_id: uuid(),
    trip_id,
    user_id: params.owner_id,
    user_name: params.owner_name,
    role: 'owner',
    joined_at: now,
  };
  await setDoc(doc(db, MEMBERS_COL, ownerMember.member_id), ownerMember);

  trackTripCreated(params.owner_id, trip_id, {
    trip_name: params.trip_name,
    place_count: params.places.length,
  });

  return trip;
}

// ── Fetch a trip by ID ────────────────────────────────────────────────────────
export async function getSharedTrip(trip_id: string): Promise<SharedTrip | null> {
  const snap = await getDoc(doc(db, TRIPS_COL, trip_id));
  if (!snap.exists()) return null;
  return snap.data() as SharedTrip;
}

// ── Fetch all members for a trip ──────────────────────────────────────────────
export async function getTripMembers(trip_id: string): Promise<TripMember[]> {
  const q = query(collection(db, MEMBERS_COL), where('trip_id', '==', trip_id));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as TripMember);
}

// ── Check if user is already a member ────────────────────────────────────────
export async function getMembership(
  trip_id: string,
  user_id: string
): Promise<TripMember | null> {
  const q = query(
    collection(db, MEMBERS_COL),
    where('trip_id', '==', trip_id),
    where('user_id', '==', user_id)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as TripMember;
}

// ── Join a shared trip ────────────────────────────────────────────────────────
export async function joinSharedTrip(params: {
  trip_id: string;
  user_id: string;
  user_name: string;
}): Promise<TripMember> {
  // Check if already a member
  const existing = await getMembership(params.trip_id, params.user_id);
  if (existing) return existing;

  const trip = await getSharedTrip(params.trip_id);
  if (!trip) throw new Error('TRIP_NOT_FOUND');

  const member: TripMember = {
    member_id: uuid(),
    trip_id: params.trip_id,
    user_id: params.user_id,
    user_name: params.user_name,
    role: 'member',
    joined_at: nowIso(),
  };

  await setDoc(doc(db, MEMBERS_COL, member.member_id), member);

  // Increment member count
  await updateDoc(doc(db, TRIPS_COL, params.trip_id), {
    member_count: (trip.member_count || 1) + 1,
  });

  trackTripJoined(params.user_id, params.trip_id);

  return member;
}

// ── Remove a member from a trip (owner only) ──────────────────────────────────
export async function removeMember(member_id: string, trip_id: string): Promise<void> {
  await deleteDoc(doc(db, MEMBERS_COL, member_id));
  const trip = await getSharedTrip(trip_id);
  if (trip && trip.member_count > 1) {
    await updateDoc(doc(db, TRIPS_COL, trip_id), {
      member_count: trip.member_count - 1,
    });
  }
}

// ── Leave a trip (member only) ────────────────────────────────────────────────
export async function leaveTrip(trip_id: string, user_id: string): Promise<void> {
  const membership = await getMembership(trip_id, user_id);
  if (!membership) return;
  await removeMember(membership.member_id, trip_id);
}

// ── Delete a trip and all its members (owner only) ────────────────────────────
export async function deleteSharedTrip(trip_id: string): Promise<void> {
  const members = await getTripMembers(trip_id);
  await Promise.all(members.map((m) => deleteDoc(doc(db, MEMBERS_COL, m.member_id))));
  await deleteDoc(doc(db, TRIPS_COL, trip_id));
}

// ── Get trips created by a user ───────────────────────────────────────────────
export async function getMyCreatedTrips(owner_id: string): Promise<SharedTrip[]> {
  const q = query(collection(db, TRIPS_COL), where('owner_id', '==', owner_id));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as SharedTrip);
}

// ── Get trips a user has joined (as member) ───────────────────────────────────
export async function getJoinedTrips(user_id: string): Promise<SharedTrip[]> {
  const q = query(
    collection(db, MEMBERS_COL),
    where('user_id', '==', user_id),
    where('role', '==', 'member')
  );
  const snap = await getDocs(q);
  const tripIds = snap.docs.map((d) => (d.data() as TripMember).trip_id);

  if (tripIds.length === 0) return [];

  const trips = await Promise.all(tripIds.map((id) => getSharedTrip(id)));
  return trips.filter(Boolean) as SharedTrip[];
}

// ── Generate share link ───────────────────────────────────────────────────────
export function buildShareLink(trip_id: string): string {
  return `fynd.app/trip/${trip_id}`;
}

// ── Track trip shared (call after share link is presented to user) ────────────
export function recordTripShared(owner_id: string, trip_id: string): void {
  trackTripShared(owner_id, trip_id);
}
