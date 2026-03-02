import { doc, setDoc, getDoc, addDoc, collection, query, where, orderBy, limit, getDocs, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

// --- USER ---
export async function createUserDoc(uid: string, fullName: string, email: string) {
  await setDoc(doc(db, 'users', uid), {
    id: uid, fullName, email, photoURL: null,
    subscriptionTier: 'free', createdAt: serverTimestamp(), travelPreferences: [],
  });
  await setDoc(doc(db, 'subscriptions', uid), {
    userId: uid, tier: 'free', stripeCustomerId: null,
    stripeSubscriptionId: null, currentPeriodEnd: null,
    tripsUsedThisMonth: 0, itinerariesGenerated: 0, savedPlacesCount: 0,
  });
}

export async function getUserDoc(uid: string) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

// --- TRIPS ---
export async function saveTrip(userId: string, tripData: any) {
  const ref = await addDoc(collection(db, 'trips'), {
    ...tripData, userId, createdAt: serverTimestamp(), status: 'active',
  });
  return ref.id;
}

// --- ITINERARIES ---
export async function saveItinerary(userId: string, tripId: string, itineraryData: any) {
  const ref = await addDoc(collection(db, 'itineraries'), {
    ...itineraryData, userId, tripId, createdAt: serverTimestamp(), status: 'active',
  });
  return ref.id;
}

export async function getRecentItineraries(userId: string, count = 5) {
  const q = query(collection(db, 'itineraries'), where('userId', '==', userId), orderBy('createdAt', 'desc'), limit(count));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getSavedItineraries(userId: string) {
  const q = query(collection(db, 'itineraries'), where('userId', '==', userId), where('status', '==', 'saved'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updateItineraryStatus(itineraryId: string, status: string) {
  await updateDoc(doc(db, 'itineraries', itineraryId), { status });
}

// --- SAVED PLACES ---
export async function savePlaceForUser(userId: string, placeData: any) {
  const ref = await addDoc(collection(db, 'savedPlaces'), {
    ...placeData, userId, savedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getSavedPlaces(userId: string) {
  const q = query(collection(db, 'savedPlaces'), where('userId', '==', userId), orderBy('savedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function deleteSavedPlace(docId: string) {
  await deleteDoc(doc(db, 'savedPlaces', docId));
}

export async function isPlaceSaved(userId: string, placeId: string): Promise<boolean> {
  const q = query(collection(db, 'savedPlaces'), where('userId', '==', userId), where('placeId', '==', placeId));
  const snap = await getDocs(q);
  return !snap.empty;
}
