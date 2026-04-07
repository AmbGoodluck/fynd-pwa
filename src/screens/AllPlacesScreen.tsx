/**
 * AllPlacesScreen
 *
 * Shows up to 20 top-rated places from place_details_cache.
 * Reached via "See all →" in ThingsToDoSection on the Home screen.
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ImageBackground, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { F } from '../theme/fonts';
import { COLORS } from '../theme/tokens';
import { FALLBACK_IMAGE } from '../constants';
import { useGuestStore } from '../store/useGuestStore';
import { useAuthStore } from '../store/useAuthStore';
import AppBar from '../components/AppBar';

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
  editorial_summary?: string;
  vibe?: string;
  lat: number;
  lng: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const EXCLUDED_TYPES = new Set(['gas_station', 'convenience_store', 'atm', 'car_wash', 'storage']);

// Banner gradient overlay (cross-platform)
const bannerGradient: any =
  Platform.OS === 'web'
    ? { background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.62) 100%)' }
    : { backgroundColor: 'rgba(0,0,0,0.42)' };

const cardGradient: any =
  Platform.OS === 'web'
    ? { background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)' }
    : { backgroundColor: 'rgba(0,0,0,0.28)' };

// ── Place row card ─────────────────────────────────────────────────────────────

function PlaceRow({
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

  const description = place.ai_description
    ? place.ai_description.split('.')[0] + '.'
    : place.editorial_summary
      ? place.editorial_summary.split('.')[0] + '.'
      : '';

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
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.88}>
      {/* Photo */}
      <ImageBackground
        source={{ uri: photoUrl }}
        style={styles.rowImage}
        imageStyle={styles.rowImageStyle}
      >
        <View style={[styles.rowImgGradient, cardGradient]} />
        {/* Rank badge */}
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>{index + 1}</Text>
        </View>
      </ImageBackground>

      {/* Body */}
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.rowName} numberOfLines={1}>{place.place_name}</Text>
          <TouchableOpacity onPress={handleSave} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={18}
              color={isSaved ? '#10B981' : '#9CA3AF'}
            />
          </TouchableOpacity>
        </View>

        {description ? (
          <Text style={styles.rowDesc} numberOfLines={2}>{description}</Text>
        ) : null}

        <View style={styles.rowMeta}>
          {place.rating ? (
            <View style={styles.metaChip}>
              <Ionicons name="star" size={11} color="#F59E0B" />
              <Text style={styles.metaChipText}>{Number(place.rating).toFixed(1)}</Text>
            </View>
          ) : null}
          {place.vibe ? (
            <View style={[styles.metaChip, styles.vibeChip]}>
              <Text style={styles.vibeText}>{place.vibe}</Text>
            </View>
          ) : null}
          {place.types?.[0] ? (
            <Text style={styles.typeText} numberOfLines={1}>
              {place.types[0].replace(/_/g, ' ')}
            </Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────

type Props = { navigation: any; route?: any };

export default function AllPlacesScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [places, setPlaces] = useState<CachedPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [bannerPlace, setBannerPlace] = useState<CachedPlace | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Fetch 30 to allow client-side type filter → take top 20
        const q = query(
          collection(db, 'place_details_cache'),
          orderBy('rating', 'desc'),
          limit(30),
        );
        const snap = await getDocs(q);
        if (cancelled) return;

        const filtered = snap.docs
          .map(d => ({ place_id: d.id, ...d.data() } as CachedPlace))
          .filter(p => !p.types?.some(t => EXCLUDED_TYPES.has(t)))
          .slice(0, 20);

        if (filtered.length > 0) {
          setBannerPlace(filtered[0]);
          setPlaces(filtered);
        }
      } catch {
        // Firestore unavailable
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const navigateToDetail = (place: CachedPlace) => {
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
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={Platform.OS === 'web' ? [] : ['top']}>
      <AppBar
        variant="sub"
        title="Things to Do"
        onBack={() => navigation.goBack()}
      />

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      ) : (
        <FlatList
          data={places}
          keyExtractor={item => item.place_id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + 24 },
          ]}
          ListHeaderComponent={
            bannerPlace ? (
              <TouchableOpacity
                activeOpacity={0.92}
                onPress={() => navigateToDetail(bannerPlace)}
              >
                <ImageBackground
                  source={{ uri: bannerPlace.photo_urls?.[0] || FALLBACK_IMAGE }}
                  style={styles.banner}
                  imageStyle={styles.bannerImg}
                >
                  <View style={[styles.bannerOverlay, bannerGradient]}>
                    <View style={styles.bannerBadge}>
                      <Text style={styles.bannerBadgeText}>🔥 Top Rated</Text>
                    </View>
                    <Text style={styles.bannerName} numberOfLines={2}>
                      {bannerPlace.place_name}
                    </Text>
                    {bannerPlace.ai_description ? (
                      <Text style={styles.bannerDesc} numberOfLines={2}>
                        {bannerPlace.ai_description.split('.')[0] + '.'}
                      </Text>
                    ) : null}
                    <View style={styles.bannerMeta}>
                      {bannerPlace.rating ? (
                        <View style={styles.bannerRating}>
                          <Ionicons name="star" size={13} color="#F59E0B" />
                          <Text style={styles.bannerRatingText}>
                            {Number(bannerPlace.rating).toFixed(1)}
                          </Text>
                        </View>
                      ) : null}
                      {bannerPlace.vibe ? (
                        <Text style={styles.bannerVibe}>{bannerPlace.vibe}</Text>
                      ) : null}
                    </View>
                  </View>
                </ImageBackground>
              </TouchableOpacity>
            ) : null
          }
          renderItem={({ item, index }) => (
            <PlaceRow
              place={item}
              index={index}
              onPress={() => navigateToDetail(item)}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  list: { paddingTop: 0 },

  // Hero banner
  banner: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
    height: 220,
    borderRadius: 18,
    overflow: 'hidden',
  },
  bannerImg: { borderRadius: 18, resizeMode: 'cover' },
  bannerOverlay: {
    flex: 1,
    borderRadius: 18,
    padding: 18,
    justifyContent: 'flex-end',
  },
  bannerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EF4444',
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginBottom: 10,
  },
  bannerBadgeText: { fontSize: 11, fontFamily: F.bold, color: '#fff' },
  bannerName: {
    fontSize: 22,
    fontFamily: F.bold,
    color: '#fff',
    marginBottom: 6,
    letterSpacing: -0.4,
  },
  bannerDesc: {
    fontSize: 13,
    fontFamily: F.regular,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 18,
    marginBottom: 10,
  },
  bannerMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bannerRating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bannerRatingText: { fontSize: 13, fontFamily: F.semibold, color: '#fff' },
  bannerVibe: {
    fontSize: 12,
    fontFamily: F.medium,
    color: 'rgba(255,255,255,0.8)',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },

  // Place rows
  row: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border.light,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  separator: { height: 10 },

  rowImage: {
    width: 96,
    height: 96,
    justifyContent: 'flex-end',
  },
  rowImageStyle: { resizeMode: 'cover' },
  rowImgGradient: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 48,
  },
  rankBadge: {
    position: 'absolute',
    top: 7, left: 7,
    width: 22, height: 22,
    borderRadius: 11,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { fontSize: 11, fontFamily: F.bold, color: '#fff' },

  rowBody: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'space-between',
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 3,
  },
  rowName: {
    flex: 1,
    fontSize: 14,
    fontFamily: F.semibold,
    color: COLORS.text.primary,
  },
  rowDesc: {
    fontSize: 12,
    fontFamily: F.regular,
    color: COLORS.text.secondary,
    lineHeight: 16,
    marginBottom: 6,
  },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  metaChipText: { fontSize: 11, fontFamily: F.medium, color: COLORS.text.secondary },
  vibeChip: { backgroundColor: '#F0FDF4' },
  vibeText: { fontSize: 11, fontFamily: F.medium, color: '#059669' },
  typeText: {
    fontSize: 11,
    fontFamily: F.regular,
    color: COLORS.text.tertiary,
    textTransform: 'capitalize',
    flexShrink: 1,
  },
});
