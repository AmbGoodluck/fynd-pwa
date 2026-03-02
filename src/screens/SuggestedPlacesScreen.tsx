import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import { checkSavedPlacesLimit, checkPlacesPerTripLimit, savePlace } from '../services/database';
import UpgradeGate from '../components/UpgradeGate';

type Props = { navigation: any; route: any };

export default function SuggestedPlacesScreen({ navigation, route }: Props) {
  const { user } = useAuthStore();
  const sourcePlaces = route?.params?.places ?? MOCK_PLACES;
  const params = route?.params || {};
  const places = params.places || [];
  const tripId = params.tripId || null;
  const destination = params.destination || '';
  const tripVibes = params.vibes || [];
  const explorationHours = params.explorationHours || 3;
  const timeOfDay = params.timeOfDay || 'morning';

  const [searchQuery, setSearchQuery] = useState('');
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [selectedForItinerary, setSelectedForItinerary] = useState<any[]>([]);
  const [showGate, setShowGate] = useState(false);
  const [gateMessage, setGateMessage] = useState('');

  const filtered = places.filter((p: any) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = async (place: any) => {
    if (!user?.id) return;
    if (savedIds.includes(place.placeId)) {
      setSavedIds(prev => prev.filter(id => id !== place.placeId));
      return;
    }
    const check = await checkSavedPlacesLimit(user.id);
    if (!check.allowed) {
      setGateMessage(check.reason || '');
      setShowGate(true);
      return;
    }
    try {
      await savePlace(user.id, {
        placeId: place.placeId,
        placeName: place.name,
        shortDescription: place.description,
        imageUrl: place.photoUrl,
        latitude: place.coordinates?.lat || 0,
        longitude: place.coordinates?.lng || 0,
        rating: place.rating,
        city: destination,
      });
      setSavedIds(prev => [...prev, place.placeId]);
    } catch (e) {
      console.error('Save place error:', e);
    }
  };

  const handleAddToItinerary = async (place: any) => {
    if (!user?.id) return;
    const isSelected = selectedForItinerary.find(p => p.placeId === place.placeId);
    if (isSelected) {
      setSelectedForItinerary(prev => prev.filter(p => p.placeId !== place.placeId));
      return;
    }
    const check = await checkPlacesPerTripLimit(user.id, selectedForItinerary.length);
    if (!check.allowed) {
      setGateMessage(check.reason || '');
      setShowGate(true);
      return;
    }
    setSelectedForItinerary(prev => [...prev, place]);
  };

  const handleGenerateItinerary = () => {
    if (selectedForItinerary.length === 0) return;
    navigation.navigate('Itinerary', {
      places: selectedForItinerary,
      tripId,
      destination,
      vibes: tripVibes,
      explorationHours,
      timeOfDay,
    });
  };

  const renderPlace = ({ item }: { item: any }) => {
    const isSaved = savedIds.includes(item.placeId);
    const isSelected = !!selectedForItinerary.find(p => p.placeId === item.placeId);
    return (
      <View style={styles.card}>
        <Image
          source={{ uri: item.photoUrl || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400' }}
          style={styles.cardImage}
        />
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
            <TouchableOpacity onPress={() => handleSave(item)}>
              <Ionicons name={isSaved ? 'heart' : 'heart-outline'} size={22} color={isSaved ? '#EF4444' : '#8E8E93'} />
            </TouchableOpacity>
          </View>
          <Text style={styles.cardDesc} numberOfLines={2}>{item.description || item.category || 'A great place to visit'}</Text>
          <View style={styles.cardMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="star" size={14} color="#F59E0B" />
              <Text style={styles.metaText}>{item.rating?.toFixed(1) || '4.0'}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={14} color="#57636C" />
              <Text style={styles.metaText} numberOfLines={1}>{item.address?.split(',')[0] || destination}</Text>
            </View>
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.bookBtn}>
              <Text style={styles.bookBtnText}>Book Now</Text>
              <Ionicons name="chevron-forward" size={14} color="#22C55E" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addBtn, isSelected && styles.addBtnSelected]}
              onPress={() => handleAddToItinerary(item)}
            >
              <Text style={[styles.addBtnText, isSelected && styles.addBtnTextSelected]}>
                {isSelected ? ' Added' : '+ Itinerary'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Suggested Places</Text>
        <View style={{ width: 28 }} />
      </View>

      {destination ? <Text style={styles.destinationTag}> {destination}</Text> : null}

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color="#8E8E93" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search places..."
          placeholderTextColor="#8E8E93"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {!user?.isPremium && (
        <View style={styles.freeBar}>
          <Ionicons name="information-circle-outline" size={16} color="#F59E0B" />
          <Text style={styles.freeBarText}>Free: {selectedForItinerary.length}/5 places  {savedIds.length}/5 saves</Text>
        </View>
      )}

      {filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="search" size={60} color="#E5E5EA" />
          <Text style={styles.emptyTitle}>No places found</Text>
          <Text style={styles.emptySubtitle}>Try different vibes or go back to adjust your trip</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.placeId}
          renderItem={renderPlace}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {selectedForItinerary.length > 0 && (
        <View style={styles.ctaBar}>
          <TouchableOpacity style={styles.ctaBtn} onPress={handleGenerateItinerary}>
            <Ionicons name="map-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.ctaBtnText}>Generate Itinerary ({selectedForItinerary.length})</Text>
          </TouchableOpacity>
        </View>
      )}

      <UpgradeGate
        visible={showGate}
        message={gateMessage}
        onUpgrade={() => { setShowGate(false); navigation.navigate('Subscription'); }}
        onDismiss={() => setShowGate(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 14, paddingBottom: 8 },
  topBarTitle: { fontSize: 17, fontWeight: '600', color: '#111827' },
  destinationTag: { fontSize: 13, color: '#57636C', paddingHorizontal: 14, marginBottom: 6 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F2F7', borderRadius: 14, marginHorizontal: 14, paddingHorizontal: 12, height: 44, marginBottom: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#111827' },
  freeBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', borderRadius: 10, marginHorizontal: 14, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8, gap: 6 },
  freeBarText: { fontSize: 13, color: '#92400E', fontWeight: '500' },
  list: { paddingHorizontal: 14, paddingBottom: 100 },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F2F2F7', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2, overflow: 'hidden' },
  cardImage: { width: 110, height: 130 },
  cardBody: { flex: 1, padding: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  cardName: { fontSize: 14, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
  cardDesc: { fontSize: 12, color: '#57636C', lineHeight: 18, marginBottom: 6 },
  cardMeta: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 12, color: '#57636C', maxWidth: 100 },
  cardActions: { flexDirection: 'row', gap: 8 },
  bookBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#22C55E' },
  bookBtnText: { fontSize: 12, color: '#22C55E', fontWeight: '500', marginRight: 2 },
  addBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6, borderRadius: 10, backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#22C55E' },
  addBtnSelected: { backgroundColor: '#22C55E' },
  addBtnText: { fontSize: 12, color: '#22C55E', fontWeight: '600' },
  addBtnTextSelected: { color: '#fff' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#57636C', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  backBtn: { backgroundColor: '#22C55E', borderRadius: 16, paddingHorizontal: 40, paddingVertical: 14 },
  backBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  ctaBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F2F2F7' },
  ctaBtn: { backgroundColor: '#22C55E', borderRadius: 16, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  ctaBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
