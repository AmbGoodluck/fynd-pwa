import { searchPlacesByVibe } from '../../../services/googlePlacesService';
import { checkTripLimit, saveTrip } from '../../../services/database';
import { isGuestUser } from '../../auth/guestUser';
import {
  placeSearchCache,
  placeSearchCacheKey,
} from '../../../services/cacheService';
import {
  trackTripCreated,
  trackItineraryGenerated,
} from '../../../services/eventTrackingService';

export type StartTripInput = {
  userId: string;
  destination: string;
  accommodation: string;
  explorationHours: number;
  distanceKm: number;
  timeOfDay: string;
  selectedVibes: string[];
  vibeKeywords: string[];
};

export type StartTripResult = {
  tripId: string | null;
  places: any[];
  limitBlockedReason?: string;
  fromCache: boolean;
};

export async function startTripDiscovery(input: StartTripInput): Promise<StartTripResult> {
  const {
    userId,
    destination,
    accommodation,
    explorationHours,
    distanceKm,
    timeOfDay,
    selectedVibes,
    vibeKeywords,
  } = input;

  let tripId: string | null = null;

  if (!isGuestUser(userId)) {
    const limitCheck = await checkTripLimit(userId);
    if (!limitCheck.allowed) {
      return {
        tripId: null,
        places: [],
        limitBlockedReason: limitCheck.reason || 'Trip limit reached.',
        fromCache: false,
      };
    }

    tripId = await saveTrip(userId, {
      destination,
      accommodation,
      explorationHours,
      distanceKm,
      timeOfDay,
      vibesSelected: selectedVibes,
      tripName: `Trip to ${destination}`,
    });

    trackTripCreated(userId, tripId ?? '', {
      destination,
      vibes: selectedVibes,
      timeOfDay,
    });
  }

  // Check cache before hitting Google Places
  const cacheKey = placeSearchCacheKey(destination, vibeKeywords, timeOfDay);
  const cached = placeSearchCache.get(cacheKey);

  if (cached) {
    return { tripId, places: cached, fromCache: true };
  }

  const places = await searchPlacesByVibe(
    destination,
    vibeKeywords,
    0,
    0,
    distanceKm,
    timeOfDay
  );

  // Store in cache for subsequent calls
  placeSearchCache.set(cacheKey, places);

  return { tripId, places, fromCache: false };
}

/**
 * Call this when the user confirms and generates a full itinerary.
 * Records the itinerary_generated event for activity tracking.
 */
export function recordItineraryGenerated(
  userId: string,
  tripId: string,
  placeCount: number,
  destination: string
): void {
  trackItineraryGenerated(userId, tripId, { placeCount, destination });
}
