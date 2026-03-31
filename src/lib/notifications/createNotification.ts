import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import type { FyndNotification, CreateNotificationInput } from '../../types/notifications';
import { NOTIFICATION_CONFIG, NOTIFICATION_EXPIRY_MS, FIRESTORE_COLLECTION } from './constants';
import { shouldBatch, updateBatchedNotification } from './batchNotifications';

// ── Core create function ──────────────────────────────────────────────────────

export async function createNotification(
  input: CreateNotificationInput
): Promise<string | null> {
  const config = NOTIFICATION_CONFIG[input.type];

  // Rate limiting: check most recent notification of this type for this user
  if (config.rateLimitMs > 0) {
    const limited = await checkRateLimit(input.userId, input.type, config.rateLimitMs);
    if (limited) return null;
  }

  // Batching: if within window, update existing instead of creating new
  if (config.batchable && input.batchKey) {
    const batchResult = await shouldBatch(
      input.userId,
      input.type,
      input.batchKey,
      config.batchWindowMs
    );
    if (batchResult.shouldUpdate && batchResult.existingDocId) {
      const newCount = (batchResult.existingCount ?? 1) + 1;
      const batchedTitle = buildBatchedTitle(input.type, newCount, input.data.params);
      await updateBatchedNotification(batchResult.existingDocId, batchedTitle, newCount);
      return batchResult.existingDocId;
    }
  }

  // Create new notification document
  const now = Date.now();
  const notificationData: Omit<FyndNotification, 'id'> = {
    userId: input.userId,
    type: input.type,
    priority: config.priority,
    title: input.title,
    ...(input.body ? { body: input.body } : {}),
    read: false,
    createdAt: now,
    expiresAt: now + NOTIFICATION_EXPIRY_MS,
    ...(input.batchKey ? { batchKey: input.batchKey, batchCount: 1 } : {}),
    data: input.data,
  };

  const docRef = await addDoc(
    collection(db, FIRESTORE_COLLECTION),
    notificationData
  );
  return docRef.id;
}

// ── Rate limit helper ─────────────────────────────────────────────────────────

async function checkRateLimit(
  userId: string,
  type: string,
  rateLimitMs: number
): Promise<boolean> {
  try {
    const q = query(
      collection(db, FIRESTORE_COLLECTION),
      where('userId', '==', userId),
      where('type', '==', type),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return false;
    const latest = snap.docs[0].data();
    return (Date.now() - (latest.createdAt as number)) < rateLimitMs;
  } catch {
    return false;
  }
}

// ── Batch title builder ───────────────────────────────────────────────────────

function buildBatchedTitle(
  type: CreateNotificationInput['type'],
  count: number,
  params?: Record<string, string>
): string {
  const tripName = params?.tripName ?? 'your trip';
  switch (type) {
    case 'moment_added':
      return `${count} new moments added to "${tripName}"`;
    case 'place_added':
      return `${count} new places added to "${tripName}"`;
    default:
      return `${count} new updates`;
  }
}

// ── Convenience notification triggers ────────────────────────────────────────

export async function notifyTripShared(
  recipientUserId: string,
  sharerName: string,
  tripId: string,
  tripName: string
): Promise<void> {
  await createNotification({
    userId: recipientUserId,
    type: 'trip_shared',
    title: `${sharerName} shared "${tripName}" with you`,
    data: {
      tripId,
      screen: 'SharedTripDetail',
      params: { trip_id: tripId },
    },
  });
}

export async function notifyMemberJoined(
  tripMemberUserIds: string[],
  joinerUserId: string,
  joinerName: string,
  tripId: string,
  tripName: string
): Promise<void> {
  const recipients = tripMemberUserIds.filter((id) => id !== joinerUserId);
  await Promise.all(
    recipients.map((userId) =>
      createNotification({
        userId,
        type: 'trip_member_joined',
        title: `${joinerName} joined "${tripName}"`,
        data: {
          tripId,
          screen: 'SharedTripDetail',
          params: { trip_id: tripId },
        },
      })
    )
  );
}

export async function notifyMomentAdded(
  tripMemberUserIds: string[],
  uploaderUserId: string,
  uploaderName: string,
  tripId: string,
  tripName: string,
  momentId: string
): Promise<void> {
  const recipients = tripMemberUserIds.filter((id) => id !== uploaderUserId);
  await Promise.all(
    recipients.map((userId) =>
      createNotification({
        userId,
        type: 'moment_added',
        title: `${uploaderName} added a moment to "${tripName}"`,
        batchKey: `moment_added:${tripId}`,
        data: {
          tripId,
          momentId,
          screen: 'Moments',
          params: { trip_id: tripId, tripName },
        },
      })
    )
  );
}

export async function notifyPlaceAdded(
  tripMemberUserIds: string[],
  adderUserId: string,
  adderName: string,
  tripId: string,
  tripName: string,
  placeId: string,
  placeName: string
): Promise<void> {
  const recipients = tripMemberUserIds.filter((id) => id !== adderUserId);
  await Promise.all(
    recipients.map((userId) =>
      createNotification({
        userId,
        type: 'place_added',
        title: `${adderName} added ${placeName} to "${tripName}"`,
        batchKey: `place_added:${tripId}`,
        data: {
          tripId,
          placeId,
          screen: 'SharedTripDetail',
          params: { trip_id: tripId, tripName },
        },
      })
    )
  );
}
