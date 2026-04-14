/**
 * citySeedService.ts — DEPRECATED
 *
 * City seeding via Firestore has been replaced by local AsyncStorage caching
 * in freePlacesService.ts. Places are now fetched on-device from Overpass API
 * (free) and cached locally for 7 days. No Firestore writes required.
 *
 * This file is kept as a no-op stub so any remaining references don't break
 * at build time. Safe to delete once all call sites have been cleaned up.
 */

export async function checkAndSeedCity(
  _cityName: string,
  _lat: number,
  _lng: number,
  _userId: string,
): Promise<void> {
  // No-op — seeding now happens automatically via getPlacesForLocation()
}
