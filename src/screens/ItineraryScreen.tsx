import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, Linking,
  Modal, Image, Platform, TextInput, Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { F } from '../theme/fonts';
import Ionicons from '@expo/vector-icons/Ionicons';
import { FALLBACK_IMAGE } from '../constants';
import DraggableList from '../components/DraggableList';
import PlacePreviewModal, { type PreviewPlace } from '../components/PlacePreviewModal';
import * as Sentry from '../services/sentry';
import { logEvent } from '../services/firebase';
import { generateItinerary } from '../services/openaiService';
import { createSharedTrip, buildShareLink, recordTripShared } from '../services/sharedTripService';
import { useSharedTripStore } from '../store/useSharedTripStore';
import { useAuthStore } from '../store/useAuthStore';
import { useGuestStore } from '../store/useGuestStore';
import BookingWebViewModal, { isValidBookingUrl } from '../components/BookingWebViewModal';
import { detectBooking } from '../services/bookingDetectionService';
import { useBookingLinksStore } from '../store/useBookingLinksStore';
import { useTripStore } from '../store/useTripStore';
import { useTabBarHeight } from '../hooks/useTabBarHeight';
import AppBar from '../components/AppBar';
import { COLORS } from '../theme/tokens';

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
    image: p.photoUrl || FALLBACK_IMAGE,
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
  const rawPlaces = route?.params?.places ?? [];
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
  const [sharing, setSharing] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const [bookingUrl, setBookingUrl] = useState<string | null>(null);
  const [bookingTitle, setBookingTitle] = useState('');
  const [bookingPlaceId, setBookingPlaceId] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // Sections 8 + 10: booking links cache
  const bookingLinks = useBookingLinksStore(s => s.links);
  const setBookingLink = useBookingLinksStore(s => s.setLink);
  const applyBookingFeedback = useBookingLinksStore(s => s.applyFeedback);
  const setStorePlaces = useTripStore(s => s.setSelectedPlaces);

  const { addMyTrip, sessionUserId, sessionUserName } = useSharedTripStore();
  const { user: authUser } = useAuthStore();
  const { isGuest } = useGuestStore();
  const tabBarHeight = useTabBarHeight();

  // Always use the real auth user identity when available.
  // Guests fall back to the persisted random sessionUserId.
  const ownerId   = authUser?.id       || sessionUserId;
  const ownerName = authUser?.fullName || authUser?.email?.split('@')[0] || sessionUserName;

  const { bottom: bottomInset } = useSafeAreaInsets();

  const [aiEnhancing, setAiEnhancing] = useState(false);

  useEffect(() => {
    logEvent('itinerary_viewed', { destination, stop_count: initialStops.length });
  }, []);

  // AI-enhance stop descriptions in the background
  useEffect(() => {
    if (initialStops.length === 0) return;
    let cancelled = false;
    setAiEnhancing(true);
    generateItinerary({
      destination,
      vibes: tripVibes,
      places: initialStops.map(s => ({ name: s.name, description: s.description })),
      explorationHours: tripData.explorationHours || 3,
      timeOfDay: tripData.timeOfDay || 'morning',
    }).then(aiStops => {
      if (cancelled) return;
      setStops(prev => prev.map((s, i) => {
        const ai = aiStops[i];
        if (!ai) return s;
        return {
          ...s,
          description: ai.description || s.description,
          time: ai.estimatedMinutes ? `${ai.estimatedMinutes} min` : s.time,
        };
      }));
  }).catch((err) => {
      // AI enrichment is non-fatal — keep original descriptions
    Sentry.captureException(err, { tags: { context: 'ItineraryScreen.generateItinerary' } });
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        Linking.openURL(url).catch(() => {});
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
    navigation.navigate('TripMap', { stops, destination, tripId: tripData.tripId || null });
  };

  const handleShareTrip = async () => {
    if (stops.length === 0 || sharing) return;

    // Shared trips require a real authenticated user so the trip can be retrieved
    // across devices.  Guests have no Supabase session, so Firestore writes would
    // be rejected by security rules — show a prompt instead of a permission error.
    if (isGuest || !authUser) {
      setShowGuestModal(true);
      return;
    }
    // Supabase Auth session is the only source of truth; no Firebase session check needed.

    setSharing(true);
    try {
      const today = new Date().toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
      });
      const places = stops.map((s) => {
        const parsedRating = parseFloat(s.rating);
        const parsedDist = s.distance ? parseFloat(s.distance) : 0;
        const parsedTime = s.time ? parseInt(s.time) : 0;
        return {
          placeId: s.id || '',
          name: s.name || 'Unknown Place',
          description: s.description || '',
          photoUrl: s.image || '',
          rating: Number.isNaN(parsedRating) ? 0 : parsedRating,
          distanceKm: Number.isNaN(parsedDist) ? 0 : parsedDist,
          walkMinutes: Number.isNaN(parsedTime) ? 0 : parsedTime,
          coordinates: s.coordinate?.latitude
            ? { lat: s.coordinate.latitude, lng: s.coordinate.longitude }
            : { lat: 0, lng: 0 },
        };
      });

      const trip = await createSharedTrip({
        owner_id: ownerId || 'unknown_owner',
        owner_name: ownerName || 'Unknown Owner',
        trip_name: destination,
        trip_date: today,
        places,
      });

      addMyTrip(trip);
      const link = buildShareLink(trip.trip_id);
      recordTripShared(ownerId, trip.trip_id);
      setShareLink(link);
      setLinkCopied(false);

      // Show our custom share modal with the generated link
      setShowShareModal(true);
      logEvent('trip_share_modal_opened', { destination, stop_count: stops.length });
    } catch (e: any) {
      if (__DEV__) console.error('[Share] Error:', e?.code, e?.message, e);
      if (e?.message?.includes('TRIP_LIMIT')) {
        setShareError('Trips support up to 20 places. Remove a stop and try again.');
      } else if (
        e?.message?.includes('PERMISSION_DENIED') ||
        e?.code === 'permission-denied' ||
        (e?.code ?? '').includes('permission') ||
        (e?.message ?? '').toLowerCase().includes('permission')
      ) {
        setShareError('Permission denied. Firestore rules need to allow shared_trips writes — see the setup guide.');
      } else {
        console.error('[Share] Unhandled error:', e?.code, e?.message, e);
        setShareError('Could not generate share link. Please check your connection and try again.');
      }
    } finally {
      setSharing(false);
    }
  };

  const showCopiedToast = () => {
    toastOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const copyToClipboard = async (text: string): Promise<boolean> => {
    // Try modern Clipboard API first
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // fall through to legacy method
      }
    }
    // Legacy fallback for older browsers / non-secure contexts
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      try {
        const el = document.createElement('textarea');
        el.value = text;
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(el);
        return ok;
      } catch {
        return false;
      }
    }
    return false;
  };

  const handleCopyFromModal = async () => {
    if (!shareLink) return;
    const ok = await copyToClipboard(shareLink);
    logEvent('trip_link_copied', { destination, stop_count: stops.length, success: ok });
    if (ok) {
      setLinkCopied(true);
      showCopiedToast();
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => setLinkCopied(false), 2500);
    } else {
      // copy failed silently — link is visible in the input, user can select manually
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
      onPress={() => {
        navigation.navigate('PlaceDetail', {
          placeId: item.id,
          name: item.name,
          photoUrl: item.image,
          description: item.description,
          rating: parseFloat(item.rating) || undefined,
        });
      }}
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
        <View style={styles.imageContainer}>
          <Image source={{ uri: item.image }} style={styles.placeImage} />
          <View style={styles.indexBadge}>
            <Text style={styles.indexBadgeText}>{index + 1}</Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={{ flex: 1 }}>
            <Text style={styles.placeName} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.placeDesc} numberOfLines={2}>{item.description}</Text>
            
            <View style={styles.statsRow}>
              {item.distance ? (
                <View style={styles.statItem}>
                  <Ionicons name="walk-outline" size={13} color="#6B7280" />
                  <Text style={styles.statText}>{item.distance}</Text>
                </View>
              ) : null}
              {item.time ? (
                <View style={styles.statItem}>
                  <Ionicons name="time-outline" size={13} color="#6B7280" />
                  <Text style={styles.statText}>{item.time}</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.cardActions}>
            {showBookNow && bookingLink ? (
              <TouchableOpacity
                style={styles.bookBtn}
                onPress={() => openBookingUrl(bookingLink.booking_url, item.id, item.name)}
              >
                <Ionicons name="calendar-outline" size={12} color="#fff" />
                <Text style={styles.bookBtnText}>BOOK</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.iconActionBtn} onPress={() => removePlace(item.id)}>
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
            <View style={{ paddingLeft: 8 }}>
              {dragHandle}
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
    );
  };

  const shareBtn = (
    <TouchableOpacity
      style={styles.shareHeaderBtn}
      onPress={handleShareTrip}
      disabled={sharing}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      activeOpacity={0.7}
    >
      <Ionicons
        name={sharing ? 'hourglass-outline' : 'share-social-outline'}
        size={16}
        color="#1A1A1A"
      />
      <Text style={styles.shareHeaderBtnText}>
        {sharing ? 'Sharing…' : 'Share'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* App bar with Share button as right action */}
      <AppBar
        variant="sub"
        title="Itinerary"
        onBack={() => navigation.goBack()}
        rightAction={shareBtn}
      />

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
          contentContainerStyle={{ paddingVertical: 4, paddingBottom: tabBarHeight + 40 }}
        />
      )}

      <View style={[styles.bottomBar, { paddingBottom: Math.max(12, bottomInset) }, Platform.OS === 'web' && { marginBottom: tabBarHeight }]}>
        <View style={styles.bottomBtnRow}>
          {tripData.tripId ? (
            <TouchableOpacity
              style={styles.momentsBtn}
              onPress={() => navigation.navigate('Moments', { trip_id: tripData.tripId, tripName: destination, isMember: true })}
            >
              <Ionicons name="camera-outline" size={18} color={COLORS.accent.primary} style={{ marginRight: 6 }} />
              <Text style={styles.momentsBtnText}>Moments</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[styles.mapBtn, stops.length === 0 && { opacity: 0.4 }, tripData.tripId ? { flex: 1 } : null]}
            onPress={() => stops.length > 0 && setShowMapModal(true)}
            disabled={stops.length === 0}
          >
            <Ionicons name="navigate-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.mapBtnText}>Open in Maps</Text>
          </TouchableOpacity>
        </View>
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
                <Ionicons name="map-outline" size={24} color={COLORS.accent.primary} />
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

      {/* ── Share Trip Modal ──────────────────────────────── */}
      <Modal
        visible={showShareModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowShareModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowShareModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.shareModalSheet}>
                <View style={styles.modalHandle} />
                <View style={styles.shareModalIconWrap}>
                  <Ionicons name="share-social-outline" size={28} color={COLORS.accent.primary} />
                </View>
                <Text style={styles.shareModalTitle}>Share Trip</Text>
                <Text style={styles.shareModalBody}>Add up to 7 members to your trip</Text>

                <View style={styles.shareLinkBox}>
                  <TextInput
                    style={styles.shareLinkText}
                    value={shareLink}
                    editable={false}
                    selectTextOnFocus
                    multiline={false}
                    numberOfLines={1}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.copyBtn, linkCopied && styles.copyBtnDone]}
                  onPress={handleCopyFromModal}
                >
                  <Ionicons
                    name={linkCopied ? 'checkmark-circle-outline' : 'copy-outline'}
                    size={18}
                    color="#fff"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.copyBtnText}>
                    {linkCopied ? 'Copied!' : 'Copy Link'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.viewTripsBtn}
                  onPress={() => { setShowShareModal(false); navigation.navigate('SharedTrips'); }}
                >
                  <Ionicons name="people-outline" size={15} color={COLORS.accent.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.viewTripsBtnText}>View Shared Trips</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.modalCancel} onPress={() => setShowShareModal(false)}>
                  <Text style={styles.modalCancelText}>Done</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Sign In Required Modal (guest tries to share) ─── */}
      <Modal
        visible={showGuestModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGuestModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowGuestModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.shareModalSheet}>
                <View style={styles.modalHandle} />
                <View style={[styles.shareModalIconWrap, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="person-outline" size={28} color="#F59E0B" />
                </View>
                <Text style={styles.shareModalTitle}>Account Required</Text>
                <Text style={styles.shareModalBody}>
                  Create a free account to share trips with others and access them on any device.
                </Text>
                <TouchableOpacity
                  style={styles.copyBtn}
                  onPress={() => { setShowGuestModal(false); navigation.navigate('Login'); }}
                >
                  <Text style={styles.copyBtnText}>Sign In</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.viewTripsBtn}
                  onPress={() => { setShowGuestModal(false); navigation.navigate('Register'); }}
                >
                  <Text style={styles.viewTripsBtnText}>Create Account</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalCancel} onPress={() => setShowGuestModal(false)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Share Error Modal ─────────────────────────────── */}
      <Modal
        visible={!!shareError}
        transparent
        animationType="slide"
        onRequestClose={() => setShareError(null)}
      >
        <TouchableWithoutFeedback onPress={() => setShareError(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.shareModalSheet}>
                <View style={styles.modalHandle} />
                <View style={[styles.shareModalIconWrap, { backgroundColor: '#FEF2F2' }]}>
                  <Ionicons name="alert-circle-outline" size={28} color="#EF4444" />
                </View>
                <Text style={styles.shareModalTitle}>Could Not Share</Text>
                <Text style={styles.shareModalBody}>{shareError}</Text>
                <TouchableOpacity
                  style={[styles.copyBtn, { backgroundColor: '#EF4444' }]}
                  onPress={() => setShareError(null)}
                >
                  <Text style={styles.copyBtnText}>OK</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
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

      {/* In-app booking WebView */}
      <BookingWebViewModal
        visible={!!bookingUrl}
        url={bookingUrl ?? ''}
        title={bookingTitle}
        placeId={bookingPlaceId ?? undefined}
        onClose={() => { setBookingUrl(null); setBookingPlaceId(null); }}
        onFeedback={applyBookingFeedback}
      />

      {/* Copied! toast — floats above everything */}
      <Animated.View
        style={[styles.copiedToast, { opacity: toastOpacity }]}
        pointerEvents="none"
      >
        <Ionicons name="checkmark-circle" size={18} color="#fff" style={{ marginRight: 6 }} />
        <Text style={styles.copiedToastText}>Link copied to clipboard!</Text>
      </Animated.View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Custom header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    minHeight: 54,
  },
  headerBack: { width: 36, alignItems: 'flex-start', justifyContent: 'center', padding: 2 },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: F.bold, color: '#1A1A1A', letterSpacing: 0.1 },
  shareHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 4,
    paddingVertical: 6,
    marginRight: 8,
  },
  shareHeaderBtnText: { fontSize: 14, fontFamily: F.semibold, color: '#1A1A1A' },

  headerSection: {
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F2F2F7',
  },
  title: { fontSize: 20, fontFamily: F.semibold, color: '#1A1A1A', marginBottom: 2 },
  metaText: { fontSize: 13, color: '#6B7280' },
  dragHint: { fontSize: 12, color: '#9CA3AF' },
  card: {
    flexDirection: 'row',
    marginHorizontal: 16, marginBottom: 14,
    borderRadius: 22, backgroundColor: '#fff', overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 3,
    borderWidth: 1, borderColor: '#F2F2F7',
  },
  imageContainer: { width: 110, position: 'relative' },
  placeImage: { width: 110, height: ITEM_HEIGHT, resizeMode: 'cover' },
  indexBadge: {
    position: 'absolute', top: 10, left: 10,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.accent.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2,
    shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  indexBadgeText: { color: '#fff', fontSize: 13, fontFamily: F.bold },
  cardContent: { flex: 1, padding: 14, flexDirection: 'row', alignItems: 'center' },
  placeName: { fontSize: 15, fontFamily: F.semibold, color: '#1A1A1A', lineHeight: 20 },
  placeDesc: { fontSize: 13, fontFamily: F.regular, color: '#4B5563', marginVertical: 4, lineHeight: 18 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 12, fontFamily: F.semibold, color: '#6B7280' },
  cardActions: { alignItems: 'flex-end', gap: 12 },
  bookBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#1D4ED8', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 6,
  },
  bookBtnText: { fontSize: 10, fontFamily: F.bold, color: '#fff', letterSpacing: 0.5 },
  iconActionBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FEF2F2',
    alignItems: 'center', justifyContent: 'center',
  },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontFamily: F.semibold, color: '#1A1A1A', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#57636C', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  goBackBtn: { backgroundColor: COLORS.accent.primary, borderRadius: 16, paddingHorizontal: 40, paddingVertical: 14 },
  goBackBtnText: { color: '#fff', fontSize: 16, fontFamily: F.semibold },
  bottomBar: {
    paddingHorizontal: 16, paddingVertical: 16,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F2F2F7',
    flexShrink: 0,
  },
  bottomBtnRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  momentsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.accent.primary,
    backgroundColor: COLORS.accent.primaryLight,
  },
  momentsBtnText: { color: COLORS.accent.primary, fontSize: 15, fontFamily: F.semibold },
  mapBtn: {
    flex: 1,
    backgroundColor: COLORS.accent.primary, borderRadius: 16, height: 54,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.accent.primary, shadowOpacity: 0.35, shadowRadius: 12,
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
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: '#57636C', marginBottom: 20 },
  modalOption: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F2F2F7',
  },
  modalOptionIcon: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: COLORS.accent.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  modalOptionText: { flex: 1 },
  modalOptionLabel: { fontSize: 16, fontWeight: '600', color: '#1A1A1A', marginBottom: 2 },
  modalOptionDesc: { fontSize: 13, color: '#57636C' },
  modalCancel: {
    marginTop: 16, height: 48, borderRadius: 14,
    borderWidth: 1, borderColor: '#E5E5EA',
    alignItems: 'center', justifyContent: 'center',
  },
  modalCancelText: { fontSize: 15, color: '#57636C', fontWeight: '500' },

  shareModalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 40, alignItems: 'center',
  },
  shareModalIconWrap: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.accent.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  shareModalTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginBottom: 6, textAlign: 'center' },
  shareModalBody: {
    fontSize: 16, color: '#1A1A1A', textAlign: 'center',
    fontFamily: F.semibold,
    lineHeight: 24, marginBottom: 20, paddingHorizontal: 16,
  },

  shareLinkBox: {
    width: '100%', backgroundColor: '#F3F4F6', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14,
  },
  shareLinkText: {
    fontSize: 13, color: '#1A1A1A', fontFamily: 'monospace',
  },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.accent.primary, borderRadius: 14,
    width: '100%', height: 50, marginBottom: 12,
  },
  copyBtnDone: { backgroundColor: COLORS.accent.sage },
  copyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  viewTripsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.accent.primary,
    marginBottom: 8,
  },
  viewTripsBtnText: { fontSize: 14, fontFamily: F.semibold, color: COLORS.accent.primary },

  copiedToast: {
    position: 'absolute',
    bottom: 110,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent.sage,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
    zIndex: 999,
  },
  copiedToastText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
