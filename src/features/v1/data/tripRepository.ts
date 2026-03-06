import { searchPlacesByVibe } from '../../../services/googlePlacesService';
import { checkTripLimit, saveTrip } from '../../../services/database';
import { isGuestUser } from '../../auth/guestUser';

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
      return { tripId: null, places: [], limitBlockedReason: limitCheck.reason || 'Trip limit reached.' };
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
  }

  const places = await searchPlacesByVibe(destination, vibeKeywords);
  return { tripId, places };
}
