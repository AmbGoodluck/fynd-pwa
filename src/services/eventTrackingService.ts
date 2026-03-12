// ─── Event-Based User Activity Tracking ─────────────────────────────────────
// Records user interactions asynchronously — never blocks the UI.
// Guest users generate events using a guest session ID.
// All writes are fire-and-forget with silent failure.

import { addDoc, collection } from 'firebase/firestore';
import { db } from './firebase';
import type { EventType, UserEvent } from '../types/userEvent';

const EVENTS_COLLECTION = 'user_events';

const DEV_LOGS = typeof __DEV__ !== 'undefined' && __DEV__;

function generateEventId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Core event recorder.
 * Fire-and-forget — callers must NOT await this.
 * Failures are silently swallowed so events never crash the app.
 */
export function trackEvent(params: {
  userId: string;
  eventType: EventType;
  placeId?: string;
  tripId?: string;
  metadata?: Record<string, unknown>;
}): void {
  const event: UserEvent = {
    event_id: generateEventId(),
    user_id: params.userId,
    event_type: params.eventType,
    place_id: params.placeId,
    trip_id: params.tripId,
    timestamp: new Date().toISOString(),
    metadata: params.metadata,
  };

  if (DEV_LOGS) {
    console.log('[EventTracking]', event.event_type, {
      user: event.user_id,
      place: event.place_id,
      trip: event.trip_id,
    });
  }

  // Fire-and-forget: do NOT await, do NOT block UI
  addDoc(collection(db, EVENTS_COLLECTION), event).catch((err) => {
    if (DEV_LOGS) console.warn('[EventTracking] Failed to record event:', err?.message || err);
  });
}

// ─── Convenience helpers ──────────────────────────────────────────────────────

/** Track when a user views a place detail. */
export function trackPlaceViewed(
  userId: string,
  placeId: string,
  metadata?: Record<string, unknown>
): void {
  trackEvent({ userId, eventType: 'place_viewed', placeId, metadata });
}

/** Track when a user saves a place to their collection. */
export function trackPlaceSaved(
  userId: string,
  placeId: string,
  metadata?: Record<string, unknown>
): void {
  trackEvent({ userId, eventType: 'place_saved', placeId, metadata });
}

/** Track when a new trip is created. */
export function trackTripCreated(
  userId: string,
  tripId: string,
  metadata?: Record<string, unknown>
): void {
  trackEvent({ userId, eventType: 'trip_created', tripId, metadata });
}

/** Track when a trip is shared (share link generated). */
export function trackTripShared(userId: string, tripId: string): void {
  trackEvent({ userId, eventType: 'trip_shared', tripId });
}

/** Track when a user joins a shared trip. */
export function trackTripJoined(userId: string, tripId: string): void {
  trackEvent({ userId, eventType: 'trip_joined', tripId });
}

/** Track when map navigation is started toward a place. */
export function trackNavigationStarted(
  userId: string,
  placeId: string,
  tripId?: string
): void {
  trackEvent({ userId, eventType: 'navigation_started', placeId, tripId });
}

/** Track when a place is added to a trip itinerary. */
export function trackPlaceAddedToTrip(
  userId: string,
  placeId: string,
  tripId: string
): void {
  trackEvent({ userId, eventType: 'place_added_to_trip', placeId, tripId });
}

/** Track when a place is removed from a trip. */
export function trackPlaceRemovedFromTrip(
  userId: string,
  placeId: string,
  tripId: string
): void {
  trackEvent({ userId, eventType: 'place_removed_from_trip', placeId, tripId });
}

/** Track when an itinerary is generated from selected places. */
export function trackItineraryGenerated(
  userId: string,
  tripId: string,
  metadata?: Record<string, unknown>
): void {
  trackEvent({ userId, eventType: 'itinerary_generated', tripId, metadata });
}
