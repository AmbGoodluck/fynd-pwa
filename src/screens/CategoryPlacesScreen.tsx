import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { F } from '../theme/fonts';
import { FALLBACK_IMAGE } from '../constants';
import { searchPlacesByVibe, type PlaceResult } from '../services/googlePlacesService';
import { useGuestStore } from '../store/useGuestStore';
import { useAuthStore } from '../store/useAuthStore';
import { useRecentTripStore } from '../store/useRecentTripStore';
import { gradientStyle, type TrendingCategory } from '../config/trendingCategories';
import type { RecentTrip } from '../types/recentTrip';
import type { Place } from '../store/useTripStore';

// ── Types ─────────────────────────────────────────────────────────────────────
type FilterId = 'all' | 'under2mi' | 'toprated';

type Props = {
  navigation: { navigate: (screen: string, params?: object) => void; goBack: () => void };
  route: {
    params: {
      category: TrendingCategory;
      userLat: number;
      userLng: number;
      cityName: string;
    };
  };
};

// ── Constants ─────────────────────────────────────────────────────────────────
const KM_PER_MILE = 1.60934;
const TWO_MI_IN_KM = 2 * KM_PER_MILE;

// ── Validity & time-context filtering ────────────────────────────────────────

/** Hard filter: never show permanently or temporarily closed places. */
function isPlaceValid(place: PlaceResult): boolean {
  if (place.business_status === 'CLOSED_PERMANENTLY') return false;
  if (place.business_status === 'CLOSED_TEMPORARILY') return false;
  return true;
}

/**
 * Time-context filter per category.
 *
 * Because Google Places Text/Nearby Search only returns `open_now` (not detailed
 * periods), we use it as a proxy:
 *
 * open_now    → exclude places where open_now === false
 * open_until  → same proxy (we can't verify closing time without periods data)
 * open_after  → AGGRESSIVE: only include places where open_now === true;
 *               places without hours data are also excluded for this category
 *               because it is high-trust (user is hungry at midnight).
 */
function doesPlaceMatchTimeContext(
  place: PlaceResult,
  category: TrendingCategory
): boolean {
  const { timeFilter } = category;
  const openNow = place.opening_hours?.open_now;

  switch (timeFilter.type) {
    case 'open_now':
    case 'open_until':
      // Confirmed closed → exclude. Unknown or confirmed open → include.
      return openNow !== false;

    case 'open_after':
      // Late night eats: only confirmed-open places. No data → exclude.
      return openNow === true;
  }
}

// ── Sort helpers ──────────────────────────────────────────────────────────────

/**
 * Sort priority: confirmed-open first (0), no hours data (1), confirmed-closed (2).
 * Within each group, sort by distance ascending.
 */
function openPriority(place: PlaceResult): number {
  if (place.opening_hours?.open_now === true) return 0;
  if (place.opening_hours?.open_now === false) return 2;
  return 1; // undefined → "Hours N/A"
}

function buildDisplayList(
  places: PlaceResult[],
  filter: FilterId
): PlaceResult[] {
  let list = [...places];

  if (filter === 'under2mi') {
    list = list.filter((p) => p.distanceKm !== undefined && p.distanceKm < TWO_MI_IN_KM);
  }

  list.sort((a, b) => {
    const oPriority = openPriority(a) - openPriority(b);
    if (oPriority !== 0) return oPriority;

    if (filter === 'toprated') {
      return (b.rating ?? 0) - (a.rating ?? 0);
    }
    return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
  });

  return list;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDistance(km: number | undefined): string {
  if (km === undefined) return '';
  return `${(km / KM_PER_MILE).toFixed(1)} mi`;
}

// ── Skeleton row ──────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <View style={styles.skeletonRow}>
      <View style={styles.skeletonThumb} />
      <View style={styles.skeletonLines}>
        <View style={[styles.skeletonLine, { width: '60%' }]} />
        <View style={[styles.skeletonLine, { width: '40%', marginTop: 6 }]} />
        <View style={[styles.skeletonLine, { width: '50%', marginTop: 6 }]} />
      </View>
    </View>
  );
}

// ── Open status badge ─────────────────────────────────────────────────────────
function OpenBadge({ openNow }: { openNow: boolean | undefined }) {
  if (openNow === true) {
    return (
      <View style={styles.openBadge}>
        <View style={styles.openDot} />
        <Text style={styles.openText}>Open</Text>
      </View>
    );
  }
  if (openNow === false) {
    return <Text style={styles.closedText}>Closed</Text>;
  }
  return <Text style={styles.hoursNaText}>Hours N/A</Text>;
}

// ── Place row ─────────────────────────────────────────────────────────────────
const PlaceRow = React.memo(function PlaceRow({
  place,
  isSaved,
  onSave,
  onNavigate,
  catGradient,
}: {
  place: PlaceResult;
  isSaved: boolean;
  onSave: () => void;
  onNavigate: () => void;
  catGradient: [string, string, string];
}) {
  const distLabel = fmtDistance(place.distanceKm);
  const ratingLabel = place.rating ? place.rating.toFixed(1) : '';
  const typeLabel = place.category ? place.category.replace(/_/g, ' ') : '';

  return (
    <View style={styles.placeRow}>
      {/* Thumbnail */}
      <View style={styles.thumbWrap}>
        {place.photoUrl ? (
          <Image source={{ uri: place.photoUrl }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, gradientStyle(catGradient) as ViewStyle]} />
        )}
      </View>

      {/* Info */}
      <View style={styles.placeInfo}>
        {/* Top row: name + heart */}
        <View style={styles.placeTopRow}>
          <Text style={styles.placeName} numberOfLines={1}>
            {place.name}
          </Text>
          <TouchableOpacity
            onPress={onSave}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isSaved ? 'heart' : 'heart-outline'}
              size={18}
              color={isSaved ? '#E24B4A' : '#9CA3AF'}
            />
          </TouchableOpacity>
        </View>

        {/* Type */}
        {!!typeLabel && (
          <Text style={styles.placeType} numberOfLines={1}>
            {typeLabel}
          </Text>
        )}

        {/* Bottom row: open badge + rating + distance + navigate */}
        <View style={styles.placeBottomRow}>
          <View style={styles.placeMeta}>
            <OpenBadge openNow={place.opening_hours?.open_now} />
            {!!ratingLabel && (
              <View style={styles.metaItem}>
                <Ionicons name="star" size={11} color="#EF9F27" />
                <Text style={styles.metaText}>{ratingLabel}</Text>
              </View>
            )}
            {!!distLabel && (
              <Text style={styles.metaText}>{distLabel}</Text>
            )}
          </View>

          <TouchableOpacity style={styles.navBtn} onPress={onNavigate}>
            <Text style={styles.navBtnText}>Navigate</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

// ── Main screen ───────────────────────────────────────────────────────────────
export default function CategoryPlacesScreen({ navigation, route }: Props) {
  const { category, userLat, userLng, cityName } = route.params;
  const insets = useSafeAreaInsets();

  const { savePlace, unsavePlace, isPlaceSaved, isGuest } = useGuestStore();
  const { isAuthenticated } = useAuthStore();

  // All valid + time-context-filtered places from the API
  const [filteredPlaces, setFilteredPlaces] = useState<PlaceResult[]>([]);
  // What's actually shown (after user filter pill)
  const [displayed, setDisplayed] = useState<PlaceResult[]>([]);
  const [filter, setFilter] = useState<FilterId>('all');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  // True if API returned results but ALL were filtered out by time context
  const [allFilteredOut, setAllFilteredOut] = useState(false);

  const unmountedRef = useRef(false);

  const fetchPlaces = useCallback(async () => {
    unmountedRef.current = false;
    setLoading(true);
    setFetchError(false);
    setAllFilteredOut(false);

    try {
      const raw = await searchPlacesByVibe(
        cityName || 'near me',
        category.searchTerms,
        userLat,
        userLng,
        13, // ~8 miles search radius in km
      );

      if (unmountedRef.current) return;

      // Step 1: remove permanently / temporarily closed places
      const valid = raw.filter(isPlaceValid);

      // Step 2: apply time-context filter for this specific category
      const relevant = valid.filter((p) => doesPlaceMatchTimeContext(p, category));

      if (valid.length > 0 && relevant.length === 0) {
        setAllFilteredOut(true);
      }

      // Step 3: default sort (open-first, then by distance)
      const sorted = buildDisplayList(relevant, 'all');

      setFilteredPlaces(sorted);
      setDisplayed(sorted);
      setFilter('all');
    } catch {
      if (!unmountedRef.current) setFetchError(true);
    } finally {
      if (!unmountedRef.current) setLoading(false);
    }
  }, [category, userLat, userLng, cityName]);

  useEffect(() => {
    fetchPlaces();
    return () => {
      unmountedRef.current = true;
    };
  }, [fetchPlaces]);

  // Re-apply user filter pill when it changes
  useEffect(() => {
    setDisplayed(buildDisplayList(filteredPlaces, filter));
  }, [filter, filteredPlaces]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSave = (place: PlaceResult) => {
    if (isGuest || !isAuthenticated) {
      navigation.navigate('AuthChoice');
      return;
    }
    if (isPlaceSaved(place.placeId)) {
      unsavePlace(place.placeId);
    } else {
      savePlace(place);
    }
  };

  const handleNavigate = (place: PlaceResult) => {
    const stop = {
      id: place.placeId,
      name: place.name,
      description: place.description || place.category || '',
      distance: '',
      time: '',
      rating: String((place.rating ?? 4.0).toFixed(1)),
      image: place.photoUrl || FALLBACK_IMAGE,
      coordinate: { latitude: place.coordinates.lat, longitude: place.coordinates.lng },
    };

    // Best-effort: prepend to local Recent Trips for authenticated users
    const userId = useAuthStore.getState().user?.id || '';
    if (userId) {
      const now = new Date().toISOString();
      const placeForTrip: Place = {
        id: place.placeId,
        name: place.name,
        address: place.address,
        image: place.photoUrl || FALLBACK_IMAGE,
        coordinate: { latitude: place.coordinates.lat, longitude: place.coordinates.lng },
        rating: place.rating,
        description: place.description,
      };
      const recentTrip: RecentTrip = {
        trip_id: `trip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        user_id: userId,
        city: cityName || 'Nearby',
        places: [placeForTrip],
        created_at: now,
        last_accessed: now,
        is_shared: false,
      };
      useRecentTripStore.getState().prependTrip(recentTrip);
    }

    navigation.navigate('TripMap', { stops: [stop] });
  };

  // ── Header gradient ──────────────────────────────────────────────────────────
  const headerStyle = [
    styles.header,
    { paddingTop: Math.max(insets.top, 12) },
    gradientStyle(category.gradient) as ViewStyle,
  ];

  // ── Count label for header ───────────────────────────────────────────────────
  function headerCountLabel(): string {
    if (loading) return 'Loading…';
    const count = displayed.length;
    if (count === 0) return `Near ${cityName || 'you'}`;
    return `${count} place${count !== 1 ? 's' : ''} near ${cityName || 'you'}`;
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Hero gradient header */}
      <View style={headerStyle}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>

        <View>
          <View style={styles.headerPill}>
            <Text style={styles.headerPillText}>{category.subtitle}</Text>
          </View>
          <Text style={styles.headerLabel}>{category.label}</Text>
          <Text style={styles.headerCount}>{headerCountLabel()}</Text>
        </View>
      </View>

      {/* Filter pills */}
      <View style={styles.filterRow}>
        {(
          [
            { id: 'all' as FilterId, label: 'All' },
            { id: 'under2mi' as FilterId, label: 'Under 2 mi' },
            { id: 'toprated' as FilterId, label: 'Top rated' },
          ] as { id: FilterId; label: string }[]
        ).map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[styles.filterPill, filter === f.id && styles.filterPillActive]}
            onPress={() => setFilter(f.id)}
          >
            <Text
              style={[styles.filterText, filter === f.id && styles.filterTextActive]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content area */}
      {loading ? (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          scrollEnabled={false}
        >
          {[0, 1, 2, 3].map((i) => (
            <SkeletonRow key={i} />
          ))}
        </ScrollView>
      ) : fetchError ? (
        <View style={styles.stateWrap}>
          <Ionicons name="wifi-outline" size={44} color="#D1D5DB" />
          <Text style={styles.stateTitle}>Couldn't load places</Text>
          <TouchableOpacity style={styles.actionBtn} onPress={fetchPlaces}>
            <Text style={styles.actionBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : allFilteredOut || (filteredPlaces.length === 0 && !allFilteredOut) ? (
        // No results: either all filtered by time context or API returned nothing
        <View style={styles.stateWrap}>
          <Ionicons name="moon-outline" size={44} color="#D1D5DB" />
          <Text style={styles.stateTitle}>
            {allFilteredOut
              ? 'No places open right now'
              : 'No places found nearby'}
          </Text>
          <Text style={styles.stateHint}>
            {allFilteredOut
              ? 'Check back later or try creating a trip to explore further!'
              : 'Try creating a trip to explore this area'}
          </Text>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Create Trip')}
          >
            <Text style={styles.actionBtnText}>Create a Trip</Text>
          </TouchableOpacity>
        </View>
      ) : displayed.length === 0 ? (
        // User filter narrowed to zero
        <View style={styles.stateWrap}>
          <Ionicons name="filter-outline" size={44} color="#D1D5DB" />
          <Text style={styles.stateTitle}>No matches for this filter</Text>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setFilter('all')}>
            <Text style={styles.actionBtnText}>Show all</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {displayed.map((place) => (
            <PlaceRow
              key={place.placeId}
              place={place}
              isSaved={isPlaceSaved(place.placeId)}
              onSave={() => handleSave(place)}
              onNavigate={() => handleNavigate(place)}
              catGradient={category.gradient}
            />
          ))}

          {/* Late night eats: low-count fallback note */}
          {category.id === 'late-night-eats' && displayed.length < 3 && (
            <Text style={styles.lateNightNote}>
              Showing all confirmed late-night spots. Some places may have limited hours.
            </Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  // Header
  header: {
    height: 140,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  headerPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 2,
    marginBottom: 6,
  },
  headerPillText: { fontSize: 10, color: '#fff', fontFamily: F.medium },
  headerLabel: { fontSize: 22, fontFamily: F.semibold, color: '#fff', marginBottom: 2 },
  headerCount: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: F.regular },

  // Filters
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
  },
  filterPillActive: { backgroundColor: '#111827', borderColor: '#111827' },
  filterText: { fontSize: 12, fontFamily: F.medium, color: '#6B7280' },
  filterTextActive: { color: '#fff' },

  // List
  list: { flex: 1 },
  listContent: { paddingBottom: 32 },

  // Place row
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#fff',
  },
  thumbWrap: { width: 80, height: 80, borderRadius: 10, overflow: 'hidden' },
  thumb: { width: 80, height: 80, borderRadius: 10, resizeMode: 'cover' },
  placeInfo: { flex: 1 },
  placeTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  placeName: {
    flex: 1,
    fontSize: 14,
    fontFamily: F.semibold,
    color: '#111827',
    marginRight: 8,
  },
  placeType: {
    fontSize: 11,
    fontFamily: F.regular,
    color: '#9CA3AF',
    marginBottom: 6,
    textTransform: 'capitalize',
  },
  placeBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  placeMeta: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11, fontFamily: F.regular, color: '#6B7280' },

  // Open status badges
  openBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  openDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#639922' },
  openText: { fontSize: 11, fontFamily: F.medium, color: '#639922' },
  closedText: { fontSize: 11, fontFamily: F.medium, color: '#A32D2D' },
  hoursNaText: { fontSize: 11, fontFamily: F.regular, color: '#9CA3AF' },

  // Navigate button
  navBtn: {
    backgroundColor: '#111827',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  navBtnText: { fontSize: 11, fontFamily: F.semibold, color: '#fff' },

  // State screens
  stateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  stateTitle: {
    fontSize: 16,
    fontFamily: F.semibold,
    color: '#374151',
    marginTop: 12,
    marginBottom: 6,
    textAlign: 'center',
  },
  stateHint: {
    fontSize: 13,
    fontFamily: F.regular,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  actionBtn: {
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#22C55E',
  },
  actionBtnText: { fontSize: 14, fontFamily: F.semibold, color: '#fff' },

  // Late night fallback note
  lateNightNote: {
    textAlign: 'center',
    fontSize: 12,
    fontFamily: F.regular,
    color: '#9CA3AF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    lineHeight: 18,
  },

  // Skeleton
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#fff',
  },
  skeletonThumb: { width: 80, height: 80, borderRadius: 10, backgroundColor: '#E5E7EB' },
  skeletonLines: { flex: 1 },
  skeletonLine: { height: 12, borderRadius: 6, backgroundColor: '#E5E7EB' },
});
