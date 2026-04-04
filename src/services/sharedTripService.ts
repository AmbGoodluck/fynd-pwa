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
  increment,
  arrayUnion,
  arrayRemove,
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
  if (params.places.length > 7) {
    throw new Error('TRIP_LIMIT: Trips support up to 7 places.');
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
    // members[] stores Firebase Auth UIDs for Firestore security-rule membership checks
    // and efficient array-contains queries.
    members: [params.owner_id],
  };

  try {
    await setDoc(doc(db, TRIPS_COL, trip_id), trip);
  } catch (err: any) {
    const code: string = err?.code ?? '';
    const msg: string = (err?.message ?? '').toLowerCase();
    if (code === 'permission-denied' || code.includes('permission') || msg.includes('permission') || msg.includes('insufficient')) {
      throw new Error('PERMISSION_DENIED: Firestore rules are blocking shared_trips writes. Add rules for shared_trips and trip_members in the Firebase console.');
    }
    throw err;
  }

  // Add owner as first member
  const ownerMember: TripMember = {
    member_id: uuid(),
    trip_id,
    user_id: params.owner_id,
    user_name: params.owner_name,
    role: 'owner',
    joined_at: now,
  };
  try {
    await setDoc(doc(db, MEMBERS_COL, ownerMember.member_id), ownerMember);
  } catch {
    // Non-fatal: owner member row missing is recoverable; trip creation already succeeded
  }

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

  // Use a deterministic doc ID so concurrent joins for the same user are idempotent
  const deterministicId = `${params.trip_id}_${params.user_id}`;
  const member: TripMember = {
    member_id: deterministicId,
    trip_id: params.trip_id,
    user_id: params.user_id,
    user_name: params.user_name,
    role: 'member',
    joined_at: nowIso(),
  };

  await setDoc(doc(db, MEMBERS_COL, deterministicId), member);

  // Best-effort: increment count and add to members[] array on the trip doc.
  // This can fail if Firestore rules only allow the owner to update the trip doc.
  // trip_members is the source of truth for membership, so this is non-fatal.
  try {
    await updateDoc(doc(db, TRIPS_COL, params.trip_id), {
      member_count: increment(1),
      members: arrayUnion(params.user_id),
    });
  } catch {
    // Non-fatal — user is still a member via the trip_members record above
  }

  trackTripJoined(params.user_id, params.trip_id);

  return member;
}

// ── Remove a member from a trip (owner only) ──────────────────────────────────
// user_id is required to keep the members[] array in the trip document in sync.
export async function removeMember(member_id: string, trip_id: string, user_id: string): Promise<void> {
  await deleteDoc(doc(db, MEMBERS_COL, member_id));
  await updateDoc(doc(db, TRIPS_COL, trip_id), {
    member_count: increment(-1),
    members: arrayRemove(user_id),
  });
}

// ── Leave a trip (member only) ────────────────────────────────────────────────
export async function leaveTrip(trip_id: string, user_id: string): Promise<void> {
  const membership = await getMembership(trip_id, user_id);
  if (!membership) return;
  await removeMember(membership.member_id, trip_id, user_id);
}

// ── Delete a trip and all its members (owner only) ────────────────────────────
// Pass requesterId to enforce client-side ownership check before writing.
// Firestore rules also enforce this; the client check gives a clearer error message.
export async function deleteSharedTrip(trip_id: string, requesterId?: string): Promise<void> {
  if (requesterId) {
    const trip = await getSharedTrip(trip_id);
    if (trip && trip.owner_id !== requesterId) {
      throw new Error('PERMISSION_DENIED: Only the trip owner can delete this trip.');
    }
  }
  const members = await getTripMembers(trip_id);
  await Promise.all(members.map((m) => deleteDoc(doc(db, MEMBERS_COL, m.member_id))));
  await deleteDoc(doc(db, TRIPS_COL, trip_id));
}

// ── Add a member UID to the trip's members array (idempotent via arrayUnion) ──
export async function addMemberToSharedTrip(tripId: string, memberId: string): Promise<void> {
  await updateDoc(doc(db, TRIPS_COL, tripId), {
    members: arrayUnion(memberId),
  });
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

// ── Get all trips for a user (owned + joined, deduplicated) ──────────────────
// Runs two queries in parallel (Firestore does not support OR across different
// fields in a single query) and merges by trip_id.
export async function getSharedTripsForUser(userId: string): Promise<SharedTrip[]> {
  const [created, joined] = await Promise.all([
    getMyCreatedTrips(userId),
    getJoinedTrips(userId),
  ]);
  const seen = new Set<string>();
  return [...created, ...joined].filter((t) => {
    if (seen.has(t.trip_id)) return false;
    seen.add(t.trip_id);
    return true;
  });
}

// ── Generate share link ───────────────────────────────────────────────────────
export function buildShareLink(trip_id: string): string {
  return `https://app.fyndplaces.com/trip/${trip_id}`;
}

// ── Track trip shared (call after share link is presented to user) ────────────
export function recordTripShared(owner_id: string, trip_id: string): void {
  trackTripShared(owner_id, trip_id);
}
