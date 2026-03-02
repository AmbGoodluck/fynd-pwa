import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Image, ScrollView } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const DEFAULT_STOPS = [
  { id: '1', name: 'Metropolitan Museum of Art', distance: '14 km', time: '16 min remaining', image: 'https://images.unsplash.com/photo-1581367687051-9b5dc9ad0c02?w=400', coordinate: { latitude: 40.7794, longitude: -73.9632 } },
  { id: '2', name: 'Apollo Theater', distance: '14 km', time: '16 min remaining', image: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=400', coordinate: { latitude: 40.8099, longitude: -73.9502 } },
  { id: '3', name: 'International Center for Photography', distance: '14 km', time: '16 min remaining', image: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=400', coordinate: { latitude: 40.7614, longitude: -73.9776 } },
  { id: '4', name: 'Summit One Vanderbilt', distance: '14 km', time: '16 min remaining', image: 'https://images.unsplash.com/photo-1499092346589-b9b6be3e94b2?w=400', coordinate: { latitude: 40.7527, longitude: -73.9772 } },
];

type Props = { navigation: any; route: any };

export default function MapScreen({ navigation, route }: Props) {
  const stops = (route?.params as any)?.stops || DEFAULT_STOPS;
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const mapRef = useRef<MapView>(null);

  const activeStop = stops[activeIndex];

  const centerOnStop = (index: number) => {
    setActiveIndex(index);
    mapRef.current?.animateToRegion({
      latitude: stops[index].coordinate.latitude,
      longitude: stops[index].coordinate.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }, 600);
  };

  const goNext = () => {
    if (activeIndex < stops.length - 1) centerOnStop(activeIndex + 1);
  };

  const goPrev = () => {
    if (activeIndex > 0) centerOnStop(activeIndex - 1);
  };

  const centerRegion = {
    latitude: stops.length
      ? stops.reduce((s: number, p: any) => s + p.coordinate.latitude, 0) / stops.length
      : DEFAULT_STOPS[0].coordinate.latitude,
    longitude: stops.length
      ? stops.reduce((s: number, p: any) => s + p.coordinate.longitude, 0) / stops.length
      : DEFAULT_STOPS[0].coordinate.longitude,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#8E8E93" style={{ marginRight: 6 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search saved places"
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.searchBtn}>
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={centerRegion}
          showsUserLocation={true}
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

        <TouchableOpacity style={styles.endTripBtn} onPress={() => navigation.navigate('Home')}>
          <Ionicons name="close-circle-outline" size={15} color="#111827" style={{ marginRight: 4 }} />
          <Text style={styles.endTripBtnText}>End Trip</Text>
        </TouchableOpacity>

        {/* Stop counter dots */}
        <View style={styles.dotsRow}>
          {stops.map((_: any, i: number) => (
            <TouchableOpacity key={i} onPress={() => centerOnStop(i)}>
              <View style={[styles.dot, i === activeIndex && styles.dotActive]} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Place card */}
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
              <Ionicons name="walk-outline" size={14} color="#57636C" />
              <Text style={styles.statText}>{activeStop.distance}</Text>
              <Ionicons name="time-outline" size={14} color="#57636C" style={{ marginLeft: 14 }} />
              <Text style={styles.statText}>{activeStop.time}</Text>
            </View>
          </View>
          {/* Prev / Next arrows */}
          <View style={styles.navArrows}>
            <TouchableOpacity onPress={goPrev} style={[styles.arrowBtn, activeIndex === 0 && { opacity: 0.3 }]}>
              <Ionicons name="chevron-up" size={20} color="#111827" />
            </TouchableOpacity>
            <TouchableOpacity onPress={goNext} style={[styles.arrowBtn, activeIndex === stops.length - 1 && { opacity: 0.3 }]}>
              <Ionicons name="chevron-down" size={20} color="#111827" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 50, paddingBottom: 7, gap: 8 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F2F7', borderRadius: 14, borderWidth: 1, borderColor: '#E5E5EA', paddingHorizontal: 12, height: 42 },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },
  searchBtn: { backgroundColor: '#22C55E', borderRadius: 8, paddingHorizontal: 16, height: 40, alignItems: 'center', justifyContent: 'center' },
  searchBtnText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  mapContainer: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  serviceHubBtn: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: '#22C55E', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 8 },
  serviceHubBtnText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  endTripBtn: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E5E5E7', paddingHorizontal: 10, paddingVertical: 8 },
  endTripBtnText: { color: '#111827', fontSize: 14 },
  dotsRow: { position: 'absolute', bottom: 100, alignSelf: 'center', flexDirection: 'row', gap: 6, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
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
});
