import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { F } from '../theme/fonts';
import AppHeader from '../components/AppHeader';

type Props = { navigation: any; route: any };

export default function SuggestedPlacesScreen({ navigation, route }: Props) {
  const params = route?.params || {};
  const places: any[] = params.places || [];
  const tripId = params.tripId || null;
  const destination = params.destination || '';
  const tripVibes = params.vibes || [];
  const explorationHours = params.explorationHours || 3;
  const timeOfDay = params.timeOfDay || 'morning';

  const [selectedForItinerary, setSelectedForItinerary] = useState<any[]>([]);

  const handleAddToItinerary = (place: any) => {
    const isSelected = selectedForItinerary.find(p => p.placeId === place.placeId);
    if (isSelected) {
      setSelectedForItinerary(prev => prev.filter(p => p.placeId !== place.placeId));
    } else {
      setSelectedForItinerary(prev => [...prev, place]);
    }
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
    const isSelected = !!selectedForItinerary.find(p => p.placeId === item.placeId);
    return (
      <View style={styles.card}>
        <Image
          source={{ uri: item.photoUrl || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400' }}
          style={styles.cardImage}
        />
        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.cardDesc} numberOfLines={2}>
            {item.description || item.category || 'A great place to visit'}
          </Text>
          <View style={styles.cardMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="star" size={13} color="#F59E0B" />
              <Text style={styles.metaText}>{item.rating?.toFixed(1) || '4.0'}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={13} color="#57636C" />
              <Text style={styles.metaText} numberOfLines={1}>
                {item.address?.split(',')[0] || destination}
              </Text>
            </View>
            {item.distanceKm ? (
              <View style={styles.metaItem}>
                <Ionicons name="walk-outline" size={13} color="#57636C" />
                <Text style={styles.metaText}>{item.distanceKm} km</Text>
              </View>
            ) : null}
          </View>
          <TouchableOpacity
            style={[styles.addBtn, isSelected && styles.addBtnSelected]}
            onPress={() => handleAddToItinerary(item)}
          >
            <Text style={[styles.addBtnText, isSelected && styles.addBtnTextSelected]}>
              {isSelected ? '\u2713 Added' : '+ Add to Itinerary'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="Suggested Places" onBack={() => navigation.goBack()} />

      {destination ? (
        <View style={styles.destRow}>
          <Ionicons name="location" size={13} color="#22C55E" />
          <Text style={styles.destinationTag}>{destination}</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{places.length} places</Text>
          </View>
        </View>
      ) : null}

      {places.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="search" size={60} color="#E5E5EA" />
          <Text style={styles.emptyTitle}>No places found</Text>
          <Text style={styles.emptySubtitle}>Try different vibes or adjust your trip preferences</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={places}
          keyExtractor={item => item.placeId}
          renderItem={renderPlace}
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {selectedForItinerary.length > 0 && (
        <View style={styles.ctaBar}>
          <TouchableOpacity style={styles.ctaBtn} onPress={handleGenerateItinerary}>
            <Ionicons name="map-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.ctaBtnText}>
              Build Itinerary ({selectedForItinerary.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  destRow: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
  destinationTag: { fontSize: 13, color: '#374151', fontWeight: '500', flex: 1 },
  countBadge: { backgroundColor: '#F0FDF4', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: '#BBF7D0' },
  countBadgeText: { fontSize: 12, color: '#22C55E', fontWeight: '600' },
  list: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 120 },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 18, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3, overflow: 'hidden' },
  cardImage: { width: 115, height: 148 },
  cardBody: { flex: 1, padding: 12, justifyContent: 'space-between' },
  cardName: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#111827', marginBottom: 3 },
  cardDesc: { fontSize: 12, color: '#6B7280', lineHeight: 18, marginBottom: 6, flex: 1 },
  cardMeta: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 12, color: '#57636C', maxWidth: 90 },
  addBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 12, backgroundColor: '#F0FDF4', borderWidth: 1.5, borderColor: '#22C55E' },
  addBtnSelected: { backgroundColor: '#22C55E' },
  addBtnText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#22C55E' },
  addBtnTextSelected: { color: '#fff' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold', color: '#111827', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#57636C', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  backBtn: { backgroundColor: '#22C55E', borderRadius: 16, paddingHorizontal: 40, paddingVertical: 14 },
  backBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  ctaBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingVertical: 14, paddingBottom: 28, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F2F2F7' },
  ctaBtn: { backgroundColor: '#22C55E', borderRadius: 16, height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#22C55E', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  ctaBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_700Bold' },
});
