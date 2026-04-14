import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import FyndMapView, { FyndMapViewRef } from '../components/FyndMapView';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import * as Sentry from '../services/sentry';
import { F } from '../theme/fonts';
import AppHeader from '../components/AppHeader';
import { submitFeedback } from '../services/feedbackService';
import { useAuthStore } from '../store/useAuthStore';
import { useGuestStore } from '../store/useGuestStore';
import { useTripStore } from '../store/useTripStore';
import { useRecentTripStore } from '../store/useRecentTripStore';
import { saveItinerary } from '../services/database';
import { Timestamp } from 'firebase/firestore';
import { FALLBACK_IMAGE } from '../constants';
import { openInExternalMaps, openRouteInMaps } from '../services/mapsIntent';
import { buildTripHtml, buildIdleHtml, type Coord, type Stop } from './mapTemplates';

// ─── Constants ────────────────────────────────────────────────────────────────
const { width: SW } = Dimensions.get('window');
const WEB_PROXY_FALLBACK = 'https://fynd-api.jallohosmanamadu311.workers.dev';
const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_ONLY_API_KEY || '';
const PROXY = ((process.env.EXPO_PUBLIC_OPENAI_PROXY || '').replace(/\/$/, '')) || WEB_PROXY_FALLBACK;
const MAP_H = 280;

// ─── Math helpers ─────────────────────────────────────────────────────────────
function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

function walkTime(km: number): string {
  const mins = Math.round(km * 12);
  if (mins < 60) return `${mins} min walk`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m walk` : `${h}h walk`;
}

// ─── Component ────────────────────────────────────────────────────────────────
type Props = { navigation: any; route?: any };

export default function MapScreen({ navigation, route }: Props) {
  const { width: viewportWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isMobileWeb = Platform.OS === 'web' && viewportWidth <= 900;
  const { isAuthenticated } = useAuthStore();
  const { isGuest } = useGuestStore();

  // Mobile browsers can overlay a bottom toolbar that is not always reported
  // via safe-area insets. Add a conservative cushion on mobile web.
  // Use env(safe-area-inset-bottom) where available; 56px fallback covers
  // Chrome (~56px) and Safari (~60px) bottom bars.
  const browserBottomCushion = isMobileWeb ? 56 : 0;
  const navBottomInset = Math.max(insets.bottom, browserBottomCushion);

  const stops: Stop[] = route?.params?.stops ?? [];
  const hasStops = stops.length > 0;

  // Idle Map tab — pull current trip places from the session store
  const storeSelectedPlaces = useTripStore(s => s.selectedPlaces);
  const tabStops: Stop[] = useMemo(
    () => storeSelectedPlaces.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      image: p.image,
      coordinate: p.coordinate,
      rating: p.rating !== undefined ? String(p.rating) : undefined,
    })),
    [storeSelectedPlaces],
  );

  const webViewRef = useRef<FyndMapViewRef>(null);
  const [webViewReady, setWebViewReady] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const [userLoc, setUserLoc] = useState<Coord | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navInfo, setNavInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [nextStopInfo, setNextStopInfo] = useState<{ distance: string; duration: string; stopName: string } | null>(null);
  const mapLoadStartRef = useRef<number>(Date.now());
  const ephemeralTripIdRef = useRef<string>(`navigate_${Date.now()}`);
  // Prevent duplicate trip saves within the same map session
  const navigateSavedRef = useRef(false);

  const mapsJsUrl = useMemo(
    () => `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&callback=initMap&loading=async`,
    [],
  );

  // Build HTML once — stops are baked in; user location + activeIdx are pushed
  // live via injectJavaScript so the WebView never needs to reload.
  const mapHtml = useMemo(
    () => buildTripHtml(hasStops ? stops : tabStops, mapsJsUrl),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [], // intentionally empty — stops don't change mid-session
  );

  // Request live user location on mount and track consistently.
  // Calls getCurrentPosition / getCurrentPositionAsync first for an immediate
  // fix, then sets up watchPosition for ongoing updates.
  useEffect(() => {
    async function startLocationTracking() {
      let locationSubscription: Location.LocationSubscription | null = null;
      try {
        if (Platform.OS === 'web') {
          const geo = typeof navigator !== 'undefined' ? navigator.geolocation : null;
          if (geo && typeof geo.watchPosition === 'function') {
            // Immediate one-shot fix so the map shows user location right away
            geo.getCurrentPosition(
              (pos: any) => setUserLoc({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
              () => {},
              { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
            );
            // Ongoing watch for accurate, live updates
            const watchId = geo.watchPosition(
              (pos: any) => setUserLoc({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
              (err: any) => {
                Sentry.captureMessage('MapScreen web geolocation error', {
                  level: 'warning',
                  extra: { message: err.message, code: err.code },
                });
              },
              { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
            );
            locationSubscription = { remove: () => geo.clearWatch(watchId) };
          }
        } else {
          // Native (Android/iOS)
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            // Immediate fix
            const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            setUserLoc({ latitude: current.coords.latitude, longitude: current.coords.longitude });
            // Ongoing watch
            locationSubscription = await Location.watchPositionAsync(
              { accuracy: Location.Accuracy.Balanced, timeInterval: 3000, distanceInterval: 5 },
              (loc: any) => setUserLoc({ latitude: loc.coords.latitude, longitude: loc.coords.longitude })
            );
          }
        }
      } catch (err) {
        Sentry.captureException(err, { tags: { context: 'MapScreen.getUserLocation', platform: Platform.OS } });
      }
      return () => {
        if (locationSubscription) {
          locationSubscription.remove();
        }
      };
    }
    startLocationTracking();
  }, []);

  // Push user location into WebView as soon as both are ready
  useEffect(() => {
    if (!webViewReady || !userLoc) return;
    webViewRef.current?.injectJavaScript(
      `setUserLocation(${userLoc.latitude}, ${userLoc.longitude}); true;`
    );
  }, [webViewReady, userLoc]);

  // Push activeIdx into the map when it changes from RN (arrows / thumbnails)
  const lastInjectedIdx = useRef(-1);
  useEffect(() => {
    if (!webViewReady || !hasStops) return;
    if (lastInjectedIdx.current === activeIdx) return; // already in sync
    lastInjectedIdx.current = activeIdx;
    webViewRef.current?.injectJavaScript(`setActiveStop(${activeIdx}); true;`);
  }, [activeIdx, webViewReady, hasStops]);

  // Safety valve: clear loading overlay after 5 s max so the UI is never stuck.
  // mapReady message from JS clears it sooner when the map actually initialises.
  useEffect(() => {
    const t = setTimeout(() => setMapLoading(false), 2000);
    return () => clearTimeout(t);
  }, []);

  // Handle messages from the map (Google Maps JS → FyndMapView bridge)
  const onMessage = (rawData: string) => {
    try {
      const data = JSON.parse(rawData);
      if (data.type === 'mapReady') {
        const durationMs = Date.now() - mapLoadStartRef.current;
        Sentry.addBreadcrumb({
          category: 'perf.map',
          message: 'map_ready',
          level: 'info',
          data: { durationMs, hasStops, platform: Platform.OS },
        });
        setWebViewReady(true);
        setMapLoading(false);
      } else if (data.type === 'markerTap') {
        lastInjectedIdx.current = data.index; // prevent echo injection
        setActiveIdx(data.index);
      } else if (data.type === 'nextStopInfo') {
        setNextStopInfo({ distance: data.distance, duration: data.duration, stopName: data.stopName });
      } else if (data.type === 'navInfo') {
        setIsNavigating(true);
        setNavInfo({ distance: data.distance, duration: data.duration });
      } else if (data.type === 'navCleared') {
        setIsNavigating(false);
        setNavInfo(null);
      } else if (data.type === 'navError') {
        setIsNavigating(false);
        setNavInfo(null);
        // Navigation is handled by NavigationScreen — silently ignore directions errors
      }
    } catch (_) {}
  };

  // Show rating popup after 4 seconds on map page
  useEffect(() => {
    if (!hasStops) return; // only show on active trip map
    const timer = setTimeout(() => {
      setShowRating(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, [hasStops]);

  const activeStop = hasStops ? stops[activeIdx] : null;

  const tripBottomLayoutStyle = isMobileWeb
    ? ({
        position: 'fixed',
        left: 10,
        right: 10,
        bottom: navBottomInset,
        zIndex: 50,
        paddingBottom: Math.max(insets.bottom, 8),
      } as any)
    : ({ paddingBottom: navBottomInset } as const);

  const distToActive = useMemo(() => {
    if (!userLoc || !activeStop) return null;
    const { latitude: lat, longitude: lng } = activeStop.coordinate;
    if (lat === 0 && lng === 0) return null;
    return haversineKm(userLoc.latitude, userLoc.longitude, lat, lng);
  }, [userLoc, activeStop]);

  const selectStop = (i: number) => {
    setActiveIdx(i);
  };

  const navigateToStop = (stop: Stop) => {
    openInExternalMaps({
      latitude: stop.coordinate.latitude,
      longitude: stop.coordinate.longitude,
      label: stop.name,
    });
  };

  const handleServiceHubFab = () => {
    if (isGuest || !isAuthenticated) {
      Alert.alert('Account Required', 'Sign in to access ServiceHub.');
      return;
    }
    navigation.navigate('ServiceHub');
  };

  const stopNavigation = () => {
    webViewRef.current?.injectJavaScript(`clearDirections(); true;`);
  };

  const openFullRoute = () => {
    if (stops.length === 0) return;

    // Persist trip on first Navigate tap — idempotent within this session.
    // Skip if this is a reopened trip (tripId already exists in Firestore).
    const existingTripId = route?.params?.tripId as string | null | undefined;
    if (!navigateSavedRef.current && !existingTripId) {
      navigateSavedRef.current = true;
      const uid = useAuthStore.getState().user?.id;
      if (uid) {
        const city = (
          (route?.params?.destination as string | undefined) ||
          useTripStore.getState().destination ||
          stops[0]?.name ||
          ''
        ).trim() || 'My Trip';
        const itineraryStops = stops.map((s, idx) => ({
          tripId: ephemeralTripIdRef.current,
          userId: uid,
          placeId: s.id,
          placeName: s.name,
          shortDescription: s.description || '',
          imageUrl: s.image,
          latitude: s.coordinate.latitude,
          longitude: s.coordinate.longitude,
          rating: s.rating !== undefined ? parseFloat(s.rating) : 0,
          distanceKm: 0,
          travelTimeMinutes: 0,
          requiresBooking: false,
          orderIndex: idx,
          status: 'pending' as const,
          addedAt: Timestamp.now(),
        }));
        saveItinerary(uid, ephemeralTripIdRef.current, {
          destination: city,
          month: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          coverPhotoUrl: stops[0]?.image || FALLBACK_IMAGE,
          stops: itineraryStops,
          totalDurationMin: 0,
          totalStops: stops.length,
        })
          .then((docId) => {
            const now = new Date().toISOString();
            useRecentTripStore.getState().prependTrip({
              trip_id: docId,
              user_id: uid,
              city,
              places: stops.map((s) => ({
                id: s.id,
                name: s.name,
                address: s.description ?? '',
                image: s.image,
                coordinate: s.coordinate,
                rating: s.rating !== undefined ? parseFloat(s.rating) : undefined,
              })),
              created_at: now,
              last_accessed: now,
              is_shared: false,
            });
          })
          .catch(() => {
            // Offline — allow retry on next Navigate tap
            navigateSavedRef.current = false;
          });
      }
    }

    openRouteInMaps(
      stops.map(s => ({
        latitude: s.coordinate.latitude,
        longitude: s.coordinate.longitude,
        label: s.name,
      })),
    );
  };

  const showOverview = () => {
    webViewRef.current?.injectJavaScript(`showOverview(); true;`);
  };

  const endTrip = () => {
    const doEnd = () => {
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs', params: { screen: 'Create Trip', params: { showPostTripFeedbackPrompt: true } } }],
      });
    };
    if (Platform.OS === 'web') {
      if (window.confirm('End this trip and return to the home page?')) doEnd();
    } else {
      Alert.alert(
        'End Trip?',
        'Are you sure you want to end this trip? You will return to the home page.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'End Trip', onPress: doEnd, style: 'destructive' },
        ]
      );
    }
  };

  const submitRating = async () => {
    // Save rating to Firestore
    try {
      await submitFeedback({
        type: 'rating',
        rating: rating,
      });
    } catch (error) {
      Sentry.captureException(error, { tags: { context: 'MapScreen.submitRating' } });
    }

    // Close rating modal and return to map
    setShowRating(false);
    setRating(0);
  };

  // ── Fullscreen map mode ───────────────────────────────────────────────────
  if (isFullscreen) {
    return (
      <SafeAreaView style={styles.fullscreenContainer} edges={['top', 'bottom']}>
        {/* Fullscreen Map */}
        <View style={styles.fullscreenMapBox}>
          <FyndMapView
            ref={webViewRef}
            html={mapHtml}
            style={styles.webView}
            onMessage={onMessage}
          />

          {/* Loading overlay */}
          {mapLoading && (
            <View style={styles.mapLoadingOverlay}>
              <ActivityIndicator color="#22C55E" size="large" />
              <Text style={styles.mapLoadingTxt}>Loading map…</Text>
            </View>
          )}

          {/* Floating controls in fullscreen */}
          {!mapLoading && (
            <View style={styles.fullscreenControls} pointerEvents="box-none">
              <TouchableOpacity style={styles.overviewBtn} onPress={showOverview}>
                <Ionicons name="contract-outline" size={13} color="#111827" />
                <Text style={styles.overviewBtnTxt}>Overview</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.endTripBtn} onPress={endTrip}>
                <Ionicons name="power" size={13} color="#fff" />
                <Text style={styles.endTripBtnTxt}>End Trip</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }} />
              <TouchableOpacity style={styles.navigateBtn} onPress={openFullRoute}>
                <Ionicons name="navigate" size={13} color="#fff" />
                <Text style={styles.navigateBtnTxt}>Navigate</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Close fullscreen button */}
          <TouchableOpacity
            style={[styles.closeFullscreenBtn, { bottom: 20 + navBottomInset }]}
            onPress={() => setIsFullscreen(false)}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Bottom panel with stop info in fullscreen */}
        <View style={[styles.fullscreenBottomPanel, { paddingBottom: 16 + navBottomInset }]}>
          {/* Stop navigator bar */}
          <View style={styles.stopBar}>
            <TouchableOpacity
              onPress={() => activeIdx > 0 && selectStop(activeIdx - 1)}
              disabled={activeIdx === 0}
              style={[styles.arrowBtn, activeIdx === 0 && styles.arrowBtnDim]}
            >
              <Ionicons
                name="chevron-back"
                size={22}
                color={activeIdx === 0 ? '#C7C7CC' : '#111827'}
              />
            </TouchableOpacity>

            <View style={styles.stopBarCenter}>
              <Text style={styles.stopBarCount}>
                Stop{' '}
                <Text style={styles.stopBarNum}>{activeIdx + 1}</Text>
                <Text style={styles.stopBarOf}> / {stops.length}</Text>
              </Text>
              {activeStop ? (
                <Text style={styles.stopBarName} numberOfLines={1}>
                  {activeStop.name}
                </Text>
              ) : null}
              <View style={styles.progressDots}>
                {stops.slice(0, 12).map((_, i) => (
                  <View key={i} style={[styles.progressDot, i === activeIdx && styles.progressDotActive]} />
                ))}
              </View>
            </View>

            <TouchableOpacity
              onPress={() => activeIdx < stops.length - 1 && selectStop(activeIdx + 1)}
              disabled={activeIdx === stops.length - 1}
              style={[styles.arrowBtn, activeIdx === stops.length - 1 && styles.arrowBtnDim]}
            >
              <Ionicons
                name="chevron-forward"
                size={22}
                color={activeIdx === stops.length - 1 ? '#C7C7CC' : '#111827'}
              />
            </TouchableOpacity>
          </View>

          {/* Navigation info bar */}
          {isNavigating && navInfo ? (
            <View style={styles.navBar}>
              <Ionicons name="navigate" size={16} color="#3B82F6" style={{ marginRight: 6 }} />
              <Text style={styles.navBarText}>{navInfo.duration} · {navInfo.distance}</Text>
              <TouchableOpacity style={styles.navStopBtn} onPress={stopNavigation}>
                <Text style={styles.navStopBtnText}>End Nav</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Active stop detail card */}
          {activeStop ? (
            <View style={[styles.detailCard, styles.detailCardFullscreen]}>
              <Image source={{ uri: activeStop.image }} style={styles.detailImg} />

              <View style={styles.detailBody}>
                <Text style={styles.detailName} numberOfLines={1}>
                  {activeStop.name}
                </Text>
                {activeStop.description ? (
                  <Text style={styles.detailDesc} numberOfLines={1}>
                    {activeStop.description}
                  </Text>
                ) : null}

                <View style={styles.chips}>
                  {activeStop.rating ? (
                    <View style={styles.chip}>
                      <Ionicons name="star" size={11} color="#F59E0B" />
                      <Text style={styles.chipTxt}>{activeStop.rating}</Text>
                    </View>
                  ) : null}
                  {distToActive !== null ? (
                    <View style={styles.chip}>
                      <Ionicons name="walk-outline" size={11} color="#22C55E" />
                      <Text style={styles.chipTxt}>
                        {distToActive} km · {walkTime(distToActive)}
                      </Text>
                    </View>
                  ) : activeStop.distance ? (
                    <View style={styles.chip}>
                      <Ionicons name="walk-outline" size={11} color="#22C55E" />
                      <Text style={styles.chipTxt}>{activeStop.distance}</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <TouchableOpacity
                style={styles.goBtn}
                onPress={() => navigateToStop(activeStop)}
              >
                <Ionicons name="navigate-outline" size={20} color="#22C55E" />
                <Text style={styles.goBtnTxt}>Go</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Next Stop live info in fullscreen */}
          {nextStopInfo && userLoc ? (
             <View style={styles.nextStopCard}>
               <View style={styles.nextStopIconBox}>
                 <Ionicons name="navigate" size={16} color="#22C55E" />
               </View>
               <View style={styles.nextStopBody}>
                 <Text style={styles.nextStopTitle}>Next: {nextStopInfo.stopName}</Text>
                 <Text style={styles.nextStopSubtitle}>
                   {nextStopInfo.duration} · {nextStopInfo.distance}
                 </Text>
               </View>
             </View>
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  // ── Idle state (Map tab, no active trip) ───────────────────────────────────
  if (!hasStops) {
    const hasTabStops = tabStops.length > 0;
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <AppHeader title="Map" />

        {/* Map fills remaining space when trip stops are available; fixed height otherwise */}
        <View style={hasTabStops ? { flex: 1 } : styles.mapBox}>
          <FyndMapView
            ref={webViewRef}
            html={mapHtml}
            style={styles.webView}
            onMessage={onMessage}
          />
          {/* No loading overlay on idle tab — map renders in place */}
        </View>

        {!hasTabStops && (
          <View style={styles.idleCard}>
            <View style={styles.idleIconWrap}>
              <Ionicons name="compass-outline" size={40} color="#22C55E" />
            </View>
            <Text style={styles.idleTitle}>Your trip map lives here</Text>
            <Text style={styles.idleSub}>
              Build an itinerary from Suggested Places, then tap{' '}
              <Text style={styles.idleSubBold}>In-App Map</Text> to see all your
              stops pinned on the map with a route connecting them.
            </Text>
            <TouchableOpacity
              style={styles.idleCta}
              onPress={() => navigation.navigate('Create Trip')}
            >
              <Ionicons name="airplane-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.idleCtaTxt}>Plan a Trip</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    );
  }

  // ── Active trip map ────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <AppHeader title="Trip Map" onBack={() => navigation.goBack()} />

      {/* ── Interactive Map (WebView on native, iframe on web) ── */}
      <View style={styles.mapBox}>
        <FyndMapView
          ref={webViewRef}
          html={mapHtml}
          style={styles.webView}
          onMessage={onMessage}
        />

        {/* Loading overlay */}
        {mapLoading && (
          <View style={styles.mapLoadingOverlay}>
            <ActivityIndicator color="#22C55E" size="large" />
            <Text style={styles.mapLoadingTxt}>Loading map…</Text>
          </View>
        )}

        {/* Floating controls — only shown after map is ready */}
        {!mapLoading && (
          <View style={styles.mapControls} pointerEvents="box-none">
            <TouchableOpacity style={styles.overviewBtn} onPress={showOverview}>
              <Ionicons name="contract-outline" size={13} color="#111827" />
              <Text style={styles.overviewBtnTxt}>Overview</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.endTripBtn} onPress={endTrip}>
              <Ionicons name="power" size={13} color="#fff" />
              <Text style={styles.endTripBtnTxt}>End Trip</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <TouchableOpacity 
              style={styles.fullscreenBtn}
              onPress={() => setIsFullscreen(true)}
            >
              <Ionicons name="expand-outline" size={13} color="#fff" />
              <Text style={styles.fullscreenBtnTxt}>Fullscreen</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navigateBtn} onPress={openFullRoute}>
              <Ionicons name="navigate" size={13} color="#fff" />
              <Text style={styles.navigateBtnTxt}>Navigate</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── Stop navigator bar ── */}
      <View style={[styles.tripBottomSection, tripBottomLayoutStyle]}>

        <View style={styles.stopBar}>
          <TouchableOpacity
            onPress={() => activeIdx > 0 && selectStop(activeIdx - 1)}
            disabled={activeIdx === 0}
            style={[styles.arrowBtn, activeIdx === 0 && styles.arrowBtnDim]}
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color={activeIdx === 0 ? '#C7C7CC' : '#111827'}
            />
          </TouchableOpacity>

          <View style={styles.stopBarCenter}>
            <Text style={styles.stopBarCount}>
              Stop{' '}
              <Text style={styles.stopBarNum}>{activeIdx + 1}</Text>
              <Text style={styles.stopBarOf}> / {stops.length}</Text>
            </Text>
            {activeStop ? (
              <Text style={styles.stopBarName} numberOfLines={1}>
                {activeStop.name}
              </Text>
            ) : null}
            <View style={styles.progressDots}>
              {stops.slice(0, 12).map((_, i) => (
                <View key={i} style={[styles.progressDot, i === activeIdx && styles.progressDotActive]} />
              ))}
            </View>
          </View>

          <TouchableOpacity
            onPress={() => activeIdx < stops.length - 1 && selectStop(activeIdx + 1)}
            disabled={activeIdx === stops.length - 1}
            style={[styles.arrowBtn, activeIdx === stops.length - 1 && styles.arrowBtnDim]}
          >
            <Ionicons
              name="chevron-forward"
              size={22}
              color={activeIdx === stops.length - 1 ? '#C7C7CC' : '#111827'}
            />
          </TouchableOpacity>
        </View>

        {/* ── Active stop detail card ── */}
        {activeStop ? (
          <View style={styles.detailCard}>
          <Image source={{ uri: activeStop.image }} style={styles.detailImg} />

          <View style={styles.detailBody}>
            <Text style={styles.detailName} numberOfLines={1}>
              {activeStop.name}
            </Text>
            {activeStop.description ? (
              <Text style={styles.detailDesc} numberOfLines={1}>
                {activeStop.description}
              </Text>
            ) : null}

            <View style={styles.chips}>
              {activeStop.rating ? (
                <View style={styles.chip}>
                  <Ionicons name="star" size={11} color="#F59E0B" />
                  <Text style={styles.chipTxt}>{activeStop.rating}</Text>
                </View>
              ) : null}
              {distToActive !== null ? (
                <View style={styles.chip}>
                  <Ionicons name="walk-outline" size={11} color="#22C55E" />
                  <Text style={styles.chipTxt}>
                    {distToActive} km · {walkTime(distToActive)}
                  </Text>
                </View>
              ) : activeStop.distance ? (
                <View style={styles.chip}>
                  <Ionicons name="walk-outline" size={11} color="#22C55E" />
                  <Text style={styles.chipTxt}>{activeStop.distance}</Text>
                </View>
              ) : null}
            </View>
          </View>

          <TouchableOpacity
            style={styles.goBtn}
            onPress={() => navigateToStop(activeStop)}
          >
            <Ionicons name="navigate-outline" size={20} color="#22C55E" />
            <Text style={styles.goBtnTxt}>Go</Text>
          </TouchableOpacity>
          </View>
        ) : null}

        {/* ── Horizontal stop thumbnail strip ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbRow}
          style={styles.thumbScroll}
        >
          {stops.map((stop, i) => (
            <TouchableOpacity
              key={stop.id}
              onPress={() => selectStop(i)}
              style={styles.thumbItem}
            >
              <View
                style={[
                  styles.thumbImgWrap,
                  i === activeIdx && styles.thumbImgWrapActive,
                ]}
              >
                <Image source={{ uri: stop.image }} style={styles.thumbImg} />
                <View
                  style={[
                    styles.thumbBadge,
                    i === activeIdx && styles.thumbBadgeActive,
                  ]}
                >
                  <Text style={styles.thumbBadgeTxt}>{i + 1}</Text>
                </View>
              </View>
              <Text style={styles.thumbLblActive} numberOfLines={1}>
                {stop.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Next Stop live info card ── */}
        {nextStopInfo && userLoc ? (
           <View style={[styles.nextStopCard, { marginHorizontal: 14, marginBottom: 8, marginTop: 2 }]}>
             <View style={styles.nextStopIconBox}>
               <Ionicons name="navigate" size={16} color="#22C55E" />
             </View>
             <View style={styles.nextStopBody}>
               <Text style={styles.nextStopTitle}>Next: {nextStopInfo.stopName}</Text>
               <Text style={styles.nextStopSubtitle}>
                 {nextStopInfo.duration} · {nextStopInfo.distance}
               </Text>
             </View>
           </View>
        ) : null}
      </View>

      {/* ── ServiceHub FAB ── */}
      {!mapLoading && (
        <TouchableOpacity
          style={styles.serviceHubFab}
          onPress={handleServiceHubFab}
        >
          <Ionicons name="help-buoy-outline" size={22} color="#fff" />
        </TouchableOpacity>
      )}

      {/* ── Rating Modal ── */}
      {showRating && (
        <View style={styles.ratingOverlay}>
          <View style={styles.ratingCard}>
            <Text style={styles.ratingTitle}>How do you rate Fynd so far?</Text>

            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  style={styles.starBtn}
                >
                  <Ionicons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={40}
                    color={star <= rating ? '#F59E0B' : '#D1D5DB'}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.ratingActions}>
              <TouchableOpacity
                style={styles.ratingCancelBtn}
                onPress={() => {
                  setShowRating(false);
                  setRating(0);
                }}
              >
                <Text style={styles.ratingCancelTxt}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.ratingSubmitBtn,
                  rating === 0 && styles.ratingSubmitBtnDisabled,
                ]}
                onPress={submitRating}
                disabled={rating === 0}
              >
                <Text style={styles.ratingSubmitTxt}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },

  // ── Fullscreen mode ──
  fullscreenContainer: { flex: 1, backgroundColor: '#000' },
  fullscreenMapBox: {
    flex: 1, backgroundColor: '#E5E7EB',
    position: 'relative', overflow: 'hidden',
  },
  fullscreenControls: {
    position: 'absolute', top: 12, left: 12, right: 12,
    flexDirection: 'row', gap: 6, alignItems: 'center', zIndex: 10,
  },
  closeFullscreenBtn: {
    position: 'absolute', bottom: 20, right: 20,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  fullscreenBottomPanel: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 8,
    shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 20,
    shadowOffset: { width: 0, height: -5 }, elevation: 14,
  },
  detailCardFullscreen: { marginTop: 4, marginBottom: 8 },

  // ── Map box ──
  mapBox: {
    width: '100%', height: MAP_H,
    backgroundColor: '#E5E7EB', overflow: 'hidden', position: 'relative',
  },
  webView: { flex: 1 },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(248,249,250,0.96)', gap: 10,
  },
  mapLoadingTxt: { fontSize: 13, color: '#6B7280', fontFamily: F.medium },

  // Map floating controls
  mapControls: {
    position: 'absolute', top: 12, left: 12, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 6, zIndex: 10,
  },
  overviewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 22, paddingHorizontal: 12, paddingVertical: 8,
    shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  overviewBtnTxt: { fontSize: 12, fontFamily: F.semibold, color: '#374151' },
  endTripBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#EF4444', borderRadius: 22,
    paddingHorizontal: 12, paddingVertical: 8,
    shadowColor: '#EF4444', shadowOpacity: 0.4, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  endTripBtnTxt: { fontSize: 12, fontFamily: F.semibold, color: '#fff' },
  fullscreenBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 22, paddingHorizontal: 12, paddingVertical: 8,
    shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  fullscreenBtnTxt: { fontSize: 12, fontFamily: F.semibold, color: '#374151' },
  navigateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#22C55E', borderRadius: 22,
    paddingHorizontal: 14, paddingVertical: 8,
    shadowColor: '#22C55E', shadowOpacity: 0.45, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 5,
  },
  navigateBtnTxt: { fontSize: 12, fontFamily: F.semibold, color: '#fff' },

  navBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#EFF6FF', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 10,
    marginHorizontal: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#BFDBFE', gap: 8,
    shadowColor: '#3B82F6', shadowOpacity: 0.08,
    shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  navBarText: { flex: 1, fontSize: 13, fontFamily: F.semibold, color: '#1D4ED8' },
  navStopBtn: {
    backgroundColor: '#EF4444', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  navStopBtnText: { fontSize: 11, fontFamily: F.bold, color: '#fff' },

  // ── Idle card ──
  idleCard: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 36, paddingBottom: 32,
  },
  idleIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#F0FDF4',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#22C55E', shadowOpacity: 0.18, shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  idleTitle: {
    fontSize: 22, fontFamily: F.bold, color: '#111827',
    marginBottom: 10, textAlign: 'center',
  },
  idleSub: {
    fontSize: 14, color: '#6B7280', textAlign: 'center',
    lineHeight: 22, marginBottom: 28,
  },
  idleSubBold: { fontFamily: F.semibold, color: '#111827' },
  idleCta: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#22C55E', borderRadius: 16,
    paddingHorizontal: 32, paddingVertical: 14,
    shadowColor: '#22C55E', shadowOpacity: 0.35, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  idleCtaTxt: { fontSize: 15, fontFamily: F.semibold, color: '#fff' },

  // ── Bottom trip panel ──
  tripBottomSection: {
    backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#F0F0F5',
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 14,
    shadowOffset: { width: 0, height: -4 }, elevation: 10,
  },

  // ── Stop navigator bar ──
  stopBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8, gap: 4,
  },
  arrowBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  arrowBtnDim: { opacity: 0.3 },
  stopBarCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 6 },
  stopBarCount: { fontSize: 11, fontFamily: F.regular, color: '#9CA3AF', letterSpacing: 0.2 },
  stopBarNum: { fontFamily: F.bold, color: '#22C55E', fontSize: 13 },
  stopBarOf: { fontFamily: F.regular, color: '#9CA3AF', fontSize: 11 },
  stopBarName: {
    fontSize: 15, fontFamily: F.semibold, color: '#111827',
    marginTop: 2, textAlign: 'center',
  },
  progressDots: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 4, marginTop: 7,
  },
  progressDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: '#E5E7EB',
  },
  progressDotActive: {
    width: 20, height: 6, borderRadius: 3, backgroundColor: '#22C55E',
  },

  // ── Active stop detail card ──
  detailCard: {
    flexDirection: 'row',
    marginHorizontal: 14, marginTop: 6,
    borderRadius: 18, overflow: 'hidden',
    height: 100, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#F0F0F5',
    shadowColor: '#000', shadowOpacity: 0.09, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  detailImg: { width: 100, height: 100, resizeMode: 'cover' },
  detailBody: {
    flex: 1, paddingHorizontal: 12, paddingVertical: 10, justifyContent: 'center',
  },
  detailName: { fontSize: 15, fontFamily: F.semibold, color: '#111827', marginBottom: 3 },
  detailDesc: { fontSize: 12, color: '#6B7280', marginBottom: 6, lineHeight: 17 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#F0FDF4', borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  chipTxt: { fontSize: 11, fontFamily: F.medium, color: '#16A34A' },
  goBtn: {
    width: 64, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    borderLeftWidth: 1, borderLeftColor: '#D1FAE5', gap: 4,
  },
  goBtnTxt: { fontSize: 11, fontFamily: F.bold, color: '#22C55E', letterSpacing: 0.2 },

  // ── Thumbnail strip ──
  thumbScroll: { marginTop: 10, marginBottom: 4 },
  thumbRow: { paddingHorizontal: 14, paddingBottom: 4, gap: 10 },
  thumbItem: { alignItems: 'center', width: 72 },
  thumbImgWrap: {
    width: 64, height: 64, borderRadius: 14, overflow: 'hidden',
    borderWidth: 2.5, borderColor: 'transparent', position: 'relative',
  },
  thumbImgWrapActive: {
    borderColor: '#22C55E',
    shadowColor: '#22C55E', shadowOpacity: 0.3,
    shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  thumbImg: { width: 64, height: 64, resizeMode: 'cover' },
  thumbBadge: {
    position: 'absolute', bottom: 4, left: 4,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  thumbBadgeActive: { backgroundColor: '#22C55E' },
  thumbBadgeTxt: { fontSize: 10, fontFamily: F.bold, color: '#fff' },
  thumbLbl: {
    fontSize: 10, fontFamily: F.regular, color: '#9CA3AF',
    marginTop: 5, textAlign: 'center', width: 72,
  },
  thumbLblActive: { fontFamily: F.semibold, color: '#22C55E' },

  // ── Next Stop ETA Card ──
  nextStopCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F0FDF4', borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#DCFCE7',
    shadowColor: '#22C55E', shadowOpacity: 0.06,
    shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2,
    marginTop: 4,
  },
  nextStopIconBox: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#DCFCE7',
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  nextStopBody: { flex: 1 },
  nextStopTitle: { fontSize: 13, fontFamily: F.bold, color: '#166534', marginBottom: 2 },
  nextStopSubtitle: { fontSize: 12, fontFamily: F.medium, color: '#15803D' },

  // ── Rating Modal ──
  ratingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center', zIndex: 999,
  },
  ratingCard: {
    width: '88%', backgroundColor: '#fff', borderRadius: 24,
    padding: 28, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 }, elevation: 14,
  },
  ratingTitle: {
    fontSize: 20, fontFamily: F.bold, color: '#111827',
    textAlign: 'center', marginBottom: 6,
  },
  ratingSubtitle: {
    fontSize: 14, fontFamily: F.regular, color: '#6B7280', marginBottom: 20,
  },
  starsContainer: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 8, marginBottom: 28, marginTop: 12,
  },
  starBtn: { padding: 4 },
  ratingActions: { flexDirection: 'row', gap: 10, width: '100%' },
  ratingCancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 14,
    backgroundColor: '#F3F4F6', alignItems: 'center',
  },
  ratingCancelTxt: { fontSize: 14, fontFamily: F.semibold, color: '#6B7280' },
  ratingSubmitBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 14,
    backgroundColor: '#22C55E', alignItems: 'center',
    shadowColor: '#22C55E', shadowOpacity: 0.3,
    shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  ratingSubmitBtnDisabled: { backgroundColor: '#D1D5DB', shadowOpacity: 0, elevation: 0 },
  ratingSubmitTxt: { fontSize: 14, fontFamily: F.bold, color: '#fff' },

  // ── ServiceHub FAB ──
  serviceHubFab: {
    position: 'absolute', right: 16, bottom: 228,
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#22C55E',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#22C55E', shadowOpacity: 0.45, shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 }, elevation: 8, zIndex: 20,
  },
});
