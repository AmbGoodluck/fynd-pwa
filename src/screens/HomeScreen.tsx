import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ImageBackground, Image, Modal, TouchableWithoutFeedback, Platform,
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
  fetchPlacesFromHERE,
  reverseGeocodeFree,
  FyndPlace,
} from '../services/freePlacesService';
import { supabase } from '../services/supabase';
import { maybeCreateDailyPickNotification } from '../services/notificationService';

// ── Constants ─────────────────────────────────────────────────────────────────

const FILTER_CATEGORIES: Record<string, string> = {
  food:      '100-1000',
  coffee:    '100-1100',
  outdoors:  '400,550',
  nightlife: '200',
  study:     '350-3500,100-1100',
};

const QUICK_FILTERS = [
  { id: 'for_you',   label: 'For You',  types: [] as string[], keywords: [] as string[] },
  { id: 'food',      label: 'Food',     types: ['restaurant', 'food', 'meal_takeaway', 'bakery'], keywords: ['restaurant', 'food', 'grill', 'diner', 'kitchen', 'eatery', 'steakhouse', 'pizza', 'burger', 'wings', 'bbq', 'barbecue', 'sushi', 'mexican', 'chinese', 'indian', 'thai', 'italian', 'deli', 'buffet'] },
  { id: 'coffee',    label: 'Coffee',   types: ['cafe'], keywords: ['coffee', 'cafe', 'espresso', 'latte', 'roast', 'brew', 'tea', 'bakery', 'pastry', 'donut', 'bagel', 'starbucks', 'dunkin'] },
  { id: 'outdoors',  label: 'Outdoors', types: ['park', 'natural_feature', 'campground', 'tourist_attraction'], keywords: ['park', 'trail', 'hike', 'hiking', 'nature', 'garden', 'forest', 'lake', 'creek', 'river', 'mountain', 'overlook', 'scenic', 'outdoor', 'recreation', 'reserve', 'playground', 'field'] },
  { id: 'nightlife', label: 'Night',    types: ['bar', 'night_club', 'pub'], keywords: ['bar', 'pub', 'tavern', 'lounge', 'brewery', 'taproom', 'cocktail', 'beer', 'wine', 'nightclub', 'club', 'nightlife', 'happy hour'] },
  { id: 'study',     label: 'Study',    types: ['library', 'book_store'], keywords: ['library', 'study', 'book', 'quiet', 'wifi', 'laptop', 'coworking', 'workspace', 'coffee', 'cafe'] },
];

function cleanDescription(desc: string, placeName: string): string {
  if (!desc) return '';
  const lower = desc.toLowerCase();
  const nameLower = placeName.toLowerCase();
  let clean = desc;
  if (lower.startsWith(nameLower)) {
    clean = desc.slice(placeName.length)
      .replace(/^\s*(is|are|was|has|offers|serves|provides|features|brings|sits|stands|lies)\s+/i, '')
      .trim();
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  }
  const firstSentence = clean.split('.')[0];
  return firstSentence ? firstSentence + '.' : clean;
}

const CHAIN_NAMES = [
  'mcdonald', 'burger king', 'wendy', 'taco bell', 'subway', 'domino',
  'pizza hut', 'papa john', 'little caesars', 'sonic', 'arby', 'hardee',
  'chick-fil-a', 'popeyes', 'kfc', 'dunkin', 'starbucks', 'red lobster',
  'olive garden', 'applebee', 'chili', 'ihop', 'denny', 'waffle house',
  'buffalo wild wings', 'hooters', 'outback', 'golden corral', 'panera',
  'chipotle', 'five guys', 'zaxby', 'cookout', 'firehouse sub', 'jersey mike',
  'jimmy john', 'panda express', 'raising cane', 'wingstop', "sonny's barbecue",
];

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km: number): string {
  const miles = km * 0.621371;
  if (miles < 0.1) return 'nearby';
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

const INTEREST_TO_QUERY: Record<string, string[]> = {
  food_drinks:      ['restaurant', 'food', 'dining'],
  coffee_study:     ['coffee', 'cafe', 'library', 'coworking'],
  nightlife:        ['bar', 'pub', 'nightclub', 'brewery'],
  outdoor_park:     ['park', 'garden', 'nature'],
  hiking_trails:    ['trail', 'hiking', 'natural'],
  fitness_gym:      ['gym', 'fitness'],
  thrift_vintage:   ['thrift', 'vintage', 'store'],
  shopping:         ['store', 'shopping'],
  arts_culture:     ['museum', 'gallery', 'theater'],
  live_music:       ['music', 'bar', 'entertainment'],
  photography:      ['scenic', 'park', 'attraction'],
  budget_friendly:  ['park', 'library', 'free'],
  late_night:       ['bar', 'diner', 'nightlife'],
  brunch_breakfast: ['cafe', 'bakery', 'restaurant'],
  desserts_bakery:  ['bakery', 'cafe', 'dessert'],
  hidden_gems:      ['attraction', 'park'],
  scenic_views:     ['park', 'natural', 'attraction'],
  history:          ['museum', 'attraction', 'historic'],
  wellness:         ['gym', 'spa', 'park'],
  family_friendly:  ['park', 'museum', 'zoo'],
  free_activities:  ['park', 'library', 'museum'],
  coworking:        ['library', 'cafe', 'coworking'],
  pet_friendly:     ['park', 'outdoor'],
  date_spots:       ['restaurant', 'bar', 'park', 'museum'],
};

const SERVICE_HUB_QUICK = [
  { id: 'Medical',           label: 'Medical',   icon: 'medkit-outline',        color: '#EF4444', bg: '#FEF2F2' },
  { id: 'Currency Exchange', label: 'Currency',  icon: 'cash-outline',          color: '#7C3AED', bg: '#F5F3FF' },
  { id: 'Transport',         label: 'Transit',   icon: 'bus-outline',           color: '#0EA5E9', bg: '#F0F9FF' },
  { id: 'Police',            label: 'Safety',    icon: 'shield-outline',        color: '#2D8E62', bg: '#EAF6F0' },
  { id: 'Emergency',         label: 'Emergency', icon: 'alert-circle-outline',  color: '#F59E0B', bg: '#FFFBEB' },
] as const;

// ── Default location (Berea, KY) — used when location permission is denied ────
const DEFAULT_LAT  = 37.5687;
const DEFAULT_LNG  = -84.2963;
const DEFAULT_CITY = 'Berea';

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
  const [filterLoading, setFilterLoading] = useState(false);

  const searchInputRef = useRef<TextInput>(null);
  const searchDebounce = useRef<any>(null);

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

  // Fetch city name + nearby places; falls back to Berea, KY when location is unavailable
  useEffect(() => {
    const load = async () => {
      setPlacesLoading(true);
      try {
        const lat  = location?.latitude  ?? DEFAULT_LAT;
        const lng  = location?.longitude ?? DEFAULT_LNG;
        let city   = DEFAULT_CITY;

        if (location) {
          city = await reverseGeocodeFree(location.latitude, location.longitude);
        }

        setCityName(city);
        const userPrefs = user?.travelPreferences || [];
        const prefKeywords = userPrefs.flatMap(id => INTEREST_TO_QUERY[id] || []);
        const results = await getPlacesForLocation(lat, lng, city, {
          limit: 20,
          generateAI: true,
          vibeFilter: prefKeywords,
        });
        setPlaces(results);
        if (results.length > 0 && user?.id) {
          maybeCreateDailyPickNotification(user.id, results[0]).catch(console.error);
        }
      } catch (e) {
        console.error('[Home] Error loading places:', e);
      } finally {
        setPlacesLoading(false);
      }
    };

    if (!locationLoading || !location) {
      load();
    }
  }, [location?.latitude, location?.longitude, locationLoading]);

  // Keep filteredPlaces in sync when places initially load (for_you / no active filter)
  useEffect(() => {
    if (activeFilter === 'for_you') setFilteredPlaces(places);
  }, [places]);

  const handleFilterTap = async (filter: typeof QUICK_FILTERS[number]) => {
    setActiveFilter(filter.id);

    if (filter.id === 'for_you') {
      setFilteredPlaces(places);
      return;
    }

    const catIds = FILTER_CATEGORIES[filter.id];
    if (!catIds) {
      setFilteredPlaces(places);
      return;
    }

    setFilteredPlaces([]);
    setFilterLoading(true);
    try {
      const lat = location?.latitude ?? DEFAULT_LAT;
      const lng = location?.longitude ?? DEFAULT_LNG;
      const results = await fetchPlacesFromHERE(lat, lng, 100, cityName, undefined, catIds);
      setFilteredPlaces(results);
    } catch {
      setFilteredPlaces([]);
    } finally {
      setFilterLoading(false);
    }
  };

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

  const handleSearch = async (text: string) => {
    if (!text.trim()) { setSearchResults([]); return; }
    const q = text.toLowerCase().trim();
    const local = places.filter(p => {
      const hay = [p.name, ...(p.types || []), p.cuisine || '', p.vibe || '', p.ai_description || '', ...(p.known_for || [])].join(' ').toLowerCase();
      return hay.includes(q);
    });
    local.sort((a, b) => {
      const aChain = CHAIN_NAMES.some(c => a.name.toLowerCase().includes(c)) ? 1 : 0;
      const bChain = CHAIN_NAMES.some(c => b.name.toLowerCase().includes(c)) ? 1 : 0;
      return aChain - bChain;
    });
    setSearchResults(local);

    if (local.length < 5) {
      try {
        const hereResults = await fetchPlacesFromHERE(
          location?.latitude ?? DEFAULT_LAT,
          location?.longitude ?? DEFAULT_LNG,
          100, cityName, text,
        );
        const existingNames = new Set(local.map(p => p.name.toLowerCase()));
        const unique = hereResults.filter(p => !existingNames.has(p.name.toLowerCase()));
        setSearchResults([...local, ...unique.slice(0, 10)]);
      } catch {
        // Non-fatal — local results already shown
      }
    }
  };

  const handleSearchDebounced = (text: string) => {
    setSearchQuery(text);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (!text.trim()) { setSearchResults([]); return; }
    const q = text.toLowerCase().trim();
    const local = places.filter(p => {
      const hay = [p.name, ...(p.types || []), p.cuisine || '', p.vibe || '', p.ai_description || ''].join(' ').toLowerCase();
      return hay.includes(q);
    });
    setSearchResults(local);
    if (local.length < 5) {
      searchDebounce.current = setTimeout(() => handleSearch(text), 400);
    }
  };

  const activateSearchWithKeyword = (keyword: string) => {
    setSearchActive(true);
    setSearchQuery(keyword);
    handleSearch(keyword);
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
                onChangeText={handleSearchDebounced}
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
              {locationLoading
                ? 'Finding your location…'
                : location
                  ? cityName || DEFAULT_CITY
                  : DEFAULT_CITY}
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
                onPress={() => handleFilterTap(f)}
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

          {isLoading || filterLoading ? (
            <View style={[styles.heroCard, styles.skeleton]} />
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
                        ? cleanDescription(heroPlace.ai_description, heroPlace.name)
                        : heroPlace.cuisine
                          ? heroPlace.cuisine.charAt(0).toUpperCase() + heroPlace.cuisine.slice(1)
                          : '';
                      return desc ? <Text style={styles.heroDesc} numberOfLines={1}>{desc}</Text> : null;
                    })()}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
                      {heroPlace.is_open !== undefined && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: heroPlace.is_open ? COLORS.accent.sage : 'rgba(255,255,255,0.4)' }} />
                          <Text style={{ fontSize: 11, fontWeight: '600', color: heroPlace.is_open ? COLORS.accent.sage : 'rgba(255,255,255,0.6)' }}>
                            {heroPlace.is_open ? 'Open' : 'Closed'}
                          </Text>
                        </View>
                      )}
                      <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>
                        {formatDistance(haversineKm(location?.latitude ?? DEFAULT_LAT, location?.longitude ?? DEFAULT_LNG, heroPlace.lat, heroPlace.lng))}
                      </Text>
                    </View>
                  </View>
                </View>
              </ImageBackground>
            </TouchableOpacity>
          ) : filteredPlaces.length === 0 && places.length > 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="filter-outline" size={36} color="#C8C2CE" />
              <Text style={styles.emptyTitle}>
                {activeFilter === 'coffee'
                  ? "We're still discovering coffee spots here. Try searching by name above."
                  : activeFilter === 'study'
                  ? "Study spots might be listed as libraries or cafes. Try the search bar."
                  : `No ${QUICK_FILTERS.find(f => f.id === activeFilter)?.label ?? ''} places found nearby. Try a different filter.`}
              </Text>
              <TouchableOpacity
                onPress={() => activateSearchWithKeyword(
                  QUICK_FILTERS.find(f => f.id === activeFilter)?.label.toLowerCase() ?? ''
                )}
                style={styles.searchInsteadBtn}
              >
                <Text style={styles.searchInsteadText}>Search instead →</Text>
              </TouchableOpacity>
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
                      {place.food_types?.[0] || place.categories_raw?.[0] || place.cuisine || place.types[0]?.replace(/_/g, ' ') || ''}
                    </Text>
                    <View style={styles.moreCardMeta}>
                      {place.is_open !== undefined && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: place.is_open ? COLORS.accent.sage : COLORS.text.disabled }} />
                          <Text style={{ fontSize: 10, fontWeight: '600', color: place.is_open ? COLORS.accent.sage : COLORS.text.hint }}>
                            {place.is_open ? 'Open' : 'Closed'}
                          </Text>
                        </View>
                      )}
                      <Text style={styles.moreCardDist}>
                        {formatDistance(haversineKm(location?.latitude ?? DEFAULT_LAT, location?.longitude ?? DEFAULT_LNG, place.lat, place.lng))}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : null}

          {/* ── Went Here Prompt ──────────────────────────────────── */}
          <TouchableOpacity
            style={styles.wentHereCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('AllPlaces', { places, cityName, showVisitPrompt: true })}
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
  filtersRow: { paddingLeft: 20, paddingRight: 8, paddingBottom: 4, gap: 8 },
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
    marginHorizontal: 20, height: 240, borderRadius: 24, overflow: 'hidden',
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
  searchInsteadBtn: { marginTop: 10, paddingVertical: 6, paddingHorizontal: 16 },
  searchInsteadText: { fontSize: 13, fontFamily: F.semibold, color: COLORS.accent.primary },

  // ── More for you ──────────────────────────────────────────────────────────
  moreRow:   { paddingLeft: 20, paddingRight: 8, gap: 12 },
  moreCard: {
    width: 180, borderRadius: 20, overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#1A1019', shadowOpacity: 0.06,
    shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  moreCardImageWrap: { position: 'relative' },
  moreCardImage:     { width: '100%', height: 130, resizeMode: 'cover' },
  cardVibePill: {
    position: 'absolute', bottom: 8, left: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100,
  },
  cardVibeText:  { fontSize: 9, fontFamily: F.bold, color: '#fff' },
  moreCardBody:  { paddingHorizontal: 12, paddingVertical: 10, gap: 3 },
  moreCardName:  { fontSize: 13, fontFamily: F.bold, color: '#1A1019' },
  moreCardSub:   { fontSize: 11, fontFamily: F.regular, color: '#9E95A8', textTransform: 'capitalize' },
  moreCardMeta:  { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, marginTop: 4 },
  moreCardDist:  { fontSize: 10, fontFamily: F.medium, color: '#9E95A8' },

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
