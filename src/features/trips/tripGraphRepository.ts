// ─── Trip Graph Repository ────────────────────────────────────────────────────
// Data access layer for the relational trip model.
// Handles CRUD for TripGraph, TripPlaceNode, and TripMemberNode with
// role-based permission enforcement.
//
// Firestore collections:
//   trips          → TripGraph documents
//   trip_places    → TripPlaceNode documents
//   trip_members   → TripMemberNode documents (shared with sharedTripService)

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
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import {
  type TripGraph,
  type TripPlaceNode,
  type TripMemberNode,
  type TripMemberRole,
  type TripVisibility,
  getPermissions,
  buildTripShareLink,
  validateTripDate,
  TRIP_CONSTRAINTS,
} from '../../types/tripGraph';
import {
  TravelApiError,
  type TripCreateRequest,
  type TripCreateResponse,
  type TripJoinResponse,
  type TripGetResponse,
} from '../../services/travelApiService';
import {
  trackTripCreated,
  trackTripShared,
  trackTripJoined,
  trackPlaceAddedToTrip,
  trackPlaceRemovedFromTrip,
} from '../../services/eventTrackingService';

const TRIPS_COL      = 'trips';
const PLACES_COL     = 'trip_places';
const MEMBERS_COL    = 'trip_members';

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

// ─── Create trip ──────────────────────────────────────────────────────────────

export async function createTripGraph(
  req: TripCreateRequest,
  isPremium: boolean
): Promise<TripCreateResponse> {
  if (!validateTripDate(req.trip_date)) {
    throw new TravelApiError(
      'TRIP_DATE_INVALID',
      'V1 supports one-day trips only. trip_date must be today.'
    );
  }

  const maxPlaces = isPremium
    ? TRIP_CONSTRAINTS.maxPlacesPremium
    : TRIP_CONSTRAINTS.maxPlacesFree;

  if (req.places.length > maxPlaces) {
    throw new TravelApiError(
      'PLACE_LIMIT_REACHED',
      `Free plan allows up to ${TRIP_CONSTRAINTS.maxPlacesFree} places per trip.`
    );
  }

  const trip_id = uuid();
  const now = nowIso();
  const share_link = buildTripShareLink(trip_id);

  const trip: TripGraph = {
    trip_id,
    owner_id: req.owner_id,
    trip_name: req.trip_name,
    trip_date: req.trip_date,
    destination: req.destination,
    visibility: req.visibility ?? 'private',
    created_at: now,
    member_count: 1,
    place_count: req.places.length,
    share_link,
  };

  await setDoc(doc(db, TRIPS_COL, trip_id), trip);

  // Write place nodes with order_index
  const placeNodes: TripPlaceNode[] = req.places.map((p, idx) => ({
    trip_place_id: uuid(),
    trip_id,
    place_id: p.place_id,
    place_name: p.place_name,
    address: p.address,
    photo_url: p.photo_url,
    rating: p.rating,
    category: p.category,
    distance_km: p.distance_km,
    walk_minutes: p.walk_minutes,
    description: p.description,
    booking_url: p.booking_url,
    coordinates: p.coordinates,
    order_index: idx,
    added_by: req.owner_id,
    created_at: now,
  }));

  await Promise.all(
    placeNodes.map((node) =>
      setDoc(doc(db, PLACES_COL, node.trip_place_id), node)
    )
  );

  // Add owner as first member
  const ownerMember: TripMemberNode = {
    trip_member_id: uuid(),
    trip_id,
    user_id: req.owner_id,
    user_name: req.owner_name,
    role: 'owner',
    joined_at: now,
  };
  await setDoc(doc(db, MEMBERS_COL, ownerMember.trip_member_id), ownerMember);

  trackTripCreated(req.owner_id, trip_id, {
    destination: req.destination,
    place_count: req.places.length,
  });

  return { trip, share_link };
}

// ─── Get trip (with edge case flags) ─────────────────────────────────────────

export async function getTripGraph(trip_id: string): Promise<TripGetResponse> {
  const tripSnap = await getDoc(doc(db, TRIPS_COL, trip_id));

  if (!tripSnap.exists()) {
    return { trip: null, places: [], members: [], not_found: true, deleted: false };
  }

  const trip = tripSnap.data() as TripGraph;

  const [placesSnap, membersSnap] = await Promise.all([
    getDocs(
      query(collection(db, PLACES_COL), where('trip_id', '==', trip_id), orderBy('order_index'))
    ),
    getDocs(query(collection(db, MEMBERS_COL), where('trip_id', '==', trip_id))),
  ]);

  const places = placesSnap.docs.map((d) => d.data() as TripPlaceNode);
  const members = membersSnap.docs.map((d) => d.data() as TripMemberNode);

  return { trip, places, members, not_found: false, deleted: false };
}

// ─── Add place (owner only) ───────────────────────────────────────────────────

export async function addPlaceToTrip(
  trip_id: string,
  actorUserId: string,
  placeData: Omit<TripPlaceNode, 'trip_place_id' | 'trip_id' | 'added_by' | 'created_at' | 'order_index'>,
  isPremium: boolean
): Promise<TripPlaceNode> {
  const membership = await getMembership(trip_id, actorUserId);
  if (!membership) {
    throw new TravelApiError('PERMISSION_DENIED', 'You are not a member of this trip.');
  }

  const perms = getPermissions(membership.role);
  if (!perms.canAddPlaces) {
    throw new TravelApiError('PERMISSION_DENIED', 'Only the trip owner can add places.');
  }

  const trip = await getDoc(doc(db, TRIPS_COL, trip_id));
  if (!trip.exists()) {
    throw new TravelApiError('TRIP_NOT_FOUND', 'Trip not found.');
  }

  const tripData = trip.data() as TripGraph;
  const maxPlaces = isPremium
    ? TRIP_CONSTRAINTS.maxPlacesPremium
    : TRIP_CONSTRAINTS.maxPlacesFree;

  if (tripData.place_count >= maxPlaces) {
    throw new TravelApiError(
      'PLACE_LIMIT_REACHED',
      `Free plan allows up to ${TRIP_CONSTRAINTS.maxPlacesFree} places per trip.`
    );
  }

  const node: TripPlaceNode = {
    trip_place_id: uuid(),
    trip_id,
    ...placeData,
    order_index: tripData.place_count,
    added_by: actorUserId,
    created_at: nowIso(),
  };

  await setDoc(doc(db, PLACES_COL, node.trip_place_id), node);
  await updateDoc(doc(db, TRIPS_COL, trip_id), {
    place_count: tripData.place_count + 1,
  });

  trackPlaceAddedToTrip(actorUserId, node.place_id, trip_id);

  return node;
}

// ─── Remove place (owner only) ────────────────────────────────────────────────

export async function removePlaceFromTrip(
  trip_id: string,
  trip_place_id: string,
  actorUserId: string
): Promise<void> {
  const membership = await getMembership(trip_id, actorUserId);
  if (!membership) {
    throw new TravelApiError('PERMISSION_DENIED', 'You are not a member of this trip.');
  }

  const perms = getPermissions(membership.role);
  if (!perms.canRemovePlaces) {
    throw new TravelApiError('PERMISSION_DENIED', 'Only the trip owner can remove places.');
  }

  const placeSnap = await getDoc(doc(db, PLACES_COL, trip_place_id));
  const placeData = placeSnap.exists() ? (placeSnap.data() as TripPlaceNode) : null;

  await deleteDoc(doc(db, PLACES_COL, trip_place_id));

  const tripSnap = await getDoc(doc(db, TRIPS_COL, trip_id));
  if (tripSnap.exists()) {
    const tripData = tripSnap.data() as TripGraph;
    await updateDoc(doc(db, TRIPS_COL, trip_id), {
      place_count: Math.max(0, tripData.place_count - 1),
    });
  }

  if (placeData) {
    trackPlaceRemovedFromTrip(actorUserId, placeData.place_id, trip_id);
  }
}

// ─── Share trip (owner only, makes trip visible) ──────────────────────────────

export async function shareTripGraph(
  trip_id: string,
  owner_id: string
): Promise<string> {
  const membership = await getMembership(trip_id, owner_id);
  if (!membership || membership.role !== 'owner') {
    throw new TravelApiError('PERMISSION_DENIED', 'Only the trip owner can share this trip.');
  }

  await updateDoc(doc(db, TRIPS_COL, trip_id), {
    visibility: 'shared' as TripVisibility,
  });

  trackTripShared(owner_id, trip_id);

  return buildTripShareLink(trip_id);
}

// ─── Join trip ────────────────────────────────────────────────────────────────

export async function joinTripGraph(
  trip_id: string,
  user_id: string,
  user_name: string
): Promise<TripJoinResponse> {
  // Already a member → return existing membership and open trip directly
  const existing = await getMembership(trip_id, user_id);
  if (existing) {
    const { trip, places, members } = await getTripGraph(trip_id);
    if (!trip) throw new TravelApiError('TRIP_NOT_FOUND', 'Trip not found.');
    return {
      member: existing,
      trip,
      already_member: true,
    };
  }

  const tripSnap = await getDoc(doc(db, TRIPS_COL, trip_id));
  if (!tripSnap.exists()) {
    throw new TravelApiError('TRIP_NOT_FOUND', 'This trip is no longer available.');
  }

  const trip = tripSnap.data() as TripGraph;

  const member: TripMemberNode = {
    trip_member_id: uuid(),
    trip_id,
    user_id,
    user_name,
    role: 'member',
    joined_at: nowIso(),
  };

  await setDoc(doc(db, MEMBERS_COL, member.trip_member_id), member);
  await updateDoc(doc(db, TRIPS_COL, trip_id), {
    member_count: trip.member_count + 1,
  });

  trackTripJoined(user_id, trip_id);

  return { member, trip, already_member: false };
}

// ─── Remove member (owner only) ───────────────────────────────────────────────

export async function removeMemberFromTrip(
  trip_id: string,
  trip_member_id: string,
  actorUserId: string
): Promise<void> {
  const actorMembership = await getMembership(trip_id, actorUserId);
  if (!actorMembership || actorMembership.role !== 'owner') {
    throw new TravelApiError('PERMISSION_DENIED', 'Only the trip owner can remove members.');
  }

  await deleteDoc(doc(db, MEMBERS_COL, trip_member_id));

  const tripSnap = await getDoc(doc(db, TRIPS_COL, trip_id));
  if (tripSnap.exists()) {
    const tripData = tripSnap.data() as TripGraph;
    await updateDoc(doc(db, TRIPS_COL, trip_id), {
      member_count: Math.max(1, tripData.member_count - 1),
    });
  }
}

// ─── Delete trip (owner only) ─────────────────────────────────────────────────

export async function deleteTripGraph(
  trip_id: string,
  actorUserId: string
): Promise<void> {
  const membership = await getMembership(trip_id, actorUserId);
  if (!membership || membership.role !== 'owner') {
    throw new TravelApiError('PERMISSION_DENIED', 'Only the trip owner can delete this trip.');
  }

  // Delete all place nodes, all member records, then the trip itself
  const [placesSnap, membersSnap] = await Promise.all([
    getDocs(query(collection(db, PLACES_COL), where('trip_id', '==', trip_id))),
    getDocs(query(collection(db, MEMBERS_COL), where('trip_id', '==', trip_id))),
  ]);

  await Promise.all([
    ...placesSnap.docs.map((d) => deleteDoc(d.ref)),
    ...membersSnap.docs.map((d) => deleteDoc(d.ref)),
  ]);

  await deleteDoc(doc(db, TRIPS_COL, trip_id));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export async function getMembership(
  trip_id: string,
  user_id: string
): Promise<TripMemberNode | null> {
  const q = query(
    collection(db, MEMBERS_COL),
    where('trip_id', '==', trip_id),
    where('user_id', '==', user_id)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as TripMemberNode;
}

export async function getTripMembers(trip_id: string): Promise<TripMemberNode[]> {
  const q = query(collection(db, MEMBERS_COL), where('trip_id', '==', trip_id));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as TripMemberNode);
}

export async function getTripsOwnedBy(owner_id: string): Promise<TripGraph[]> {
  const q = query(collection(db, TRIPS_COL), where('owner_id', '==', owner_id));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as TripGraph);
}

export async function getTripsJoinedBy(user_id: string): Promise<TripGraph[]> {
  const q = query(
    collection(db, MEMBERS_COL),
    where('user_id', '==', user_id),
    where('role', '==', 'member' as TripMemberRole)
  );
  const snap = await getDocs(q);
  const tripIds = snap.docs.map((d) => (d.data() as TripMemberNode).trip_id);
  if (tripIds.length === 0) return [];

  const trips = await Promise.all(
    tripIds.map((id) =>
      getDoc(doc(db, TRIPS_COL, id)).then((s) => (s.exists() ? (s.data() as TripGraph) : null))
    )
  );
  return trips.filter(Boolean) as TripGraph[];
}
