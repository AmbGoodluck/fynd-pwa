import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { F } from '../theme/fonts';
import AppHeader from '../components/AppHeader';

// ─── Constants ────────────────────────────────────────────────────────────────
const { width: SW } = Dimensions.get('window');
const API_KEY = 'AIzaSyAXJbrM6TImUPguLUnXUNKUkPzTdXKV53c';
const MAP_H = 220; // logical display height in px
// Request at device-pixel-width; scale=2 doubles it for retina
const MAP_PX_W = Math.round(SW);
const MAP_PX_H = MAP_H;
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

// Auto-zoom level that fits all stops in frame
function autoZoom(stops: Stop[]): number {
  if (stops.length <= 1) return 15;
  const lats = stops.map(s => s.coordinate.latitude);
  const lngs = stops.map(s => s.coordinate.longitude);
  const span = Math.max(
    Math.max(...lats) - Math.min(...lats),
    Math.max(...lngs) - Math.min(...lngs),
  );
  if (span < 0.01) return 15;
  if (span < 0.04) return 14;
  if (span < 0.10) return 13;
  if (span < 0.25) return 12;
  if (span < 0.60) return 11;
  if (span < 1.50) return 10;
  return 9;
}

const hasCoord = (s: Stop) =>
  s.coordinate != null &&
  (s.coordinate.latitude !== 0 || s.coordinate.longitude !== 0);

// ─── Static Maps URL builders ─────────────────────────────────────────────────

/**
 * Overview: all stops as numbered markers + green polyline route.
 * Active stop marker is green; others are red.
 */
function buildOverviewUrl(
  stops: Stop[],
  activeIdx: number,
  user: Coord | null,
): string {
  const valid = stops.filter(hasCoord);
  if (valid.length === 0) return '';

  let u =
    `https://maps.googleapis.com/maps/api/staticmap` +
    `?size=${MAP_PX_W}x${MAP_PX_H}&scale=2&maptype=roadmap`;

  // Minimal style: hide clutter
  u += '&style=feature:poi|visibility:simplified';
  u += '&style=feature:transit|visibility:off';

  // Route polyline
  if (valid.length > 1) {
    const pts = valid
      .map(s => `${s.coordinate.latitude},${s.coordinate.longitude}`)
      .join('|');
    u += `&path=weight:4|color:0x22C55Ebb|${pts}`;
  }

  // Numbered markers — cap at 10 to keep URL within limits
  valid.slice(0, 10).forEach((s, i) => {
    const color = i === activeIdx ? '0x22C55E' : 'red';
    const label = LABELS[i] ?? 'X';
    u += `&markers=color:${color}|label:${label}|${s.coordinate.latitude},${s.coordinate.longitude}`;
  });

  // User location (small blue dot)
  if (user) {
    u += `&markers=color:blue|size:small|${user.latitude},${user.longitude}`;
  }

  // Center on midpoint of all stops; zoom to fit bounding box
  const avgLat = valid.reduce((a, s) => a + s.coordinate.latitude, 0) / valid.length;
  const avgLng = valid.reduce((a, s) => a + s.coordinate.longitude, 0) / valid.length;
  u += `&center=${avgLat.toFixed(6)},${avgLng.toFixed(6)}&zoom=${autoZoom(valid)}`;
  u += `&key=${API_KEY}`;
  return u;
}

/**
 * Focus: zoom into a single stop at z=15, draw dotted line from user if available.
 */
function buildFocusUrl(stop: Stop, user: Coord | null): string {
  const { latitude: lat, longitude: lng } = stop.coordinate;
  let u =
    `https://maps.googleapis.com/maps/api/staticmap` +
    `?size=${MAP_PX_W}x${MAP_PX_H}&scale=2&maptype=roadmap`;

  u += '&style=feature:poi|visibility:simplified';
  u += `&markers=color:0x22C55E|label:${LABELS[0]}|${lat},${lng}`;

  if (user) {
    u += `&markers=color:blue|size:small|${user.latitude},${user.longitude}`;
    // Geodesic dashed-style line from user to stop
    u += `&path=weight:3|color:0x22C55E88|geodesic:true|${user.latitude},${user.longitude}|${lat},${lng}`;
  }

  u += `&center=${lat.toFixed(6)},${lng.toFixed(6)}&zoom=15`;
  u += `&key=${API_KEY}`;
  return u;
}

/**
 * Idle (Map tab, no active trip): show user's current position.
 */
function buildIdleUrl(user: Coord): string {
  let u =
    `https://maps.googleapis.com/maps/api/staticmap` +
    `?size=${MAP_PX_W}x${MAP_PX_H}&scale=2&maptype=roadmap`;
  u += `&markers=color:0x22C55E|label:Y|${user.latitude},${user.longitude}`;
  u += `&center=${user.latitude.toFixed(6)},${user.longitude.toFixed(6)}&zoom=14`;
  u += `&key=${API_KEY}`;
  return u;
}

// ─── Component ────────────────────────────────────────────────────────────────
type Props = { navigation: any; route?: any };

export default function MapScreen({ navigation, route }: Props) {
  const stops: Stop[] = route?.params?.stops ?? [];
  const hasStops = stops.length > 0;

  const [activeIdx, setActiveIdx] = useState(0);
  const [userLoc, setUserLoc] = useState<Coord | null>(null);
  const [imgLoading, setImgLoading] = useState(true);
  const [focusMode, setFocusMode] = useState(false);

  // Request location once on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserLoc({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      } catch (_) {}
    })();
  }, []);

  const activeStop = hasStops ? stops[activeIdx] : null;

  // Real-time distance from user to the active stop
  const distToActive = useMemo(() => {
    if (!userLoc || !activeStop || !hasCoord(activeStop)) return null;
    return haversineKm(
      userLoc.latitude, userLoc.longitude,
      activeStop.coordinate.latitude, activeStop.coordinate.longitude,
    );
  }, [userLoc, activeStop]);

  // Rebuild map URL whenever dependencies change
  const mapUrl = useMemo(() => {
    if (!hasStops) return userLoc ? buildIdleUrl(userLoc) : null;
    if (focusMode && activeStop && hasCoord(activeStop)) {
      return buildFocusUrl(activeStop, userLoc);
    }
    return buildOverviewUrl(stops, activeIdx, userLoc);
  }, [hasStops, stops, activeIdx, userLoc, focusMode, activeStop]);

  // Reset loading spinner each time the URL changes
  useEffect(() => { setImgLoading(true); }, [mapUrl]);

  const selectStop = (i: number) => { setActiveIdx(i); setFocusMode(false); };

  const openStopInGMaps = (stop: Stop) => {
    const { latitude, longitude } = stop.coordinate;
    Linking.openURL(`https://maps.google.com/maps?q=${latitude},${longitude}`)
      .catch(() => Alert.alert('Error', 'Could not open Google Maps.'));
  };

  const openFullRoute = () => {
    if (!hasStops) return;
    if (stops.length === 1) { openStopInGMaps(stops[0]); return; }
    const o = stops[0].coordinate;
    const d = stops[stops.length - 1].coordinate;
    const wp = stops
      .slice(1, -1)
      .map(s => `${s.coordinate.latitude},${s.coordinate.longitude}`)
      .join('|');
    let url =
      `https://www.google.com/maps/dir/?api=1` +
      `&origin=${o.latitude},${o.longitude}` +
      `&destination=${d.latitude},${d.longitude}`;
    if (wp) url += `&waypoints=${encodeURIComponent(wp)}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open Google Maps.'));
  };

  // ── Idle state (Map tab, no active trip) ───────────────────────────────────
  if (!hasStops) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <AppHeader title="Map" />

        {/* Static map of user's location */}
        <View style={styles.mapBox}>
          {mapUrl ? (
            <>
              <Image
                source={{ uri: mapUrl }}
                style={styles.mapImg}
                onLoad={() => setImgLoading(false)}
                onError={() => setImgLoading(false)}
              />
              {imgLoading && (
                <View style={styles.mapLoadingOverlay}>
                  <ActivityIndicator color="#22C55E" size="large" />
                </View>
              )}
              {!imgLoading && (
                <View style={styles.locationPillWrap}>
                  <View style={styles.locationPill}>
                    <Ionicons name="location" size={13} color="#22C55E" />
                    <Text style={styles.locationPillTxt}>Your location</Text>
                  </View>
                </View>
              )}
            </>
          ) : (
            <View style={styles.mapPlaceholder}>
              <Ionicons name="map-outline" size={48} color="#E5E5EA" />
              <Text style={styles.mapPlaceholderTxt}>Finding your location…</Text>
            </View>
          )}
        </View>

        {/* CTA card */}
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="Trip Map" onBack={() => navigation.goBack()} />

      {/* ── Static map image ── */}
      <TouchableOpacity
        activeOpacity={0.97}
        onPress={() => setFocusMode(f => !f)}
        style={styles.mapBox}
      >
        {mapUrl ? (
          <Image
            source={{ uri: mapUrl }}
            style={styles.mapImg}
            onLoadStart={() => setImgLoading(true)}
            onLoad={() => setImgLoading(false)}
            onError={() => setImgLoading(false)}
          />
        ) : (
          <View style={styles.mapPlaceholder}>
            <ActivityIndicator color="#22C55E" size="large" />
          </View>
        )}

        {/* Loading spinner overlay */}
        {imgLoading && mapUrl ? (
          <View style={styles.mapLoadingOverlay}>
            <ActivityIndicator color="#22C55E" size="large" />
          </View>
        ) : null}

        {/* Floating controls row */}
        <View style={styles.mapControls}>
          <View style={styles.focusPill}>
            <Ionicons
              name={focusMode ? 'contract-outline' : 'expand-outline'}
              size={12}
              color="#111827"
            />
            <Text style={styles.focusPillTxt}>
              {focusMode ? 'Overview' : 'Focus stop'}
            </Text>
          </View>
          <TouchableOpacity style={styles.navigateBtn} onPress={openFullRoute}>
            <Ionicons name="navigate" size={13} color="#fff" />
            <Text style={styles.navigateBtnTxt}>Navigate</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* ── Stop navigator bar ── */}
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
            onPress={() => openStopInGMaps(activeStop)}
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
                <Text
                  style={[
                    styles.thumbBadgeTxt,
                    i === activeIdx && styles.thumbBadgeTxtActive,
                  ]}
                >
                  {i + 1}
                </Text>
              </View>
            </View>
            <Text
              style={[
                styles.thumbLbl,
                i === activeIdx && styles.thumbLblActive,
              ]}
              numberOfLines={1}
            >
              {stop.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  // ── Map box (shared) ──
  mapBox: {
    width: '100%',
    height: MAP_H,
    backgroundColor: '#F2F2F7',
    overflow: 'hidden',
    position: 'relative',
  },
  mapImg: { width: '100%', height: MAP_H, resizeMode: 'cover' },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  mapPlaceholder: {
    width: '100%',
    height: MAP_H,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
  },
  mapPlaceholderTxt: { fontSize: 13, color: '#8E8E93', marginTop: 8 },

  // Location pill (idle)
  locationPillWrap: {
    position: 'absolute',
    bottom: 12,
    left: 12,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.93)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  locationPillTxt: { fontSize: 12, fontFamily: F.medium, color: '#111827' },

  // Map floating controls
  mapControls: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  focusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.93)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  focusPillTxt: { fontSize: 12, fontFamily: F.medium, color: '#111827' },
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
  detailDesc: { fontSize: 12, color: '#57636C', marginBottom: 6 },
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
  thumbBadgeTxtActive: { color: '#fff' },
  thumbLbl: {
    fontSize: 10,
    fontFamily: F.regular,
    color: '#8E8E93',
    marginTop: 4,
    textAlign: 'center',
    width: 68,
  },
  thumbLblActive: { fontFamily: F.medium, color: '#22C55E' },
});
