import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Image, ActivityIndicator, Alert, Linking, Platform, ScrollView,
  Modal, TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Sentry from '../services/sentry';
import { searchNearby, PlaceResult, getPhotoUrl } from '../services/googlePlacesService';
import { useGuestStore } from '../store/useGuestStore';

const CATEGORIES = [
  { id: 'Medical',           label: 'Medical',        icon: 'medkit',              color: '#EF4444' },
  { id: 'Currency Exchange', label: 'Currency',        icon: 'cash',                color: '#2A0BBF' },
  { id: 'Public Bathrooms',  label: 'Bathrooms',       icon: 'water',               color: '#047433' },
  { id: 'Transport',         label: 'Transport',       icon: 'car',                 color: '#047433' },
  { id: 'Police',            label: 'Police',          icon: 'shield',              color: '#1D3557' },
  { id: 'Embassy',           label: 'Embassy',         icon: 'flag',                color: '#7C3AED' },
  { id: 'ATM',               label: 'ATM / Bank',      icon: 'card',                color: '#B45309' },
  { id: 'Pharmacy',          label: 'Pharmacy',        icon: 'medical',             color: '#10B981' },
  { id: 'Hotel',             label: 'Hotel',           icon: 'bed',                 color: '#F59E0B' },
  { id: 'Tourist Info',      label: 'Tourist Info',    icon: 'information-circle',  color: '#06B6D4' },
];

type Props = { navigation: any; route?: any };

export default function ServiceHubScreen({ navigation, route }: Props) {
  const initialCategory = route?.params?.initialCategory || CATEGORIES[0].id;
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const { isGuest } = useGuestStore();

  useEffect(() => {
    if (isGuest) {
      setShowGuestModal(true);
      return;
    }
    fetchNearbyForCategory(selectedCategory);
  }, []);

  // If navigated with a specific category from HomeScreen
  useEffect(() => {
    if (route?.params?.initialCategory) {
      setSelectedCategory(route.params.initialCategory);
      fetchNearbyForCategory(route.params.initialCategory);
    }
  }, [route?.params?.initialCategory]);

  const getCurrentLocation = async (): Promise<{ lat: number; lng: number } | null> => {
    try {
      if (Platform.OS === 'web') {
        if (!navigator.geolocation) {
          Alert.alert('Not Supported', 'Geolocation is not supported by your browser.');
          return null;
        }
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false, timeout: 15000, maximumAge: 60000,
          })
        );
        return { lat: pos.coords.latitude, lng: pos.coords.longitude };
      }
      const existing = await Location.getForegroundPermissionsAsync();
      if (existing.status === 'denied' && !existing.canAskAgain) {
        Alert.alert('Location Required', 'Enable location in Settings to find nearby services.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => { if (Platform.OS !== 'web') Linking.openSettings(); } },
        ]);
        return null;
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;
      const loc = await Location.getCurrentPositionAsync({});
      return { lat: loc.coords.latitude, lng: loc.coords.longitude };
    } catch (e: any) {
      if (Platform.OS === 'web' && e?.code === 1) {
        Alert.alert('Location Blocked', 'Allow location access in your browser settings and reload.');
      }
      Sentry.captureException(e, { tags: { context: 'ServiceHubScreen.getLocation' } });
      return null;
    }
  };

  const calcDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const fetchNearbyForCategory = async (category: string) => {
    setLoadingResults(true);
    setResults([]);
    try {
      const loc = await getCurrentLocation();
      if (!loc) { setLoadingResults(false); return; }
      setUserLocation(loc);
      const places = await searchNearby(loc.lat, loc.lng, category);
      const withDist = places
        .map(p => ({ ...p, distanceKm: calcDistanceKm(loc.lat, loc.lng, p.coordinates.lat, p.coordinates.lng) }))
        .sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
      setResults(withDist);
    } catch (e) {
      console.error('ServiceHub fetch error:', e);
      setResults([]);
    } finally {
      setLoadingResults(false);
    }
  };

  const onSelectCategory = (catId: string) => {
    setSelectedCategory(catId);
    fetchNearbyForCategory(catId);
  };

  const openRoute = (item: PlaceResult) => {
    const stops = [{
      id: item.placeId,
      name: item.name,
      distance: `${(item.distanceKm || 0).toFixed(2)} km`,
      time: '',
      image: item.photoUrl,
      coordinate: { latitude: item.coordinates.lat, longitude: item.coordinates.lng },
    }];
    navigation.navigate('TripMap', { stops });
  };

  const renderItem = ({ item }: { item: PlaceResult }) => (
    <View style={styles.card}>
      <Image
        source={{ uri: item.photoUrl || getPhotoUrl(item.photoRef) }}
        style={styles.cardImage}
      />
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.cardMeta}>
          <Ionicons name="walk-outline" size={13} color="#57636C" />
          <Text style={styles.cardDistance}>
            {item.distanceKm != null ? `${item.distanceKm.toFixed(2)} km` : '—'}
          </Text>
          {item.rating > 0 ? (
            <>
              <Ionicons name="star" size={12} color="#F59E0B" style={{ marginLeft: 8 }} />
              <Text style={styles.cardDistance}>{item.rating.toFixed(1)}</Text>
            </>
          ) : null}
        </View>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>{item.category}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.routeBtn} onPress={() => openRoute(item)}>
        <Text style={styles.routeBtnText}>Route</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header: back (left) | title (center) | logo (right) */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={26} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>ServiceHub</Text>
        <Image source={require('../../assets/logo-icon.png')} style={styles.logo} />
      </View>

      <Text style={styles.subtitle}>Find essential services near your current location</Text>

      {/* Category grid — 5 per row, 2 rows */}
      <View style={styles.categoryGrid}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.catCard, selectedCategory === cat.id && styles.catCardActive]}
            onPress={() => onSelectCategory(cat.id)}
          >
            <Ionicons
              name={cat.icon as any}
              size={22}
              color={selectedCategory === cat.id ? '#22C55E' : cat.color}
            />
            <Text style={[styles.catLabel, selectedCategory === cat.id && styles.catLabelActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Results */}
      {loadingResults ? (
        <ScrollView contentContainerStyle={styles.loadingWrap} showsVerticalScrollIndicator={false}>
          <ActivityIndicator color="#22C55E" />
          <Text style={styles.loadingText}>Finding nearby services…</Text>
        </ScrollView>
      ) : results.length === 0 ? (
        <ScrollView contentContainerStyle={styles.emptyState} showsVerticalScrollIndicator={false}>
          <Ionicons name="search" size={48} color="#E5E5EA" />
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptyText}>
            This service isn't available in your current location, or location access was denied.
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => fetchNearbyForCategory(selectedCategory)}
          >
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <FlatList
          data={results}
          keyExtractor={item => item.placeId}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Guest Restriction Modal */}
      <Modal
        visible={showGuestModal}
        transparent
        animationType="slide"
        onRequestClose={() => { setShowGuestModal(false); navigation.goBack(); }}
      >
        <TouchableWithoutFeedback onPress={() => { setShowGuestModal(false); navigation.goBack(); }}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalSheet}>
                <View style={styles.modalHandle} />
                <View style={styles.modalIconWrap}>
                  <Ionicons name="compass-outline" size={32} color="#22C55E" />
                </View>
                <Text style={styles.modalTitle}>Account Required</Text>
                <Text style={styles.modalBody}>
                  Create an account to access nearby services like medical help, transport, and emergency locations.
                </Text>
                <TouchableOpacity
                  style={styles.modalPrimaryBtn}
                  onPress={() => { setShowGuestModal(false); navigation.navigate('Login'); }}
                >
                  <Text style={styles.modalPrimaryBtnText}>Sign In</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalOutlineBtn}
                  onPress={() => { setShowGuestModal(false); navigation.navigate('Register'); }}
                >
                  <Text style={styles.modalOutlineBtnText}>Create Account</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalGhostBtn}
                  onPress={() => { setShowGuestModal(false); navigation.goBack(); }}
                >
                  <Text style={styles.modalGhostBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 50, height: 44, resizeMode: 'contain' },
  topBarTitle: { fontSize: 20, fontWeight: '700', color: '#111827', flex: 1, textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#57636C', paddingHorizontal: 14, marginBottom: 10 },
  categoryGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 8, marginBottom: 6,
  },
  catCard: {
    width: '18%', margin: '1%', aspectRatio: 1,
    borderRadius: 14, borderWidth: 1, borderColor: '#E5E5EA',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', gap: 4,
  },
  catCardActive: { borderColor: '#22C55E', backgroundColor: '#F0FDF4' },
  catLabel: { fontSize: 9, textAlign: 'center', color: '#57636C', fontWeight: '500' },
  catLabelActive: { color: '#22C55E', fontWeight: '700' },
  list: { paddingHorizontal: 14, paddingBottom: 100 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#F2F2F7', padding: 10,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  cardImage: { width: 60, height: 60, borderRadius: 12, marginRight: 12 },
  cardBody: { flex: 1 },
  cardName: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 4 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  cardDistance: { fontSize: 12, color: '#57636C' },
  categoryBadge: {
    alignSelf: 'flex-start', backgroundColor: '#F0FDF4',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2,
  },
  categoryBadgeText: { fontSize: 11, color: '#22C55E', fontWeight: '500' },
  routeBtn: {
    backgroundColor: '#22C55E', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  routeBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  loadingWrap: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 10 },
  loadingText: { fontSize: 14, color: '#57636C' },
  emptyState: {
    flexGrow: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 40, paddingVertical: 40,
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#111827', marginTop: 14, marginBottom: 6 },
  emptyText: { fontSize: 14, color: '#57636C', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  retryBtn: {
    backgroundColor: '#22C55E', borderRadius: 14,
    paddingHorizontal: 28, paddingVertical: 12,
  },
  retryBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 44, alignItems: 'center',
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E5E5EA', marginBottom: 20,
  },
  modalIconWrap: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#F0FDF4',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22, fontWeight: '700', color: '#111827',
    marginBottom: 10, textAlign: 'center',
  },
  modalBody: {
    fontSize: 14, color: '#57636C', textAlign: 'center',
    lineHeight: 22, marginBottom: 24, paddingHorizontal: 4,
  },
  modalPrimaryBtn: {
    width: '100%', backgroundColor: '#22C55E', borderRadius: 16,
    height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  modalPrimaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalOutlineBtn: {
    width: '100%', borderWidth: 1.5, borderColor: '#22C55E',
    borderRadius: 16, height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  modalOutlineBtnText: { color: '#22C55E', fontSize: 16, fontWeight: '600' },
  modalGhostBtn: { paddingVertical: 10, paddingHorizontal: 20 },
  modalGhostBtnText: { color: '#9CA3AF', fontSize: 14, fontWeight: '500' },
});
