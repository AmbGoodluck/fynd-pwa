import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Linking, Alert, Modal, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { F } from '../theme/fonts';
import AppHeader from '../components/AppHeader';

// Maps a PlaceResult (from SuggestedPlaces) to the stop shape used in this screen
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
  };
}

type Stop = ReturnType<typeof mapPlaceToStop>;
type Props = { navigation: any; route?: any };

export default function ItineraryScreen({ navigation, route }: Props) {
  // Support both 'places' (from SuggestedPlaces) and legacy 'stops' key
  const rawPlaces = route?.params?.places ?? route?.params?.stops ?? [];
  const destination = route?.params?.destination || 'Your Destination';
  const tripData = route?.params || {};

  const initialStops: Stop[] = rawPlaces.map(mapPlaceToStop);
  const [stops, setStops] = useState<Stop[]>(initialStops);
  const [showMapModal, setShowMapModal] = useState(false);

  const removePlace = (id: string) =>
    setStops(prev => prev.filter(s => s.id !== id));

  const openGoogleMaps = () => {
    if (stops.length === 0) return;

    if (stops.length === 1) {
      const { latitude, longitude } = stops[0].coordinate;
      const url = `https://maps.google.com/maps?q=${latitude},${longitude}`;
      Linking.openURL(url).catch(() =>
        Alert.alert('Error', 'Could not open Google Maps.')
      );
      return;
    }

    const origin = stops[0].coordinate;
    const dest = stops[stops.length - 1].coordinate;
    const waypoints = stops
      .slice(1, -1)
      .map(s => `${s.coordinate.latitude},${s.coordinate.longitude}`)
      .join('|');

    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin.latitude},${origin.longitude}&destination=${dest.latitude},${dest.longitude}`;
    if (waypoints) url += `&waypoints=${encodeURIComponent(waypoints)}`;

    Linking.openURL(url).catch(() =>
      Alert.alert('Error', 'Could not open Google Maps.')
    );
  };

  const openInAppMap = () => {
    setShowMapModal(false);
    navigation.navigate('TripMap', { stops });
  };

  const renderStop = ({ item, index }: { item: Stop; index: number }) => (
    <View style={styles.card}>
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
              <Ionicons name="walk-outline" size={14} color="#57636C" />
              <Text style={styles.statText}>{item.distance}</Text>
            </>
          ) : null}
          {item.time ? (
            <>
              <Ionicons name="time-outline" size={14} color="#57636C" style={{ marginLeft: 8 }} />
              <Text style={styles.statText}>{item.time}</Text>
            </>
          ) : null}
          <Ionicons name="star-half" size={14} color="#F59E0B" style={{ marginLeft: 8 }} />
          <Text style={styles.statText}>{item.rating}</Text>
        </View>
        <TouchableOpacity style={styles.removeBtn} onPress={() => removePlace(item.id)}>
          <Ionicons name="trash-outline" size={13} color="#57636C" />
          <Text style={styles.removeBtnText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="Itinerary" onBack={() => navigation.goBack()} />

      <View style={styles.headerSection}>
        <Text style={styles.title}>Itinerary for {destination}</Text>
        <Text style={styles.metaText}>
          {stops.length} Stop{stops.length !== 1 ? 's' : ''}
          {tripData.explorationHours ? `, ${tripData.explorationHours} hrs` : ''}
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
        <FlatList
          data={stops}
          keyExtractor={item => item.id}
          renderItem={renderStop}
          contentContainerStyle={{ paddingVertical: 5, paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={styles.bottomBar}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  headerSection: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
  title: { fontSize: 20, fontFamily: 'Inter_600SemiBold', color: '#111827', marginBottom: 2 },
  metaText: { fontSize: 14, color: '#6B7280' },
  card: { flexDirection: 'row', marginHorizontal: 14, marginVertical: 6, borderRadius: 18, backgroundColor: '#fff', overflow: 'hidden', height: 136, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  imageContainer: { width: 112 },
  placeImage: { width: 112, height: 136, resizeMode: 'cover' },
  indexBadge: { position: 'absolute', top: 8, left: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center', shadowColor: '#22C55E', shadowOpacity: 0.4, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  indexBadgeText: { color: '#fff', fontSize: 12, fontFamily: 'Inter_700Bold' },
  cardContent: { flex: 1, padding: 12, justifyContent: 'space-between' },
  placeName: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#111827' },
  placeDesc: { fontSize: 12, color: '#6B7280', lineHeight: 17, flex: 1, marginVertical: 4 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  statText: { fontSize: 12, color: '#57636C', marginLeft: 2 },
  removeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  removeBtnText: { fontSize: 12, color: '#9CA3AF' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold', color: '#111827', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#57636C', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  goBackBtn: { backgroundColor: '#22C55E', borderRadius: 16, paddingHorizontal: 40, paddingVertical: 14 },
  goBackBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingVertical: 14, paddingBottom: 28, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F2F2F7' },
  mapBtn: { backgroundColor: '#22C55E', borderRadius: 16, height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#22C55E', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  mapBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E5EA', alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: '#57636C', marginBottom: 20 },
  modalOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
  modalOptionIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  modalOptionText: { flex: 1 },
  modalOptionLabel: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 2 },
  modalOptionDesc: { fontSize: 13, color: '#57636C' },
  modalCancel: { marginTop: 16, height: 48, borderRadius: 14, borderWidth: 1, borderColor: '#E5E5EA', alignItems: 'center', justifyContent: 'center' },
  modalCancelText: { fontSize: 15, color: '#57636C', fontWeight: '500' },
});
