import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Linking,
  Alert, Modal, Image, Platform, Share, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { F } from '../theme/fonts';
import DraggableList from '../components/DraggableList';
import PlacePreviewModal, { type PreviewPlace } from '../components/PlacePreviewModal';
import { logEvent } from '../services/firebase';
import { createSharedTrip, buildShareLink } from '../services/sharedTripService';
import { useSharedTripStore } from '../store/useSharedTripStore';
import BookingWebViewModal, { isValidBookingUrl } from '../components/BookingWebViewModal';
import FyndPlusUpgradeModal from '../components/FyndPlusUpgradeModal';
import { usePremiumStore } from '../store/usePremiumStore';
import { detectBooking } from '../services/bookingDetectionService';
import { useBookingLinksStore } from '../store/useBookingLinksStore';
import { useTripStore } from '../store/useTripStore';

// Matches the image height used in SuggestedPlacesScreen for visual consistency
const ITEM_HEIGHT = 128;

function mapPlaceToStop(p: any, index: number) {
  return {
    id: p.placeId || String(index),
    name: p.name || 'Unknown Place',
    description: p.description || p.category || '',
    distance: p.distanceKm ? `${p.distanceKm} km` : '',
    time: p.walkMinutes ? `${p.walkMinutes} min` : '',
    rating: p.rating ? String(p.rating.toFixed(1)) : '4.0',
    image: p.photoUrl || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400',
    coordinate: {
      latitude: p.coordinates?.lat ?? 0,
      longitude: p.coordinates?.lng ?? 0,
    },
    bookingUrl: p.bookingUrl,
    // Preserve for booking detection (Sections 5–6)
    category: p.category as string | undefined,
    types: p.types as string[] | undefined,
  };
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type Stop = ReturnType<typeof mapPlaceToStop>;
type Props = { navigation: any; route?: any };

export default function ItineraryScreen({ navigation, route }: Props) {
  const rawPlaces = route?.params?.places ?? route?.params?.stops ?? [];
  const destination = route?.params?.destination || 'Your Destination';
  const tripData = route?.params || {};
  const userLat: number | null = route?.params?.userLatitude ?? null;
  const userLng: number | null = route?.params?.userLongitude ?? null;
  const tripVibes: string[] = route?.params?.vibes ?? [];

  const rawStops: Stop[] = rawPlaces.map(mapPlaceToStop);
  const initialStops: Stop[] =
    userLat !== null && userLng !== null
      ? [...rawStops].sort((a, b) =>
          haversineKm(userLat, userLng, a.coordinate.latitude, a.coordinate.longitude) -
          haversineKm(userLat, userLng, b.coordinate.latitude, b.coordinate.longitude)
        )
      : rawStops;

  const [stops, setStops] = useState<Stop[]>(initialStops);
  const [showMapModal, setShowMapModal] = useState(false);
  const [previewStop, setPreviewStop] = useState<PreviewPlace | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [bookingUrl, setBookingUrl] = useState<string | null>(null);
  const [bookingTitle, setBookingTitle] = useState('');
  const [bookingPlaceId, setBookingPlaceId] = useState<string | null>(null);

  // Sections 8 + 10: booking links cache
  const bookingLinks = useBookingLinksStore(s => s.links);
  const setBookingLink = useBookingLinksStore(s => s.setLink);
  const applyBookingFeedback = useBookingLinksStore(s => s.applyFeedback);
  const setStorePlaces = useTripStore(s => s.setSelectedPlaces);

  const { sessionUserId, sessionUserName, addMyTrip } = useSharedTripStore();
  const { isPremium } = usePremiumStore();
  const { bottom: bottomInset } = useSafeAreaInsets();
  const [showShareUpgradeModal, setShowShareUpgradeModal] = useState(false);

  useEffect(() => {
    logEvent('itinerary_viewed', { destination, stop_count: initialStops.length });
  }, []);

  const removePlace = (id: string) =>
    setStops(prev => prev.filter(s => s.id !== id));

  const openBookingUrl = (url: string, placeId: string, name?: string) => {
    if (!isValidBookingUrl(url)) return;
    setBookingTitle(name || 'Book Now');
    setBookingUrl(url);
    setBookingPlaceId(placeId);
  };

  const openGoogleMaps = () => {
    if (stops.length === 0) return;
    const openUrl = (url: string) => {
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      } else {
        Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open Google Maps.'));
      }
    };
    if (stops.length === 1) {
      const { latitude, longitude } = stops[0].coordinate;
      openUrl(`https://maps.google.com/maps?q=${latitude},${longitude}`);
      return;
    }
    const origin = stops[0].coordinate;
    const dest = stops[stops.length - 1].coordinate;
    const waypoints = stops.slice(1, -1)
      .map(s => `${s.coordinate.latitude},${s.coordinate.longitude}`)
      .join('|');
    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin.latitude},${origin.longitude}&destination=${dest.latitude},${dest.longitude}`;
    if (waypoints) url += `&waypoints=${encodeURIComponent(waypoints)}`;
    openUrl(url);
  };

  const openInAppMap = () => {
    setShowMapModal(false);
    logEvent('map_opened', { type: 'in_app', destination, stop_count: stops.length });
    // Persist stops to session store so the Map tab also shows them
    setStorePlaces(stops.map(s => ({
      id: s.id,
      name: s.name,
      description: s.description,
      image: s.image,
      coordinate: s.coordinate,
      address: '',
    })));
    navigation.navigate('TripMap', { stops });
  };

  const handleShareViaSheet = async (link: string, tripName: string) => {
    try {
      await Share.share({
        message: `Join my trip "${tripName}" on Fynd! ${link}`,
        title: tripName,
      });
    } catch {
      // user cancelled or share unavailable
    }
  };

  const handleShareTrip = async () => {
    if (stops.length === 0) return;
    if (stops.length > 4) {
      Alert.alert(
        'Trip Limit Reached',
        'Trips in this version support up to 4 places per day.',
        [{ text: 'OK' }]
      );
      return;
    }
    setSharing(true);
    try {
      const today = new Date().toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
      });
      const places = stops.map((s) => ({
        placeId: s.id,
        name: s.name,
        description: s.description,
        photoUrl: s.image,
        rating: parseFloat(s.rating) || undefined,
        distanceKm: s.distance ? parseFloat(s.distance) : undefined,
        walkMinutes: s.time ? parseInt(s.time) : undefined,
        coordinates: s.coordinate.latitude !== 0
          ? { lat: s.coordinate.latitude, lng: s.coordinate.longitude }
          : undefined,
      }));

      const trip = await createSharedTrip({
        owner_id: sessionUserId,
        owner_name: sessionUserName,
        trip_name: destination,
        trip_date: today,
        places,
      });

      addMyTrip(trip);
      const link = buildShareLink(trip.trip_id);
      setShowShareModal(false);
      await handleShareViaSheet(link, destination);
      logEvent('trip_shared', { destination, stop_count: stops.length });
    } catch (e: any) {
      if (e?.message?.includes('TRIP_LIMIT')) {
        Alert.alert('Trip Limit Reached', 'Trips in this version support up to 4 places per day.');
      } else {
        Alert.alert('Error', 'Could not share trip. Please try again.');
      }
    } finally {
      setSharing(false);
    }
  };

  // Render each stop card for the DraggableList
  const renderStop = (item: Stop, index: number, dragHandle: React.ReactElement) => {
    // Sections 2–6: high-accuracy booking detection for this stop
    const { showBookNow, bookingLink } = detectBooking({
      placeId: item.id,
      businessName: item.name,
      bookingUrl: item.bookingUrl,
      category: (item as any).category,
      types: (item as any).types,
      cached: bookingLinks[item.id] ?? null,
    });

    return (
    <TouchableOpacity
      activeOpacity={0.95}
      onLongPress={() => {
        if (bookingLink) setBookingLink(bookingLink);
        setPreviewStop({
          placeId: item.id,
          name: item.name,
          description: item.description,
          rating: parseFloat(item.rating),
          photoUrl: item.image,
          photoUrls: (item as any).photoUrls,
          bookingUrl: showBookNow ? bookingLink?.booking_url : undefined,
          address: item.distance,
          vibes: tripVibes,
        });
        setShowPreview(true);
      }}
      delayLongPress={350}
    >
      <View style={styles.card}>
        {/* Drag handle on left */}
        {dragHandle}

        <View style={styles.imageContainer}>
          <Image source={{ uri: item.image }} style={styles.placeImage} />
          <View style={styles.indexBadge}>
            <Text style={styles.indexBadgeText}>{index + 1}</Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.placeName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.placeDesc} numberOfLines={2}>{item.description}</Text>
          <View style={styles.statsRow}>
            {item.distance ? (
              <>
                <Ionicons name="walk-outline" size={13} color="#57636C" />
                <Text style={styles.statText}>{item.distance}</Text>
              </>
            ) : null}
            {item.time ? (
              <>
                <Ionicons name="time-outline" size={13} color="#57636C" style={{ marginLeft: 6 }} />
                <Text style={styles.statText}>{item.time}</Text>
              </>
            ) : null}
            <Ionicons name="star-half" size={13} color="#F59E0B" style={{ marginLeft: 6 }} />
            <Text style={styles.statText}>{item.rating}</Text>
          </View>

          <View style={styles.cardActions}>
            {showBookNow && bookingLink ? (
              <TouchableOpacity
                style={styles.bookBtn}
                onPress={() => openBookingUrl(bookingLink.booking_url, item.id, item.name)}
              >
                <Ionicons name="calendar-outline" size={12} color="#fff" />
                <Text style={styles.bookBtnText}>BOOK NOW</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.removeBtn} onPress={() => removePlace(item.id)}>
              <Ionicons name="trash-outline" size={13} color="#9CA3AF" />
              <Text style={styles.removeBtnText}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Custom header with Share button */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={26} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Itinerary</Text>
        <TouchableOpacity
          style={styles.shareHeaderBtn}
          onPress={() => isPremium ? setShowShareModal(true) : setShowShareUpgradeModal(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {!isPremium && <Ionicons name="lock-closed" size={13} color="#9CA3AF" />}
          {isPremium && <Ionicons name="share-outline" size={20} color="#22C55E" />}
          <Text style={[styles.shareHeaderBtnText, !isPremium && { color: '#9CA3AF' }]}>Share</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.headerSection}>
        <Text style={styles.title}>Itinerary for {destination}</Text>
        <Text style={styles.metaText}>
          {stops.length} Stop{stops.length !== 1 ? 's' : ''}
          {tripData.explorationHours ? `, ${tripData.explorationHours} hrs` : ''}
          {'  ·  '}
          <Text style={styles.dragHint}>
            <Ionicons name="reorder-three-outline" size={12} color="#9CA3AF" /> Hold to reorder
          </Text>
        </Text>
      </View>

      {stops.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="map-outline" size={60} color="#E5E5EA" />
          <Text style={styles.emptyTitle}>No stops left</Text>
          <Text style={styles.emptySubtitle}>Go back and add places to your itinerary</Text>
          <TouchableOpacity style={styles.goBackBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.goBackBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <DraggableList
          data={stops}
          keyExtractor={item => item.id}
          itemHeight={ITEM_HEIGHT}
          onReorder={setStops}
          renderItem={renderStop}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingVertical: 4, paddingBottom: 100 }}
        />
      )}

      <View style={[styles.bottomBar, { paddingBottom: Math.max(12, bottomInset) }]}>
        <TouchableOpacity
          style={[styles.mapBtn, stops.length === 0 && { opacity: 0.4 }]}
          onPress={() => stops.length > 0 && setShowMapModal(true)}
          disabled={stops.length === 0}
        >
          <Ionicons name="navigate-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.mapBtnText}>Open in Maps</Text>
        </TouchableOpacity>
      </View>

      {/* Map choice modal */}
      <Modal
        visible={showMapModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMapModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMapModal(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Open in Maps</Text>
            <Text style={styles.modalSubtitle}>Choose how you want to navigate your trip</Text>

            <TouchableOpacity style={styles.modalOption} onPress={openInAppMap}>
              <View style={styles.modalOptionIcon}>
                <Ionicons name="map-outline" size={24} color="#22C55E" />
              </View>
              <View style={styles.modalOptionText}>
                <Text style={styles.modalOptionLabel}>In-App Map</Text>
                <Text style={styles.modalOptionDesc}>View all your stops pinned on the map</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => { setShowMapModal(false); openGoogleMaps(); }}
            >
              <View style={[styles.modalOptionIcon, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="navigate-outline" size={24} color="#3B82F6" />
              </View>
              <View style={styles.modalOptionText}>
                <Text style={styles.modalOptionLabel}>Google Maps</Text>
                <Text style={styles.modalOptionDesc}>Get turn-by-turn directions externally</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowMapModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Long-press Place Preview */}
      <PlacePreviewModal
        visible={showPreview}
        place={previewStop}
        onViewDetails={() => setShowPreview(false)}
        onClose={() => setShowPreview(false)}
        onRemoveFromItinerary={() => {
          if (previewStop) removePlace(previewStop.placeId);
          setShowPreview(false);
        }}
        isInItinerary
      />

      {/* Share Trip Modal */}
      <Modal
        visible={showShareModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowShareModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowShareModal(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Share Trip</Text>
            <Text style={styles.modalSubtitle}>
              Invite your team to explore this itinerary together
            </Text>

            {stops.length > 4 && (
              <View style={styles.limitWarning}>
                <Ionicons name="warning-outline" size={16} color="#F59E0B" />
                <Text style={styles.limitWarningText}>
                  Only the first 4 places will be shared (V1 limit).
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.shareOption, sharing && { opacity: 0.6 }]}
              onPress={handleShareTrip}
              disabled={sharing}
            >
              <View style={styles.shareOptionIcon}>
                <Ionicons name="share-social-outline" size={24} color="#22C55E" />
              </View>
              <View style={styles.shareOptionText}>
                <Text style={styles.shareOptionLabel}>
                  {sharing ? 'Creating link…' : 'Share via…'}
                </Text>
                <Text style={styles.shareOptionDesc}>
                  WhatsApp, Messages, Email & more
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowShareModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* In-app booking WebView */}
      <BookingWebViewModal
        visible={!!bookingUrl}
        url={bookingUrl ?? ''}
        title={bookingTitle}
        placeId={bookingPlaceId ?? undefined}
        onClose={() => { setBookingUrl(null); setBookingPlaceId(null); }}
        onFeedback={applyBookingFeedback}
      />

      {/* Share Trip — FyndPlus upgrade prompt for free users */}
      <FyndPlusUpgradeModal
        visible={showShareUpgradeModal}
        onClose={() => setShowShareUpgradeModal(false)}
        onUpgrade={() => { setShowShareUpgradeModal(false); navigation.navigate('Subscription'); }}
        icon="people-outline"
        title="Share Trips with Your Team"
        message="Create a shareable trip link so friends and teammates can join, explore, and save your itinerary together."
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  // Custom header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    minHeight: 54,
  },
  headerBack: { width: 36, alignItems: 'flex-start', justifyContent: 'center', padding: 2 },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: F.bold, color: '#111827', letterSpacing: 0.1 },
  shareHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  shareHeaderBtnText: { fontSize: 13, fontFamily: F.semibold, color: '#22C55E' },

  // Share modal extras
  limitWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    width: '100%',
  },
  limitWarningText: { fontSize: 12, color: '#92400E', flex: 1 },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    width: '100%',
  },
  shareOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  shareOptionText: { flex: 1 },
  shareOptionLabel: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 2 },
  shareOptionDesc: { fontSize: 13, color: '#57636C' },
  headerSection: {
    paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F2F2F7',
  },
  title: { fontSize: 20, fontFamily: F.semibold, color: '#111827', marginBottom: 2 },
  metaText: { fontSize: 13, color: '#6B7280' },
  dragHint: { fontSize: 12, color: '#9CA3AF' },
  card: {
    flexDirection: 'row',
    marginHorizontal: 14, marginBottom: 12,
    borderRadius: 18, backgroundColor: '#fff', overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  imageContainer: { width: 80 },
  placeImage: { width: 80, height: ITEM_HEIGHT, resizeMode: 'cover' },
  indexBadge: {
    position: 'absolute', top: 8, left: 8,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#22C55E', shadowOpacity: 0.4,
    shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  indexBadgeText: { color: '#fff', fontSize: 12, fontFamily: F.bold },
  cardContent: { flex: 1, padding: 12, justifyContent: 'space-between' },
  placeName: { fontSize: 15, fontFamily: F.semibold, color: '#111827' },
  placeDesc: { fontSize: 12, color: '#6B7280', lineHeight: 18, flex: 1, marginVertical: 3 },
  statsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  statText: { fontSize: 12, color: '#57636C', marginLeft: 2 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  bookBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#1D4ED8', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 8,
  },
  bookBtnText: { fontSize: 10, color: '#fff', fontWeight: '700', letterSpacing: 0.3 },
  removeBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  removeBtnText: { fontSize: 11, color: '#9CA3AF' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontFamily: F.semibold, color: '#111827', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#57636C', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  goBackBtn: { backgroundColor: '#22C55E', borderRadius: 16, paddingHorizontal: 40, paddingVertical: 14 },
  goBackBtnText: { color: '#fff', fontSize: 16, fontFamily: F.semibold },
  bottomBar: {
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F2F2F7',
  },
  mapBtn: {
    backgroundColor: '#22C55E', borderRadius: 16, height: 54,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#22C55E', shadowOpacity: 0.35, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  mapBtnText: { color: '#fff', fontSize: 16, fontFamily: F.semibold },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 40,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E5E5EA', alignSelf: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: '#57636C', marginBottom: 20 },
  modalOption: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F2F2F7',
  },
  modalOptionIcon: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  modalOptionText: { flex: 1 },
  modalOptionLabel: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 2 },
  modalOptionDesc: { fontSize: 13, color: '#57636C' },
  modalCancel: {
    marginTop: 16, height: 48, borderRadius: 14,
    borderWidth: 1, borderColor: '#E5E5EA',
    alignItems: 'center', justifyContent: 'center',
  },
  modalCancelText: { fontSize: 15, color: '#57636C', fontWeight: '500' },
});
