export interface SharedTripPlace {
  placeId: string;
  name: string;
  address?: string;
  photoUrl?: string;
  rating?: number;
  category?: string;
  distanceKm?: number;
  walkMinutes?: number;
  description?: string;
  bookingUrl?: string;
  coordinates?: { lat: number; lng: number };
}

export type MemberRole = 'owner' | 'member';

export interface SharedTrip {
  trip_id: string;
  owner_id: string;
  owner_name: string;
  trip_name: string;
  trip_date: string;
  created_at: string;
  places: SharedTripPlace[];
  visibility: 'shared';
  member_count: number;
  /** Firebase Auth UIDs of every member (owner + joiners). Used for Firestore
   *  array-contains queries and security rule membership checks. */
  members: string[];
}

export interface TripMember {
  member_id: string;
  trip_id: string;
  user_id: string;
  user_name: string;
  role: MemberRole;
  joined_at: string;
}
