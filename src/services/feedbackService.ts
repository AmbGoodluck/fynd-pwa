import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Platform } from 'react-native';
import { db } from './firebase';

export type FeedbackType = 'quick' | 'rating';
export type Sentiment = 'love' | 'better' | 'issue';

export interface FeedbackPayload {
  type: FeedbackType;
  sentiment?: Sentiment;
  comment?: string;
  rating?: number; // 1–5, only for type='rating'
}

/**
 * Saves a feedback entry to Firestore → collection: "feedback"
 * Fire-and-forget safe: rejects silently so UI is never blocked.
 */
export async function submitFeedback(payload: FeedbackPayload): Promise<void> {
  await addDoc(collection(db, 'feedback'), {
    ...payload,
    platform: Platform.OS,
    createdAt: serverTimestamp(),
  });
}
