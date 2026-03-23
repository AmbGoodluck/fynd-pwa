import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Platform, Modal, TouchableWithoutFeedback, FlatList,
  Image, Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Sentry from '../services/sentry';
import { F } from '../theme/fonts';

import PlacePreviewModal, { type PreviewPlace } from '../components/PlacePreviewModal';
import GuestGateModal from '../components/GuestGateModal';
import BookingWebViewModal, { isValidBookingUrl } from '../components/BookingWebViewModal';
import PlaceCard from '../components/PlaceCard';
import { useTripStore } from '../store/useTripStore';
import { useGuestStore } from '../store/useGuestStore';
import { useAuthStore } from '../store/useAuthStore';
import { detectBooking } from '../services/bookingDetectionService';
import { useBookingLinksStore } from '../store/useBookingLinksStore';
import { usePremiumStore, GUEST_MAX_PLACES_PER_ITINERARY } from '../store/usePremiumStore';

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
  const { isGuest, savePlace, unsavePlace, isPlaceSaved, savedPlaces } = useGuestStore();
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
  }, []);

  // Filter places by search query (name or description)
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
    const saved = isPlaceSaved(item.placeId);

    const { showBookNow, bookingLink } = detectBooking({
      placeId: item.placeId,
      businessName: item.name,
      bookingUrl: item.bookingUrl,
      category: item.category,
      types: item.types,
      cached: bookingLinks[item.placeId] ?? null,
    });

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onLongPress={() => handleLongPress(item)}
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
          isSaved={isAuthenticated && !isGuest ? saved : undefined}
          onSave={isAuthenticated && !isGuest ? () => handleSave(item) : undefined}
          isAdded={isSelected}
          onAdd={() => handleAddToItinerary(item)}
          onBook={showBookNow && bookingLink ? () => openBookingUrl(bookingLink.booking_url, item.placeId, item.name) : undefined}
        />
      </TouchableOpacity>
    );
  }, [selectedForItinerary, bookingLinks, isPlaceSaved, places, isAuthenticated, isGuest, savedPlaces]);

  // Avatar: photo or initial letter
  const displayName = user?.fullName?.split(' ')[0] || 'U';
  const avatarLetter = displayName[0]?.toUpperCase() ?? '?';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* ── Top bar: back | Fynd | avatar ────────────────────── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back-outline" size={36} color="#111827" />
        </TouchableOpacity>

        <Text style={styles.topBarTitle}>Fynd</Text>

        <TouchableOpacity
          onPress={() => navigation.navigate('Profile')}
          style={styles.avatarWrap}
        >
          {user?.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarLetter}>{avatarLetter}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Sub-header: title + subtitle + search ─────────────── */}
      <View style={styles.subHeader}>
        <Text style={styles.sectionTitle}>Suggested Places</Text>
        <Text style={styles.sectionSubtitle}>
          Search for places you would like to add to your trip
        </Text>
        <View style={styles.searchRow}>
          <View style={styles.searchInputWrap}>
            <Ionicons name="search-outline" size={18} color="#8E8E93" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search saved places"
              placeholderTextColor="rgba(0,0,0,0.38)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#8E8E93" />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity
            style={styles.searchBtn}
            onPress={() => Keyboard.dismiss()}
          >
            <Text style={styles.searchBtnText}>Search</Text>
          </TouchableOpacity>
        </View>
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
          extraData={savedPlaces}
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
    color: '#111827',
    letterSpacing: 0.2,
  },
  avatarWrap: {
    width: 40, height: 40, borderRadius: 20, overflow: 'hidden',
  },
  avatarImg: { width: 40, height: 40, borderRadius: 20, resizeMode: 'cover' },
  avatarCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center',
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
    color: '#111827',
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
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: { marginRight: 6 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: F.regular,
    color: '#111827',
  },
  searchBtn: {
    backgroundColor: '#22C55E',
    borderRadius: 8,
    width: 80,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnText: { color: '#fff', fontSize: 15, fontFamily: F.medium },

  // ── List ─────────────────────────────────────────────────────
  list: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 24 },

  // ── Empty state ──────────────────────────────────────────────
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontFamily: F.semibold, color: '#111827', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#57636C', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  backBtn: { backgroundColor: '#22C55E', borderRadius: 16, paddingHorizontal: 40, paddingVertical: 14 },
  backBtnText: { color: '#fff', fontSize: 16, fontFamily: F.semibold },

  // ── CTA bar ──────────────────────────────────────────────────
  ctaBar: {
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F2F2F7',
  },
  ctaBtn: {
    backgroundColor: '#22C55E', borderRadius: 16, height: 58,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#22C55E', shadowOpacity: 0.35, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  ctaBtnDisabled: { backgroundColor: '#9CA3AF', shadowOpacity: 0 },
  ctaBtnText: { color: '#fff', fontSize: 16, fontFamily: F.bold },

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
  modalTitle: { fontSize: 22, fontFamily: F.bold, color: '#111827', marginBottom: 10, textAlign: 'center' },
  modalBody: { fontSize: 14, color: '#57636C', textAlign: 'center', lineHeight: 22, marginBottom: 24, paddingHorizontal: 4 },
  modalPrimaryBtn: {
    width: '100%', backgroundColor: '#22C55E', borderRadius: 16,
    height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  modalPrimaryBtnText: { color: '#fff', fontSize: 16, fontFamily: F.bold },
  modalOutlineBtn: {
    width: '100%', borderWidth: 1.5, borderColor: '#22C55E',
    borderRadius: 16, height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  modalOutlineBtnText: { color: '#22C55E', fontSize: 16, fontFamily: F.semibold },
  modalGhostBtn: { paddingVertical: 10, paddingHorizontal: 20 },
  modalGhostBtnText: { color: '#9CA3AF', fontSize: 14, fontFamily: F.semibold },
});
