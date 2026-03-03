import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { F } from '../theme/fonts';
import * as Location from 'expo-location';

const DEFAULT_REGION = {
  latitude: 40.7128,
  longitude: -74.006,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

type Props = { navigation: any; route: any };

export default function MapScreen({ navigation, route }: Props) {
  const stops = (route?.params as any)?.stops || [];
  const hasStops = stops.length > 0;

  const [activeIndex, setActiveIndex] = useState(0);
  const [userRegion, setUserRegion] = useState<Region>(DEFAULT_REGION);
  const [showPopup, setShowPopup] = useState(!hasStops);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<MapView>(null);

  // When opened directly as a tab (no stops), center on user location
  useEffect(() => {
    if (!hasStops) {
      (async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') return;
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setUserRegion({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.04,
            longitudeDelta: 0.04,
          });
        } catch {
          // keep default region
        }
      })();
    }
  }, [hasStops]);

  const activeStop = hasStops ? stops[activeIndex] : null;

  // Memoize the center region calculation to avoid unnecessary recalculations
  const centerRegion = useMemo(() => {
    if (hasStops && stops.length > 0) {
      try {
        const sumLat = stops.reduce((s: number, p: any) => s + (p.coordinate?.latitude || 0), 0);
        const sumLng = stops.reduce((s: number, p: any) => s + (p.coordinate?.longitude || 0), 0);
        const avgLat = sumLat / stops.length;
        const avgLng = sumLng / stops.length;
        
        // Validate coordinates
        if (!isNaN(avgLat) && !isNaN(avgLng)) {
          return {
            latitude: avgLat,
            longitude: avgLng,
            latitudeDelta: 0.08,
            longitudeDelta: 0.08,
          };
        }
      } catch {
        // fall through to default
      }
    }
    return userRegion;
  }, [hasStops, stops, userRegion]);

  const centerOnStop = (index: number) => {
    setActiveIndex(index);
    mapRef.current?.animateToRegion({
      latitude: stops[index].coordinate.latitude,
      longitude: stops[index].coordinate.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }, 600);
  };

  const goNext = () => { if (activeIndex < stops.length - 1) centerOnStop(activeIndex + 1); };
  const goPrev = () => { if (activeIndex > 0) centerOnStop(activeIndex - 1); };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={centerRegion}
          region={mapReady ? centerRegion : undefined}
          onMapReady={() => setMapReady(true)}
          showsUserLocation
        >
          {stops.map((stop: any, index: number) => (
            <Marker
              key={stop.id}
              coordinate={stop.coordinate}
              title={stop.name}
              onPress={() => centerOnStop(index)}
              pinColor={index === activeIndex ? '#22C55E' : '#FF5A5F'}
            />
          ))}
        </MapView>

        {/* End trip / back button */}
        <TouchableOpacity
          style={styles.endTripBtn}
          onPress={() => navigation.navigate('Create Trip')}
        >
          <Ionicons name="close-circle-outline" size={15} color="#111827" style={{ marginRight: 4 }} />
          <Text style={styles.endTripBtnText}>End Trip</Text>
        </TouchableOpacity>

        {/* Stop dots */}
        {hasStops && (
          <View style={styles.dotsRow}>
            {stops.map((_: any, i: number) => (
              <TouchableOpacity key={i} onPress={() => centerOnStop(i)}>
                <View style={[styles.dot, i === activeIndex && styles.dotActive]} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Active stop card */}
        {hasStops && activeStop && (
          <View style={styles.placeCard}>
            <View style={styles.placeImageBox}>
              <Image source={{ uri: activeStop.image }} style={styles.placeImage} />
              <View style={styles.stopBadge}>
                <Text style={styles.stopBadgeText}>{activeIndex + 1}/{stops.length}</Text>
              </View>
            </View>
            <View style={styles.placeInfo}>
              <Text style={styles.nextLabel}>Next Stop</Text>
              <Text style={styles.placeName} numberOfLines={2}>{activeStop.name}</Text>
              <View style={styles.placeStats}>
                {activeStop.distance ? (
                  <>
                    <Ionicons name="walk-outline" size={14} color="#57636C" />
                    <Text style={styles.statText}>{activeStop.distance}</Text>
                  </>
                ) : null}
                {activeStop.time ? (
                  <>
                    <Ionicons name="time-outline" size={14} color="#57636C" style={{ marginLeft: 10 }} />
                    <Text style={styles.statText}>{activeStop.time}</Text>
                  </>
                ) : null}
              </View>
            </View>
            <View style={styles.navArrows}>
              <TouchableOpacity onPress={goPrev} style={[styles.arrowBtn, activeIndex === 0 && { opacity: 0.3 }]}>
                <Ionicons name="chevron-up" size={20} color="#111827" />
              </TouchableOpacity>
              <TouchableOpacity onPress={goNext} style={[styles.arrowBtn, activeIndex === stops.length - 1 && { opacity: 0.3 }]}>
                <Ionicons name="chevron-down" size={20} color="#111827" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Empty state popup (no active trip) */}
        {showPopup && !hasStops && (
          <View style={styles.popupOverlay}>
            <View style={styles.popup}>
              <View style={styles.popupIconWrap}>
                <Ionicons name="map-outline" size={32} color="#22C55E" />
              </View>
              <Text style={styles.popupTitle}>Explore locations nearby</Text>
              <Text style={styles.popupSubtitle}>
                Create a trip to discover places around you
              </Text>
              <View style={styles.popupActions}>
                <TouchableOpacity style={styles.popupCancel} onPress={() => setShowPopup(false)}>
                  <Text style={styles.popupCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.popupCreate}
                  onPress={() => { setShowPopup(false); navigation.navigate('Create Trip'); }}
                >
                  <Text style={styles.popupCreateText}>Create a Trip</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  mapContainer: { flex: 1 },
  map: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },

  endTripBtn: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E5E5E7', paddingHorizontal: 10, paddingVertical: 8 },
  endTripBtnText: { color: '#111827', fontSize: 14 },

  dotsRow: { position: 'absolute', bottom: 104, alignSelf: 'center', flexDirection: 'row', gap: 6, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D1FAE5' },
  dotActive: { width: 20, backgroundColor: '#22C55E', borderRadius: 4 },

  placeCard: { position: 'absolute', bottom: 8, left: 14, right: 14, height: 90, backgroundColor: '#fff', borderRadius: 16, borderWidth: 0.5, borderColor: '#E5E5E7', flexDirection: 'row', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  placeImageBox: { width: 90, height: 90 },
  placeImage: { width: 90, height: 90, resizeMode: 'cover' },
  stopBadge: { position: 'absolute', bottom: 4, left: 4, backgroundColor: '#22C55E', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  stopBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  placeInfo: { flex: 1, padding: 10, justifyContent: 'center' },
  nextLabel: { fontSize: 11, color: '#22C55E', fontWeight: '600', marginBottom: 2 },
  placeName: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 6, lineHeight: 18 },
  placeStats: { flexDirection: 'row', alignItems: 'center' },
  statText: { fontSize: 12, color: '#57636C', marginLeft: 2 },
  navArrows: { justifyContent: 'center', alignItems: 'center', paddingRight: 10, gap: 4 },
  arrowBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F2F2F7', alignItems: 'center', justifyContent: 'center' },

  // Empty state popup
  popupOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  popup: { width: '82%', backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center' },
  popupIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  popupTitle: { fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 8 },
  popupSubtitle: { fontSize: 14, color: '#57636C', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  popupActions: { flexDirection: 'row', gap: 12, width: '100%' },
  popupCancel: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#E5E5EA', alignItems: 'center', justifyContent: 'center' },
  popupCancelText: { fontSize: 15, color: '#57636C', fontWeight: '500' },
  popupCreate: { flex: 1, height: 44, borderRadius: 12, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center' },
  popupCreateText: { fontSize: 15, color: '#fff', fontWeight: '600' },
});
