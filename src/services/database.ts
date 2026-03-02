import {
  doc, setDoc, getDoc, addDoc, collection,
  query, where, orderBy, limit, getDocs,
  updateDoc, deleteDoc, serverTimestamp, increment,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';

// ================================
// TYPES
// ================================

export interface UserDoc {
  id: string;
  email: string;
  fullName: string;
  profilePhoto: string | null;
  createdAt: Timestamp;
  homeCity: string;
  travelStyle: string[];
  travelPreferences?: string[]; // added to support user settings
  isPremium: boolean;
}

export interface SubscriptionDoc {
  userId: string;
  isPremium: boolean;
  plan: 'free' | 'premium';
  status: 'active' | 'expired' | 'canceled';
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: Timestamp | null;
  tripsUsedThisMonth: number;
  itinerariesGenerated: number;
  savedPlacesCount: number;
  resetDate: Timestamp;
  // Free limits
  tripLimit: number;        // 3
  itineraryLimit: number;   // 1
  savedPlacesLimit: number; // 5
  placesPerTripLimit: number; // 5
}

export interface TripDoc {
  id?: string;
  userId: string;
  tripName: string;
  destination: string;
  accommodation: string;
  explorationHours?: number;      // new fields used by CreateTripScreen
  distanceKm?: number;
  timeOfDay?: string;
  vibesSelected: string[];
  // legacy/alternative naming (kept optional for backward compatibility)
  tripDurationHours?: number;
  travelRadiusKm?: number;
  dayPart?: 'morning' | 'afternoon' | 'evening';
  createdAt: Timestamp;
  status: 'draft' | 'generated' | 'completed';
}

export interface TripPlaceDoc {
  id?: string;
  tripId: string;
  userId: string;
  placeId: string;
  placeName: string;
  shortDescription: string;
  imageUrl: string;
  latitude: number;
  longitude: number;
  rating: number;
  distanceKm: number;
  travelTimeMinutes: number;
  requiresBooking: boolean;
  orderIndex: number;
  status: 'pending' | 'inProgress' | 'done';
  addedAt: Timestamp;
}

export interface ItineraryDoc {
  id?: string;
  userId: string;
  tripId: string;
  destination: string;
  month: string;
  coverPhotoUrl: string;
  stops: TripPlaceDoc[];
  totalDurationMin: number;
  totalStops: number;
  status: 'active' | 'saved' | 'ignored';
  createdAt: Timestamp;
}

export interface SavedPlaceDoc {
  id?: string;
  userId: string;
  placeId: string;
  placeName: string;
  shortDescription: string;
  imageUrl: string;
  latitude: number;
  longitude: number;
  rating: number;
  city: string;
  savedAt: Timestamp;
}

export interface FeedbackDoc {
  id?: string;
  userId: string;
  type: 'feedback' | 'bug' | 'feature_request';
  message: string;
  screen: string;
  createdAt: Timestamp;
}

// ================================
// FREE TIER LIMITS
// ================================

export const FREE_LIMITS = {
  tripsPerMonth: 3,
  itineraries: 1,
  savedPlaces: 5,
  placesPerTrip: 5,
};

// ================================
// USER FUNCTIONS
// ================================

export async function createUserDoc(uid: string, fullName: string, email: string) {
  // Create user document
  await setDoc(doc(db, 'users', uid), {
    id: uid,
    email,
    fullName,
    profilePhoto: null,
    createdAt: serverTimestamp(),
    homeCity: '',
    travelStyle: [],
    isPremium: false,
  });

  // Create subscription document with free limits
  await setDoc(doc(db, 'subscriptions', uid), {
    userId: uid,
    isPremium: false,
    plan: 'free',
    status: 'active',
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    currentPeriodEnd: null,
    tripsUsedThisMonth: 0,
    itinerariesGenerated: 0,
    savedPlacesCount: 0,
    resetDate: Timestamp.fromDate(new Date(new Date().setDate(1))),
    tripLimit: FREE_LIMITS.tripsPerMonth,
    itineraryLimit: FREE_LIMITS.itineraries,
    savedPlacesLimit: FREE_LIMITS.savedPlaces,
    placesPerTripLimit: FREE_LIMITS.placesPerTrip,
  });
}

export async function getUserDoc(uid: string): Promise<UserDoc | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() as UserDoc : null;
}

export async function updateUserPremium(uid: string, isPremium: boolean) {
  await updateDoc(doc(db, 'users', uid), { isPremium });
  await updateDoc(doc(db, 'subscriptions', uid), {
    isPremium,
    plan: isPremium ? 'premium' : 'free',
  });
}

// ================================
// SUBSCRIPTION / GATE FUNCTIONS
// ================================

export async function getSubscription(uid: string): Promise<SubscriptionDoc | null> {
  const snap = await getDoc(doc(db, 'subscriptions', uid));
  return snap.exists() ? snap.data() as SubscriptionDoc : null;
}

export type GateResult = { allowed: boolean; reason?: string; limit?: number; used?: number };

export async function checkTripLimit(uid: string): Promise<GateResult> {
  const sub = await getSubscription(uid);
  if (!sub) return { allowed: true };
  if (sub.isPremium) return { allowed: true };
  if (sub.tripsUsedThisMonth >= FREE_LIMITS.tripsPerMonth) {
    return {
      allowed: false,
      reason: `You've used all ${FREE_LIMITS.tripsPerMonth} free trips this month.\n\nUpgrade to Fynd Plus for unlimited trips, itineraries, and more.`,
      limit: FREE_LIMITS.tripsPerMonth,
      used: sub.tripsUsedThisMonth,
    };
  }
  return { allowed: true, limit: FREE_LIMITS.tripsPerMonth, used: sub.tripsUsedThisMonth };
}

export async function checkItineraryLimit(uid: string): Promise<GateResult> {
  const sub = await getSubscription(uid);
  if (!sub) return { allowed: true };
  if (sub.isPremium) return { allowed: true };
  if (sub.itinerariesGenerated >= FREE_LIMITS.itineraries) {
    return {
      allowed: false,
      reason: `Free users can only generate ${FREE_LIMITS.itineraries} itinerary.\n\nUpgrade to Fynd Plus for unlimited AI-generated itineraries.`,
      limit: FREE_LIMITS.itineraries,
      used: sub.itinerariesGenerated,
    };
  }
  return { allowed: true, limit: FREE_LIMITS.itineraries, used: sub.itinerariesGenerated };
}

export async function checkPlacesPerTripLimit(uid: string, currentCount: number): Promise<GateResult> {
  const sub = await getSubscription(uid);
  if (!sub) return { allowed: true };
  if (sub.isPremium) return { allowed: true };
  if (currentCount >= FREE_LIMITS.placesPerTrip) {
    return {
      allowed: false,
      reason: `Free users can add up to ${FREE_LIMITS.placesPerTrip} places per trip.\n\nUpgrade to Fynd Plus to add unlimited places to your itinerary.`,
      limit: FREE_LIMITS.placesPerTrip,
      used: currentCount,
    };
  }
  return { allowed: true, limit: FREE_LIMITS.placesPerTrip, used: currentCount };
}

export async function checkSavedPlacesLimit(uid: string): Promise<GateResult> {
  const sub = await getSubscription(uid);
  if (!sub) return { allowed: true };
  if (sub.isPremium) return { allowed: true };
  if (sub.savedPlacesCount >= FREE_LIMITS.savedPlaces) {
    return {
      allowed: false,
      reason: `Free users can save up to ${FREE_LIMITS.savedPlaces} places.\n\nUpgrade to Fynd Plus to save unlimited places from your discoveries.`,
      limit: FREE_LIMITS.savedPlaces,
      used: sub.savedPlacesCount,
    };
  }
  return { allowed: true, limit: FREE_LIMITS.savedPlaces, used: sub.savedPlacesCount };
}

export async function checkServiceHubAccess(uid: string): Promise<GateResult> {
  const sub = await getSubscription(uid);
  if (!sub) return { allowed: true };
  if (sub.isPremium) return { allowed: true };
  return {
    allowed: false,
    reason: `ServiceHub is a Fynd Plus feature.\n\nUpgrade to access nearby medical facilities, currency exchange, transport, and more  wherever you travel.`,
  };
}

// ================================
// USAGE INCREMENT FUNCTIONS
// ================================

export async function incrementTripUsage(uid: string) {
  await updateDoc(doc(db, 'subscriptions', uid), {
    tripsUsedThisMonth: increment(1),
  });
}

export async function incrementItineraryUsage(uid: string) {
  await updateDoc(doc(db, 'subscriptions', uid), {
    itinerariesGenerated: increment(1),
  });
}

export async function incrementSavedPlaces(uid: string) {
  await updateDoc(doc(db, 'subscriptions', uid), {
    savedPlacesCount: increment(1),
  });
}

export async function decrementSavedPlaces(uid: string) {
  await updateDoc(doc(db, 'subscriptions', uid), {
    savedPlacesCount: increment(-1),
  });
}

// ================================
// TRIP FUNCTIONS
// ================================

export async function saveTrip(uid: string, tripData: Partial<TripDoc>): Promise<string> {
  const ref = await addDoc(collection(db, 'trips'), {
    ...tripData,
    userId: uid,
    createdAt: serverTimestamp(),
    status: 'draft',
  });
  await incrementTripUsage(uid);
  return ref.id;
}

export async function getTrip(tripId: string): Promise<TripDoc | null> {
  const snap = await getDoc(doc(db, 'trips', tripId));
  return snap.exists() ? { id: snap.id, ...snap.data() } as TripDoc : null;
}

// ================================
// ITINERARY FUNCTIONS
// ================================

export async function saveItinerary(uid: string, tripId: string, data: Partial<ItineraryDoc>): Promise<string> {
  const ref = await addDoc(collection(db, 'itineraries'), {
    ...data,
    userId: uid,
    tripId,
    createdAt: serverTimestamp(),
    status: 'active',
  });
  await incrementItineraryUsage(uid);
  return ref.id;
}

export async function getItinerary(itineraryId: string): Promise<ItineraryDoc | null> {
  const snap = await getDoc(doc(db, 'itineraries', itineraryId));
  return snap.exists() ? { id: snap.id, ...snap.data() } as ItineraryDoc : null;
}

export async function getRecentItineraries(uid: string, count = 5): Promise<ItineraryDoc[]> {
  const q = query(
    collection(db, 'itineraries'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(count)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as ItineraryDoc);
}

export async function getSavedItineraries(uid: string): Promise<ItineraryDoc[]> {
  const q = query(
    collection(db, 'itineraries'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as ItineraryDoc);
}

export async function updateItineraryStatus(itineraryId: string, status: 'active' | 'saved' | 'ignored') {
  await updateDoc(doc(db, 'itineraries', itineraryId), { status });
}

// ================================
// SAVED PLACES FUNCTIONS
// ================================

export async function savePlace(uid: string, placeData: Partial<SavedPlaceDoc>): Promise<string> {
  const ref = await addDoc(collection(db, 'savedPlaces'), {
    ...placeData,
    userId: uid,
    savedAt: serverTimestamp(),
  });
  await incrementSavedPlaces(uid);
  return ref.id;
}

export async function getSavedPlaces(uid: string): Promise<SavedPlaceDoc[]> {
  const q = query(
    collection(db, 'savedPlaces'),
    where('userId', '==', uid),
    orderBy('savedAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as SavedPlaceDoc);
}

export async function deleteSavedPlace(docId: string, uid: string) {
  await deleteDoc(doc(db, 'savedPlaces', docId));
  await decrementSavedPlaces(uid);
}

export async function isPlaceSaved(uid: string, placeId: string): Promise<string | null> {
  const q = query(
    collection(db, 'savedPlaces'),
    where('userId', '==', uid),
    where('placeId', '==', placeId),
    limit(1)
  );
  const snap = await getDocs(q);
  return snap.empty ? null : snap.docs[0].id;
}

// ================================
// FEEDBACK FUNCTIONS
// ================================

export async function submitFeedback(uid: string, type: string, message: string, screen: string) {
  await addDoc(collection(db, 'feedback'), {
    userId: uid,
    type,
    message,
    screen,
    createdAt: serverTimestamp(),
  });
}
