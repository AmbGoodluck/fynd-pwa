import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { F } from '../../theme/fonts';
import { COLORS } from '../../theme/tokens';
import { useUserLocation } from '../../hooks/useUserLocation';
import { reverseGeocodeFree } from '../../services/freePlacesService';

export default function CampusBanner() {
  const { location, loading, error } = useUserLocation();
  const [cityName, setCityName] = useState<string | null>(null);

  useEffect(() => {
    if (!location || cityName) return; // don't re-geocode if already resolved
    reverseGeocodeFree(location.latitude, location.longitude)
      .then(city => {
        if (city) setCityName(city);
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
