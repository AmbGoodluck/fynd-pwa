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
import GuestGateModal from '../components/GuestGateModal';
import { useRecentTripStore } from '../store/useRecentTripStore';
import { gradientStyle, type TrendingCategory } from '../config/trendingCategories';
import type { RecentTrip } from '../types/recentTrip';
import type { Place } from '../store/useTripStore';

// ── buildDisplayList helper ──
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

  const fetchPlaces = useCallback(async () => {
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



  useEffect(() => {
    setDisplayed(buildDisplayList(filteredPlaces, filter));
  }, [filter, filteredPlaces]);

  const headerStyle = [
    styles.header,
    { paddingTop: Math.max(insets.top, 12) },
    gradientStyle(category.gradient) as ViewStyle,
  ];

  function headerCountLabel(): string {
    if (loading) return 'Loading…';
    const count = displayed.length;
    if (count === 0) return `Near ${cityName || 'you'}`;
    return `${count} place${count !== 1 ? 's' : ''} near ${cityName || 'you'}`;
  }


// Main screen component
function CategoryPlacesScreen({ navigation, route }) {
  // ...existing hooks, state, and logic...

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
        {[
          { id: 'all', label: 'All' },
          { id: 'under2mi', label: 'Under 2 mi' },
          { id: 'toprated', label: 'Top rated' },
        ].map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[styles.filterPill, filter === f.id && styles.filterPillActive]}
            onPress={() => setFilter(f.id as FilterId)}
          >
            <Text style={[styles.filterPillText, filter === f.id && styles.filterPillTextActive]}>{f.label}</Text>
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
        <View style={styles.stateWrap}>
          <Ionicons name="search-outline" size={44} color="#D1D5DB" />
          <Text style={styles.stateTitle}>No places found</Text>
          <Text style={styles.stateDesc}>Try a different filter or category.</Text>
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
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
        </ScrollView>
      )}

      {/* Guest gate modal */}
      {/* ...rest of the component... */}
    </View>
  );

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
      <GuestGateModal
        visible={showGate}
        onDismiss={() => setShowGate(false)}
        onLogin={() => { setShowGate(false); navigation.navigate('AuthChoice'); }}
        onRegister={() => { setShowGate(false); navigation.navigate('AuthChoice'); }}
        onContinueAsGuest={() => setShowGate(false)}
      />
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
