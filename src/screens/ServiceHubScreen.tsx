import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Image, ActivityIndicator, Alert, Linking, Platform, ScrollView,
  Modal, TouchableWithoutFeedback,
} from 'react-native';
import { useTabBarHeight } from '../hooks/useTabBarHeight';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import * as Sentry from '../services/sentry';
import { searchNearbyFree, fyndPlaceToPlaceResult } from '../services/freePlacesService';
import { PlaceResult } from '../services/googlePlacesService';
import { useGuestStore } from '../store/useGuestStore';
import { useAuthStore } from '../store/useAuthStore';
import AppBar from '../components/AppBar';
import { getPlaceDisplayType } from '../utils/placeTypeMap';
import { COLORS } from '../theme/tokens';

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
  { id: 'Gas Station',       label: 'Gas Station',     icon: 'flame',               color: '#F97316' },
];

type Props = { navigation: any; route?: any };

export default function ServiceHubScreen({ navigation, route }: Props) {
  const initialCategory = route?.params?.initialCategory || CATEGORIES[0].id;
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showGuestModal, setShowGuestModal] = useState(false);
  // Tracks why the results list is empty so we can show the right message
  type EmptyReason = 'location_denied' | 'not_available' | 'error' | null;
  const [emptyReason, setEmptyReason] = useState<EmptyReason>(null);
  const { isGuest } = useGuestStore();
  const { isAuthenticated } = useAuthStore();
  const tabBarHeight = useTabBarHeight();

  useEffect(() => {
    if (isGuest || !isAuthenticated) {
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
      Sentry.captureException(e, { tags: { context: 'ServiceHubScreen.getLocation' } } as any);
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
    setEmptyReason(null);
    try {
      const loc = await getCurrentLocation();
      if (!loc) {
        setEmptyReason('location_denied');
        setLoadingResults(false);
        return;
      }
      setUserLocation(loc);
      const fyndPlaces = await searchNearbyFree(loc.lat, loc.lng, category);
      if (fyndPlaces.length === 0) {
        setEmptyReason('not_available');
        setResults([]);
      } else {
        const mapped = fyndPlaces.map(fyndPlaceToPlaceResult);
        const withDist = mapped
          .map((p: PlaceResult) => ({ ...p, distanceKm: calcDistanceKm(loc.lat, loc.lng, p.coordinates.lat, p.coordinates.lng) }))
          .sort((a: PlaceResult & { distanceKm: number }, b: PlaceResult & { distanceKm: number }) => (a.distanceKm || 0) - (b.distanceKm || 0));
        setResults(withDist);
      }
    } catch (e) {
      console.error('ServiceHub fetch error:', e);
      setEmptyReason('error');
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

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Image
        source={{ uri: item.photoUrl ?? '' }}
        style={styles.cardImage}
      />
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardSub} numberOfLines={1}>
          {getPlaceDisplayType(item.types ?? (item.category ? [item.category] : []))}
        </Text>
        <View style={styles.cardMeta}>
          <Ionicons name="walk-outline" size={13} color="#6B7280" />
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
      </View>
      <TouchableOpacity style={styles.routeBtn} onPress={() => openRoute(item)}>
        <Ionicons name="navigate-outline" size={14} color="#fff" />
        <Text style={styles.routeBtnText}>Route</Text>
      </TouchableOpacity>
    </View>
  );


  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* App bar */}
      <AppBar
        variant="sub"
        title="ServiceHub"
        onBack={() => navigation.goBack()}
      />

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
              color={selectedCategory === cat.id ? COLORS.accent.primary : '#6B7280'}
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
          <ActivityIndicator color={COLORS.accent.primary} />
          <Text style={styles.loadingText}>Finding nearby services…</Text>
        </ScrollView>
      ) : results.length === 0 ? (
        <ScrollView contentContainerStyle={styles.emptyState} showsVerticalScrollIndicator={false}>
          {emptyReason === 'location_denied' ? (
            <>
              <Ionicons name="location-outline" size={48} color="#E5E5EA" />
              <Text style={styles.emptyTitle}>Location access needed</Text>
              <Text style={styles.emptyText}>
                Allow location access so we can find nearby services. Enable it in your browser or device settings.
              </Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => {
                  if (Platform.OS !== 'web') Linking.openSettings();
                  else fetchNearbyForCategory(selectedCategory);
                }}
              >
                <Text style={styles.retryBtnText}>
                  {Platform.OS !== 'web' ? 'Open Settings' : 'Try Again'}
                </Text>
              </TouchableOpacity>
            </>
          ) : emptyReason === 'not_available' ? (
            <>
              <Ionicons name="map-outline" size={48} color="#E5E5EA" />
              <Text style={styles.emptyTitle}>Not available near you</Text>
              <Text style={styles.emptyText}>
                We couldn't find any {CATEGORIES.find(c => c.id === selectedCategory)?.label ?? selectedCategory} services in your current area.
              </Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => fetchNearbyForCategory(selectedCategory)}
              >
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </>
          ) : emptyReason === 'error' ? (
            <>
              <Ionicons name="cloud-offline-outline" size={48} color="#E5E5EA" />
              <Text style={styles.emptyTitle}>Something went wrong</Text>
              <Text style={styles.emptyText}>
                Check your connection and try again.
              </Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => fetchNearbyForCategory(selectedCategory)}
              >
                <Text style={styles.retryBtnText}>Try Again</Text>
              </TouchableOpacity>
            </>
          ) : (
            // Initial state before any fetch (e.g. guest modal dismissed without navigating away)
            <>
              <Ionicons name="search" size={48} color="#E5E5EA" />
              <Text style={styles.emptyTitle}>Select a category</Text>
              <Text style={styles.emptyText}>
                Choose a service above to find what's nearby.
              </Text>
            </>
          )}
        </ScrollView>
      ) : (
        <FlatList
          data={results}
          keyExtractor={item => item.placeId}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + 20 }]}
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
                  <Ionicons name="compass-outline" size={32} color={COLORS.accent.primary} />
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
  topBarTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', flex: 1, textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#57636C', paddingHorizontal: 14, marginBottom: 10 },
  categoryGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 8, marginBottom: 6,
  },
  catCard: {
    width: '18%', margin: '1%', aspectRatio: 1,
    borderRadius: 12, borderWidth: 0.5, borderColor: '#E5E7EB',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', gap: 4,
  },
  catCardActive: { borderColor: COLORS.accent.primary, borderWidth: 1.5 },
  catLabel: { fontSize: 9, textAlign: 'center', color: '#6B7280', fontWeight: '500' },
  catLabelActive: { color: COLORS.accent.primary, fontWeight: '600' },
  list: { paddingHorizontal: 14, paddingBottom: 100 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#F2F2F7', padding: 10,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  cardImage: { width: 60, height: 60, borderRadius: 12, marginRight: 12 },
  cardBody: { flex: 1 },
  cardName: { fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginBottom: 2 },
  cardSub: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  cardDistance: { fontSize: 12, color: '#57636C' },
  categoryBadge: {
    alignSelf: 'flex-start', backgroundColor: COLORS.accent.primaryLight,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2,
  },
  categoryBadgeText: { fontSize: 11, color: COLORS.accent.primary, fontWeight: '500' },
  routeBtn: {
    backgroundColor: '#1A1A1A',
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  routeBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  loadingWrap: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 10 },
  loadingText: { fontSize: 14, color: '#57636C' },
  emptyState: {
    flexGrow: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 40, paddingVertical: 40,
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#1A1A1A', marginTop: 14, marginBottom: 6 },
  emptyText: { fontSize: 14, color: '#57636C', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  retryBtn: {
    backgroundColor: COLORS.accent.primary, borderRadius: 14,
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
    width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.accent.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22, fontWeight: '700', color: '#1A1A1A',
    marginBottom: 10, textAlign: 'center',
  },
  modalBody: {
    fontSize: 14, color: '#57636C', textAlign: 'center',
    lineHeight: 22, marginBottom: 24, paddingHorizontal: 4,
  },
  modalPrimaryBtn: {
    width: '100%', backgroundColor: COLORS.accent.primary, borderRadius: 16,
    height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  modalPrimaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalOutlineBtn: {
    width: '100%', borderWidth: 1.5, borderColor: COLORS.accent.primary,
    borderRadius: 16, height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  modalOutlineBtnText: { color: COLORS.accent.primary, fontSize: 16, fontWeight: '600' },
  modalGhostBtn: { paddingVertical: 10, paddingHorizontal: 20 },
  modalGhostBtnText: { color: '#9CA3AF', fontSize: 14, fontWeight: '500' },
});
