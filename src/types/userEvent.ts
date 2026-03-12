// ─── User Activity Event Model ───────────────────────────────────────────────
// Records how users interact with trips and places.
// Powers analytics, recommendations, and future AI features.

export type EventType =
  | 'place_viewed'
  | 'place_saved'
  | 'trip_created'
  | 'trip_shared'
  | 'trip_joined'
  | 'trip_deleted'
  | 'navigation_started'
  | 'place_added_to_trip'
  | 'place_removed_from_trip'
  | 'itinerary_generated';

export interface UserEvent {
  /** UUID for this event record */
  event_id: string;
  /**
   * Authenticated user ID, or a guest session ID prefixed with "guest-".
   * Never null — guests still generate trackable events.
   */
  user_id: string;
  event_type: EventType;
  /** Relevant place, if any */
  place_id?: string;
  /** Relevant trip, if any */
  trip_id?: string;
  /** ISO timestamp */
  timestamp: string;
  /** Arbitrary extra context (destination, vibe, screen, etc.) */
  metadata?: Record<string, unknown>;
}
