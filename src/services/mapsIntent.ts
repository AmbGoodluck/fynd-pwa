import { Alert, Linking, Platform } from 'react-native';

export type MapPoint = {
  latitude: number;
  longitude: number;
  label?: string;
};

/**
 * Opens the phone's native maps app and starts turn-by-turn directions to a
 * single destination.
 *
 * Priority order:
 *  Android  → Google Maps navigation intent  (google.navigation:q=)
 *  iOS      → Google Maps app if installed   (comgooglemaps://?daddr=)
 *           → Apple Maps fallback            (maps://?daddr=)
 *  Web      → Google Maps in a new tab
 */
export async function openInExternalMaps(point: MapPoint): Promise<boolean> {
  const { latitude, longitude, label } = point;
  const encodedLabel = encodeURIComponent(label || 'Destination');

  if (Platform.OS === 'web') {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=walking`;
    try {
      (window as any).open(url, '_blank');
      return true;
    } catch {
      return false;
    }
  }

  // Android — Google Maps navigation intent (always available if GMaps is installed)
  if (Platform.OS === 'android') {
    const navUrl = `google.navigation:q=${latitude},${longitude}`;
    const fallback = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=walking`;
    try {
      if (await Linking.canOpenURL(navUrl)) {
        await Linking.openURL(navUrl);
        return true;
      }
      await Linking.openURL(fallback);
      return true;
    } catch {
      Alert.alert('Maps unavailable', 'Could not open a maps app on this device.');
      return false;
    }
  }

  // iOS — try Google Maps first, fall back to Apple Maps
  const googleUrl = `comgooglemaps://?daddr=${latitude},${longitude}&directionsmode=walking&q=${encodedLabel}`;
  const appleUrl  = `maps://?daddr=${latitude},${longitude}&q=${encodedLabel}`;

  try {
    if (await Linking.canOpenURL(googleUrl)) {
      await Linking.openURL(googleUrl);
      return true;
    }
    if (await Linking.canOpenURL(appleUrl)) {
      await Linking.openURL(appleUrl);
      return true;
    }
    // Last resort: universal Google Maps web URL (Safari → opens Apple Maps on iOS)
    await Linking.openURL(
      `https://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=w`,
    );
    return true;
  } catch {
    Alert.alert('Maps unavailable', 'Could not open a maps app on this device.');
    return false;
  }
}

/**
 * Opens the phone's native maps app with a multi-stop walking route.
 * All stops are passed in order: first = origin, last = destination,
 * middle ones = waypoints.
 *
 * Falls back to single-stop navigation when there is only one stop.
 */
export async function openRouteInMaps(stops: MapPoint[]): Promise<boolean> {
  if (stops.length === 0) return false;
  if (stops.length === 1) return openInExternalMaps(stops[0]);

  const origin = stops[0];
  const dest   = stops[stops.length - 1];
  const waypoints = stops.slice(1, -1)
    .map(s => `${s.latitude},${s.longitude}`)
    .join('|');

  let url =
    `https://www.google.com/maps/dir/?api=1` +
    `&origin=${origin.latitude},${origin.longitude}` +
    `&destination=${dest.latitude},${dest.longitude}` +
    `&travelmode=walking`;

  if (waypoints) url += `&waypoints=${encodeURIComponent(waypoints)}`;

  try {
    if (Platform.OS === 'web') {
      (window as any).open(url, '_blank');
      return true;
    }
    await Linking.openURL(url);
    return true;
  } catch {
    Alert.alert('Maps unavailable', 'Could not open a maps app on this device.');
    return false;
  }
}
