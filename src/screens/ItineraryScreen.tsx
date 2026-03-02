import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';

const MOCK_STOPS = [
  { id: '1', name: 'Metropolitan Museum of Art', description: 'Famous for world-class arts and history', distance: '14 km', time: '16 min', rating: '4.7', image: 'https://images.unsplash.com/photo-1581367687051-9b5dc9ad0c02?w=400', coordinate: { latitude: 40.7794, longitude: -73.9632 } },
  { id: '2', name: 'Apollo Theater', description: 'Iconic for its Amateur Night and Landmark hiphop and Jazz performance', distance: '14 km', time: '16 min', rating: '4.7', image: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=400', coordinate: { latitude: 40.8099, longitude: -73.9502 } },
  { id: '3', name: 'International Center for Photography', description: 'Showcase cutting-edge exhibitions on contemporary and documentary photos.', distance: '14 km', time: '16 min', rating: '4.7', image: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=400', coordinate: { latitude: 40.7614, longitude: -73.9776 } },
  { id: '4', name: 'Summit One Vanderbilt', description: 'Provides 360-degree view including the nearby Chrysler and Empire State Buildings', distance: '14 km', time: '16 min', rating: '4.7', image: 'https://images.unsplash.com/photo-1499092346589-b9b6be3e94b2?w=400', coordinate: { latitude: 40.7527, longitude: -73.9772 } },
];

type Stop = typeof MOCK_STOPS[number];

type Props = { navigation: any; route?: any };

export default function ItineraryScreen({ navigation, route }: Props) {
  const { user } = useAuthStore();
  const initialStops = route?.params?.stops ?? MOCK_STOPS;
  const destination = route?.params?.destination || 'Your Destination';
  const tripData = route?.params || {};
  const [stops, setStops] = useState(initialStops);
  const [savedPlaces, setSavedPlaces] = useState<string[]>([]);
  const firstName = user?.fullName?.split(' ')[0] || 'U';
  
  console.log('ItineraryScreen - route.params:', JSON.stringify(route?.params));
  console.log('ItineraryScreen - initialStops:', JSON.stringify(initialStops?.length), 'stops');
  console.log('ItineraryScreen - destination:', destination);

  const removePlace = (id: string) => setStops((prev: Stop[]) => prev.filter((s: Stop) => s.id !== id));
  const toggleSave = (id: string) => setSavedPlaces(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const openInMap = () => {
    navigation.navigate('Map', { stops });
  };

  const renderStop = ({ item }: { item: Stop }) => (
    <View style={styles.card}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.image }} style={styles.placeImage} />
        <TouchableOpacity style={styles.heartBtn} onPress={() => toggleSave(item.id)}>
          <Ionicons name={savedPlaces.includes(item.id) ? 'heart' : 'heart-outline'} size={16} color={savedPlaces.includes(item.id) ? '#22C55E' : '#fff'} />
        </TouchableOpacity>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.placeName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.placeDesc} numberOfLines={2}>{item.description}</Text>
        <View style={styles.statsRow}>
          <Ionicons name="walk-outline" size={14} color="#57636C" />
          <Text style={styles.statText}>{item.distance}</Text>
          <Ionicons name="time-outline" size={14} color="#57636C" style={{ marginLeft: 10 }} />
          <Text style={styles.statText}>{item.time}</Text>
          <Ionicons name="star-half" size={14} color="#F59E0B" style={{ marginLeft: 10 }} />
          <Text style={styles.statText}>{item.rating}</Text>
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.outlineBtn}>
            <Text style={styles.outlineBtnText}>Book Now</Text>
            <Ionicons name="chevron-forward" size={13} color="#111827" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.outlineBtn} onPress={() => removePlace(item.id)}>
            <Text style={styles.outlineBtnText}>Remove Place</Text>
            <Ionicons name="trash-outline" size={13} color="#111827" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={32} color="#111827" />
        </TouchableOpacity>
        <Image source={require('../../assets/logo-icon.png')} style={styles.logo} />
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{firstName[0].toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.headerSection}>
        <Text style={styles.title}>Itinerary for {destination}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{stops.length} Stops{tripData.explorationHours ? ', ' + tripData.explorationHours + ' hrs' : ''}</Text>
          <TouchableOpacity style={styles.ignoreBtn}>
            <Text style={styles.ignoreBtnText}>Ignore Itinerary</Text>
            <Ionicons name="trash-outline" size={16} color="#111827" />
          </TouchableOpacity>
        </View>
        <Text style={styles.reviewLabel}>Review Itinerary</Text>
      </View>

      <FlatList
        data={stops}
        keyExtractor={item => item.id}
        renderItem={renderStop}
        contentContainerStyle={{ paddingVertical: 5, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.mapBtn} onPress={openInMap}>
          <Text style={styles.mapBtnText}>Open in Map</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 8 },
  logo: { width: 80, height: 40, resizeMode: 'contain' },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  headerSection: { paddingHorizontal: 20, paddingVertical: 10, borderTopWidth: 0.5, borderBottomWidth: 0.5, borderColor: '#E5E5EA' },
  title: { fontSize: 22, fontWeight: '500', color: '#111827', marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  metaText: { fontSize: 16, color: '#111827', opacity: 0.8 },
  ignoreBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E5E7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, gap: 4 },
  ignoreBtnText: { fontSize: 14, color: '#111827' },
  reviewLabel: { fontSize: 14, fontWeight: '500', color: '#111827', opacity: 0.8 },
  card: { flexDirection: 'row', marginHorizontal: 14, marginVertical: 6, borderRadius: 16, borderWidth: 0.5, borderColor: '#E5E5E7', backgroundColor: '#fff', overflow: 'hidden', height: 144 },
  imageContainer: { width: 116 },
  placeImage: { width: 116, height: 144, resizeMode: 'cover' },
  heartBtn: { position: 'absolute', top: 6, right: 6, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  cardContent: { flex: 1, padding: 10, justifyContent: 'space-between' },
  placeName: { fontSize: 15, fontWeight: '500', color: '#111827' },
  placeDesc: { fontSize: 12, color: '#57636C', lineHeight: 16 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statText: { fontSize: 12, color: '#57636C', marginLeft: 2 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  outlineBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E5E7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, gap: 4 },
  outlineBtnText: { fontSize: 12, color: '#111827' },
  bottomBar: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F2F2F7', alignItems: 'center' },
  mapBtn: { backgroundColor: '#22C55E', borderRadius: 16, height: 44, width: 220, alignItems: 'center', justifyContent: 'center' },
  mapBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
