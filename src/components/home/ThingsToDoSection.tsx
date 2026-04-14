import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ImageBackground, Platform, ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { F } from '../../theme/fonts';
import { COLORS } from '../../theme/tokens';
import { FALLBACK_IMAGE } from '../../constants';
import { useGuestStore } from '../../store/useGuestStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useUserLocation } from '../../hooks/useUserLocation';
import { getPlacesForLocation, reverseGeocodeFree, type FyndPlace } from '../../services/freePlacesService';
import GuestGateModal from '../GuestGateModal';

// ── Constants ─────────────────────────────────────────────────────────────────

const EXCLUDED_TYPES = new Set([
  'gas_station', 'convenience_store', 'atm',
  'parking', 'storage', 'car_dealer', 'car_rental', 'car_repair', 'car_wash',
  'insurance_agency', 'real_estate_agency', 'moving_company', 'locksmith',
  'electrician', 'plumber', 'roofing_contractor', 'painter', 'lawyer',
  'accounting', 'funeral_home',
]);

const DEPRIORITIZED_TYPES = new Set([
  'gym', 'fitness_center', 'health', 'martial_arts', 'physiotherapist',
  'hair_care', 'beauty_salon', 'laundry', 'church', 'place_of_worship',
  'dentist', 'doctor', 'veterinary_care',
]);

const BOOSTED_TYPES = new Set([
  'restaurant', 'cafe', 'bar', 'park', 'museum', 'tourist_attraction',
  'art_gallery', 'library', 'book_store', 'bakery', 'night_club',
  'movie_theater', 'bowling_alley', 'amusement_park', 'campground',
  'natural_feature',
]);

// ── Personalization maps ──────────────────────────────────────────────────────

const PREFERENCE_TO_TYPES: Record<string, string[]> = {
  hidden_gems:   ['point_of_interest', 'establishment', 'art_gallery', 'museum'],
  photography:   ['park', 'natural_feature', 'tourist_attraction', 'art_gallery', 'viewpoint'],
  work_friendly: ['cafe', 'library', 'book_store', 'coworking'],
  arts_culture:  ['art_gallery', 'museum', 'performing_arts_theater', 'cultural_center'],
  outdoor_park:  ['park', 'campground', 'natural_feature', 'hiking_area', 'trail'],
  food_drinks:   ['restaurant', 'cafe', 'bakery', 'bar', 'meal_delivery', 'meal_takeaway', 'food'],
  nightlife:     ['bar', 'night_club', 'pub', 'lounge'],
  shopping:      ['shopping_mall', 'store', 'clothing_store', 'home_goods_store', 'gift_shop', 'book_store'],
  wellness:      ['spa', 'gym', 'yoga', 'health'],
  adventure:     ['campground', 'natural_feature', 'park', 'tourist_attraction', 'amusement_park'],
  beaches:       ['beach', 'natural_feature', 'water'],
  history:       ['museum', 'church', 'cemetery', 'monument', 'historic', 'heritage'],
  music:         ['night_club', 'bar', 'performing_arts_theater', 'music', 'entertainment'],
  family:        ['park', 'amusement_park', 'zoo', 'aquarium', 'museum', 'bowling_alley', 'movie_theater'],
};

const PREFERENCE_TO_KEYWORDS: Record<string, string[]> = {
  hidden_gems:   ['hidden', 'gem', 'unique', 'local', 'off-beat', 'quirky'],
  photography:   ['scenic', 'view', 'sunset', 'overlook', 'panoramic', 'beautiful'],
  work_friendly: ['study', 'wifi', 'quiet', 'laptop', 'cozy', 'coffee'],
  arts_culture:  ['art', 'gallery', 'museum', 'craft', 'artisan', 'cultural'],
  outdoor_park:  ['trail', 'hike', 'park', 'nature', 'forest', 'outdoor', 'lake', 'creek'],
  food_drinks:   ['food', 'restaurant', 'cafe', 'pizza', 'brunch', 'dinner', 'lunch', 'coffee', 'bakery'],
  nightlife:     ['bar', 'pub', 'tavern', 'lounge', 'nightlife', 'cocktail', 'beer', 'live music'],
  shopping:      ['shop', 'store', 'mall', 'boutique', 'thrift', 'antique', 'market', 'gallery'],
  wellness:      ['gym', 'yoga', 'fitness', 'spa', 'wellness', 'health'],
  adventure:     ['adventure', 'hiking', 'trail', 'climbing', 'kayak', 'bike', 'outdoor'],
  beaches:       ['beach', 'lake', 'swimming', 'water', 'shore'],
  history:       ['historic', 'history', 'heritage', 'museum', 'monument', 'old', 'civil war'],
  music:         ['music', 'live', 'concert', 'band', 'entertainment', 'show'],
  family:        ['family', 'kids', 'children', 'playground', 'fun', 'arcade'],
};

function calculateRelevance(place: FyndPlace, preferences: string[]): number {
  if (preferences.length === 0) return 0;
  let score = 0;
  const placeTypes = (place.types || []).map(t => t.toLowerCase());
  const haystack = [
    ...placeTypes,
    (place.known_for || []).join(' ').toLowerCase(),
    (place.vibe || '').toLowerCase(),
    (place.ai_description || '').toLowerCase(),
  ].join(' ');

  for (const pref of preferences) {
    for (const t of (PREFERENCE_TO_TYPES[pref] || [])) {
      if (placeTypes.some(pt => pt.includes(t.replace(/_/g, ' ')) || pt.includes(t))) {
        score += 3;
      }
    }
    for (const kw of (PREFERENCE_TO_KEYWORDS[pref] || [])) {
      if (haystack.includes(kw)) score += 1;
    }
  }
  return score;
}

function sortPlaces(places: FyndPlace[], preferences: string[] = []): FyndPlace[] {
  if (preferences.length > 0) {
    const scored = places.map(p => ({ place: p, relevance: calculateRelevance(p, preferences) }));
    const hasRelevant = scored.some(s => s.relevance > 0);
    if (hasRelevant) {
      return scored
        .sort((a, b) => {
          if (b.relevance !== a.relevance) return b.relevance - a.relevance;
          return a.place.name.localeCompare(b.place.name);
        })
        .map(s => s.place);
    }
  }

  return [...places].sort((a, b) => {
    const aTypes = a.types || [];
    const bTypes = b.types || [];
    const aBoosted = aTypes.some(t => BOOSTED_TYPES.has(t)) ? 1 : 0;
    const bBoosted = bTypes.some(t => BOOSTED_TYPES.has(t)) ? 1 : 0;
    const aDeprio  = aTypes.some(t => DEPRIORITIZED_TYPES.has(t)) ? -1 : 0;
    const bDeprio  = bTypes.some(t => DEPRIORITIZED_TYPES.has(t)) ? -1 : 0;
    const aScore = aBoosted + aDeprio;
    const bScore = bBoosted + bDeprio;
    if (bScore !== aScore) return bScore - aScore;
    return a.name.localeCompare(b.name);
  });
}

const BADGES = [
  { label: '🔥 Hot',      bg: '#EF4444' },
  { label: '↑ Rising',    bg: '#10B981' },
  { label: '✦ Popular',   bg: '#1A1A1A' },
] as const;

const imgGradient: any =
  Platform.OS === 'web'
    ? { background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%)' }
    : { backgroundColor: 'rgba(0,0,0,0.3)' };

// ── Per-card component ────────────────────────────────────────────────────────

function ThingsToDoCard({
  place,
  index,
  onPress,
}: {
  place: FyndPlace;
  index: number;
  onPress: () => void;
}) {
  const { isGuest, isPlaceSaved, savePlace, unsavePlace } = useGuestStore();
  const { isAuthenticated } = useAuthStore();

  const isSaved = isPlaceSaved(place.id);
  const photoUrl = place.photo_urls?.[0] || FALLBACK_IMAGE;
  const badge = index < BADGES.length ? BADGES[index] : null;
  const vibe = place.vibe || '';
  const [showGate, setShowGate] = useState(false);

  const handleSave = () => {
    if (!isAuthenticated || isGuest) {
      setShowGate(true);
      return;
    }
    if (isSaved) {
      unsavePlace(place.id);
    } else {
      savePlace({
        placeId: place.id,
        name: place.name,
        address: place.address,
        rating: undefined,
        description: place.ai_description || '',
        photoRef: '',
        photoUrl,
        photoUrls: place.photo_urls,
        coordinates: { lat: place.lat, lng: place.lng },
        category: place.types?.[0]?.replace(/_/g, ' '),
        city: place.city,
        types: place.types,
      } as any);
    }
  };

  return (
    <>
      <GuestGateModal
        visible={showGate}
        onDismiss={() => setShowGate(false)}
        onLogin={() => setShowGate(false)}
        onRegister={() => setShowGate(false)}
        onContinueAsGuest={() => setShowGate(false)}
      />
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
        {/* Image */}
        <ImageBackground
          source={{ uri: photoUrl }}
          style={styles.cardImage}
          imageStyle={styles.cardImageStyle}
        >
          <View style={[styles.imgGradient, imgGradient]} />

          {/* Trending badge — top left */}
          {badge && (
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Text style={styles.badgeText}>{badge.label}</Text>
            </View>
          )}

          {/* Save icon — top right */}
          <TouchableOpacity
            style={[styles.saveBtn, isSaved && styles.saveBtnActive]}
            onPress={handleSave}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons
              name={isSaved ? 'heart' : 'heart-outline'}
              size={14}
              color={isSaved ? '#E24B4A' : '#9CA3AF'}
            />
          </TouchableOpacity>
        </ImageBackground>

        {/* Body */}
        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={1}>{place.name}</Text>
          <Text style={styles.cardDesc} numberOfLines={2}>
            {place.ai_description
              ? place.ai_description.split('.')[0] + '.'
              : place.types?.[0]?.replace(/_/g, ' ') || ''}
          </Text>

          {/* Footer */}
          <View style={styles.cardFooter}>
            <View style={styles.footerLeft} />
            {vibe ? (
              <View style={{ backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 }}>
                <Text style={{ color: '#6B7280', fontSize: 11 }}>{vibe}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type Props = { navigation: any };

export default function ThingsToDoSection({ navigation }: Props) {
  const [places, setPlaces] = useState<FyndPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore(s => s.user);
  const preferences = user?.travelPreferences || [];
  const { location } = useUserLocation();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!location) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const cityName = await reverseGeocodeFree(location.latitude, location.longitude);
        if (cancelled) return;

        const fetched = await getPlacesForLocation(
          location.latitude,
          location.longitude,
          cityName,
          {
            vibeFilter: preferences,
            excludeTypes: Array.from(EXCLUDED_TYPES),
            limit: 15,
          },
        );
        if (cancelled) return;

        setPlaces(sortPlaces(fetched, preferences));
      } catch {
        // Overpass unavailable — section stays hidden
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [location]);

  if (loading) {
    return (
      <View style={styles.wrapper}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Things to Do</Text>
        </View>
        <View style={styles.seedingMsg}>
          <ActivityIndicator size="small" color="#10B981" style={{ marginRight: 10 }} />
          <Text style={styles.seedingText}>Discovering places near you…</Text>
        </View>
      </View>
    );
  }

  if (places.length === 0) return null;

  const sectionTitle = preferences.length > 0 ? 'For You' : 'Things to Do';

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{sectionTitle}</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('AllPlaces')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.seeAll}>See all →</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {places.map((place, index) => (
          <ThingsToDoCard
            key={place.id}
            place={place}
            index={index}
            onPress={() =>
              navigation.navigate('PlaceDetail', {
                placeId: place.id,
                name: place.name,
                photoUrl: place.photo_urls?.[0],
                photoUrls: place.photo_urls,
                description: place.ai_description,
                rating: undefined,
                address: place.address,
                types: place.types,
                city: place.city,
                lat: place.lat,
                lng: place.lng,
                phone: place.phone,
                website: place.website,
                opening_hours_raw: place.opening_hours_raw,
              })
            }
          />
        ))}
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const CARD_W = 195;

const styles = StyleSheet.create({
  wrapper: { marginTop: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: F.bold,
    color: COLORS.text.primary,
  },
  seeAll: {
    fontSize: 13,
    fontFamily: F.semibold,
    color: '#10B981',
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 4,
  },
  seedingMsg: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  seedingText: {
    flex: 1,
    fontSize: 13,
    fontFamily: F.regular,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },

  card: {
    width: CARD_W,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  cardImage: {
    height: 125,
    width: '100%',
    justifyContent: 'flex-end',
  },
  cardImageStyle: {
    resizeMode: 'cover',
  },
  imgGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: F.bold,
    color: '#fff',
  },
  saveBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnActive: {
    backgroundColor: '#F0FDF4',
  },
  cardBody: {
    padding: 10,
  },
  cardName: {
    fontSize: 14,
    fontFamily: F.semibold,
    color: COLORS.text.primary,
    marginBottom: 3,
  },
  cardDesc: {
    fontSize: 11,
    fontFamily: F.regular,
    color: COLORS.text.secondary,
    lineHeight: 15,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
