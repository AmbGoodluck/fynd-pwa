import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { F } from '../../theme/fonts';
import { COLORS } from '../../theme/tokens';
import { useUserLocation } from '../../hooks/useUserLocation';
import { reverseGeocode } from '../../services/googlePlacesService';
import { useAuthStore } from '../../store/useAuthStore';
import { checkAndSeedCity } from '../../services/citySeedService';

export default function CampusBanner() {
  const { location, loading, error } = useUserLocation();
  const [cityName, setCityName] = useState<string | null>(null);
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    if (!location || cityName) return; // don't re-geocode if already resolved
    reverseGeocode(location.latitude, location.longitude)
      .then(city => {
        if (city) {
          setCityName(city);
          // Fire-and-forget: seed this city if it hasn't been seeded yet
          if (city !== 'My Location' && user?.id) {
            checkAndSeedCity(city, location.latitude, location.longitude, user.id)
              .catch(() => {});
          }
        }
      })
      .catch(() => {});
  }, [location]);

  let label: string;
  let cityPart: string | null = null;

  if (loading) {
    label = '📍 Detecting your location...';
  } else if (error || !location) {
    label = '📍 Explore places near you';
  } else {
    cityPart = cityName || null;
    label = '📍 Exploring ';
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.text} numberOfLines={1}>
        {cityPart !== null ? (
          <>
            <Text style={styles.muted}>📍 Exploring </Text>
            <Text style={styles.city}>{cityPart}</Text>
          </>
        ) : (
          <Text style={styles.muted}>{label}</Text>
        )}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  text: {
    fontSize: 14,
  },
  muted: {
    fontFamily: F.medium,
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  city: {
    fontFamily: F.semibold,
    fontSize: 14,
    color: COLORS.text.primary,
  },
});
