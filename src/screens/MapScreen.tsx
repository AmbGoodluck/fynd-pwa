import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, Image } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

type Props = { navigation: any };

export default function MapScreen({ navigation }: Props) {
  const [searchQuery, setSearchQuery] = useState('');

  const INITIAL_REGION = {
    latitude: 13.106061,
    longitude: -59.613158,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  const MOCK_PLACE = {
    name: 'Metropolitan Museum of Art',
    distance: '14 km',
    time: '16 min remaining',
    image: 'https://images.unsplash.com/photo-1581367687051-9b5dc9ad0c02?w=400',
    coordinate: { latitude: 13.106061, longitude: -59.613158 },
  };

  return (
    <SafeAreaView style={styles.container}>
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
          style={styles.map}
          initialRegion={INITIAL_REGION}
          showsUserLocation={true}
          showsZoomControls={true}
        >
          <Marker coordinate={MOCK_PLACE.coordinate} title={MOCK_PLACE.name} />
        </MapView>

        <TouchableOpacity style={styles.serviceHubBtn} onPress={() => navigation.navigate('ServiceHub')}>
          <Ionicons name="radio" size={15} color="#fff" style={{ marginRight: 4 }} />
          <Text style={styles.serviceHubBtnText}>ServiceHub</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.endTripBtn} onPress={() => navigation.navigate('MainTabs')}>
          <Ionicons name="close-circle-outline" size={15} color="#111827" style={{ marginRight: 4 }} />
          <Text style={styles.endTripBtnText}>End Trip</Text>
        </TouchableOpacity>

        <View style={styles.placeCard}>
          <View style={styles.placeImageBox}>
            <Image source={{ uri: MOCK_PLACE.image }} style={styles.placeImage} />
            <TouchableOpacity style={styles.heartBtn}>
              <Ionicons name="heart-outline" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.placeInfo}>
            <Text style={styles.placeName} numberOfLines={2}>{MOCK_PLACE.name}</Text>
            <View style={styles.placeStats}>
              <Ionicons name="walk-outline" size={14} color="#57636C" />
              <Text style={styles.statText}>{MOCK_PLACE.distance}</Text>
              <Ionicons name="time-outline" size={14} color="#57636C" style={{ marginLeft: 14 }} />
              <Text style={styles.statText}>{MOCK_PLACE.time}</Text>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 7, gap: 8 },
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
  placeCard: { position: 'absolute', bottom: 8, left: 14, right: 14, height: 74, backgroundColor: '#fff', borderRadius: 16, borderWidth: 0.5, borderColor: '#E5E5E7', flexDirection: 'row', overflow: 'hidden' },
  placeImageBox: { width: 74, height: 74 },
  placeImage: { width: 74, height: 74, resizeMode: 'cover' },
  heartBtn: { position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  placeInfo: { flex: 1, padding: 10, justifyContent: 'center' },
  placeName: { fontSize: 15, fontWeight: '500', color: '#111827', marginBottom: 6 },
  placeStats: { flexDirection: 'row', alignItems: 'center' },
  statText: { fontSize: 12, color: '#57636C', marginLeft: 2 },
});
