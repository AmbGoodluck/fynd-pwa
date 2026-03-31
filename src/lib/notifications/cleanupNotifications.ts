import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { FIRESTORE_COLLECTION } from './constants';

export async function cleanupExpiredNotifications(userId: string): Promise<number> {
  try {
    const q = query(
      collection(db, FIRESTORE_COLLECTION),
      where('userId', '==', userId),
      where('expiresAt', '<', Date.now())
    );
    const snap = await getDocs(q);
    if (snap.empty) return 0;

    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(doc(db, FIRESTORE_COLLECTION, d.id)));
    await batch.commit();
    return snap.docs.length;
  } catch {
    return 0;
  }
}
