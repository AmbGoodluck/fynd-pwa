import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ImageBackground, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { F } from '../../theme/fonts';
import { COLORS } from '../../theme/tokens';
import { FALLBACK_IMAGE } from '../../constants';
import { useGuestStore } from '../../store/useGuestStore';
import { useAuthStore } from '../../store/useAuthStore';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CachedPlace {
  place_id: string;
  place_name: string;
  formatted_address: string;
  city: string;
  rating?: number;
  photo_urls: string[];
  types: string[];
  ai_description: string;
  lat: number;
  lng: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const EXCLUDED_TYPES = new Set(['gas_station', 'convenience_store', 'atm', 'car_wash', 'storage']);

const BADGES = [
  { label: '🔥 Hot',      bg: '#EF4444' },
  { label: '↑ Rising',    bg: '#10B981' },
  { label: '✦ Popular',   bg: '#1A1A1A' },
] as const;

const CLASSMATE_COUNTS = [21, 14, 38, 9, 17, 6, 29, 11, 43, 7, 25, 18];
const DISTANCES        = ['0.3 mi', '0.6 mi', '0.8 mi', '1.1 mi', '0.4 mi', '1.5 mi',
                          '0.2 mi', '0.9 mi', '1.3 mi', '0.5 mi', '1.8 mi', '0.7 mi'];

// ── Gradient overlay ──────────────────────────────────────────────────────────

const imgGradient: any =
  Platform.OS === 'web'
    ? { background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%)' }
    : { backgroundColor: 'rgba(0,0,0,0.3)' };

// ── Per-card component (needs hooks for save state) ───────────────────────────

function ThingsToDoCard({
  place,
  index,
  onPress,
}: {
  place: CachedPlace;
  index: number;
  onPress: () => void;
}) {
  const { isGuest, isPlaceSaved, savePlace, unsavePlace } = useGuestStore();
  const { isAuthenticated } = useAuthStore();

  const isSaved = isPlaceSaved(place.place_id);
  const photoUrl = place.photo_urls?.[0] || FALLBACK_IMAGE;
  const badge = index < BADGES.length ? BADGES[index] : null;
  // Remove fake classmate count and use rating and vibe
  const rating = place.rating ? Number(place.rating).toFixed(1) : undefined;
  const vibe = place.vibe || '';
  const distance = place.distanceKm ? `${place.distanceKm} mi` : '';

  const handleSave = () => {
    if (!isAuthenticated || isGuest) return;
    if (isSaved) {
      unsavePlace(place.place_id);
    } else {
      savePlace({
        placeId: place.place_id,
        name: place.place_name,
        address: place.formatted_address,
        rating: place.rating ?? 4.0,
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
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={14}
            color={isSaved ? '#10B981' : '#1A1A1A'}
          />
        </TouchableOpacity>
      </ImageBackground>

      {/* Body */}
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{place.place_name}</Text>
        {/* Truncate to first sentence of ai_description, fallback to editorial_summary */}
        <Text style={styles.cardDesc} numberOfLines={2}>
          {place.ai_description
            ? place.ai_description.split('.')[0] + '.'
            : place.editorial_summary
              ? place.editorial_summary.split('.')[0] + '.'
              : ''}
        </Text>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.footerLeft}>
            {rating && (
              <Text style={{ color: '#F59E0B', fontWeight: 'bold', fontSize: 12 }}>★ {rating}</Text>
            )}
          </View>
          {vibe ? (
            <View style={{ backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, marginLeft: 6 }}>
              <Text style={{ color: '#6B7280', fontSize: 11 }}>{vibe}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type Props = { navigation: any };

export default function ThingsToDoSection({ navigation }: Props) {
  const [places, setPlaces] = useState<CachedPlace[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Fetch 25 to allow client-side filtering of excluded types → take 12
        const q = query(
          collection(db, 'place_details_cache'),
          orderBy('rating', 'desc'),
          limit(25),
        );
        const snap = await getDocs(q);
        if (cancelled) return;

        const filtered = snap.docs
          .map(d => ({ place_id: d.id, ...d.data() } as CachedPlace))
          .filter(p => !p.types?.some(t => EXCLUDED_TYPES.has(t)))
          .slice(0, 12);

        setPlaces(filtered);
      } catch {
        // Firestore unavailable — section stays hidden
      }
    })();

    return () => { cancelled = true; };
  }, []);

  if (places.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      {/* Section header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Things to Do</Text>
        <TouchableOpacity
          onPress={() => console.log('[ThingsToDo] See all pressed')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.seeAll}>See all →</Text>
        </TouchableOpacity>
      </View>

      {/* Horizontal card scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {places.map((place, index) => (
          <ThingsToDoCard
            key={place.place_id}
            place={place}
            index={index}
            onPress={() =>
              navigation.navigate('PlaceDetail', {
                placeId: place.place_id,
                name: place.place_name,
                photoUrl: place.photo_urls?.[0],
                photoUrls: place.photo_urls,
                description: place.ai_description,
                rating: place.rating,
                address: place.formatted_address,
                types: place.types,
                lat: place.lat,
                lng: place.lng,
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

  // Card
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

  // Body
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
    gap: 3,
  },
  classmateText: {
    fontSize: 10.5,
    fontFamily: F.medium,
    color: '#10B981',
  },
  distanceText: {
    fontSize: 10,
    fontFamily: F.regular,
    color: COLORS.text.tertiary,
  },
});
