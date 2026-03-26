import { useState, useEffect } from 'react';
import { Platform } from 'react-native';

export interface UserLocation {
  latitude: number;
  longitude: number;
}

interface LocationResult {
  location: UserLocation | null;
  loading: boolean;
  error: string | null;
}

const CACHE_MS = 15 * 60 * 1000; // 15 minutes
let _cache: { location: UserLocation; at: number } | null = null;

function fromCache(): UserLocation | null {
  if (_cache && Date.now() - _cache.at < CACHE_MS) return _cache.location;
  return null;
}

/** Returns the user's current location.
 *  - Caches the result for 15 minutes to avoid repeated permission prompts.
 *  - On web: uses navigator.geolocation directly.
 *  - On native: uses expo-location.
 *  - If permission is denied, returns null location gracefully (no error surfaced to UI). */
export function useUserLocation(): LocationResult {
  const initial = fromCache();
  const [location, setLocation] = useState<UserLocation | null>(initial);
  const [loading, setLoading] = useState<boolean>(!initial);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Already resolved from module-level cache — skip re-fetch.
    if (fromCache()) return;

    if (Platform.OS === 'web') {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        setError('denied');
        setLoading(false);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc: UserLocation = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          _cache = { location: loc, at: Date.now() };
          setLocation(loc);
          setLoading(false);
        },
        () => {
          setError('denied');
          setLoading(false);
        },
        { timeout: 15000, enableHighAccuracy: false }
      );
    } else {
      // Native: use expo-location (already installed at ^55.1.2)
      import('expo-location').then(async (Loc) => {
        try {
          const { status } = await Loc.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            setError('denied');
            setLoading(false);
            return;
          }
          const pos = await Loc.getCurrentPositionAsync({});
          const loc: UserLocation = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          _cache = { location: loc, at: Date.now() };
          setLocation(loc);
          setLoading(false);
        } catch {
          setError('unavailable');
          setLoading(false);
        }
      }).catch(() => {
        setError('unavailable');
        setLoading(false);
      });
    }
  }, []);

  return { location, loading, error };
}
