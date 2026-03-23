import {
  collection,
  doc,
  addDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { SavedPlaceDoc, SavedPlace } from '../types/savedPlace';
import { docToSavedPlace, savedPlaceToDoc } from '../types/savedPlace';

const COL = 'savedPlaces';

// ── Write ─────────────────────────────────────────────────────────────────

/**
 * Save a place for a user. Returns the Firestore document ID.
 * Caller should check isPlaceSaved() first to avoid duplicates.
 */
export async function savePlace(userId: string, place: Omit<SavedPlace, 'savedAt'>): Promise<string> {
  const data = savedPlaceToDoc(userId, place);
  const ref = await addDoc(collection(db, COL), {
    ...data,
    savedAt: serverTimestamp(),
  });
  return ref.id;
}

// ── Read ──────────────────────────────────────────────────────────────────

/**
 * Fetch all saved places for a user, newest first.
 */
export async function getSavedPlaces(userId: string): Promise<SavedPlace[]> {
  const q = query(
    collection(db, COL),
    where('userId', '==', userId),
    orderBy('savedAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => docToSavedPlace({ id: d.id, ...d.data() } as SavedPlaceDoc));
}

/**
 * Check if a specific place is saved. Returns the Firestore doc ID or null.
 */
export async function isPlaceSaved(userId: string, placeId: string): Promise<string | null> {
  const q = query(
    collection(db, COL),
    where('userId', '==', userId),
    where('placeId', '==', placeId),
    limit(1)
  );
  const snap = await getDocs(q);
  return snap.empty ? null : snap.docs[0].id;
}

// ── Delete ────────────────────────────────────────────────────────────────

/**
 * Delete a saved place by its Firestore document ID.
 */
export async function deleteSavedPlace(docId: string): Promise<void> {
  await deleteDoc(doc(db, COL, docId));
}
