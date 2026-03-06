import { Alert, Linking, Platform } from 'react-native';

export type MapPoint = {
  latitude: number;
  longitude: number;
  label?: string;
};

export async function openInExternalMaps(point: MapPoint) {
  const { latitude, longitude, label } = point;
  const encodedLabel = encodeURIComponent(label || 'Destination');

  const googleMapsUrl = Platform.select({
    android: `google.navigation:q=${latitude},${longitude}`,
    ios: `comgooglemaps://?q=${latitude},${longitude}`,
    default: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
  });

  const fallbackUrl = Platform.select({
    ios: `http://maps.apple.com/?ll=${latitude},${longitude}&q=${encodedLabel}`,
    default: `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodedLabel})`,
  });

  try {
    if (googleMapsUrl && await Linking.canOpenURL(googleMapsUrl)) {
      await Linking.openURL(googleMapsUrl);
      return true;
    }

    if (fallbackUrl && await Linking.canOpenURL(fallbackUrl)) {
      await Linking.openURL(fallbackUrl);
      return true;
    }
  } catch (error) {
    console.log('Failed to open maps', error);
  }

  Alert.alert('Maps unavailable', 'No maps application is available on this device.');
  return false;
}
