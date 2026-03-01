import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, Image, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';

const MOCK_SAVED_PLACES = [
  { id: '1', name: 'Downtown', city: 'Johannesburg', image: 'https://images.unsplash.com/photo-1577948000111-9c970dfe3743?w=400' },
  { id: '2', name: 'DownTown', city: 'Freetown', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400' },
  { id: '3', name: 'Sydney', city: 'Australia', image: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=400' },
  { id: '4', name: 'SoHo', city: 'London', image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400' },
  { id: '5', name: 'Empire State Building', city: 'New York', image: 'https://images.unsplash.com/photo-1499092346589-b9b6be3e94b2?w=400' },
];

const MOCK_SAVED_ITINERARIES = [
  { id: '1', name: 'Johannesburg', month: 'May, 2025', image: 'https://images.unsplash.com/photo-1577948000111-9c970dfe3743?w=400' },
  { id: '2', name: 'Freetown', month: 'July, 2025', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400' },
  { id: '3', name: 'Sydney', month: 'September 2024', image: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=400' },
  { id: '4', name: 'London', month: 'June, 2024', image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400' },
  { id: '5', name: 'New York', month: 'April, 2024', image: 'https://images.unsplash.com/photo-1499092346589-b9b6be3e94b2?w=400' },
];

type Props = { navigation: any };

export default function SavedScreen({ navigation }: Props) {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'Places' | 'Itineraries'>('Places');
  const [searchQuery, setSearchQuery] = useState('');
  const [savedPlaces, setSavedPlaces] = useState(MOCK_SAVED_PLACES);
  const firstName = user?.fullName?.split(' ')[0] || 'U';

  const filteredPlaces = savedPlaces.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredItineraries = MOCK_SAVED_ITINERARIES.filter(i =>
    i.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const deletePlace = (id: string) => {
    setSavedPlaces(prev => prev.filter(p => p.id !== id));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={32} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Fynd</Text>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{firstName[0].toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>Saved Items</Text>
        <Text style={styles.subtitle}>Switch between saved places and past Itineraries.</Text>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Places' && styles.tabActive]}
          onPress={() => { setActiveTab('Places'); setSearchQuery(''); }}
        >
          <Text style={[styles.tabText, activeTab === 'Places' && styles.tabTextActive]}>Places</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Itineraries' && styles.tabActive]}
          onPress={() => { setActiveTab('Itineraries'); setSearchQuery(''); }}
        >
          <Text style={[styles.tabText, activeTab === 'Itineraries' && styles.tabTextActive]}>Itineraries</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#8E8E93" style={{ marginRight: 6 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={activeTab === 'Places' ? 'Search saved places' : 'Search past Itinerary'}
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.searchBtn}>
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'Places' ? (
        <FlatList
          data={filteredPlaces}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Image source={{ uri: item.image }} style={styles.cardImage} />
              <View style={styles.cardContent}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardCity}>{item.city}</Text>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.addBtn}>
                  <Text style={styles.addBtnText}>Add to Itine...</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deletePlace(item.id)} style={styles.deleteBtn}>
                  <Ionicons name="trash" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={filteredItineraries}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Image source={{ uri: item.image }} style={styles.cardImage} />
              <View style={styles.cardContent}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardCity}>{item.month}</Text>
              </View>
              <TouchableOpacity style={styles.viewBtn} onPress={() => navigation.navigate('Itinerary')}>
                <Text style={styles.viewBtnText}>View</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 8 },
  topBarTitle: { fontSize: 25, fontWeight: '500', color: '#111827' },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  header: { paddingHorizontal: 14, paddingBottom: 10 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#57636C' },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E5EA', marginHorizontal: 14, marginBottom: 12 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#22C55E' },
  tabText: { fontSize: 15, color: '#8E8E93', fontWeight: '500' },
  tabTextActive: { color: '#111827', fontWeight: '600' },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, marginBottom: 10, gap: 8 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F2F7', borderRadius: 14, borderWidth: 1, borderColor: '#E5E5EA', paddingHorizontal: 12, height: 42 },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },
  searchBtn: { backgroundColor: '#22C55E', borderRadius: 8, paddingHorizontal: 16, height: 42, alignItems: 'center', justifyContent: 'center' },
  searchBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  card: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 14, marginVertical: 5, borderRadius: 12, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2, padding: 8 },
  cardImage: { width: 70, height: 70, borderRadius: 10, resizeMode: 'cover' },
  cardContent: { flex: 1, paddingLeft: 10 },
  cardName: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
  cardCity: { fontSize: 13, color: '#57636C' },
  cardActions: { alignItems: 'flex-end', gap: 8 },
  addBtn: { backgroundColor: '#22C55E', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  deleteBtn: { padding: 4 },
  viewBtn: { backgroundColor: '#22C55E', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  viewBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
