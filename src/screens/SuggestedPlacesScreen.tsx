import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Platform, Modal, TouchableWithoutFeedback, FlatList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Sentry from '../services/sentry';
import { F } from '../theme/fonts';
import AppHeader from '../components/AppHeader';

import PlacePreviewModal, { type PreviewPlace } from '../components/PlacePreviewModal';
import GuestGateModal from '../components/GuestGateModal';
import BookingWebViewModal, { isValidBookingUrl } from '../components/BookingWebViewModal';
import PlaceCard from '../components/PlaceCard';
import { useTripStore } from '../store/useTripStore';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
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
  const tabBarHeight = useBottomTabBarHeight();
  const { isPremium } = usePremiumStore();
  const { isAuthenticated } = useAuthStore();
  const { incrementItineraryCount } = usePremiumStore();

  // Guests are limited to GUEST_MAX; all logged-in users are unlimited
  const maxPlaces = isGuest ? GUEST_MAX_PLACES_PER_ITINERARY : Infinity;

  const [selectedForItinerary, setSelectedForItinerary] = useState<any[]>([]);
  const [previewPlace, setPreviewPlace] = useState<PreviewPlace | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showGate, setShowGate] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [bookingUrl, setBookingUrl] = useState<string | null>(null);
  const [bookingTitle, setBookingTitle] = useState('');
  const [bookingPlaceId, setBookingPlaceId] = useState<string | null>(null);

  // Section 8 + 10: booking links cache — prevents repeated detection for same place
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

  const handleAddToItinerary = (place: any) => {
    const isSelected = selectedForItinerary.find(p => p.placeId === place.placeId);
    if (isSelected) {
      setSelectedForItinerary(prev => prev.filter(p => p.placeId !== place.placeId));
    } else {
      const isItineraryFull = selectedForItinerary.length >= maxPlaces; // Use maxPlaces
      if (isItineraryFull) {
        // Only guests have a finite maxPlaces; authenticated users have Infinity so
        // this branch is only reachable for guests — show upgrade modal.
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
    // Run booking detection so the preview modal only shows a verified booking URL
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
    if (!isGuest) {
      incrementItineraryCount();
    }
    navigation.navigate('Itinerary', {
      places: selectedForItinerary,
      tripId, destination, vibes: tripVibes,
      explorationHours, timeOfDay,
      userLatitude, userLongitude,
    });
  };

  const renderPlace = useCallback(({ item, index }: { item: any, index: number }) => {
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
          name={item.name}
          description={item.description || item.category}
          photoUrl={item.photoUrl}
          rating={item.rating}
          distance={item.distanceKm ? `${item.distanceKm} km` : undefined}
          isSaved={saved}
          onSave={() => handleSave(item)}
          isAdded={isSelected}
          onAdd={() => handleAddToItinerary(item)}
          onBook={showBookNow && bookingLink ? () => openBookingUrl(bookingLink.booking_url, item.placeId, item.name) : undefined}
        />
      </TouchableOpacity>
    );
  }, [selectedForItinerary, bookingLinks, isPlaceSaved, places]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="Suggested Places" onBack={() => navigation.goBack()} />

      {destination ? (
        <View style={styles.destRow}>
          <Ionicons name="location" size={13} color="#22C55E" />
          <Text style={styles.destinationTag}>{destination}</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{places.length} places</Text>
          </View>
        </View>
      ) : null}

      {(tripVibes && tripVibes.length > 0) || timeOfDay ? (
        <View style={styles.interestsRow}>
          <Text style={styles.interestsLabel}>Filters: </Text>
          {timeOfDay ? (
            <View style={styles.todChip}>
              <Ionicons
                name={timeOfDay === 'morning' ? 'sunny-outline' : timeOfDay === 'afternoon' ? 'partly-sunny-outline' : timeOfDay === 'evening' ? 'moon-outline' : 'star-outline'}
                size={10}
                color="#fff"
              />
              <Text style={styles.todChipText}>{timeOfDay.charAt(0).toUpperCase() + timeOfDay.slice(1)}</Text>
            </View>
          ) : null}
          {tripVibes && tripVibes.length > 0 ? (
            <Text style={styles.interestsText} numberOfLines={1}>
              {(timeOfDay ? ' • ' : '') + tripVibes.map((v: string) =>
                v.split(' ')[0].charAt(0).toUpperCase() + v.split(' ')[0].slice(1)
              ).join(' • ')}
            </Text>
          ) : null}
        </View>
      ) : null}

      {places.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="search" size={60} color="#E5E5EA" />
          <Text style={styles.emptyTitle}>No places found</Text>
          <Text style={styles.emptySubtitle}>Try different vibes or adjust your trip preferences</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={places}
          keyExtractor={item => item.placeId || String(item.name)}
          renderItem={renderPlace}
          showsVerticalScrollIndicator={false}
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews
          contentContainerStyle={[
            styles.list,
            // Extra bottom padding so the last card doesn't hide under the
            // stacked CTA bar + absolute tab bar on web.
            Platform.OS === 'web' && { paddingBottom: 16 },
          ]}
          style={styles.scrollView}
        />
      )}

      <View style={[
        styles.ctaBar,
        { paddingBottom: Math.max(12, bottomInset) },
        // On web the tab bar is position:absolute, so it floats above our content.
        // Add explicit margin so the CTA button sits fully above the tab bar.
        Platform.OS === 'web' && { marginBottom: tabBarHeight },
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
              : `Build Itinerary (${selectedForItinerary.length})`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Long-press Place Preview Modal */}
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
            if (full) handleAddToItinerary(full); // toggles off
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

      {/* In-app Booking WebView */}
      <BookingWebViewModal
        visible={!!bookingUrl}
        url={bookingUrl ?? ''}
        title={bookingTitle}
        placeId={bookingPlaceId ?? undefined}
        onClose={() => { setBookingUrl(null); setBookingPlaceId(null); }}
        onFeedback={applyBookingFeedback}
      />

      {/* Guest Gate Modal */}
      <GuestGateModal
        visible={showGate}
        onDismiss={() => setShowGate(false)}
        onLogin={() => { setShowGate(false); navigation.navigate('Login'); }}
        onRegister={() => { setShowGate(false); navigation.navigate('Register'); }}
        onContinueAsGuest={() => setShowGate(false)}
      />

      {/* Guest Itinerary Limit Modal */}
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
  container: { flex: 1, minHeight: 0, backgroundColor: '#F9FAFB' },
  scrollView: { flex: 1, minHeight: 0 },
  destRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F2F2F7',
  },
  destinationTag: { fontSize: 13, color: '#374151', fontWeight: '500', flex: 1 },
  countBadge: {
    backgroundColor: '#F0FDF4', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 3,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  countBadgeText: { fontSize: 12, color: '#22C55E', fontWeight: '600' },
  list: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
    overflow: 'hidden',
  },
  imageContainer: { position: 'relative' },
  cardImage: { width: '100%', height: 200, resizeMode: 'cover' },
  heartBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { padding: 16 },
  cardName: { fontSize: 18, fontFamily: F.bold, color: '#111827', marginBottom: 6 },
  cardDesc: { fontSize: 14, fontFamily: F.regular, color: '#6B7280', marginBottom: 10, lineHeight: 20 },
  cardMeta: { flexDirection: 'row', gap: 12, marginBottom: 14, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, fontFamily: F.medium, color: '#57636C', maxWidth: 120 },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    paddingTop: 14,
    flexWrap: 'wrap',
  },
  addBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#22C55E',
  },
  addBtnSelected: { backgroundColor: '#22C55E' },
  addBtnText: { fontSize: 13, fontFamily: F.semibold, color: '#22C55E' },
  addBtnTextSelected: { color: '#fff' },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1D4ED8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  bookBtnText: { fontSize: 13, fontFamily: F.bold, color: '#fff' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyTitle: {
    fontSize: 18, fontFamily: F.semibold,
    color: '#111827', marginTop: 16, marginBottom: 8,
  },
  emptySubtitle: { fontSize: 14, color: '#57636C', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  backBtn: { backgroundColor: '#22C55E', borderRadius: 16, paddingHorizontal: 40, paddingVertical: 14 },
  backBtnText: { color: '#fff', fontSize: 16, fontFamily: F.semibold },
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
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 44, alignItems: 'center',
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E5E5EA', marginBottom: 20,
  },
  modalIconWrap: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#FEF9C3',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  modalEmoji: { fontSize: 28 },
  modalTitle: {
    fontSize: 22, fontFamily: F.bold, color: '#111827',
    marginBottom: 10, textAlign: 'center',
  },
  modalBody: {
    fontSize: 14, color: '#57636C', textAlign: 'center',
    lineHeight: 22, marginBottom: 24, paddingHorizontal: 4,
  },
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
  interestsRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F2F2F7',
    flexWrap: 'wrap', gap: 8,
  },
  interestsLabel: { fontSize: 13, color: '#6B7280', fontFamily: F.medium },
  interestsText: { fontSize: 13, color: '#22C55E', fontFamily: F.bold, flex: 1 },
  todChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F0FDF4', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: '#DCFCE7',
  },
  todChipText: { fontSize: 12, color: '#16A34A', fontFamily: F.bold },

  matchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginBottom: 8,
  },
  matchText: { fontSize: 12, color: '#22C55E', fontFamily: F.semibold, flex: 1 },
});
