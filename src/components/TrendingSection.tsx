import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { F } from '../theme/fonts';
import { useUserLocation } from '../hooks/useUserLocation';
import {
  getVisibleCategories,
  gradientStyle,
  type TrendingCategory,
} from '../config/trendingCategories';
import { reverseGeocode } from '../services/googlePlacesService';

const CARD_W = 140;
const CARD_H = 170;

type Props = {
  navigation: { navigate: (screen: string, params?: object) => void };
};

// ── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return <View style={styles.skeletonCard} />;
}

// ── Category card ─────────────────────────────────────────────────────────────
const CategoryCard = React.memo(function CategoryCard({
  category,
  onPress,
}: {
  category: TrendingCategory;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      style={[
        styles.card,
        gradientStyle(category.gradient) as ViewStyle,
      ]}
    >
      {/* Subtitle pill */}
      <View style={styles.subtitlePill}>
        <Text style={styles.subtitleText} numberOfLines={1}>
          {category.subtitle}
        </Text>
      </View>

      {/* Bottom scrim + label */}
      <View style={styles.cardScrim}>
        <Text style={styles.cardLabel} numberOfLines={2}>
          {category.label}
        </Text>
        <Text style={styles.cardCount}>Explore</Text>
      </View>
    </TouchableOpacity>
  );
});

// ── TrendingSection ───────────────────────────────────────────────────────────
export default function TrendingSection({ navigation }: Props) {
  const { location, loading: locLoading, error: locError } = useUserLocation();

  // Categories frozen on first render — don't re-compute mid-session.
  const categoriesRef = useRef<TrendingCategory[]>(getVisibleCategories());
  const categories = categoriesRef.current;

  const [cityName, setCityName] = useState<string>('Near you');

  // Reverse-geocode to get city name once location is available.
  useEffect(() => {
    if (!location) return;
    reverseGeocode(location.latitude, location.longitude)
      .then((city) => {
        if (city) setCityName(city);
      })
      .catch(() => {});
  }, [location]);

  // Location denied — hide section completely.
  if (locError === 'denied') return null;

  const handleCardPress = (category: TrendingCategory) => {
    if (!location) return;
    navigation.navigate('CategoryPlaces', {
      category,
      userLat: location.latitude,
      userLng: location.longitude,
      cityName,
    });
  };

  return (
    <View style={styles.wrapper}>
      {/* Section header */}
      <View style={styles.header}>
        <Text style={styles.title}>Trending near you</Text>
        <Text style={styles.subtitle}>{cityName}</Text>
      </View>

      {/* Horizontal scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {locLoading || !location
          ? [0, 1, 2].map((i) => <SkeletonCard key={i} />)
          : categories.map((cat) => (
              <CategoryCard
                key={cat.id}
                category={cat}
                onPress={() => handleCardPress(cat)}
              />
            ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 8,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 12,
    marginTop: 8,
  },
  title: {
    fontSize: 16,
    fontFamily: F.semibold,
    color: '#111827',
  },
  subtitle: {
    fontSize: 11,
    fontFamily: F.regular,
    color: '#9CA3AF',
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 10,
  },

  // Category card
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'space-between',
    padding: 10,
  },
  subtitlePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 2,
  },
  subtitleText: {
    fontSize: 10,
    color: '#fff',
    fontFamily: F.medium,
  },
  cardScrim: {
    // handled by padding from card
  },
  cardLabel: {
    fontSize: 13,
    fontFamily: F.semibold,
    color: '#fff',
    lineHeight: 17,
    marginBottom: 2,
  },
  cardCount: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: F.regular,
  },

  // Skeleton
  skeletonCard: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
});
