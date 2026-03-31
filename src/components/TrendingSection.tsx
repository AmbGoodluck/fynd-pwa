import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { F } from '../theme/fonts';
import { useUserLocation } from '../hooks/useUserLocation';
import {
  getVisibleCategories,
  gradientStyle,
  type TrendingCategory,
} from '../config/trendingCategories';
import { reverseGeocode } from '../services/googlePlacesService';
import { markA2HSEligible } from '../hooks/useAddToHomeScreen';

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

  const [retryFlag, setRetryFlag] = useState(0);

  // Re-request location when user taps the prompt (web only).
  const retryLocation = () => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        // Bust the module cache so useUserLocation picks up the new value on next mount,
        // but for this session just update local display via retryFlag re-render trigger.
        // (A full solution would expose a retry from the hook; this is V1-simple.)
        setRetryFlag((f) => f + 1);
        reverseGeocode(loc.latitude, loc.longitude)
          .then((city) => { if (city) setCityName(city); })
          .catch(() => {});
      },
      () => {},
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  const handleCardPress = (category: TrendingCategory) => {
    if (!location) return;
    markA2HSEligible();
    navigation.navigate('CategoryPlaces', {
      category,
      userLat: location.latitude,
      userLng: location.longitude,
      cityName,
    });
  };

  const locationDenied = locError === 'denied';

  return (
    <View style={styles.wrapper}>
      {/* Section header */}
      <View style={styles.header}>
        <Text style={styles.title}>Trending near you</Text>
        <Text style={styles.subtitle}>{locationDenied ? 'Enable location for local results' : cityName}</Text>
      </View>

      {/* Horizontal scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {locationDenied ? (
          <TouchableOpacity style={styles.locationPrompt} onPress={retryLocation} activeOpacity={0.85}>
            <View style={styles.locationPromptIcon}>
              <Ionicons name="location-outline" size={22} color="#10B981" />
            </View>
            <Text style={styles.locationPromptTitle}>Allow location access</Text>
            <Text style={styles.locationPromptHint}>
              Tap to see trending spots{'\n'}near you right now
            </Text>
          </TouchableOpacity>
        ) : locLoading || !location ? (
          [0, 1, 2].map((i) => <SkeletonCard key={i} />)
        ) : (
          categories.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              onPress={() => handleCardPress(cat)}
            />
          ))
        )}
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

  // Location denied prompt
  locationPrompt: {
    width: 200,
    height: CARD_H,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  locationPromptIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  locationPromptTitle: {
    fontSize: 13,
    fontFamily: F.semibold,
    color: '#065F46',
    marginBottom: 4,
    textAlign: 'center',
  },
  locationPromptHint: {
    fontSize: 11,
    fontFamily: F.regular,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 16,
  },
});
