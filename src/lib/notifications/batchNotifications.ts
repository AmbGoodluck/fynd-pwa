import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import type { NotificationType } from '../../types/notifications';
import { FIRESTORE_COLLECTION } from './constants';

export interface BatchCheckResult {
  shouldUpdate: boolean;
  existingDocId?: string;
  existingCount?: number;
}

export async function shouldBatch(
  userId: string,
  type: NotificationType,
  batchKey: string,
  batchWindowMs: number
): Promise<BatchCheckResult> {
  const windowStart = Date.now() - batchWindowMs;
  try {
    const q = query(
      collection(db, FIRESTORE_COLLECTION),
      where('userId', '==', userId),
      where('type', '==', type),
      where('batchKey', '==', batchKey),
      where('createdAt', '>', windowStart),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return { shouldUpdate: false };
    const existing = snap.docs[0];
    const data = existing.data();
    return {
      shouldUpdate: true,
      existingDocId: existing.id,
      existingCount: data.batchCount ?? 1,
    };
  } catch {
    // If index not ready yet, fall through to create new
    return { shouldUpdate: false };
  }
}

export async function updateBatchedNotification(
  docId: string,
  newTitle: string,
  newCount: number
): Promise<void> {
  await updateDoc(doc(db, FIRESTORE_COLLECTION, docId), {
    title: newTitle,
    batchCount: newCount,
    createdAt: Date.now(),
    read: false,
  });
}
