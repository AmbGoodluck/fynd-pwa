import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ImageBackground, Image, Modal, TouchableWithoutFeedback, Platform, Alert,
  TextInput, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuthStore } from '../store/useAuthStore';
import { useGuestStore } from '../store/useGuestStore';
import { useUserLocation } from '../hooks/useUserLocation';
import { useTabBarHeight } from '../hooks/useTabBarHeight';
import { F } from '../theme/fonts';
import { COLORS } from '../theme/tokens';
import PWATopBar from '../components/PWATopBar';
import {
  getPlacesForLocation,
  reverseGeocodeFree,
  FyndPlace,
} from '../services/freePlacesService';
import { supabase } from '../services/supabase';
import { maybeCreateDailyPickNotification } from '../services/notificationService';

// ── Constants ─────────────────────────────────────────────────────────────────

const QUICK_FILTERS = [
  { id: 'for_you',   label: 'For You',  types: [] as string[] },
  { id: 'food',      label: 'Food',     types: ['restaurant', 'food', 'meal_takeaway', 'bakery'] },
  { id: 'coffee',    label: 'Coffee',   types: ['cafe'] },
  { id: 'outdoors',  label: 'Outdoors', types: ['park', 'natural_feature', 'campground', 'tourist_attraction'] },
  { id: 'nightlife', label: 'Night',    types: ['bar', 'night_club', 'pub'] },
  { id: 'study',     label: 'Study',    types: ['library', 'cafe', 'book_store'] },
];

const SERVICE_HUB_QUICK = [
  { id: 'Medical',           label: 'Medical',   icon: 'medkit-outline',        color: '#EF4444', bg: '#FEF2F2' },
  { id: 'Currency Exchange', label: 'Currency',  icon: 'cash-outline',          color: '#7C3AED', bg: '#F5F3FF' },
  { id: 'Transport',         label: 'Transit',   icon: 'bus-outline',           color: '#0EA5E9', bg: '#F0F9FF' },
  { id: 'Police',            label: 'Safety',    icon: 'shield-outline',        color: '#2D8E62', bg: '#EAF6F0' },
  { id: 'Emergency',         label: 'Emergency', icon: 'alert-circle-outline',  color: '#F59E0B', bg: '#FFFBEB' },
] as const;

// ── Component ─────────────────────────────────────────────────────────────────

type Props = { navigation: any };

export default function HomeScreen({ navigation }: Props) {
  const { user, isAuthenticated } = useAuthStore();
  const { isGuest } = useGuestStore();
  const { location, loading: locationLoading } = useUserLocation();
  const tabBarHeight = useTabBarHeight();

  const [cityName, setCityName] = useState('');
  const [places, setPlaces] = useState<FyndPlace[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('for_you');
  const [filteredPlaces, setFilteredPlaces] = useState<FyndPlace[]>([]);
  const [showServiceGate, setShowServiceGate] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FyndPlace[]>([]);

  const searchInputRef = useRef<TextInput>(null);

  // Fetch unread notification count from Supabase
  useEffect(() => {
    if (!user?.id) return;
    const fetchUnread = async () => {
      try {
        const { count, error } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('read', false);
        if (!error && count !== null) setUnreadCount(count);
      } catch {
        setUnreadCount(0);
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 60000);
    return () => clearInterval(interval);
  }, [user?.id]);

  // Resolve city name when location becomes available
  useEffect(() => {
    if (!location) return;
    reverseGeocodeFree(location.latitude, location.longitude)
      .then(name => setCityName(name))
      .catch(() => {});
  }, [location]);

  // Fetch nearby places
  useEffect(() => {
    if (!location) return;
    setPlacesLoading(true);
    getPlacesForLocation(
      location.latitude,
      location.longitude,
      cityName || 'Nearby',
      { limit: 20, generateAI: true },
    )
      .then(results => {
        setPlaces(results);
        if (results.length > 0 && user?.id) {
          maybeCreateDailyPickNotification(user.id, results[0]).catch(console.error);
        }
      })
      .catch(() => {})
      .finally(() => setPlacesLoading(false));
  }, [location, cityName]);

  // Derive filteredPlaces from places + activeFilter
  useEffect(() => {
    const filter = QUICK_FILTERS.find(f => f.id === activeFilter);
    if (!filter || filter.types.length === 0) {
      setFilteredPlaces(places);
    } else {
      setFilteredPlaces(places.filter(p => p.types.some(t => filter.types.includes(t))));
    }
  }, [places, activeFilter]);

  const heroPlace = filteredPlaces[0] ?? null;
  const moreForYou = filteredPlaces.slice(1, 10);
  const isLoading = locationLoading || placesLoading;

  const userInitial =
    user?.fullName?.charAt(0)?.toUpperCase() || (isGuest ? 'G' : '?');

  const handleServicePress = (id: string) => {
    if (isGuest || !isAuthenticated) {
      setShowServiceGate(true);
      return;
    }
    navigation.navigate('ServiceHub', { initialCategory: id });
  };

  const navToPlace = (place: FyndPlace) =>
    navigation.navigate('PlaceDetail', {
      placeId:     place.id,
      name:        place.name,
      address:     place.address,
      photoUrl:    place.photo_urls[0] ?? '',
      photoUrls:   place.photo_urls,
      description: place.ai_description ?? '',
      lat:         place.lat,
      lng:         place.lng,
      types:       place.types,
      phone:       place.phone ?? '',
      website:     place.website ?? '',
      place,
    });

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) { setSearchResults([]); return; }
    const q = text.toLowerCase().trim();
    const results = places.filter(p => {
      const haystack = [
        p.name,
        ...(p.types || []),
        p.cuisine || '',
        p.vibe || '',
        p.ai_description || '',
        ...(p.known_for || []),
      ].join(' ').toLowerCase();
      return haystack.includes(q);
    });
    setSearchResults(results);
  };

  const cancelSearch = () => {
    setSearchActive(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={Platform.OS === 'web' ? [] : ['top']}>

      {/* Web: PWATopBar */}
      {Platform.OS === 'web' && (
        <PWATopBar
          onSharedTripsPress={() => navigation.navigate('SharedTrips')}
          onProfilePress={() => navigation.navigate('Profile')}
          onNotificationsPress={() => navigation.navigate('Notifications')}
        />
      )}

      {/* Native: Custom AppBar */}
      {Platform.OS !== 'web' && (
        <View style={styles.appBar}>
          <View style={styles.appBarLeft}>
            <View style={styles.appBarPinWrap}>
              <Ionicons name="location-sharp" size={18} color={COLORS.accent.primary} />
            </View>
            <Text style={styles.appBarBrand}>fynd.</Text>
          </View>
          <View style={styles.appBarRight}>
            <TouchableOpacity
              style={styles.bellWrap}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Ionicons name="notifications-outline" size={22} color={COLORS.text.primary} />
              {unreadCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.avatar}
              onPress={() => navigation.navigate('Profile')}
            >
              <Text style={styles.avatarText}>{userInitial}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Search overlay ──────────────────────────────────────────── */}
      {searchActive ? (
        <View style={styles.searchOverlay}>
          {/* Input row */}
          <View style={styles.searchInputRow}>
            <View style={styles.searchInputWrap}>
              <Ionicons name="search" size={17} color={COLORS.text.hint} style={styles.searchInputIcon} />
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                placeholder="Search places, vibes, cuisines…"
                placeholderTextColor={COLORS.text.hint}
                value={searchQuery}
                onChangeText={handleSearch}
                autoFocus
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => { setSearchQuery(''); setSearchResults([]); }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={17} color={COLORS.text.hint} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity onPress={cancelSearch} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          {/* Results */}
          {searchQuery.trim().length === 0 ? (
            <View style={styles.searchEmpty}>
              <Ionicons name="search-outline" size={44} color={COLORS.text.disabled} />
              <Text style={styles.searchEmptyText}>Search for a place or vibe</Text>
            </View>
          ) : searchResults.length === 0 ? (
            <View style={styles.searchEmpty}>
              <Ionicons name="search-outline" size={44} color={COLORS.text.disabled} />
              <Text style={styles.searchEmptyText}>No places match "{searchQuery}"</Text>
            </View>
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={item => item.id}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.searchResultsList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.searchResultRow}
                  onPress={() => { cancelSearch(); navToPlace(item); }}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ uri: item.photo_urls[0] ?? '' }}
                    style={styles.searchResultImage}
                  />
                  <View style={styles.searchResultBody}>
                    <Text style={styles.searchResultName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.searchResultSub} numberOfLines={1}>
                      {item.vibe || item.cuisine || item.types[0]?.replace(/_/g, ' ') || ''}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.text.disabled} />
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      ) : (
        /* ── Main scroll content ──────────────────────────────────── */
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight + 24 }]}
        >
          {/* ── Location bar ──────────────────────────────────────── */}
          <View style={styles.locationBar}>
            <Ionicons name="location-sharp" size={16} color={COLORS.accent.primary} />
            <Text style={styles.locationText} numberOfLines={1}>
              {locationLoading ? 'Finding your location…' : cityName || 'Tap to set location'}
            </Text>
          </View>

          {/* ── Search bar (tappable placeholder) ─────────────────── */}
          <TouchableOpacity
            style={styles.searchBar}
            activeOpacity={0.8}
            onPress={() => setSearchActive(true)}
          >
            <Ionicons name="search-outline" size={18} color="#9E95A8" style={styles.searchIcon} />
            <Text style={styles.searchPlaceholder}>Search places, vibes, cuisines…</Text>
          </TouchableOpacity>

          {/* ── Quick filters ─────────────────────────────────────── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersRow}
          >
            {QUICK_FILTERS.map(f => (
              <TouchableOpacity
                key={f.id}
                style={[styles.filterChip, activeFilter === f.id && styles.filterChipActive]}
                onPress={() => setActiveFilter(f.id)}
                activeOpacity={0.75}
              >
                <Text style={[styles.filterChipText, activeFilter === f.id && styles.filterChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ── Today's Pick ──────────────────────────────────────── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Pick</Text>
          </View>

          {isLoading ? (
            <View style={[styles.heroCard, styles.skeleton]} />
          ) : !location ? (
            <View style={styles.emptyCard}>
              <Ionicons name="location-outline" size={36} color="#C8C2CE" />
              <Text style={styles.emptyTitle}>Location not available</Text>
              <Text style={styles.emptySub}>Allow location access to discover places near you.</Text>
            </View>
          ) : heroPlace ? (
            <TouchableOpacity style={styles.heroCard} activeOpacity={0.9} onPress={() => navToPlace(heroPlace)}>
              <ImageBackground
                source={{ uri: heroPlace.photo_urls[0] ?? '' }}
                style={styles.heroImage}
                imageStyle={styles.heroImageStyle}
              >
                <View style={styles.heroOverlay}>
                  <View style={styles.heroTopRow}>
                    <View style={styles.heroBadge}>
                      <Text style={styles.heroBadgeText}>Picked for you</Text>
                    </View>
                  </View>
                  <View style={styles.heroBottom}>
                    {(heroPlace.vibe ?? heroPlace.types[0]) ? (
                      <View style={styles.heroVibePill}>
                        <Text style={styles.heroVibePillText}>
                          {heroPlace.vibe ?? heroPlace.types[0]}
                        </Text>
                      </View>
                    ) : null}
                    <Text style={styles.heroName} numberOfLines={1}>{heroPlace.name}</Text>
                    {(() => {
                      const desc = heroPlace.ai_description
                        ? heroPlace.ai_description.split('.')[0] + '.'
                        : heroPlace.cuisine
                          ? heroPlace.cuisine.charAt(0).toUpperCase() + heroPlace.cuisine.slice(1)
                          : '';
                      return desc ? <Text style={styles.heroDesc} numberOfLines={1}>{desc}</Text> : null;
                    })()}
                  </View>
                </View>
              </ImageBackground>
            </TouchableOpacity>
          ) : filteredPlaces.length === 0 && places.length > 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="filter-outline" size={36} color="#C8C2CE" />
              <Text style={styles.emptyTitle}>
                No {QUICK_FILTERS.find(f => f.id === activeFilter)?.label ?? ''} places nearby
              </Text>
              <Text style={styles.emptySub}>Try a different filter.</Text>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="map-outline" size={36} color="#C8C2CE" />
              <Text style={styles.emptyTitle}>No places found nearby</Text>
              <Text style={styles.emptySub}>Try a different filter or expand your area.</Text>
            </View>
          )}

          {/* ── More for you ──────────────────────────────────────── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>More for you</Text>
            {!isLoading && filteredPlaces.length > 1 && (
              <TouchableOpacity
                style={styles.seeAllBtn}
                onPress={() => navigation.navigate('AllPlaces', { places: filteredPlaces, cityName })}
              >
                <Text style={styles.seeAllText}>See all</Text>
                <Ionicons name="chevron-forward" size={14} color={COLORS.accent.primary} />
              </TouchableOpacity>
            )}
          </View>

          {isLoading ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moreRow} scrollEnabled={false}>
              {[0, 1, 2].map(i => <View key={i} style={[styles.moreCard, styles.skeleton]} />)}
            </ScrollView>
          ) : moreForYou.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moreRow}>
              {moreForYou.map(place => (
                <TouchableOpacity key={place.id} style={styles.moreCard} activeOpacity={0.85} onPress={() => navToPlace(place)}>
                  <View style={styles.moreCardImageWrap}>
                    <Image source={{ uri: place.photo_urls[0] ?? '' }} style={styles.moreCardImage} />
                    {place.vibe && (
                      <View style={styles.cardVibePill}>
                        <Text style={styles.cardVibeText}>{place.vibe}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.moreCardBody}>
                    <Text style={styles.moreCardName} numberOfLines={1}>{place.name}</Text>
                    <Text style={styles.moreCardSub} numberOfLines={1}>
                      {place.ai_description
                        ? place.ai_description.split('.')[0] + '.'
                        : place.cuisine || place.types[0]?.replace(/_/g, ' ') || 'Place'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : null}

          {/* ── Went Here Prompt ──────────────────────────────────── */}
          <TouchableOpacity
            style={styles.wentHereCard}
            activeOpacity={0.85}
            onPress={() => Alert.alert('Coming soon!', 'Log a visit directly from any place page — tap "I went here" on the place detail.')}
          >
            <View style={styles.wentHereLeft}>
              <View style={styles.wentHereIconWrap}>
                <Ionicons name="star-outline" size={20} color={COLORS.accent.primary} />
              </View>
              <View>
                <Text style={styles.wentHereTitle}>Been somewhere good?</Text>
                <Text style={styles.wentHereSub}>Tell us about it</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.accent.primary} />
          </TouchableOpacity>

          {/* ── ServiceHub Quick ──────────────────────────────────── */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionLeft}>
              <Ionicons name="compass-outline" size={18} color={COLORS.text.primary} />
              <Text style={styles.sectionTitle}>ServiceHub</Text>
            </View>
            {isAuthenticated && !isGuest && (
              <TouchableOpacity
                style={styles.seeAllBtn}
                onPress={() => navigation.navigate('Services')}
              >
                <Text style={styles.seeAllText}>See all</Text>
                <Ionicons name="chevron-forward" size={14} color={COLORS.accent.primary} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.serviceRow}>
            {SERVICE_HUB_QUICK.map(item => (
              <TouchableOpacity key={item.id} style={styles.serviceCard} onPress={() => handleServicePress(item.id)} activeOpacity={0.8}>
                <View style={[styles.serviceIconWrap, { backgroundColor: item.bg }]}>
                  <Ionicons name={item.icon as any} size={24} color={item.color} />
                </View>
                <Text style={styles.serviceLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {/* ── ServiceHub Guest Gate Modal ───────────────────────────── */}
      <Modal visible={showServiceGate} transparent animationType="slide" onRequestClose={() => setShowServiceGate(false)}>
        <TouchableWithoutFeedback onPress={() => setShowServiceGate(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalSheet}>
                <View style={styles.modalHandle} />
                <View style={styles.modalIconWrap}>
                  <Ionicons name="compass-outline" size={32} color={COLORS.accent.primary} />
                </View>
                <Text style={styles.modalTitle}>Account Required</Text>
                <Text style={styles.modalBody}>
                  Create an account to access nearby services like medical help, transport, and emergency locations.
                </Text>
                <TouchableOpacity style={styles.modalPrimaryBtn} onPress={() => { setShowServiceGate(false); navigation.navigate('Login'); }}>
                  <Text style={styles.modalPrimaryBtnText}>Sign In</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalOutlineBtn} onPress={() => { setShowServiceGate(false); navigation.navigate('Register'); }}>
                  <Text style={styles.modalOutlineBtnText}>Create Account</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalGhostBtn} onPress={() => setShowServiceGate(false)}>
                  <Text style={styles.modalGhostBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFAF8' },
  scroll:    { paddingBottom: 24 },

  // ── AppBar ───────────────────────────────────────────────────────────────
  appBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#FFFAF8',
  },
  appBarLeft:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  appBarPinWrap: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.accent.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  appBarBrand:  { fontSize: 22, fontFamily: F.extrabold, color: '#1A1019' },
  appBarRight:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bellWrap:     { position: 'relative', padding: 4 },
  bellBadge: {
    position: 'absolute', top: 0, right: 0,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: COLORS.accent.primary,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  bellBadgeText: { fontSize: 9, color: '#fff', fontFamily: F.bold },
  avatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: COLORS.accent.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.accent.primary,
  },
  avatarText: { fontSize: 14, fontFamily: F.bold, color: COLORS.accent.primaryDark },

  // ── Search overlay ────────────────────────────────────────────────────────
  searchOverlay: { flex: 1, backgroundColor: COLORS.background },
  searchInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border.light,
    backgroundColor: '#fff',
  },
  searchInputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.background, borderRadius: 12,
    paddingHorizontal: 12, height: 44,
    borderWidth: 1, borderColor: COLORS.border.default,
  },
  searchInputIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: F.medium, color: COLORS.text.primary },
  cancelBtn: { paddingHorizontal: 4 },
  cancelText: { fontSize: 14, fontFamily: F.semibold, color: COLORS.accent.primary },
  searchEmpty: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40,
  },
  searchEmptyText: { fontSize: 14, fontFamily: F.medium, color: COLORS.text.hint, textAlign: 'center' },
  searchResultsList: { paddingTop: 4, paddingBottom: 24 },
  searchResultRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border.light,
    backgroundColor: '#fff',
  },
  searchResultImage: {
    width: 56, height: 56, borderRadius: 8, backgroundColor: COLORS.border.light,
  },
  searchResultBody: { flex: 1 },
  searchResultName: { fontSize: 14, fontFamily: F.bold, color: COLORS.text.primary, marginBottom: 3 },
  searchResultSub:  { fontSize: 12, fontFamily: F.regular, color: COLORS.text.tertiary, textTransform: 'capitalize' },

  // ── Location bar ──────────────────────────────────────────────────────────
  locationBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, marginBottom: 12,
  },
  locationText: { fontSize: 13, fontFamily: F.semibold, color: COLORS.text.secondary, flex: 1 },

  // ── Search bar (placeholder) ──────────────────────────────────────────────
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: '#FFFFFF', borderRadius: 16,
    paddingHorizontal: 14, height: 48,
    borderWidth: 1, borderColor: 'rgba(26,16,25,0.07)',
    shadowColor: '#1A1019', shadowOpacity: 0.04,
    shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  searchIcon:        { marginRight: 8 },
  searchPlaceholder: { fontSize: 14, fontFamily: F.regular, color: '#9E95A8', flex: 1 },

  // ── Quick filters ─────────────────────────────────────────────────────────
  filtersRow: { paddingHorizontal: 20, paddingBottom: 4, gap: 8 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 9999, backgroundColor: 'transparent',
    borderWidth: 1.5, borderColor: COLORS.border.default,
  },
  filterChipActive:     { backgroundColor: COLORS.accent.primary, borderColor: COLORS.accent.primary },
  filterChipText:       { fontSize: 13, fontFamily: F.semibold, color: COLORS.text.tertiary },
  filterChipTextActive: { color: '#FFFFFF' },

  // ── Section header ────────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, marginTop: 24, marginBottom: 12,
  },
  sectionLeft:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 17, fontFamily: F.bold, color: '#1A1019' },
  seeAllBtn:    { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText:   { fontSize: 13, fontFamily: F.semibold, color: COLORS.accent.primary },

  // ── Skeleton ──────────────────────────────────────────────────────────────
  skeleton: { backgroundColor: '#EDE8ED' },

  // ── Hero card ─────────────────────────────────────────────────────────────
  heroCard: {
    marginHorizontal: 20, height: 200, borderRadius: 24, overflow: 'hidden',
    backgroundColor: '#D0CBD0',
    shadowColor: '#1A1019', shadowOpacity: 0.12,
    shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 5,
  },
  heroImage:      { flex: 1 },
  heroImageStyle: { borderRadius: 24 },
  heroOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.38)',
    padding: 16, justifyContent: 'space-between',
  },
  heroTopRow: { flexDirection: 'row' },
  heroBadge: {
    backgroundColor: COLORS.accent.primary, borderRadius: 9999,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  heroBadgeText:    { fontSize: 11, fontFamily: F.bold, color: '#fff' },
  heroBottom:       { gap: 4 },
  heroVibePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 9999,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  heroVibePillText: { fontSize: 11, fontFamily: F.semibold, color: 'rgba(255,255,255,0.9)' },
  heroName:         { fontSize: 20, fontFamily: F.extrabold, color: '#fff' },
  heroDesc:         { fontSize: 12, fontFamily: F.regular, color: 'rgba(255,255,255,0.8)', lineHeight: 18 },

  // ── Empty card ────────────────────────────────────────────────────────────
  emptyCard: {
    marginHorizontal: 20, paddingVertical: 36, borderRadius: 24,
    backgroundColor: '#FFFFFF', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: 'rgba(26,16,25,0.06)',
  },
  emptyTitle: { fontSize: 16, fontFamily: F.bold, color: '#1A1019' },
  emptySub: {
    fontSize: 13, fontFamily: F.regular, color: '#6E6577',
    textAlign: 'center', paddingHorizontal: 32, lineHeight: 20,
  },

  // ── More for you ──────────────────────────────────────────────────────────
  moreRow:   { paddingLeft: 20, paddingRight: 8, gap: 12 },
  moreCard: {
    width: 160, borderRadius: 20, overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#1A1019', shadowOpacity: 0.06,
    shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  moreCardImageWrap: { position: 'relative' },
  moreCardImage:     { width: '100%', height: 110, resizeMode: 'cover' },
  cardVibePill: {
    position: 'absolute', bottom: 8, left: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100,
  },
  cardVibeText:  { fontSize: 9, fontFamily: F.bold, color: '#fff' },
  moreCardBody:  { paddingHorizontal: 12, paddingVertical: 10, gap: 3 },
  moreCardName:  { fontSize: 13, fontFamily: F.bold, color: '#1A1019' },
  moreCardSub:   { fontSize: 11, fontFamily: F.regular, color: '#9E95A8', textTransform: 'capitalize' },

  // ── Went Here Prompt ──────────────────────────────────────────────────────
  wentHereCard: {
    marginHorizontal: 20, marginTop: 20,
    backgroundColor: COLORS.accent.primaryLight,
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: 'rgba(232,80,58,0.15)',
  },
  wentHereLeft:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  wentHereIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
  },
  wentHereTitle: { fontSize: 14, fontFamily: F.bold, color: '#1A1019' },
  wentHereSub:   { fontSize: 12, fontFamily: F.regular, color: COLORS.accent.primary, marginTop: 2 },

  // ── ServiceHub quick row ──────────────────────────────────────────────────
  serviceRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 8,
  },
  serviceCard:     { alignItems: 'center', gap: 6, flex: 1 },
  serviceIconWrap: {
    width: 52, height: 52, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  serviceLabel: { fontSize: 11, fontFamily: F.semibold, color: '#3D3540', textAlign: 'center' },

  // ── Modal ─────────────────────────────────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 44, alignItems: 'center',
  },
  modalHandle:  { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E5EA', marginBottom: 20 },
  modalIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: COLORS.accent.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22, fontFamily: F.bold, color: COLORS.text.primary,
    marginBottom: 10, textAlign: 'center',
  },
  modalBody: {
    fontSize: 14, color: '#57636C', textAlign: 'center',
    lineHeight: 22, marginBottom: 24, paddingHorizontal: 4,
  },
  modalPrimaryBtn: {
    width: '100%', backgroundColor: COLORS.accent.primary, borderRadius: 16,
    height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  modalPrimaryBtnText: { color: '#fff', fontSize: 16, fontFamily: F.bold },
  modalOutlineBtn: {
    width: '100%', borderWidth: 1.5, borderColor: COLORS.accent.primary,
    borderRadius: 16, height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  modalOutlineBtnText: { color: COLORS.accent.primary, fontSize: 16, fontFamily: F.semibold },
  modalGhostBtn:     { paddingVertical: 10, paddingHorizontal: 20 },
  modalGhostBtnText: { color: '#9CA3AF', fontSize: 14, fontFamily: F.medium },
});
