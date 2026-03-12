// ─── Travel-Focused API Structure ────────────────────────────────────────────
// Typed request/response contracts for all travel actions.
// Currently backed by Firestore + Google Places.
// Designed to be swappable with a REST backend without UI changes.
//
// API route map:
//   GET  /places/search
//   GET  /places/recommend
//   POST /trip/create
//   POST /trip/add-place
//   POST /trip/remove-place
//   POST /trip/share
//   POST /trip/join
//   GET  /trip/:trip_id

import type { PlaceResult } from './googlePlacesService';
import type { TripGraph, TripPlaceNode, TripMemberNode } from '../types/tripGraph';

// ─── Route constants ──────────────────────────────────────────────────────────

export const TRAVEL_API_ROUTES = {
  PLACES_SEARCH:     'GET /places/search',
  PLACES_RECOMMEND:  'GET /places/recommend',
  TRIP_CREATE:       'POST /trip/create',
  TRIP_ADD_PLACE:    'POST /trip/add-place',
  TRIP_REMOVE_PLACE: 'POST /trip/remove-place',
  TRIP_SHARE:        'POST /trip/share',
  TRIP_JOIN:         'POST /trip/join',
  TRIP_GET:          'GET /trip/:trip_id',
} as const;

export type TravelApiRoute = typeof TRAVEL_API_ROUTES[keyof typeof TRAVEL_API_ROUTES];

// ─── Places ───────────────────────────────────────────────────────────────────

export interface PlaceSearchRequest {
  destination: string;
  vibes: string[];
  time_of_day?: string;
  origin_lat?: number;
  origin_lng?: number;
  max_distance_km?: number;
}

export interface PlaceSearchResponse {
  places: PlaceResult[];
  /** true if result came from in-memory cache */
  cached: boolean;
  query_time_ms: number;
}

export interface PlaceRecommendRequest {
  user_id: string;
  destination?: string;
  limit?: number;
}

export interface PlaceRecommendResponse {
  places: PlaceResult[];
  cached: boolean;
}

// ─── Trip create ──────────────────────────────────────────────────────────────

export interface TripCreateRequest {
  owner_id: string;
  owner_name: string;
  trip_name: string;
  /** YYYY-MM-DD. V1: must be today (one-day trips only). */
  trip_date: string;
  destination: string;
  places: Array<Omit<TripPlaceNode, 'trip_place_id' | 'trip_id' | 'added_by' | 'created_at' | 'order_index'>>;
  visibility?: 'private' | 'shared';
}

export interface TripCreateResponse {
  trip: TripGraph;
  share_link: string;
}

// ─── Trip place management ────────────────────────────────────────────────────

export interface TripAddPlaceRequest {
  trip_id: string;
  /** Must be the trip owner for write actions */
  user_id: string;
  place: Omit<TripPlaceNode, 'trip_place_id' | 'trip_id' | 'added_by' | 'created_at' | 'order_index'>;
}

export interface TripAddPlaceResponse {
  place_node: TripPlaceNode;
}

export interface TripRemovePlaceRequest {
  trip_id: string;
  trip_place_id: string;
  /** Must be the trip owner for write actions */
  user_id: string;
}

// ─── Trip sharing ─────────────────────────────────────────────────────────────

export interface TripShareRequest {
  trip_id: string;
  owner_id: string;
}

export interface TripShareResponse {
  share_link: string;
  trip_id: string;
}

// ─── Trip joining ─────────────────────────────────────────────────────────────

export interface TripJoinRequest {
  trip_id: string;
  user_id: string;
  user_name: string;
}

export interface TripJoinResponse {
  member: TripMemberNode;
  trip: TripGraph;
  /** true if the user was already a member — UI should open trip directly */
  already_member: boolean;
}

// ─── Trip retrieval ───────────────────────────────────────────────────────────

export interface TripGetResponse {
  trip: TripGraph | null;
  places: TripPlaceNode[];
  members: TripMemberNode[];
  /**
   * Edge case flags for UI handling:
   *   not_found  → "This trip is no longer available"
   *   deleted    → "This trip has been deleted by the owner"
   */
  not_found: boolean;
  deleted: boolean;
}

// ─── Error types ──────────────────────────────────────────────────────────────

export type TravelApiErrorCode =
  | 'TRIP_NOT_FOUND'
  | 'TRIP_DELETED'
  | 'MEMBER_REMOVED'
  | 'PERMISSION_DENIED'
  | 'PLACE_LIMIT_REACHED'
  | 'TRIP_DATE_INVALID'
  | 'ALREADY_MEMBER';

export class TravelApiError extends Error {
  constructor(
    public readonly code: TravelApiErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'TravelApiError';
  }
}
