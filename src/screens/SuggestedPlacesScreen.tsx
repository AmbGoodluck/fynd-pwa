import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Platform, Modal, TouchableWithoutFeedback, FlatList,
  Keyboard, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Sentry from '../services/sentry';
import { F } from '../theme/fonts';

import PlacePreviewModal, { type PreviewPlace } from '../components/PlacePreviewModal';
import GuestGateModal from '../components/GuestGateModal';
import BookingWebViewModal, { isValidBookingUrl } from '../components/BookingWebViewModal';
import PlaceCard from '../components/PlaceCard';
import AppBar from '../components/AppBar';
import { useTripStore } from '../store/useTripStore';
import { useGuestStore } from '../store/useGuestStore';
import { useAuthStore } from '../store/useAuthStore';
import { detectBooking } from '../services/bookingDetectionService';
import { useBookingLinksStore } from '../store/useBookingLinksStore';
import { usePremiumStore, GUEST_MAX_PLACES_PER_ITINERARY } from '../store/usePremiumStore';
import { markA2HSEligible } from '../hooks/useAddToHomeScreen';
import { searchEstablishments, fetchPlaceDetails, getPhotoUrl, type EstablishmentSuggestion, PlaceResult } from '../services/googlePlacesService';
import { upsertSearchedPlace, readPlaceCache } from '../services/placeDetailsService';
import { checkAndSeedCity } from '../services/citySeedService';
import { FALLBACK_IMAGE } from '../constants';

// ── Haversine in-city check ─────────────────────────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isPlaceInCity(placeLat: number, placeLng: number, tripLat: number, tripLng: number, maxKm = 30): boolean {
  if (!tripLat || !tripLng) return true; // no city anchor — allow all
  return haversineKm(placeLat, placeLng, tripLat, tripLng) <= maxKm;
}

// Each item subscribes directly to the store so it re-renders independently
// when savedPlaces changes — FlatList extraData is not reliable on web.
function PlaceListItem({
  item,
  isAdded,
  onAdd,
  onBook,
  onPress,
  onLongPress,
  isAuthenticated,
  isGuest,
  onShowGate,
}: {
  item: any;
  isAdded: boolean;
  onAdd: () => void;
  onBook?: () => void;
  onPress?: () => void;
  onLongPress: () => void;
  isAuthenticated: boolean;
  isGuest: boolean;
  onShowGate: () => void;
}) {
  const isSaved = useGuestStore(s => s.savedPlaces.some((p: any) => p.placeId === item.placeId));
  const savePlace = useGuestStore(s => s.savePlace);
  const unsavePlace = useGuestStore(s => s.unsavePlace);

  // Only allow save/unsave if logged in and not guest
  const canSave = isAuthenticated && !isGuest;
  const handleSave = canSave
    ? (isSaved
        ? () => {
            console.log('[PlaceListItem] Unsave pressed', item.placeId);
            unsavePlace(item.placeId);
          }
        : () => {
            console.log('[PlaceListItem] Save pressed', item.placeId);
            savePlace(item);
          }
      )
    : () => {
        console.warn('[PlaceListItem] Save blocked, not authenticated or guest', { item });
        if (onShowGate) onShowGate();
        else alert('Sign in required to save places.');
      };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
    >
      <PlaceCard
        horizontal
        name={item.name}
        description={item.description || item.category}
        photoUrl={item.photoUrl}
        rating={item.rating}
        distance={item.distanceKm ? `${item.distanceKm} km` : undefined}
        duration={item.walkMinutes ? `${item.walkMinutes} min` : undefined}
        isSaved={canSave && isSaved}
        onSave={handleSave}
        isAdded={isAdded}
        onAdd={onAdd}
        onBook={onBook}
      />
    </TouchableOpacity>
  );
}

type Props = { navigation: any; route: any };

export default function SuggestedPlacesScreen({ navigation, route }: Props) {
  const mountAtRef = useRef(Date.now());
  const params = route?.params || {};
  const places: any[] = params.places || [];
  const tripId = params.tripId || null;
  const destination = params.destination || '';
  const tripVibes = params.vibes || [];
  const explorationHours = params.explorationHours || 3;
  const timeOfDay = params.timeOfDay || 'morning';
  const userLatitude: number | null = params.latitude ?? null;
  const userLongitude: number | null = params.longitude ?? null;

  const { bottom: bottomInset } = useSafeAreaInsets();
  const { isGuest, savePlace, unsavePlace, isPlaceSaved } = useGuestStore();
  const { isPremium } = usePremiumStore();
  const { isAuthenticated, user } = useAuthStore();
  const { incrementItineraryCount } = usePremiumStore();

  const maxPlaces = isGuest ? GUEST_MAX_PLACES_PER_ITINERARY : Infinity;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedForItinerary, setSelectedForItinerary] = useState<any[]>([]);
  const [previewPlace, setPreviewPlace] = useState<PreviewPlace | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showGate, setShowGate] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [bookingUrl, setBookingUrl] = useState<string | null>(null);
  const [bookingTitle, setBookingTitle] = useState('');
  const [bookingPlaceId, setBookingPlaceId] = useState<string | null>(null);

  // ── Universal place search state ───────────────────────────────────────────
  const [placeSearch, setPlaceSearch] = useState('');
  const [placeSearchResults, setPlaceSearchResults] = useState<EstablishmentSuggestion[]>([]);
  const [placeSearchLoading, setPlaceSearchLoading] = useState(false);
  const [placeSearchFocused, setPlaceSearchFocused] = useState(false);
  // placeId → { inCity, distKm, details }
  const [resolvedPlaces, setResolvedPlaces] = useState<Record<string, { inCity: boolean; distKm: number; details: any | null; adding: boolean }>>({});
  const placeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { user: currentUser } = useAuthStore();

  const bookingLinks = useBookingLinksStore(s => s.links);
  const setBookingLink = useBookingLinksStore(s => s.setLink);
  const applyBookingFeedback = useBookingLinksStore(s => s.applyFeedback);

  useEffect(() => {
    const navStart = typeof params.perfSuggestedNavAt === 'number' ? params.perfSuggestedNavAt : mountAtRef.current;
    Sentry.addBreadcrumb({
      category: 'perf.suggested',
      message: 'suggested_first_render',
      level: 'info',
      data: { firstRenderMs: Date.now() - navStart, placeCount: places.length },
    });
    // Fire-and-forget: seed the trip destination city in the background
    if (destination && userLatitude && userLongitude && currentUser?.id) {
      checkAndSeedCity(destination, userLatitude, userLongitude, currentUser.id).catch(() => {});
    }
  }, []);

  // ── Debounced establishment search ──────────────────────────────────────────
  useEffect(() => {
    if (placeDebounceRef.current) clearTimeout(placeDebounceRef.current);
    if (!placeSearch.trim() || placeSearch.trim().length < 2) {
      setPlaceSearchResults([]);
      setPlaceSearchLoading(false);
      return;
    }
    setPlaceSearchLoading(true);
    placeDebounceRef.current = setTimeout(async () => {
      const results = await searchEstablishments(
        placeSearch,
        userLatitude ?? 0,
        userLongitude ?? 0,
        50000,
      );
      setPlaceSearchResults(results);
      setPlaceSearchLoading(false);
    }, 300);
    return () => { if (placeDebounceRef.current) clearTimeout(placeDebounceRef.current); };
  }, [placeSearch, userLatitude, userLongitude]);

  const handleSelectSearchResult = async (suggestion: EstablishmentSuggestion) => {
    Keyboard.dismiss();
    // If already resolved, skip re-fetch
    if (resolvedPlaces[suggestion.placeId]) return;
    setResolvedPlaces(prev => ({ ...prev, [suggestion.placeId]: { inCity: true, distKm: 0, details: null, adding: false } }));
    // Check Firestore cache first — zero API cost if seeded
    const cached = await readPlaceCache(suggestion.placeId);
    const details = cached
      ? {
          placeId: cached.place_id,
          name: cached.place_name,
          formattedAddress: cached.formatted_address,
          city: cached.city,
          phone: cached.phone,
          website: cached.website,
          rating: cached.rating,
          priceLevel: cached.price_level,
          openingHours: cached.opening_hours
            ? { openNow: cached.opening_hours.open_now, weekdayText: cached.opening_hours.weekday_text }
            : undefined,
          photoUrls: cached.photo_urls || [],
          photoRefs: [],
          types: cached.types || [],
          lat: cached.lat,
          lng: cached.lng,
          editorialSummary: cached.editorial_summary,
          mapsUrl: cached.maps_url,
        }
      : await fetchPlaceDetails(suggestion.placeId);
    if (!details) return;
    const distKm = (userLatitude && userLongitude)
      ? haversineKm(details.lat, details.lng, userLatitude, userLongitude)
      : 0;
    const inCity = isPlaceInCity(details.lat, details.lng, userLatitude ?? 0, userLongitude ?? 0);
    setResolvedPlaces(prev => ({ ...prev, [suggestion.placeId]: { inCity, distKm, details, adding: false } }));
  };

  const handleAddSearchedPlace = async (suggestion: EstablishmentSuggestion) => {
    const resolved = resolvedPlaces[suggestion.placeId];
    if (!resolved?.details || !resolved.inCity) return;
    if (selectedForItinerary.length >= maxPlaces) { setShowUpgradeModal(true); return; }

    const details = resolved.details;
    const newPlace: any = {
      placeId: suggestion.placeId,
      name: details.name,
      address: details.formattedAddress,
      description: details.editorialSummary || details.types?.[0]?.replace(/_/g, ' ') || '',
      rating: details.rating || 4.0,
      photoUrl: details.photoUrls?.[0] || FALLBACK_IMAGE,
      photoUrls: details.photoUrls,
      coordinates: { lat: details.lat, lng: details.lng },
      category: details.types?.[0]?.replace(/_/g, ' ') || 'place',
      types: details.types,
      distanceKm: Math.round(resolved.distKm * 10) / 10,
    };

    setSelectedForItinerary(prev => [...prev, newPlace]);
    // Persist to Firestore so it enriches the places catalog
    upsertSearchedPlace(suggestion.placeId, details, destination, currentUser?.id);
    // Clear search
    setPlaceSearch('');
    setPlaceSearchResults([]);
    setPlaceSearchFocused(false);
    markA2HSEligible();
  };

  // ── Filter local pre-loaded places by search query ────────────────────────
  const filteredPlaces = searchQuery.trim()
    ? places.filter(p =>
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.category || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : places;

  const handleAddToItinerary = (place: any) => {
    const isSelected = selectedForItinerary.find(p => p.placeId === place.placeId);
    if (isSelected) {
      setSelectedForItinerary(prev => prev.filter(p => p.placeId !== place.placeId));
    } else {
      if (selectedForItinerary.length >= maxPlaces) {
        setShowUpgradeModal(true);
        return;
      }
      setSelectedForItinerary(prev => [...prev, place]);
    }
  };

  const handleSave = (place: any) => {
    if (isGuest || !isAuthenticated) { setShowGate(true); return; }
    if (isPlaceSaved(place.placeId)) {
      unsavePlace(place.placeId);
      return;
    }
    savePlace(place);
    markA2HSEligible();
  };

  const handleLongPress = (place: any) => {
    const { showBookNow, bookingLink } = detectBooking({
      placeId: place.placeId,
      businessName: place.name,
      bookingUrl: place.bookingUrl,
      category: place.category,
      types: place.types,
      cached: bookingLinks[place.placeId] ?? null,
    });
    if (bookingLink) setBookingLink(bookingLink);

    markA2HSEligible();
    setPreviewPlace({
      placeId: place.placeId,
      name: place.name,
      description: place.description || place.category || '',
      rating: place.rating || 4.0,
      distanceKm: place.distanceKm,
      photoUrl: place.photoUrl,
      photoUrls: place.photoUrls,
      bookingUrl: showBookNow ? bookingLink?.booking_url : undefined,
      category: place.category,
      address: place.address,
      vibes: tripVibes,
    });
    setShowPreview(true);
  };

  const openBookingUrl = (url: string, placeId: string, name?: string) => {
    if (!isValidBookingUrl(url)) return;
    setBookingTitle(name || 'Book Now');
    setBookingUrl(url);
    setBookingPlaceId(placeId);
  };

  const handleGenerateItinerary = () => {
    if (selectedForItinerary.length === 0) return;
    if (!isGuest) incrementItineraryCount();
    navigation.navigate('Itinerary', {
      places: selectedForItinerary,
      tripId, destination, vibes: tripVibes,
      explorationHours, timeOfDay,
      userLatitude, userLongitude,
    });
  };

  const renderPlace = useCallback(({ item }: { item: any }) => {
    const isSelected = !!selectedForItinerary.find(p => p.placeId === item.placeId);

    const { showBookNow, bookingLink } = detectBooking({
      placeId: item.placeId,
      businessName: item.name,
      bookingUrl: item.bookingUrl,
      category: item.category,
      types: item.types,
      cached: bookingLinks[item.placeId] ?? null,
    });

    return (
      <PlaceListItem
        item={item}
        isAdded={isSelected}
        onAdd={() => handleAddToItinerary(item)}
        onBook={showBookNow && bookingLink ? () => openBookingUrl(bookingLink.booking_url, item.placeId, item.name) : undefined}
        onPress={() => navigation.navigate('PlaceDetail', {
          placeId: item.placeId,
          name: item.name,
          photoUrl: item.photoUrl,
          photoUrls: item.photoUrls,
          description: item.description || item.category,
          rating: item.rating,
          address: item.formatted_address || item.address,
          category: item.category,
          types: item.types,
          lat: item.coordinates?.lat,
          lng: item.coordinates?.lng,
        })}
        onLongPress={() => handleLongPress(item)}
        isAuthenticated={isAuthenticated}
        isGuest={isGuest}
        onShowGate={() => setShowGate(true)}
      />
    );
  }, [selectedForItinerary, bookingLinks, isAuthenticated, isGuest]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* ── Top bar ──────────────────────────────────────────── */}
      <AppBar
        variant="sub"
        title="Suggested Places"
        onBack={() => navigation.goBack()}
      />

      {/* ── Sub-header: subtitle only ─────────────────────── */}
      <View style={styles.subHeader}>
        <Text style={styles.sectionSubtitle}>
          Select places you'd like to include in your itinerary
        </Text>
      </View>

      {/* ── Universal Place Search ───────────────────────────── */}
      <View style={styles.uniSearchWrap}>
        <View style={[styles.uniSearchRow, placeSearchFocused && styles.uniSearchRowFocused]}>
          <Ionicons name="add-circle-outline" size={18} color="#10B981" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.uniSearchInput}
            placeholder="Search any place to add…"
            placeholderTextColor="rgba(0,0,0,0.38)"
            value={placeSearch}
            onChangeText={setPlaceSearch}
            onFocus={() => setPlaceSearchFocused(true)}
            onBlur={() => { if (!placeSearch) setPlaceSearchFocused(false); }}
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          {placeSearchLoading
            ? <ActivityIndicator size="small" color="#10B981" />
            : placeSearch.length > 0
              ? <TouchableOpacity onPress={() => { setPlaceSearch(''); setPlaceSearchResults([]); setPlaceSearchFocused(false); }}>
                  <Ionicons name="close-circle" size={16} color="#8E8E93" />
                </TouchableOpacity>
              : null
          }
        </View>

        {/* Search results dropdown */}
        {placeSearchFocused && placeSearchResults.length > 0 && (
          <View style={styles.uniSearchDropdown}>
            {placeSearchResults.map((item, idx) => {
              const resolved = resolvedPlaces[item.placeId];
              const isResolved = !!resolved?.details;
              const inCity = resolved ? resolved.inCity : true;
              const distKm = resolved?.distKm ?? 0;
              const isAdded = !!selectedForItinerary.find(p => p.placeId === item.placeId);

              return (
                <TouchableOpacity
                  key={item.placeId}
                  style={[
                    styles.uniResultItem,
                    idx < placeSearchResults.length - 1 && styles.uniResultBorder,
                    !inCity && styles.uniResultDimmed,
                  ]}
                  onPress={() => handleSelectSearchResult(item)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <View style={styles.uniResultNameRow}>
                      <Text style={styles.uniResultName} numberOfLines={1}>{item.name}</Text>
                      {!inCity && isResolved && (
                        <Ionicons name="warning-outline" size={14} color="#D97706" style={{ marginLeft: 6 }} />
                      )}
                    </View>
                    <Text style={styles.uniResultAddr} numberOfLines={1}>{item.address}</Text>
                    {isResolved && !inCity && (
                      <View style={styles.outOfCityBanner}>
                        <Text style={styles.outOfCityText}>
                          Outside trip area · {Math.round(distKm)} km away
                        </Text>
                      </View>
                    )}
                  </View>
                  {isResolved && inCity && !isAdded && (
                    <TouchableOpacity style={styles.uniAddBtn} onPress={() => handleAddSearchedPlace(item)}>
                      <Ionicons name="add" size={14} color="#fff" />
                      <Text style={styles.uniAddBtnText}>Add</Text>
                    </TouchableOpacity>
                  )}
                  {isAdded && (
                    <View style={styles.uniAddedBadge}>
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    </View>
                  )}
                  {!isResolved && (
                    <ActivityIndicator size="small" color="#9CA3AF" style={{ marginLeft: 8 }} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {placeSearchFocused && !placeSearchLoading && placeSearch.trim().length >= 2 && placeSearchResults.length === 0 && (
          <View style={styles.uniEmptyState}>
            <Text style={styles.uniEmptyText}>No places found for "{placeSearch}"</Text>
          </View>
        )}
      </View>

      {/* ── Place list ────────────────────────────────────────── */}
      {filteredPlaces.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="search" size={60} color="#E5E5EA" />
          <Text style={styles.emptyTitle}>
            {places.length === 0 ? 'No places found' : 'No results'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {places.length === 0
              ? 'Try different vibes or adjust your trip preferences'
              : 'Try a different search term'}
          </Text>
          {places.length === 0 ? (
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.backBtnText}>Go Back</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <FlatList
          data={filteredPlaces}
          keyExtractor={item => item.placeId || String(item.name)}
          renderItem={renderPlace}
          showsVerticalScrollIndicator={false}
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.list,
            Platform.OS === 'web' && { paddingBottom: 16 },
          ]}
          style={styles.scrollView}
        />
      )}

      {/* ── CTA bar ──────────────────────────────────────────── */}
      <View style={[
        styles.ctaBar,
        { paddingBottom: Math.max(12, bottomInset) },
        Platform.OS === 'web' && { marginBottom: bottomInset },
      ]}>
        <TouchableOpacity
          style={[styles.ctaBtn, selectedForItinerary.length === 0 && styles.ctaBtnDisabled]}
          onPress={handleGenerateItinerary}
          disabled={selectedForItinerary.length === 0}
          activeOpacity={0.8}
        >
          <Ionicons name="map-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.ctaBtnText}>
            {selectedForItinerary.length === 0
              ? 'Select places to continue'
              : `Generate Itinerary (${selectedForItinerary.length})`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Modals ───────────────────────────────────────────── */}
      <PlacePreviewModal
        visible={showPreview}
        place={previewPlace}
        isInItinerary={previewPlace ? !!selectedForItinerary.find(p => p.placeId === previewPlace.placeId) : false}
        isSaved={previewPlace ? isPlaceSaved(previewPlace.placeId) : false}
        onViewDetails={() => setShowPreview(false)}
        onClose={() => setShowPreview(false)}
        onAddToItinerary={() => {
          if (previewPlace) {
            const full = places.find(p => p.placeId === previewPlace.placeId);
            if (full) handleAddToItinerary(full);
          }
          setShowPreview(false);
        }}
        onRemoveFromItinerary={() => {
          if (previewPlace) {
            const full = places.find(p => p.placeId === previewPlace.placeId);
            if (full) handleAddToItinerary(full);
          }
          setShowPreview(false);
        }}
        onSave={() => {
          if (!previewPlace) return;
          const full = places.find(p => p.placeId === previewPlace.placeId);
          if (full) handleSave(full);
        }}
        onUnsave={() => {
          if (previewPlace) unsavePlace(previewPlace.placeId);
        }}
      />

      <BookingWebViewModal
        visible={!!bookingUrl}
        url={bookingUrl ?? ''}
        title={bookingTitle}
        placeId={bookingPlaceId ?? undefined}
        onClose={() => { setBookingUrl(null); setBookingPlaceId(null); }}
        onFeedback={applyBookingFeedback}
      />

      <GuestGateModal
        visible={showGate}
        onDismiss={() => setShowGate(false)}
        onLogin={() => { setShowGate(false); navigation.navigate('Login'); }}
        onRegister={() => { setShowGate(false); navigation.navigate('Register'); }}
        onContinueAsGuest={() => setShowGate(false)}
      />

      <Modal
        visible={showUpgradeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowUpgradeModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowUpgradeModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalSheet}>
                <View style={styles.modalHandle} />
                <View style={styles.modalIconWrap}>
                  <Text style={styles.modalEmoji}>🔒</Text>
                </View>
                <Text style={styles.modalTitle}>Upgrade Your Access</Text>
                <Text style={styles.modalBody}>
                  Create an account to add more places and unlock unlimited trip planning.
                </Text>
                <TouchableOpacity
                  style={styles.modalPrimaryBtn}
                  onPress={() => { setShowUpgradeModal(false); navigation.navigate('Register'); }}
                >
                  <Text style={styles.modalPrimaryBtnText}>Create Account</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalOutlineBtn}
                  onPress={() => { setShowUpgradeModal(false); navigation.navigate('Login'); }}
                >
                  <Text style={styles.modalOutlineBtnText}>Sign In</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalGhostBtn}
                  onPress={() => setShowUpgradeModal(false)}
                >
                  <Text style={styles.modalGhostBtnText}>Continue as Guest</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollView: { flex: 1, minHeight: 0 },

  // ── Top bar ─────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingRight: 14,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  topBarTitle: {
    fontSize: 22,
    fontFamily: F.semibold,
    color: '#1A1A1A',
    letterSpacing: 0.2,
  },
  avatarWrap: {
    width: 40, height: 40, borderRadius: 20, overflow: 'hidden',
  },
  avatarImg: { width: 40, height: 40, borderRadius: 20, resizeMode: 'cover' },
  avatarCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { color: '#fff', fontFamily: F.bold, fontSize: 16 },

  // ── Sub-header ───────────────────────────────────────────────
  subHeader: {
    backgroundColor: '#fff',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: F.semibold,
    color: '#1A1A1A',
    marginLeft: 20,
    marginTop: 14,
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: F.regular,
    color: '#57636C',
    marginLeft: 20,
    marginBottom: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 8,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 14,
    borderWidth: 0,
    borderColor: 'transparent',
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: { marginRight: 6 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: F.regular,
    color: '#1A1A1A',
  },
  searchBtn: {
    backgroundColor: '#1A1A1A',
    borderRadius: 9999,
    paddingHorizontal: 16,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnText: { color: '#fff', fontSize: 13, fontFamily: F.semibold },

  // ── Universal Search ─────────────────────────────────────────
  uniSearchWrap: {
    marginHorizontal: 14, marginBottom: 4, zIndex: 10,
  },
  uniSearchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F0FDF4', borderRadius: 14,
    borderWidth: 0, borderColor: 'transparent',
    paddingHorizontal: 12, height: 44,
  },
  uniSearchRowFocused: { borderColor: '#10B981', borderWidth: 1.5 },
  uniSearchInput: { flex: 1, fontSize: 14, fontFamily: F.regular, color: '#1A1A1A' },
  uniSearchDropdown: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
    marginTop: 4,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
    overflow: 'hidden',
  },
  uniResultItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  uniResultBorder: { borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
  uniResultDimmed: { opacity: 0.55 },
  uniResultNameRow: { flexDirection: 'row', alignItems: 'center' },
  uniResultName: { fontSize: 14, fontFamily: F.semibold, color: '#1A1A1A', flex: 1 },
  uniResultAddr: { fontSize: 12, fontFamily: F.regular, color: '#6B7280', marginTop: 2 },
  outOfCityBanner: {
    marginTop: 4, backgroundColor: '#FEF3C7',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  outOfCityText: { fontSize: 11, fontFamily: F.medium, color: '#92400E' },
  uniAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#10B981', borderRadius: 9999,
    paddingHorizontal: 12, paddingVertical: 6, marginLeft: 8,
  },
  uniAddBtnText: { fontSize: 12, fontFamily: F.semibold, color: '#fff' },
  uniAddedBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center', marginLeft: 8,
  },
  uniEmptyState: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
    marginTop: 4, paddingVertical: 14, paddingHorizontal: 16,
  },
  uniEmptyText: { fontSize: 13, fontFamily: F.regular, color: '#6B7280', textAlign: 'center' },

  // ── List ─────────────────────────────────────────────────────
  list: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 24 },

  // ── Empty state ──────────────────────────────────────────────
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontFamily: F.semibold, color: '#1A1A1A', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#57636C', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  backBtn: { backgroundColor: '#10B981', borderRadius: 16, paddingHorizontal: 40, paddingVertical: 14 },
  backBtnText: { color: '#fff', fontSize: 16, fontFamily: F.semibold },

  // ── CTA bar ──────────────────────────────────────────────────
  ctaBar: {
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F2F2F7',
    flexShrink: 0,
  },
  ctaBtn: {
    backgroundColor: '#10B981', borderRadius: 12, height: 50,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#10B981', shadowOpacity: 0.3, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  ctaBtnDisabled: { backgroundColor: '#10B981', opacity: 0.4, shadowOpacity: 0 },
  ctaBtnText: { color: '#fff', fontSize: 15, fontFamily: F.semibold },

  // ── Modals ───────────────────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 44, alignItems: 'center',
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E5EA', marginBottom: 20 },
  modalIconWrap: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#FEF9C3',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  modalEmoji: { fontSize: 28 },
  modalTitle: { fontSize: 22, fontFamily: F.bold, color: '#1A1A1A', marginBottom: 10, textAlign: 'center' },
  modalBody: { fontSize: 14, color: '#57636C', textAlign: 'center', lineHeight: 22, marginBottom: 24, paddingHorizontal: 4 },
  modalPrimaryBtn: {
    width: '100%', backgroundColor: '#10B981', borderRadius: 16,
    height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  modalPrimaryBtnText: { color: '#fff', fontSize: 16, fontFamily: F.bold },
  modalOutlineBtn: {
    width: '100%', borderWidth: 1.5, borderColor: '#10B981',
    borderRadius: 16, height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  modalOutlineBtnText: { color: '#10B981', fontSize: 16, fontFamily: F.semibold },
  modalGhostBtn: { paddingVertical: 10, paddingHorizontal: 20 },
  modalGhostBtnText: { color: '#9CA3AF', fontSize: 14, fontFamily: F.semibold },
});
