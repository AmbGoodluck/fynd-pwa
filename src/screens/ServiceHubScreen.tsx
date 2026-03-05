import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, ActivityIndicator, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import { checkServiceHubAccess } from '../services/database';
import UpgradeGate from '../components/UpgradeGate';
import * as Location from 'expo-location';
import * as Sentry from '@sentry/react-native';
import { searchNearby, PlaceResult, getPhotoUrl } from '../services/googlePlacesService';
import { enhancePlaceDescription } from '../services/openaiService';

const CATEGORIES = [
  { id: 'Medical', label: 'Medical', icon: 'medkit', color: '#E90909' },
  { id: 'Currency Exchange', label: 'Currency Exchange', icon: 'cash', color: '#2A0BBF' },
  { id: 'Public Bathrooms', label: 'Public Bathrooms', icon: 'people', color: '#047433' },
  { id: 'Transport', label: 'Transport', icon: 'car', color: '#047433' },
];

const MOCK_RESULTS: Record<string, any[]> = {
  Medical: [
    { id: '1', name: 'Hillside Clinic', category: 'Medical', time: '2 min', image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400' },
    { id: '2', name: 'Bayview Hospital', category: 'Medical', time: '13 min', image: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=400' },
    { id: '3', name: 'Amadu Pharmaceuticals', category: 'Medical', time: '26 min', image: 'https://images.unsplash.com/photo-1563213126-a4273aed2016?w=400' },
  ],
  'Currency Exchange': [
    { id: '4', name: 'City Forex', category: 'Currency Exchange', time: '5 min', image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400' },
    { id: '5', name: 'Global Exchange', category: 'Currency Exchange', time: '10 min', image: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=400' },
  ],
  'Public Bathrooms': [
    { id: '6', name: 'Central Park Restroom', category: 'Public Bathrooms', time: '3 min', image: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=400' },
  ],
  Transport: [
    { id: '7', name: 'Central Bus Station', category: 'Transport', time: '8 min', image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400' },
    { id: '8', name: 'Metro Station', category: 'Transport', time: '4 min', image: 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=400' },
  ],
};

type Props = { navigation: any };

export default function ServiceHubScreen({ navigation }: Props) {
  const { user } = useAuthStore();
  const [selectedCategory, setSelectedCategory] = useState('Medical');
  const [showGate, setShowGate] = useState(false);
  const [gateMessage, setGateMessage] = useState('');
  const [accessChecked, setAccessChecked] = useState(false);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    checkAccess();
    // fetch default category on mount
    (async () => { await fetchNearbyForCategory(selectedCategory); })();
  }, []);

  const checkAccess = async () => {
    if (!user?.id) return;
    const result = await checkServiceHubAccess(user.id);
    if (!result.allowed) {
      setGateMessage(result.reason || '');
      setShowGate(true);
    }
    setAccessChecked(true);
  };

  const getCurrentLocation = async (): Promise<{ lat: number; lng: number } | null> => {
    try {
      const existing = await Location.getForegroundPermissionsAsync();
      if (existing.status === 'denied' && !existing.canAskAgain) {
        Alert.alert(
          'Location Required',
          'Service Hub needs your location to find nearby services. Enable it in Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return null;
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;
      const loc = await Location.getCurrentPositionAsync({});
      return { lat: loc.coords.latitude, lng: loc.coords.longitude };
    } catch (e) {
      Sentry.captureException(e, { tags: { context: 'ServiceHubScreen.getCurrentLocation' } });
      console.error('Location error:', e);
      return null;
    }
  };

  const calcDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const fetchNearbyForCategory = async (category: string) => {
    setLoadingResults(true);
    try {
      const loc = await getCurrentLocation();
      if (!loc) {
        setResults([]);
        setLoadingResults(false);
        return;
      }
      setUserLocation(loc);
      const places = await searchNearby(loc.lat, loc.lng, category);
      // compute distance, sort
      const withDistance = places.map(p => ({
        ...p,
        distanceKm: calcDistanceKm(loc.lat, loc.lng, p.coordinates.lat, p.coordinates.lng),
      }));
      withDistance.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));

      // enhance descriptions for the first few places (async, best-effort)
      const toEnhance = withDistance.slice(0, 4);
      await Promise.all(toEnhance.map(async p => {
        try {
          const desc = await enhancePlaceDescription(p.name, [category], p.city || '');
          p.description = desc;
        } catch (e) {
          // ignore
        }
      }));

      setResults(withDistance);
    } catch (e) {
      console.error('ServiceHub fetch error:', e);
      setResults([]);
    } finally {
      setLoadingResults(false);
    }
  };

  // switch categories and re-fetch nearby results
  const onSelectCategory = async (catId: string) => {
    setSelectedCategory(catId);
    await fetchNearbyForCategory(catId);
  };

  const renderItem = ({ item }: { item: PlaceResult | any }) => (
    <View style={styles.card}>
      <Image source={{ uri: (item.photoUrl || item.image || getPhotoUrl(item.photoRef)) }} style={styles.cardImage} />
      <View style={styles.cardBody}>
        <Text style={styles.cardName}>{item.name}</Text>
        <View style={styles.cardMeta}>
          <Ionicons name="walk-outline" size={14} color="#57636C" />
          <Text style={styles.cardTime}>{item.distanceKm ? `${item.distanceKm.toFixed(2)} km` : (item.time || '')}</Text>
        </View>
        {item.description ? <Text style={{ color: '#57636C', fontSize: 12, marginTop: 4 }}>{item.description}</Text> : null}
        <View style={styles.cardTag}>
          <Text style={styles.cardTagText}>{item.category}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.routeBtn} onPress={() => navigation.navigate('Map', { stops: results.map(r => ({ id: r.placeId, name: r.name, distance: `${(r.distanceKm||0).toFixed(2)} km`, time: '', image: r.photoUrl, coordinate: { latitude: r.coordinates.lat, longitude: r.coordinates.lng } })) })}>
        <Text style={styles.routeBtnText}>Route</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <Image source={require('../../assets/logo-icon.png')} style={styles.logo} />
        <Text style={styles.topBarTitle}>ServiceHub</Text>
        <View style={{ width: 55 }} />
      </View>

      <Text style={styles.subtitle}>Select a service to view close by locations</Text>

      <View style={styles.categoryRow}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.catCard, selectedCategory === cat.id && styles.catCardActive]}
            onPress={() => onSelectCategory(cat.id)}
          >
            <Ionicons name={cat.icon as any} size={26} color={selectedCategory === cat.id ? '#22C55E' : cat.color} />
            <Text style={[styles.catLabel, selectedCategory === cat.id && styles.catLabelActive]}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loadingResults ? (
        <View style={{ padding: 30 }}>
          <ActivityIndicator color="#22C55E" />
        </View>
      ) : results.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="search" size={50} color="#E5E5EA" />
          <Text style={styles.emptyText}>Sorry, the service you selected is not available in your current location.</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={item => item.placeId}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <UpgradeGate
        visible={showGate}
        message={gateMessage}
        onUpgrade={() => { setShowGate(false); navigation.navigate('Subscription'); }}
        onDismiss={() => { setShowGate(false); /* stay on screen instead of backing up; this is a tab */ }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 14, paddingBottom: 8 },
  logo: { width: 55, height: 50, resizeMode: 'contain' },
  topBarTitle: { fontSize: 20, fontWeight: '600', color: '#111827' },
  subtitle: { fontSize: 14, color: '#57636C', paddingHorizontal: 14, marginBottom: 12 },
  categoryRow: { flexDirection: 'row', paddingHorizontal: 8, marginBottom: 8 },
  catCard: { flex: 1, margin: 4, height: 80, borderRadius: 16, borderWidth: 1, borderColor: '#E5E5EA', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  catCardActive: { borderColor: '#22C55E', backgroundColor: '#F0FDF4' },
  catLabel: { fontSize: 11, textAlign: 'center', marginTop: 4, color: '#57636C' },
  catLabelActive: { color: '#22C55E', fontWeight: '600' },
  list: { paddingHorizontal: 14, paddingBottom: 20 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#F2F2F7', padding: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  cardImage: { width: 60, height: 60, borderRadius: 12, marginRight: 12 },
  cardBody: { flex: 1 },
  cardName: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 4 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  cardTime: { fontSize: 12, color: '#57636C' },
  cardTag: { alignSelf: 'flex-start', backgroundColor: '#F0FDF4', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  cardTagText: { fontSize: 11, color: '#22C55E', fontWeight: '500' },
  routeBtn: { backgroundColor: '#22C55E', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  routeBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyText: { fontSize: 14, color: '#57636C', textAlign: 'center', marginTop: 16, lineHeight: 22 },
});
