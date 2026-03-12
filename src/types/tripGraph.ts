// ─── Trip Graph Architecture ─────────────────────────────────────────────────
// Relational model replacing simple "trip with place list".
// Supports shared trips, ordered places, and role-based member permissions.

export type TripVisibility = 'private' | 'shared';
export type TripMemberRole = 'owner' | 'member';

// ─── Core Models ─────────────────────────────────────────────────────────────

/**
 * Top-level trip record.
 * V1 constraint: one-day trips only (trip_date is a single YYYY-MM-DD string).
 */
export interface TripGraph {
  /** UUID — also used as the share link ID */
  trip_id: string;
  owner_id: string;
  trip_name: string;
  /** YYYY-MM-DD. V1: must equal today's date (one-day trips only). */
  trip_date: string;
  destination: string;
  visibility: TripVisibility;
  /** ISO timestamp */
  created_at: string;
  member_count: number;
  place_count: number;
  /** Canonical share URL: fynd.app/trip/{trip_id} */
  share_link: string;
}

/**
 * A place node within a trip.
 * Ordered by order_index; owner can reorder.
 */
export interface TripPlaceNode {
  /** UUID */
  trip_place_id: string;
  trip_id: string;
  place_id: string;
  place_name: string;
  address?: string;
  photo_url?: string;
  rating?: number;
  category?: string;
  distance_km?: number;
  walk_minutes?: number;
  description?: string;
  booking_url?: string;
  coordinates?: { lat: number; lng: number };
  /** Zero-based position in the itinerary */
  order_index: number;
  /** user_id of whoever added this place */
  added_by: string;
  /** ISO timestamp */
  created_at: string;
}

/**
 * A member attached to a trip.
 * Compatible with the legacy TripMember shape in sharedTrip.ts.
 */
export interface TripMemberNode {
  /** UUID */
  trip_member_id: string;
  trip_id: string;
  user_id: string;
  user_name: string;
  role: TripMemberRole;
  /** ISO timestamp */
  joined_at: string;
}

// ─── Permission Model ─────────────────────────────────────────────────────────

export interface TripRolePermissions {
  canAddPlaces: boolean;
  canRemovePlaces: boolean;
  canReorderPlaces: boolean;
  canDeleteTrip: boolean;
  canRemoveMembers: boolean;
  canViewTrip: boolean;
  canNavigate: boolean;
  canSaveTrip: boolean;
}

export const OWNER_PERMISSIONS: TripRolePermissions = {
  canAddPlaces: true,
  canRemovePlaces: true,
  canReorderPlaces: true,
  canDeleteTrip: true,
  canRemoveMembers: true,
  canViewTrip: true,
  canNavigate: true,
  canSaveTrip: true,
};

export const MEMBER_PERMISSIONS: TripRolePermissions = {
  canAddPlaces: false,
  canRemovePlaces: false,
  canReorderPlaces: false,
  canDeleteTrip: false,
  canRemoveMembers: false,
  canViewTrip: true,
  canNavigate: true,
  canSaveTrip: true,
};

export function getPermissions(role: TripMemberRole): TripRolePermissions {
  return role === 'owner' ? OWNER_PERMISSIONS : MEMBER_PERMISSIONS;
}

// ─── V1 Trip Constraints ─────────────────────────────────────────────────────

export const TRIP_CONSTRAINTS = {
  /** Free users: max places per trip itinerary */
  maxPlacesFree: 5,
  /** Premium users: no enforced limit */
  maxPlacesPremium: Infinity,
  /** V1: one-day trips only */
  maxDaysPerTrip: 1,
  shareLinkBase: 'fynd.app/trip',
} as const;

export function buildTripShareLink(trip_id: string): string {
  return `${TRIP_CONSTRAINTS.shareLinkBase}/${trip_id}`;
}

/**
 * Validates that a trip_date string is today's date (YYYY-MM-DD).
 * V1 enforces one-day trips only.
 */
export function validateTripDate(trip_date: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  return trip_date === today;
}
