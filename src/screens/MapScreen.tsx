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
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Sentry from '../services/sentry';
import { F } from '../theme/fonts';
import AppHeader from '../components/AppHeader';
import { submitFeedback } from '../services/feedbackService';
import { usePremiumStore } from '../store/usePremiumStore';
import { useAuthStore } from '../store/useAuthStore';
import { useGuestStore } from '../store/useGuestStore';
import FyndPlusUpgradeModal from '../components/FyndPlusUpgradeModal';

// ─── Constants ────────────────────────────────────────────────────────────────
const { width: SW } = Dimensions.get('window');
const WEB_PROXY_FALLBACK = 'https://fynd-api.jallohosmanamadu311.workers.dev';
const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || '';
const PROXY = ((process.env.EXPO_PUBLIC_OPENAI_PROXY || '').replace(/\/$/, '')) || WEB_PROXY_FALLBACK;
const MAP_H = 280;
const LABELS = '123456789ABCDEFGHIJKLMNOP';

// ─── Types ────────────────────────────────────────────────────────────────────
type Coord = { latitude: number; longitude: number };
type Stop = {
  id: string;
  name: string;
  description?: string;
  distance?: string;
  time?: string;
  rating?: string;
  image: string;
  coordinate: Coord;
};

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

// ─── HTML builders ────────────────────────────────────────────────────────────

/**
 * Full interactive Google Maps JS — bakes STOPS into the HTML.
 * User location + activeIdx changes are pushed later via injectJavaScript.
 */
function buildTripHtml(stops: Stop[], mapsJsUrl: string): string {
  const stopsData = JSON.stringify(
    stops.map((s, i) => ({
      id: s.id,
      name: s.name,
      lat: s.coordinate.latitude,
      lng: s.coordinate.longitude,
      label: LABELS[i] ?? 'X',
    }))
  );

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; overflow: hidden; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var STOPS = ${stopsData};
    var USER = null;
    var activeIdx = 0;
    var map, markers = [], polyline, userMarker;
    var directionsRenderer = null;

    function pinSvg(label, isActive) {
      var color = isActive ? '#22C55E' : '#EF4444';
      var size = isActive ? 40 : 34;
      var fs = isActive ? 13 : 11;
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + Math.round(size * 1.3) + '" viewBox="0 0 40 52">'
        + '<path d="M20 0C9 0 0 9 0 20c0 14 20 32 20 32S40 34 40 20C40 9 31 0 20 0z" fill="' + color + '"/>'
        + '<circle cx="20" cy="19" r="12" fill="white"/>'
        + '<text x="20" y="24" font-family="Arial,sans-serif" font-size="' + fs + '" font-weight="bold" text-anchor="middle" fill="' + color + '">' + label + '</text>'
        + '</svg>';
      return {
        url: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg),
        scaledSize: new google.maps.Size(size, Math.round(size * 1.3)),
        anchor: new google.maps.Point(size / 2, Math.round(size * 1.3)),
      };
    }

    function blueDotSvg() {
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22">'
        + '<circle cx="11" cy="11" r="8" fill="#3B82F6" stroke="white" stroke-width="3"/>'
        + '<circle cx="11" cy="11" r="3" fill="white"/>'
        + '</svg>';
      return {
        url: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg),
        scaledSize: new google.maps.Size(22, 22),
        anchor: new google.maps.Point(11, 11),
      };
    }

    function initMap() {
      var center = STOPS.length > 0
        ? { lat: STOPS[0].lat, lng: STOPS[0].lng }
        : { lat: 40.7128, lng: -74.006 };

      map = new google.maps.Map(document.getElementById('map'), {
        center: center,
        zoom: 13,
        disableDefaultUI: true,
        gestureHandling: 'greedy',
        clickableIcons: false,
        styles: [
          { featureType: 'poi', stylers: [{ visibility: 'simplified' }] },
          { featureType: 'transit', stylers: [{ visibility: 'off' }] },
        ],
      });

      renderAll();
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));
      }
    }

    function renderAll() {
      markers.forEach(function(m) { m.setMap(null); });
      markers = [];
      if (polyline) polyline.setMap(null);
      if (userMarker) userMarker.setMap(null);
      if (STOPS.length === 0) return;

      if (STOPS.length > 1) {
        polyline = new google.maps.Polyline({
          path: STOPS.map(function(s) { return { lat: s.lat, lng: s.lng }; }),
          geodesic: true,
          strokeColor: '#22C55E',
          strokeOpacity: 0.85,
          strokeWeight: 4,
          map: map,
        });
      }

      STOPS.forEach(function(stop, i) {
        var m = new google.maps.Marker({
          position: { lat: stop.lat, lng: stop.lng },
          map: map,
          icon: pinSvg(stop.label, i === activeIdx),
          title: stop.name,
          zIndex: i === activeIdx ? 10 : 1,
        });
        (function(idx) {
          m.addListener('click', function() {
            activeIdx = idx;
            refreshMarkers();
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(
                JSON.stringify({ type: 'markerTap', index: idx })
              );
            }
          });
        })(i);
        markers.push(m);
      });

      drawUserDot();
      fitAll();
    }

    function drawUserDot() {
      if (userMarker) userMarker.setMap(null);
      if (!USER) return;
      userMarker = new google.maps.Marker({
        position: USER,
        map: map,
        icon: blueDotSvg(),
        zIndex: 20,
        title: 'You',
      });
    }

    function refreshMarkers() {
      markers.forEach(function(m, i) {
        m.setIcon(pinSvg(STOPS[i].label, i === activeIdx));
        m.setZIndex(i === activeIdx ? 10 : 1);
      });
    }

    function fitAll() {
      if (STOPS.length === 0) return;
      if (STOPS.length === 1) {
        map.setCenter({ lat: STOPS[0].lat, lng: STOPS[0].lng });
        map.setZoom(15);
        return;
      }
      var b = new google.maps.LatLngBounds();
      STOPS.forEach(function(s) { b.extend({ lat: s.lat, lng: s.lng }); });
      if (USER) b.extend(USER);
      map.fitBounds(b, { top: 50, right: 30, bottom: 30, left: 30 });
    }

    /* ── Called from React Native via injectJavaScript ── */

    function setActiveStop(idx) {
      activeIdx = idx;
      refreshMarkers();
      if (STOPS[idx]) {
        map.panTo({ lat: STOPS[idx].lat, lng: STOPS[idx].lng });
        map.setZoom(15);
      }
    }

    function showOverview() {
      refreshMarkers();
      fitAll();
    }

    function setUserLocation(lat, lng) {
      USER = { lat: lat, lng: lng };
      drawUserDot();
    }

    function showDirections(uLat, uLng, dLat, dLng) {
      if (!map) return;
      if (directionsRenderer) { directionsRenderer.setMap(null); directionsRenderer = null; }
      directionsRenderer = new google.maps.DirectionsRenderer({
        map: map,
        suppressMarkers: true,
        polylineOptions: { strokeColor: '#3B82F6', strokeWeight: 5, strokeOpacity: 0.9 }
      });
      var ds = new google.maps.DirectionsService();
      ds.route({
        origin: { lat: uLat, lng: uLng },
        destination: { lat: dLat, lng: dLng },
        travelMode: google.maps.TravelMode.WALKING
      }, function(result, status) {
        if (status === 'OK') {
          directionsRenderer.setDirections(result);
          var leg = result.routes[0].legs[0];
          map.fitBounds(result.routes[0].bounds, { top: 60, right: 30, bottom: 30, left: 30 });
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'navInfo',
              distance: leg.distance ? leg.distance.text : '',
              duration: leg.duration ? leg.duration.text : ''
            }));
          }
        } else {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'navError', status: status }));
          }
        }
      });
    }

    function clearDirections() {
      if (directionsRenderer) { directionsRenderer.setMap(null); directionsRenderer = null; }
      renderAll();
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'navCleared' }));
      }
    }
  </script>
  <script async
    src="${mapsJsUrl}">
  </script>
</body>
</html>`;
}

/**
 * Idle map (Map tab, no active trip) — shows user's location only.
 */
function buildIdleHtml(mapsJsUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; overflow: hidden; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var USER = null;
    var map, userMarker;

    function initMap() {
      map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 40.7128, lng: -74.006 },
        zoom: 11,
        disableDefaultUI: true,
        gestureHandling: 'greedy',
        clickableIcons: false,
        styles: [
          { featureType: 'poi', stylers: [{ visibility: 'simplified' }] },
          { featureType: 'transit', stylers: [{ visibility: 'off' }] },
        ],
      });
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));
      }
    }

    function setUserLocation(lat, lng) {
      USER = { lat: lat, lng: lng };
      if (userMarker) userMarker.setMap(null);
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22">'
        + '<circle cx="11" cy="11" r="8" fill="#22C55E" stroke="white" stroke-width="3"/>'
        + '<circle cx="11" cy="11" r="3" fill="white"/></svg>';
      userMarker = new google.maps.Marker({
        position: USER,
        map: map,
        icon: {
          url: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg),
          scaledSize: new google.maps.Size(22, 22),
          anchor: new google.maps.Point(11, 11),
        },
        title: 'Your location',
      });
      map.setCenter(USER);
      map.setZoom(14);
    }
  </script>
  <script async
    src="${mapsJsUrl}">
  </script>
</body>
</html>`;
}

// ─── Component ────────────────────────────────────────────────────────────────
type Props = { navigation: any; route?: any };

export default function MapScreen({ navigation, route }: Props) {
  const { width: viewportWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isMobileWeb = Platform.OS === 'web' && viewportWidth <= 900;
  const { isPremium } = usePremiumStore();
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
  const [showServiceHubUpgradeModal, setShowServiceHubUpgradeModal] = useState(false);
  const mapLoadStartRef = useRef<number>(Date.now());

  const mapsJsUrl = useMemo(() => {
    if (Platform.OS === 'web' && PROXY) {
      return `${PROXY}/api/maps/js?callback=initMap&loading=async`;
    }
    return `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&callback=initMap&loading=async`;
  }, []);

  // Build HTML once — stops are baked in; user location + activeIdx are pushed via injectJavaScript
  const mapHtml = useMemo(
    () => (hasStops ? buildTripHtml(stops, mapsJsUrl) : buildIdleHtml(mapsJsUrl)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasStops, mapsJsUrl]   // intentionally only rebuild if mode/script source changes
  );

  useEffect(() => {
    mapLoadStartRef.current = Date.now();
    Sentry.addBreadcrumb({
      category: 'perf.map',
      message: 'map_html_load_start',
      level: 'info',
      data: { hasStops, platform: Platform.OS },
    });
  }, [mapHtml, hasStops]);

  // Request GPS once on mount
  useEffect(() => {
    (async () => {
      try {
        if (Platform.OS === 'web') {
          // Use browser Geolocation API directly on web
          const geo = typeof navigator !== 'undefined' ? navigator.geolocation : null;
          if (geo && typeof geo.getCurrentPosition === 'function') {
            geo.getCurrentPosition(
              (pos) => setUserLoc({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
              (err) => {
                Sentry.captureMessage('MapScreen web geolocation error', {
                  level: 'warning',
                  extra: { message: err.message, code: err.code },
                });
              },
              { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
            );
          } else {
            Sentry.captureMessage('MapScreen web geolocation unavailable', {
              level: 'warning',
              extra: { hasNavigator: typeof navigator !== 'undefined' },
            });
          }
          return;
        }
        // Native (Android/iOS)
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserLoc({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      } catch (err) {
        Sentry.captureException(err, { tags: { context: 'MapScreen.getUserLocation', platform: Platform.OS } });
      }
    })();
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

  // Safety valve: if mapReady message never arrives (e.g. API key issue), clear
  // the loading overlay after 12 s so the UI is never permanently stuck.
  useEffect(() => {
    const t = setTimeout(() => setMapLoading(false), 12000);
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
      } else if (data.type === 'navInfo') {
        setIsNavigating(true);
        setNavInfo({ distance: data.distance, duration: data.duration });
      } else if (data.type === 'navCleared') {
        setIsNavigating(false);
        setNavInfo(null);
      } else if (data.type === 'navError') {
        setIsNavigating(false);
        setNavInfo(null);
        Alert.alert('Navigation', 'Could not calculate route. Make sure location is enabled.');
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
    if (!userLoc) {
      Alert.alert('Location access required for navigation.');
      return;
    }
    // Launch full NavigationScreen for turn-by-turn walking directions
    navigation.navigate('Navigation', {
      destinationLat: stop.coordinate.latitude,
      destinationLng: stop.coordinate.longitude,
      destinationName: stop.name,
    });
  };

  const handleServiceHubFab = () => {
    if (isGuest || !isAuthenticated) {
      Alert.alert('Account Required', 'Sign in to access ServiceHub.');
      return;
    }
    if (!isPremium) {
      setShowServiceHubUpgradeModal(true);
      return;
    }
    navigation.navigate('ServiceHub');
  };

  const stopNavigation = () => {
    webViewRef.current?.injectJavaScript(`clearDirections(); true;`);
  };

  const openFullRoute = () => {
    // Show overview of all stops on in-app map
    showOverview();
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
        </View>
      </SafeAreaView>
    );
  }

  // ── Idle state (Map tab, no active trip) ───────────────────────────────────
  if (!hasStops) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <AppHeader title="Map" />

        <View style={styles.mapBox}>
          <FyndMapView
            ref={webViewRef}
            html={mapHtml}
            style={styles.webView}
            onMessage={onMessage}
          />
          {mapLoading && (
            <View style={styles.mapLoadingOverlay}>
              <ActivityIndicator color="#22C55E" size="large" />
              <Text style={styles.mapLoadingTxt}>Loading map…</Text>
            </View>
          )}
        </View>

        <View style={styles.idleCard}>
          <Ionicons name="compass-outline" size={44} color="#22C55E" style={{ marginBottom: 14 }} />
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
              <Text
                style={[styles.thumbLbl, i === activeIdx && styles.thumbLblActive]}
                numberOfLines={1}
              >
                {stop.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
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

      {/* ── ServiceHub Upgrade Modal ── */}
      <FyndPlusUpgradeModal
        visible={showServiceHubUpgradeModal}
        onClose={() => setShowServiceHubUpgradeModal(false)}
        onUpgrade={() => { setShowServiceHubUpgradeModal(false); navigation.navigate('Subscription'); }}
        icon="compass-outline"
        title="Unlock ServiceHub"
        message="Access nearby medical help, transport, and emergency services with FyndPlus."
      />

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
  container: { flex: 1, backgroundColor: '#fff' },

  // ── Fullscreen mode ──
  fullscreenContainer: { flex: 1, backgroundColor: '#000' },
  fullscreenMapBox: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    position: 'relative',
    overflow: 'hidden',
  },
  fullscreenControls: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  closeFullscreenBtn: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenBottomPanel: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 16,
    maxHeight: '35%',
  },
  detailCardFullscreen: {
    marginVertical: 10,
  },

  // ── Map box ──
  mapBox: {
    width: '100%',
    height: MAP_H,
    backgroundColor: '#F2F2F7',
    overflow: 'hidden',
    position: 'relative',
  },
  webView: { flex: 1 },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
  },
  mapLoadingTxt: {
    marginTop: 10,
    fontSize: 13,
    color: '#8E8E93',
    fontFamily: F.regular,
  },

  // Map floating controls
  mapControls: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  overviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.93)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  overviewBtnTxt: { fontSize: 12, fontFamily: F.medium, color: '#111827' },
  endTripBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EF4444',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  endTripBtnTxt: { fontSize: 12, fontFamily: F.medium, color: '#fff' },
  fullscreenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#3B82F6',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  fullscreenBtnTxt: { fontSize: 12, fontFamily: F.medium, color: '#fff' },
  navigateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#22C55E',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  navigateBtnTxt: { fontSize: 12, fontFamily: F.semibold, color: '#fff' },

  navBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#EFF6FF', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 8,
    marginBottom: 8, marginHorizontal: 4,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  navBarText: { flex: 1, fontSize: 13, fontFamily: F.semibold, color: '#1D4ED8' },
  navStopBtn: {
    backgroundColor: '#EF4444', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  navStopBtnText: { fontSize: 11, fontFamily: F.semibold, color: '#fff' },

  // ── Idle card ──
  idleCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 24,
  },
  idleTitle: {
    fontSize: 20,
    fontFamily: F.bold,
    color: '#111827',
    marginBottom: 10,
    textAlign: 'center',
  },
  idleSub: {
    fontSize: 14,
    color: '#57636C',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  idleSubBold: { fontFamily: F.semibold, color: '#111827' },
  idleCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22C55E',
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  idleCtaTxt: { fontSize: 15, fontFamily: F.semibold, color: '#fff' },

  // ── Stop navigator bar ──
  tripBottomSection: {
    backgroundColor: '#fff',
  },
  stopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    backgroundColor: '#fff',
  },
  arrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowBtnDim: { opacity: 0.35 },
  stopBarCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 6 },
  stopBarCount: { fontSize: 12, fontFamily: F.regular, color: '#8E8E93' },
  stopBarNum: { fontFamily: F.bold, color: '#111827' },
  stopBarOf: { fontFamily: F.regular, color: '#8E8E93' },
  stopBarName: {
    fontSize: 14,
    fontFamily: F.semibold,
    color: '#111827',
    marginTop: 1,
  },

  // ── Active stop detail card ──
  detailCard: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    overflow: 'hidden',
    height: 90,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  detailImg: { width: 90, height: 90, resizeMode: 'cover' },
  detailBody: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  detailName: {
    fontSize: 14,
    fontFamily: F.semibold,
    color: '#111827',
    marginBottom: 3,
  },
  detailDesc: { fontSize: 12, color: '#57636C', marginBottom: 5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F0FDF4',
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  chipTxt: { fontSize: 11, fontFamily: F.medium, color: '#374151' },
  goBtn: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#F2F2F7',
  },
  goBtnTxt: {
    fontSize: 11,
    fontFamily: F.semibold,
    color: '#22C55E',
    marginTop: 2,
  },

  // ── Thumbnail strip ──
  thumbScroll: { marginTop: 10 },
  thumbRow: { paddingHorizontal: 12, gap: 10 },
  thumbItem: { alignItems: 'center', width: 68 },
  thumbImgWrap: {
    width: 60,
    height: 60,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  thumbImgWrapActive: { borderColor: '#22C55E' },
  thumbImg: { width: 60, height: 60, resizeMode: 'cover' },
  thumbBadge: {
    position: 'absolute',
    bottom: 3,
    left: 3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.50)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbBadgeActive: { backgroundColor: '#22C55E' },
  thumbBadgeTxt: { fontSize: 10, fontFamily: F.bold, color: '#fff' },
  thumbLbl: {
    fontSize: 10,
    fontFamily: F.regular,
    color: '#8E8E93',
    marginTop: 4,
    textAlign: 'center',
    width: 68,
  },
  thumbLblActive: { fontFamily: F.medium, color: '#22C55E' },

  // ── Rating Modal ──
  ratingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  ratingCard: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  ratingTitle: {
    fontSize: 20,
    fontFamily: F.bold,
    color: '#111827',
    marginBottom: 6,
  },
  ratingSubtitle: {
    fontSize: 14,
    fontFamily: F.regular,
    color: '#6B7280',
    marginBottom: 20,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  starBtn: {
    padding: 4,
  },
  ratingActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  ratingCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
  },
  ratingCancelTxt: {
    fontSize: 14,
    fontFamily: F.semibold,
    color: '#6B7280',
  },
  ratingSubmitBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#22C55E',
    alignItems: 'center',
  },
  ratingSubmitBtnDisabled: {
    backgroundColor: '#D1D5DB',
  },
  ratingSubmitTxt: {
    fontSize: 14,
    fontFamily: F.semibold,
    color: '#fff',
  },

  // ── ServiceHub FAB ──
  serviceHubFab: {
    position: 'absolute',
    right: 16,
    bottom: 220,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    zIndex: 20,
  },
});
