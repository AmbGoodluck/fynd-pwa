/**
 * PlaceDetailScreen
 *
 * Full-screen place detail page with:
 *   • Hero image slider (scrollable, with dot indicators)
 *   • Quick actions row (Navigate, Save, Share)
 *   • AI-generated description with skeleton loading
 *   • "Known for" pill tags
 *   • Hours & Info (open/closed, expandable daily hours, address, phone, website)
 *
 * Data flow:
 *   1. Renders immediately with basic data from route.params
 *   2. Checks Firestore cache
 *   3. Fetches Google Places Details + generates OpenAI description in parallel
 *   4. Caches result for 7 days
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Linking, Platform, Animated, NativeSyntheticEvent,
  NativeScrollEvent, Dimensions, useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { F } from '../theme/fonts';
import { FALLBACK_IMAGE } from '../constants';
import { useGuestStore } from '../store/useGuestStore';
import { fetchRichPlaceData, type PlaceDetailsCache } from '../services/placeDetailsService';
import { type PlaceDetails } from '../services/googlePlacesService';

// ── Skeleton loader ───────────────────────────────────────────────────────────
function SkeletonLine({ width = '100%', height = 14, style }: { width?: number | string; height?: number; style?: any }) {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View
      style={[
        { width, height, borderRadius: height / 2, backgroundColor: '#E5E7EB', opacity: anim },
        style,
      ]}
    />
  );
}

// ── Price level dots ──────────────────────────────────────────────────────────
function PriceDots({ level }: { level: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4].map(i => (
        <Text key={i} style={{ fontSize: 13, color: i <= level ? '#10B981' : '#D1D5DB' }}>$</Text>
      ))}
    </View>
  );
}

// ── Today's day index (0 = Sunday) ───────────────────────────────────────────
// Google Places weekday_text is Mon–Sun (index 0 = Monday)
function getTodayGoogleIndex(): number {
  const jsDay = new Date().getDay(); // 0=Sun,1=Mon,...6=Sat
  return jsDay === 0 ? 6 : jsDay - 1; // Mon=0,...Sun=6
}

// ── Main component ────────────────────────────────────────────────────────────


// Main screen: must use standard React Navigation props
export default function PlaceDetailScreen(props: any) {
  const { navigation, route } = props;
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const params = route.params || {};
  // ...existing code...
  // The main render block must return JSX
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ...existing JSX... */}
    </SafeAreaView>
  );
}

  const {
    placeId,
    name,
    photoUrl,
    photoUrls: initialPhotoUrls,
    description: initialDescription,
    rating: initialRating,
    address: initialAddress,
    category,
    types: initialTypes,
    lat: initialLat,
    lng: initialLng,
  } = params;

  // ── State ──────────────────────────────────────────────────────────────────
  const [photos, setPhotos] = useState<string[]>(
    initialPhotoUrls?.length ? initialPhotoUrls : (photoUrl ? [photoUrl] : [FALLBACK_IMAGE])
  );
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const [details, setDetails] = useState<PlaceDetails | null>(null);
  const [aiDescription, setAiDescription] = useState<string>(initialDescription || '');
  const [knownFor, setKnownFor] = useState<string[]>([]);
  const [vibe, setVibe] = useState('');
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [hoursExpanded, setHoursExpanded] = useState(false);

  const { isPlaceSaved, savePlace, unsavePlace } = useGuestStore();
  const isSaved = isPlaceSaved(placeId);

  // ── Load rich data ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await fetchRichPlaceData(placeId, initialDescription);
      if (cancelled) return;
      if (result.details) {
        setDetails(result.details);
        if (result.details.photoUrls.length > 0) setPhotos(result.details.photoUrls);
      }
      setAiDescription(result.aiDescription || initialDescription || '');
      setKnownFor(result.knownFor);
      setVibe(result.vibe);
      setDetailsLoading(false);
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeId]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const openMaps = () => {
    const lat = details?.lat ?? initialLat ?? 0;
    const lng = details?.lng ?? initialLng ?? 0;
    const label = encodeURIComponent(name);
    const url = Platform.OS === 'ios'
      ? `maps:?q=${label}&ll=${lat},${lng}`
      : `geo:${lat},${lng}?q=${label}`;
    if (Platform.OS === 'web') {
      window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
    } else {
      Linking.openURL(url).catch(() => {
        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
      });
    }
  };

  const openPhone = (phone: string) => {
    if (Platform.OS === 'web') {
      window.open(`tel:${phone}`, '_self');
    } else {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const openWebsite = (url: string) => {
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url);
    }
  };

  const openAddress = () => {
    const addr = details?.formattedAddress || initialAddress || name;
    if (Platform.OS === 'web') {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`, '_blank');
    } else {
      Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(addr)}`);
    }
  };

  const handleSave = () => {
    const placeData = {
      placeId,
      name,
      description: aiDescription || initialDescription || '',
      photoUrl: photos[0] || FALLBACK_IMAGE,
      rating: details?.rating ?? initialRating ?? 4,
      category: category || details?.types?.[0]?.replace(/_/g, ' '),
      address: details?.formattedAddress || initialAddress,
      coordinates: { lat: details?.lat ?? initialLat ?? 0, lng: details?.lng ?? initialLng ?? 0 },
      types: details?.types || initialTypes,
    };
    if (isSaved) {
      unsavePlace(placeId);
    } else {
      savePlace(placeData);
    }
  };

  const handleShare = () => {
    const url = details?.mapsUrl || `https://www.google.com/maps/place/?q=place_id:${placeId}`;
    if (Platform.OS === 'web' && navigator.share) {
      navigator.share({ title: name, text: aiDescription, url }).catch(() => {});
    } else if (Platform.OS === 'web') {
      navigator.clipboard?.writeText(url).catch(() => {});
    } else {
      Linking.openURL(url);
    }
  };

  // ── Opening hours helpers ──────────────────────────────────────────────────
  const openingHours = details?.openingHours;
  const todayHours = openingHours?.weekdayText?.[getTodayGoogleIndex()];

  // ── Render ─────────────────────────────────────────────────────────────────
  const HERO_HEIGHT = 240;
  const displayRating = details?.rating ?? initialRating;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(24, insets.bottom) }}
      >
        {/* ── Hero image slider ─────────────────────────────────── */}
        <View style={[styles.heroContainer, { height: HERO_HEIGHT }]}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
              const page = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
              setCurrentPhoto(page);
            }}
          >
            {photos.map((uri, i) => (
              <Image
                key={i}
                source={{ uri }}
                style={{ width: screenWidth, height: HERO_HEIGHT, resizeMode: 'cover' }}
              />
            ))}
          </ScrollView>

          {/* Gradient overlay */}
          <View style={styles.heroGradient} pointerEvents="none" />

          {/* Name + vibe overlay */}
          <View style={styles.heroOverlay} pointerEvents="none">
            <Text style={styles.heroName} numberOfLines={2}>{name}</Text>
            {vibe ? (
              <View style={styles.vibePill}>
                <Text style={styles.vibePillText}>{vibe}</Text>
              </View>
            ) : null}
          </View>

          {/* Back button */}
          <TouchableOpacity style={[styles.heroBtn, styles.heroBtnLeft]} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </TouchableOpacity>

          {/* Save button */}
          <TouchableOpacity
            style={[styles.heroBtn, styles.heroBtnRight, isSaved && styles.heroBtnSaved]}
            onPress={handleSave}
          >
            <Ionicons name={isSaved ? 'heart' : 'heart-outline'} size={20} color="#fff" />
          </TouchableOpacity>

          {/* Dot indicators */}
          {photos.length > 1 && (
            <View style={styles.dotsRow} pointerEvents="none">
              {photos.map((_, i) => (
                <View key={i} style={[styles.dot, i === currentPhoto && styles.dotActive]} />
              ))}
            </View>
          )}
        </View>

        {/* ── Quick actions ─────────────────────────────────────── */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionItem} onPress={openMaps}>
            <View style={[styles.actionIcon, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="navigate-outline" size={20} color="#1D4ED8" />
            </View>
            <Text style={styles.actionLabel}>Navigate</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={handleSave}>
            <View style={[styles.actionIcon, { backgroundColor: isSaved ? '#FEF2F2' : '#FFF7ED' }]}>
              <Ionicons name={isSaved ? 'heart' : 'heart-outline'} size={20} color={isSaved ? '#EF4444' : '#EA580C'} />
            </View>
            <Text style={styles.actionLabel}>{isSaved ? 'Saved' : 'Save'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={handleShare}>
            <View style={[styles.actionIcon, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="share-social-outline" size={20} color="#10B981" />
            </View>
            <Text style={styles.actionLabel}>Share</Text>
          </TouchableOpacity>

          {details?.website ? (
            <TouchableOpacity style={styles.actionItem} onPress={() => openWebsite(details.website!)}>
              <View style={[styles.actionIcon, { backgroundColor: '#F5F3FF' }]}>
                <Ionicons name="globe-outline" size={20} color="#7C3AED" />
              </View>
              <Text style={styles.actionLabel}>Website</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.actionItem} onPress={openMaps}>
              <View style={[styles.actionIcon, { backgroundColor: '#FEF9C3' }]}>
                <Ionicons name="map-outline" size={20} color="#CA8A04" />
              </View>
              <Text style={styles.actionLabel}>View Map</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── AI Description ────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About this place</Text>
          {detailsLoading && !aiDescription ? (
            <View style={{ gap: 8, marginTop: 4 }}>
              <SkeletonLine width="100%" height={13} />
              <SkeletonLine width="90%" height={13} />
              <SkeletonLine width="70%" height={13} />
            </View>
          ) : aiDescription ? (
            <Text style={styles.description}>{aiDescription}</Text>
          ) : (
            <Text style={styles.descriptionMuted}>No description available.</Text>
          )}

          {/* Rating row */}
          {displayRating ? (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color="#F59E0B" />
              <Text style={styles.ratingText}>{displayRating.toFixed(1)}</Text>
              {details?.priceLevel != null && (
                <>
                  <Text style={styles.ratingDot}>·</Text>
                  <PriceDots level={details.priceLevel} />
                </>
              )}
            </View>
          ) : null}
        </View>

        {/* ── Known For ─────────────────────────────────────────── */}
        {knownFor.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Known for</Text>
            <View style={styles.knownForRow}>
              {knownFor.map((tag, i) => (
                <View key={i} style={styles.knownForPill}>
                  <Text style={styles.knownForPillText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : detailsLoading ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Known for</Text>
            <View style={styles.knownForRow}>
              <SkeletonLine width={90} height={28} style={{ borderRadius: 9999 }} />
              <SkeletonLine width={110} height={28} style={{ borderRadius: 9999 }} />
              <SkeletonLine width={80} height={28} style={{ borderRadius: 9999 }} />
            </View>
          </View>
        ) : null}

        {/* ── Hours & Info ──────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hours & Info</Text>

          {detailsLoading && !details ? (
            <View style={{ gap: 12, marginTop: 4 }}>
              <SkeletonLine width={120} height={13} />
              <SkeletonLine width="80%" height={13} />
              <SkeletonLine width="60%" height={13} />
            </View>
          ) : (
            <>
              {/* Open/closed status */}
              {openingHours && (
                <TouchableOpacity
                  style={styles.hoursHeader}
                  onPress={() => setHoursExpanded(v => !v)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.statusDot, { backgroundColor: openingHours.openNow ? '#10B981' : '#EF4444' }]} />
                  <Text style={[styles.statusText, { color: openingHours.openNow ? '#10B981' : '#EF4444' }]}>
                    {openingHours.openNow ? 'Open now' : 'Closed'}
                  </Text>
                  {todayHours ? (
                    <Text style={styles.todayHours} numberOfLines={1}>
                      {' · '}{todayHours.split(': ')[1] || todayHours}
                    </Text>
                  ) : null}
                  <Ionicons
                    name={hoursExpanded ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color="#9CA3AF"
                    style={{ marginLeft: 'auto' }}
                  />
                </TouchableOpacity>
              )}

              {/* Expanded hours list */}
              {hoursExpanded && openingHours?.weekdayText && (
                <View style={styles.hoursExpanded}>
                  {openingHours.weekdayText.map((line, i) => (
                    <Text key={i} style={styles.hoursLine}>{line}</Text>
                  ))}
                </View>
              )}

              {!openingHours && !detailsLoading && (
                <Text style={styles.infoMuted}>Hours not available</Text>
              )}

              {/* Address */}
              {(details?.formattedAddress || initialAddress) ? (
                <TouchableOpacity style={styles.infoRow} onPress={openAddress}>
                  <Ionicons name="location-outline" size={15} color="#6B7280" style={styles.infoIcon} />
                  <Text style={styles.infoText} numberOfLines={2}>
                    {details?.formattedAddress || initialAddress}
                  </Text>
                  <Ionicons name="open-outline" size={13} color="#10B981" />
                </TouchableOpacity>
              ) : null}

              {/* Phone */}
              {details?.phone ? (
                <TouchableOpacity style={styles.infoRow} onPress={() => openPhone(details.phone!)}>
                  <Ionicons name="call-outline" size={15} color="#6B7280" style={styles.infoIcon} />
                  <Text style={[styles.infoText, { color: '#1D4ED8' }]}>{details.phone}</Text>
                </TouchableOpacity>
              ) : null}

              {/* Website */}
              {details?.website ? (
                <TouchableOpacity style={styles.infoRow} onPress={() => openWebsite(details.website!)}>
                  <Ionicons name="globe-outline" size={15} color="#6B7280" style={styles.infoIcon} />
                  <Text style={[styles.infoText, { color: '#1D4ED8', flex: 1 }]} numberOfLines={1}>
                    {details.website.replace(/^https?:\/\/(www\.)?/, '')}
                  </Text>
                  <Ionicons name="open-outline" size={13} color="#10B981" />
                </TouchableOpacity>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  // Hero
  heroContainer: { position: 'relative', backgroundColor: '#E5E7EB' },
  heroGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 120,
    // Simple CSS gradient on web; on native it's just a semi-transparent overlay
    ...Platform.select({
      web: { background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.55))' } as any,
      default: { backgroundColor: 'rgba(0,0,0,0.25)' },
    }),
  },
  heroOverlay: {
    position: 'absolute', bottom: 14, left: 16, right: 60,
  },
  heroName: {
    fontSize: 22, fontFamily: F.bold, color: '#fff',
    lineHeight: 28, textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  vibePill: {
    marginTop: 6, alignSelf: 'flex-start',
    backgroundColor: '#10B981', borderRadius: 9999,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  vibePillText: { fontSize: 12, fontFamily: F.semibold, color: '#fff' },
  heroBtn: {
    position: 'absolute', top: 14,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroBtnLeft: { left: 14 },
  heroBtnRight: { right: 14 },
  heroBtnSaved: { backgroundColor: '#EF4444' },
  dotsRow: {
    position: 'absolute', bottom: 10, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 5,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },

  // Quick actions row
  actionsRow: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F2F2F7',
  },
  actionItem: { flex: 1, alignItems: 'center', paddingVertical: 16, gap: 6 },
  actionIcon: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
  },
  actionLabel: { fontSize: 11, fontFamily: F.medium, color: '#374151' },

  // Sections
  section: {
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4,
    borderBottomWidth: 1, borderBottomColor: '#F9FAFB',
  },
  sectionTitle: {
    fontSize: 14, fontFamily: F.semibold, color: '#9CA3AF',
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10,
  },

  // Description
  description: { fontSize: 15, fontFamily: F.regular, color: '#374151', lineHeight: 24 },
  descriptionMuted: { fontSize: 14, color: '#9CA3AF', fontStyle: 'italic' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  ratingText: { fontSize: 14, fontFamily: F.semibold, color: '#374151' },
  ratingDot: { fontSize: 14, color: '#D1D5DB' },

  // Known for
  knownForRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  knownForPill: {
    backgroundColor: '#ECFDF5', borderRadius: 9999,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#A7F3D0',
  },
  knownForPillText: { fontSize: 12, fontFamily: F.medium, color: '#065F46' },

  // Hours & Info
  hoursHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 6,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 14, fontFamily: F.semibold },
  todayHours: { fontSize: 13, fontFamily: F.regular, color: '#6B7280', flex: 1 },
  hoursExpanded: {
    marginTop: 8, backgroundColor: '#F9FAFB', borderRadius: 10,
    padding: 12, gap: 4,
  },
  hoursLine: { fontSize: 13, fontFamily: F.regular, color: '#374151', lineHeight: 20 },
  infoMuted: { fontSize: 13, fontFamily: F.regular, color: '#9CA3AF', marginTop: 4 },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: '#F2F2F7',
  },
  infoIcon: { width: 18 },
  infoText: { fontSize: 14, fontFamily: F.regular, color: '#374151', flex: 1 },
});
