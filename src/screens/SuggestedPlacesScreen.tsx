import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, TextInput, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';

const MOCK_PLACES = [
  { id: '1', name: 'Metropolitan Museum of Art', description: 'Famous for world-class arts and history', distance: '14 km', time: '16 min', rating: '4.7', image: 'https://images.unsplash.com/photo-1581367687051-9b5dc9ad0c02?w=400' },
  { id: '2', name: 'Apollo Theater', description: 'Iconic for its Amateur Night and Landmark hiphop and Jazz performance', distance: '14 km', time: '16 min', rating: '4.7', image: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=400' },
  { id: '3', name: 'International Center for Photography', description: 'Showcase cutting-edge exhibitions on contemporaty and documentary photos.', distance: '14 km', time: '16 min', rating: '4.7', image: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=400' },
  { id: '4', name: 'Summit One Vanderbilt', description: 'Provides 360-degree view including the nearby Chrysler and Empire State Buildings', distance: '14 km', time: '16 min', rating: '4.7', image: 'https://images.unsplash.com/photo-1499092346589-b9b6be3e94b2?w=400' },
  { id: '5', name: 'The High Line', description: 'Elevated linear park built on a historic freight rail line on Manhattans west side.', distance: '9 km', time: '12 min', rating: '4.8', image: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=400' },
  { id: '6', name: 'Central Park', description: 'An urban oasis spanning 843 acres in the heart of Manhattan.', distance: '5 km', time: '8 min', rating: '4.9', image: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=400' },
  { id: '7', name: 'Brooklyn Bridge', description: 'Iconic suspension bridge connecting Manhattan and Brooklyn.', distance: '18 km', time: '22 min', rating: '4.8', image: 'https://images.unsplash.com/photo-1499092346589-b9b6be3e94b2?w=400' },
  { id: '8', name: 'Times Square', description: 'The commercial heart of Midtown Manhattan known for its bright lights.', distance: '3 km', time: '5 min', rating: '4.5', image: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=400' },
];

type Props = { navigation: any };

export default function SuggestedPlacesScreen({ navigation }: Props) {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [savedPlaces, setSavedPlaces] = useState<string[]>([]);
  const [addedToItinerary, setAddedToItinerary] = useState<string[]>([]);

  const firstName = user?.fullName?.split(' ')[0] || 'U';

  const filteredPlaces = MOCK_PLACES.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSave = (id: string) => {
    setSavedPlaces(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleItinerary = (id: string) => {
    setAddedToItinerary(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const renderItem = ({ item }: { item: typeof MOCK_PLACES[0] }) => (
    <View style={styles.card}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.image }} style={styles.placeImage} />
        <TouchableOpacity style={styles.heartBtn} onPress={() => toggleSave(item.id)}>
          <Ionicons name={savedPlaces.includes(item.id) ? 'heart' : 'heart-outline'} size={18} color={savedPlaces.includes(item.id) ? '#22C55E' : '#fff'} />
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
          <Ionicons name="star" size={14} color="#F59E0B" style={{ marginLeft: 10 }} />
          <Text style={styles.statText}>{item.rating}</Text>
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.bookBtn}>
            <Text style={styles.bookBtnText}>Book Now</Text>
            <Ionicons name="chevron-forward" size={14} color="#111827" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.itineraryBtn, addedToItinerary.includes(item.id) && styles.itineraryBtnAdded]}
            onPress={() => toggleItinerary(item.id)}
          >
            <Text style={styles.itineraryBtnText}>{addedToItinerary.includes(item.id) ? 'Added' : 'Add to Itinerary'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={32} color="#111827" />
        </TouchableOpacity>
        <Image source={require('../../assets/logo-icon.png')} style={styles.logo} />
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{firstName[0].toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>Suggested Places</Text>
        <Text style={styles.subtitle}>Search for places you would like to add to your trip</Text>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color="#8E8E93" style={{ marginRight: 6 }} />
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
      </View>

      <FlatList
        data={filteredPlaces}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingVertical: 4, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      />

      {addedToItinerary.length > 0 && (
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.generateBtn} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.generateBtnText}>Generate Itinerary ({addedToItinerary.length})</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 8 },
  logo: { width: 80, height: 40, resizeMode: 'contain' },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  header: { paddingHorizontal: 20, paddingBottom: 10 },
  title: { fontSize: 20, fontWeight: '600', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 12, color: '#8E8E93', marginBottom: 10 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F2F7', borderRadius: 14, borderWidth: 1, borderColor: '#E5E5EA', paddingHorizontal: 12, height: 42 },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },
  searchBtn: { backgroundColor: '#22C55E', borderRadius: 8, paddingHorizontal: 16, height: 42, alignItems: 'center', justifyContent: 'center' },
  searchBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  card: { flexDirection: 'row', marginHorizontal: 14, marginVertical: 6, borderRadius: 16, borderWidth: 0.5, borderColor: '#E5E5E7', backgroundColor: '#fff', overflow: 'hidden' },
  imageContainer: { width: 116, height: 144 },
  placeImage: { width: 116, height: 144, resizeMode: 'cover' },
  heartBtn: { position: 'absolute', top: 6, right: 6, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  cardContent: { flex: 1, padding: 10, justifyContent: 'space-between' },
  placeName: { fontSize: 15, fontWeight: '500', color: '#111827', marginBottom: 4 },
  placeDesc: { fontSize: 12, color: '#57636C', marginBottom: 6, lineHeight: 16 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  statText: { fontSize: 12, color: '#57636C', marginLeft: 2 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bookBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E5E7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  bookBtnText: { fontSize: 13, color: '#111827', marginRight: 2 },
  itineraryBtn: { flex: 1, backgroundColor: '#22C55E', borderRadius: 8, paddingVertical: 6, alignItems: 'center' },
  itineraryBtnAdded: { backgroundColor: '#16A34A' },
  itineraryBtnText: { fontSize: 13, color: '#fff', fontWeight: '500' },
  bottomBar: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F2F2F7' },
  generateBtn: { backgroundColor: '#22C55E', borderRadius: 16, height: 48, alignItems: 'center', justifyContent: 'center' },
  generateBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
