import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Linking, Platform, Animated, NativeSyntheticEvent,
  NativeScrollEvent, useWindowDimensions, Share, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { F } from '../theme/fonts';
import { COLORS, RADIUS, SPACING } from '../theme/tokens';
import { FALLBACK_IMAGE } from '../constants';
import { useGuestStore } from '../store/useGuestStore';
import { useAuthStore } from '../store/useAuthStore';
import { fetchPlaceDetails, type PlaceDetails } from '../services/googlePlacesService';
import { generatePlaceDescription } from '../services/openaiService';
import { recordVisit, hasVisited } from '../services/visitService';

// ── Alternating palette for Known For tags ────────────────────────────────────
const KNOWN_FOR_PALETTE = [
  { bg: COLORS.accent.primaryLight, text: COLORS.accent.primaryDark },
  { bg: COLORS.accent.sageLight,    text: COLORS.accent.sage },
  { bg: COLORS.accent.amberLight,   text: COLORS.accent.amber },
  { bg: COLORS.accent.plumLight,    text: COLORS.accent.plum },
];

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
        <Text key={i} style={{ fontSize: 13, color: i <= level ? COLORS.accent.sage : '#D1D5DB' }}>$</Text>
      ))}
    </View>
  );
}

// ── Today's day index (0 = Sunday) ───────────────────────────────────────────
function getTodayGoogleIndex(): number {
  const jsDay = new Date().getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PlaceDetailScreen(props: any) {
    // Fix 2: Generate AI description if missing and place has a name
    useEffect(() => {
      if (!aiDescription && name) {
        generatePlaceDescription(
          name,
          initialAddress || '',
          params.city || '',
          params.types || [],
          undefined,
          undefined
        ).then(result => {
          if (result) {
            setAiDescription(result.description);
            setKnownFor(result.knownFor || []);
            setVibe(result.vibe || '');
          }
        }).catch(() => {});
      }
    }, [aiDescription, name, initialAddress, params.city, params.types]);
  const { navigation, route } = props;
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const params = route.params || {};

  const { savePlace, unsavePlace, savedPlaces, isGuest } = useGuestStore();
  const { user, isAuthenticated } = useAuthStore();

  // FyndPlace passed directly from Home (has vibe, known_for, etc.)
  const routePlace = params.place;

  const placeId          = params.placeId;
  const name             = params.name || 'Unknown Place';
  const photoUrl         = params.photoUrl;
  const initialPhotoUrls = params.photoUrls || [];
  const initialDescription = params.description || '';
  const initialRating    = params.rating;
  const initialAddress   = params.address || '';
  const category         = params.category || '';
  const initialLat       = params.lat;
  const initialLng       = params.lng;
  const initialPhone     = params.phone || routePlace?.phone;
  const initialWebsite   = params.website || routePlace?.website;

  const isSaved = savedPlaces.some(p => p.placeId === placeId);

  // ── State ──────────────────────────────────────────────────────────────────
  const [photos, setPhotos] = useState<string[]>(
    initialPhotoUrls?.length
      ? initialPhotoUrls
      : routePlace?.photo_urls?.length
        ? routePlace.photo_urls
        : photoUrl
          ? [photoUrl]
          : [FALLBACK_IMAGE]
  );
  const [currentPhoto, setCurrentPhoto]   = useState(0);
  const [details, setDetails]             = useState<PlaceDetails | null>(null);
  const [aiDescription, setAiDescription] = useState<string>(initialDescription || routePlace?.ai_description || '');
  const [knownFor, setKnownFor]           = useState<string[]>(routePlace?.known_for || []);
  const [vibe, setVibe]                   = useState(routePlace?.vibe || '');
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [hoursExpanded, setHoursExpanded] = useState(false);
  const [visited, setVisited]             = useState(false);
  const [visitLoading, setVisitLoading]   = useState(false);

  const openingHours    = details?.openingHours;
  const isRawOSMHours   = openingHours?.weekdayText?.length === 1
    && !/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday):/.test(openingHours.weekdayText[0]);
  const todayHours      = isRawOSMHours
    ? openingHours?.weekdayText?.[0]
    : openingHours?.weekdayText?.[getTodayGoogleIndex()];

  // ── Check if already visited ───────────────────────────────────────────────
  useEffect(() => {
    if (user?.id && placeId) {
      hasVisited(user.id, placeId).then(setVisited).catch(() => {});
    }
  }, [user?.id, placeId]);

  // ── Load rich data ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!placeId) { setDetailsLoading(false); return; }

      if (placeId.startsWith('osm_')) {
        // OSM place: data from params + FyndPlace object
        // Only generate AI if we truly have nothing
        const needsAI = !aiDescription && !routePlace?.vibe;
        if (needsAI) {
          generatePlaceDescription(
            name, initialAddress, params.city || '', params.types || [],
          ).then(res => {
            if (!cancelled && res) {
              setAiDescription(res.description);
              setKnownFor(res.knownFor);
              setVibe(res.vibe);
            }
          }).catch(() => {});
        }
        setDetailsLoading(false);
        return;
      }

      // Google place: fetch full details + AI description in parallel
      const [googleDetails, aiRes] = await Promise.all([
        fetchPlaceDetails(placeId),
        generatePlaceDescription(
          name, initialAddress, params.city || '', params.types || [], initialRating,
        ),
      ]);

      if (cancelled) return;

      if (googleDetails) {
        setDetails(googleDetails);
        if (googleDetails.photoUrls.length > 0) setPhotos(googleDetails.photoUrls);
      }
      if (aiRes) {
        setAiDescription(aiRes.description);
        setKnownFor(aiRes.knownFor);
        setVibe(aiRes.vibe);
      } else {
        setAiDescription(googleDetails?.editorialSummary || initialDescription || '');
      }
      setDetailsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [placeId, initialDescription]);

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
    if (Platform.OS === 'web') { window.open(`tel:${phone}`, '_self'); }
    else { Linking.openURL(`tel:${phone}`); }
  };

  const openWebsite = (url: string) => {
    if (Platform.OS === 'web') { window.open(url, '_blank'); }
    else { Linking.openURL(url); }
  };

  const openAddress = () => {
    const addr = details?.formattedAddress || initialAddress || name;
    if (Platform.OS === 'web') {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`, '_blank');
    } else {
      Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(addr)}`);
    }
  };

  const handleShare = async () => {
    try {
      const url = details?.mapsUrl
        || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`;
      await Share.share({ message: `Check out ${name} on Fynd!\n${url}` });
    } catch { /* ignore */ }
  };

  const handleSave = () => {
    if (isGuest || !isAuthenticated) {
      Alert.alert('Account Required', 'Sign in to save places.');
      return;
    }
    if (isSaved) {
      unsavePlace(placeId);
    } else {
      savePlace({
        placeId,
        name,
        address: details?.formattedAddress || initialAddress,
        description: aiDescription || initialDescription || '',
        photoUrl: photos[0] || FALLBACK_IMAGE,
        photoUrls: photos,
        rating: details?.rating ?? initialRating ?? 4.0,
        coordinates: {
          lat: details?.lat ?? initialLat ?? 0,
          lng: details?.lng ?? initialLng ?? 0,
        },
        category: category || details?.types?.[0]?.replace(/_/g, ' ') || 'place',
        types: details?.types || params.types || [],
      } as any);
    }
  };

  const handleVisit = async () => {
    if (isGuest || !isAuthenticated || !user?.id) {
      Alert.alert('Account Required', 'Sign in to track visited places.');
      return;
    }
    if (visited || visitLoading) return;
    setVisitLoading(true);
    const placeTypes = (details?.types || params.types || []) as string[];
    const placeCity  = params.city
      || (details?.formattedAddress?.split(',').pop()?.trim() ?? '');
    await recordVisit(user.id, placeId, name, placeTypes, placeCity, 'detail_screen');
    setVisited(true);
    setVisitLoading(false);
    Alert.alert('Got it!', "We'll improve your picks based on where you go.");
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const HERO_HEIGHT  = 240;
  const displayRating = details?.rating ?? initialRating;
  const displayPhone  = details?.phone || initialPhone;
  const displayWebsite = details?.website || initialWebsite;

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
          <TouchableOpacity
            style={[styles.heroBtn, styles.heroBtnLeft]}
            onPress={() => navigation.goBack()}
          >
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
            <View style={[styles.actionIcon, { backgroundColor: COLORS.accent.primaryLight }]}>
              <Ionicons name="navigate-outline" size={20} color={COLORS.accent.primary} />
            </View>
            <Text style={styles.actionLabel}>Navigate</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={handleSave}>
            <View style={[styles.actionIcon, { backgroundColor: COLORS.accent.sageLight }]}>
              <Ionicons
                name={isSaved ? 'heart' : 'heart-outline'}
                size={20}
                color={COLORS.accent.sage}
              />
            </View>
            <Text style={styles.actionLabel}>{isSaved ? 'Saved' : 'Save'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={handleShare}>
            <View style={[styles.actionIcon, { backgroundColor: COLORS.accent.skyLight }]}>
              <Ionicons name="share-social-outline" size={20} color={COLORS.accent.sky} />
            </View>
            <Text style={styles.actionLabel}>Share</Text>
          </TouchableOpacity>

          {displayWebsite ? (
            <TouchableOpacity style={styles.actionItem} onPress={() => openWebsite(displayWebsite)}>
              <View style={[styles.actionIcon, { backgroundColor: COLORS.accent.plumLight }]}>
                <Ionicons name="globe-outline" size={20} color={COLORS.accent.plum} />
              </View>
              <Text style={styles.actionLabel}>Website</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.actionItem} onPress={openMaps}>
              <View style={[styles.actionIcon, { backgroundColor: COLORS.accent.plumLight }]}>
                <Ionicons name="map-outline" size={20} color={COLORS.accent.plum} />
              </View>
              <Text style={styles.actionLabel}>View Map</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── AI Description ────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ABOUT THIS PLACE</Text>
          {detailsLoading && !aiDescription ? (
            <View style={{ gap: 8, marginTop: 4 }}>
              <SkeletonLine width="100%" height={13} />
              <SkeletonLine width="90%" height={13} />
              <SkeletonLine width="70%" height={13} />
            </View>
          ) : aiDescription ? (
            <Text style={styles.description}>{aiDescription}</Text>
          ) : (
            <Text style={styles.descriptionMuted}>
              {params.types?.length > 0
                ? `A ${(params.types[0] as string).replace(/_/g, ' ')} in ${params.city || 'your area'}. Tap "I went here" to help us learn about this place.`
                : 'Tap "I went here" to help us learn about this place.'}
            </Text>
          )}

          {/* Rating row */}
          {displayRating ? (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color={COLORS.accent.amber} />
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
            <Text style={styles.sectionTitle}>KNOWN FOR</Text>
            <View style={styles.knownForRow}>
              {knownFor.map((tag, i) => {
                const c = KNOWN_FOR_PALETTE[i % KNOWN_FOR_PALETTE.length];
                return (
                  <View
                    key={i}
                    style={[styles.knownForPill, { backgroundColor: c.bg, borderColor: c.bg }]}
                  >
                    <Text style={[styles.knownForPillText, { color: c.text }]}>{tag}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : detailsLoading ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>KNOWN FOR</Text>
            <View style={styles.knownForRow}>
              <SkeletonLine width={90} height={28} style={{ borderRadius: 9999 }} />
              <SkeletonLine width={110} height={28} style={{ borderRadius: 9999 }} />
              <SkeletonLine width={80} height={28} style={{ borderRadius: 9999 }} />
            </View>
          </View>
        ) : null}

        {/* ── Hours & Info ──────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>HOURS & INFO</Text>

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
                  onPress={() => !isRawOSMHours && setHoursExpanded(v => !v)}
                  activeOpacity={isRawOSMHours ? 1 : 0.7}
                >
                  <View style={[
                    styles.statusDot,
                    { backgroundColor: openingHours.openNow ? COLORS.accent.sage : COLORS.accent.danger },
                  ]} />
                  <Text style={[
                    styles.statusText,
                    { color: openingHours.openNow ? COLORS.accent.sage : COLORS.accent.danger },
                  ]}>
                    {openingHours.openNow ? 'Open now' : 'Closed'}
                  </Text>
                  {todayHours ? (
                    <Text
                      style={[styles.todayHours, isRawOSMHours && { flex: 0, marginLeft: 4 }]}
                      numberOfLines={1}
                    >
                      {' · '}{todayHours.split(': ')[1] || todayHours}
                    </Text>
                  ) : null}
                  {!isRawOSMHours && (
                    <Ionicons
                      name={hoursExpanded ? 'chevron-up' : 'chevron-down'}
                      size={14}
                      color={COLORS.text.hint}
                      style={{ marginLeft: 'auto' }}
                    />
                  )}
                </TouchableOpacity>
              )}

              {/* Expanded hours list */}
              {hoursExpanded && openingHours?.weekdayText && !isRawOSMHours && (
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
                  <Ionicons
                    name="location-outline"
                    size={15}
                    color={COLORS.text.tertiary}
                    style={styles.infoIcon}
                  />
                  <Text style={styles.infoText} numberOfLines={2}>
                    {details?.formattedAddress || initialAddress}
                  </Text>
                  <Ionicons name="open-outline" size={13} color={COLORS.accent.sage} />
                </TouchableOpacity>
              ) : null}

              {/* Phone */}
              {displayPhone ? (
                <TouchableOpacity style={styles.infoRow} onPress={() => openPhone(displayPhone)}>
                  <Ionicons
                    name="call-outline"
                    size={15}
                    color={COLORS.text.tertiary}
                    style={styles.infoIcon}
                  />
                  <Text style={[styles.infoText, { color: COLORS.accent.sky }]}>{displayPhone}</Text>
                </TouchableOpacity>
              ) : null}

              {/* Website */}
              {displayWebsite ? (
                <TouchableOpacity style={styles.infoRow} onPress={() => openWebsite(displayWebsite)}>
                  <Ionicons
                    name="globe-outline"
                    size={15}
                    color={COLORS.text.tertiary}
                    style={styles.infoIcon}
                  />
                  <Text style={[styles.infoText, { color: COLORS.accent.sky, flex: 1 }]} numberOfLines={1}>
                    {displayWebsite.replace(/^https?:\/\/(www\.)?/, '')}
                  </Text>
                  <Ionicons name="open-outline" size={13} color={COLORS.accent.sage} />
                </TouchableOpacity>
              ) : null}
            </>
          )}
        </View>

        {/* ── I Went Here ───────────────────────────────────────── */}
        <View style={styles.wentHereSection}>
          <TouchableOpacity
            style={[
              styles.wentHereBtn,
              (visited || visitLoading) && styles.wentHereBtnDisabled,
            ]}
            onPress={handleVisit}
            disabled={visited || visitLoading}
            activeOpacity={0.85}
          >
            {visitLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : visited ? (
              <>
                <Ionicons name="checkmark" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.wentHereBtnText}>Visited ✓</Text>
              </>
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={18}
                  color="#fff"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.wentHereBtnText}>I went here</Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.wentHereHint}>Help us learn what you like</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Hero
  heroContainer: { position: 'relative', backgroundColor: '#E5E7EB' },
  heroGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 120,
    ...Platform.select({
      web:     { background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.55))' } as any,
      default: { backgroundColor: 'rgba(0,0,0,0.25)' },
    }),
  },
  heroOverlay: { position: 'absolute', bottom: 14, left: 16, right: 60 },
  heroName: {
    fontSize: 22, fontFamily: F.bold, color: '#fff',
    lineHeight: 28, textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  vibePill: {
    marginTop: 6, alignSelf: 'flex-start',
    backgroundColor: COLORS.accent.primary, borderRadius: RADIUS.full,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  vibePillText: { fontSize: 12, fontFamily: F.semibold, color: '#fff' },
  heroBtn: {
    position: 'absolute', top: 14,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroBtnLeft:  { left: 14 },
  heroBtnRight: { right: 14 },
  heroBtnSaved: { backgroundColor: COLORS.accent.sage },
  dotsRow: {
    position: 'absolute', bottom: 10, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 5,
  },
  dot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },

  // Quick actions row
  actionsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  actionItem:  { flex: 1, alignItems: 'center', paddingVertical: 16, gap: 6 },
  actionIcon:  {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
  },
  actionLabel: { fontSize: 11, fontFamily: F.medium, color: COLORS.text.secondary },

  // Sections
  section: {
    paddingHorizontal: SPACING.xl, paddingTop: SPACING.xl, paddingBottom: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.border.light,
  },
  sectionTitle: {
    fontSize: 11, fontFamily: F.semibold, color: COLORS.text.hint,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: SPACING.sm,
  },

  // Description
  description:      { fontSize: 15, fontFamily: F.regular, color: COLORS.text.secondary, lineHeight: 24 },
  descriptionMuted: { fontSize: 14, color: COLORS.text.hint, fontStyle: 'italic' },
  ratingRow:        { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.sm },
  ratingText:       { fontSize: 14, fontFamily: F.semibold, color: COLORS.text.secondary },
  ratingDot:        { fontSize: 14, color: COLORS.border.default },

  // Known for
  knownForRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  knownForPill: {
    borderRadius: RADIUS.full,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1,
  },
  knownForPillText: { fontSize: 12, fontFamily: F.medium },

  // Hours & Info
  hoursHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6,
  },
  statusDot:    { width: 8, height: 8, borderRadius: 4 },
  statusText:   { fontSize: 14, fontFamily: F.semibold },
  todayHours:   { fontSize: 13, fontFamily: F.regular, color: COLORS.text.tertiary, flex: 1 },
  hoursExpanded: {
    marginTop: 8, backgroundColor: COLORS.border.light, borderRadius: RADIUS.sm,
    padding: 12, gap: 4,
  },
  hoursLine: { fontSize: 13, fontFamily: F.regular, color: COLORS.text.secondary, lineHeight: 20 },
  infoMuted:  { fontSize: 13, fontFamily: F.regular, color: COLORS.text.hint, marginTop: 4 },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: COLORS.border.light,
  },
  infoIcon: { width: 18 },
  infoText: { fontSize: 14, fontFamily: F.regular, color: COLORS.text.secondary, flex: 1 },

  // I Went Here
  wentHereSection: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  wentHereBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.accent.primary,
    borderRadius: RADIUS.lg, paddingVertical: SPACING.lg,
    shadowColor: COLORS.accent.primary, shadowOpacity: 0.25,
    shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  wentHereBtnDisabled: { backgroundColor: COLORS.text.disabled },
  wentHereBtnText: { fontSize: 16, fontFamily: F.bold, color: COLORS.text.inverse },
  wentHereHint: {
    fontSize: 11, fontFamily: F.regular, color: COLORS.text.hint,
    textAlign: 'center', marginTop: SPACING.sm,
  },
});
