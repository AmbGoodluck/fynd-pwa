import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Image, FlatList, Modal, TouchableWithoutFeedback, Alert,
} from 'react-native';
import { formatRelativeDate } from '../utils/date';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import { useGuestStore, type SavedPlace } from '../store/useGuestStore';
import { useTempItineraryStore, TEMP_MAX_PLACES } from '../store/useTempItineraryStore';
import { useRecentTripStore } from '../store/useRecentTripStore';
import { useTabBarHeight } from '../hooks/useTabBarHeight';
import GuestGateModal from '../components/GuestGateModal';
import PlaceCard from '../components/PlaceCard';
import { F } from '../theme/fonts';
import { getRecentItineraries, deleteItinerary, type ItineraryDoc } from '../services/database';

import { FALLBACK_IMAGE } from '../constants';

type Props = { navigation: any };

export default function SavedScreen({ navigation }: Props) {
  const { user, isAuthenticated } = useAuthStore();
  const { isGuest, savedPlaces, unsavePlace } = useGuestStore();
  const { places: tempPlaces, addPlace, clear: clearTemp } = useTempItineraryStore();
  const { recentTrips } = useRecentTripStore();
  const tabBarHeight = useTabBarHeight();

  const [searchQuery, setSearchQuery] = useState('');
  const [showGate, setShowGate] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDiffCityModal, setShowDiffCityModal] = useState(false);
  const [showFullModal, setShowFullModal] = useState(false);

  // Tabs State
  const [activeTab, setActiveTab] = useState<'places' | 'itineraries'>('places');
  const [itineraries, setItineraries] = useState<ItineraryDoc[]>([]);
  const [loadingItineraries, setLoadingItineraries] = useState(false);

  React.useEffect(() => {
    if (activeTab === 'itineraries' && isAuthenticated && user) {
      setLoadingItineraries(true);
      getRecentItineraries(user.id, 20)
        .then(res => setItineraries(res))
        .catch(err => { if (__DEV__) console.error('Failed to load itineraries:', err); })
        .finally(() => setLoadingItineraries(false));
    }
  }, [activeTab, isAuthenticated, user]);

  const displayName = user?.fullName?.split(' ')[0] || 'U';

  const filtered = savedPlaces.filter((p: SavedPlace) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.city || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddToItinerary = (place: SavedPlace) => {
    const wasEmpty = tempPlaces.length === 0;
    const result = addPlace(place);

    switch (result) {
      case 'duplicate':
        Alert.alert('Already Added', 'This place is already in your itinerary.');
        break;
      case 'full':
        setShowFullModal(true);
        break;
      case 'different_city':
        setShowDiffCityModal(true);
        break;
      case 'added':
        if (wasEmpty) {
          setShowCreateModal(true);
        }
        break;
    }
  };

  const handleCreateTrip = () => {
    const { places, city } = useTempItineraryStore.getState();
    clearTemp();
    setShowCreateModal(false);
    navigation.navigate('Itinerary', {
      places,
      destination: city || 'My Trip',
    });
  };

  const handleCreateNewTrip = () => {
    setShowDiffCityModal(false);
    navigation.navigate('Create Trip');
  };

  const renderItem = ({ item }: { item: SavedPlace }) => {
    const inTemp = tempPlaces.some((p: any) => p.placeId === item.placeId);

    return (
      <PlaceCard
        horizontal
        name={item.name}
        description={item.description || item.category || item.city}
        rating={item.rating > 0 ? item.rating : undefined}
        photoUrl={item.photoUrl || FALLBACK_IMAGE}
        isSaved={true}
        onSave={() => unsavePlace(item.placeId)}
        isAdded={inTemp}
        onAdd={() => handleAddToItinerary(item)}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Image source={require('../../assets/logo-icon.png')} style={styles.logo} />
        <Text style={styles.topBarTitle}>Saved</Text>
        <TouchableOpacity
          style={styles.avatarCircle}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.avatarText}>{displayName[0].toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.header}>
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'places' && styles.tabActive]}
            onPress={() => setActiveTab('places')}
          >
            <Text style={[styles.tabText, activeTab === 'places' && styles.tabTextActive]}>
              Places ({savedPlaces.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'itineraries' && styles.tabActive]}
            onPress={() => {
              if (isGuest) {
                setShowGate(true);
              } else {
                setActiveTab('itineraries');
              }
            }}
          >
            <Text style={[styles.tabText, activeTab === 'itineraries' && styles.tabTextActive]}>
              Recent Trips
            </Text>
          </TouchableOpacity>
        </View>
      </View>




      {/* Search (Only for Places Tab) */}
      {activeTab === 'places' && (
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={16} color="#8E8E93" style={{ marginRight: 6 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search saved places…"
              placeholderTextColor="#8E8E93"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#8E8E93" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      )}

      {/* Guest notice */}
      {isGuest && (
        <TouchableOpacity style={styles.guestBanner} onPress={() => setShowGate(true)}>
          <Ionicons name="information-circle-outline" size={16} color="#1D4ED8" />
          <Text style={styles.guestBannerText}>
            Sign up to sync saved places across devices
          </Text>
          <Ionicons name="chevron-forward" size={14} color="#1D4ED8" />
        </TouchableOpacity>
      )}

      {/* List */}
      {activeTab === 'places' ? (
        filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="bookmark-outline" size={56} color="#E5E5EA" />
            <Text style={styles.emptyTitle}>
              {savedPlaces.length === 0 ? 'No saved places' : 'No results'}
            </Text>
            <Text style={styles.emptyText}>
              {savedPlaces.length === 0
                ? 'Browse suggested places and tap the heart to save them here.'
                : 'Try a different search term.'}
            </Text>
            {savedPlaces.length === 0 ? (
              <TouchableOpacity
                style={styles.exploreBtn}
                onPress={() => navigation.navigate('Create Trip')}
              >
                <Text style={styles.exploreBtnText}>Create a Trip</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item.placeId}
            renderItem={({ item }: { item: SavedPlace }) => renderItem({ item })}
            showsVerticalScrollIndicator={false}
            initialNumToRender={5}
            maxToRenderPerBatch={6}
            windowSize={7}
            removeClippedSubviews
            contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 20 }]}
          />
        )
      ) : (
        /* Itineraries Tab */
        <FlatList
          data={[]}
          keyExtractor={() => ''}
          renderItem={() => null}
          ListHeaderComponent={
            <>
              {/* Recent Trips from session store */}
              {recentTrips.length > 0 && (
                <View style={styles.recentTripsSection}>
                  <Text style={styles.recentTripsSectionTitle}>Recent Trips</Text>
                  {recentTrips.map((trip) => (
                    <TouchableOpacity
                      key={trip.trip_id}
                      style={styles.recentTripCard}
                      onPress={() => navigation.navigate('Itinerary', {
                        places: trip.places.map(p => ({
                          placeId: p.id,
                          name: p.name,
                          address: p.address,
                          rating: p.rating ?? 0,
                          description: p.description ?? '',
                          photoRef: '',
                          photoUrl: p.image,
                          coordinates: { lat: p.coordinate.latitude, lng: p.coordinate.longitude },
                        })),
                        destination: trip.city || 'My Trip',
                        tripId: trip.trip_id,
                      })}
                    >
                      <View style={styles.recentTripRow}>
                        <View style={styles.recentTripIconWrap}>
                          <Ionicons name="location-outline" size={22} color="#22C55E" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.recentTripCity}>{trip.city || 'My Trip'}</Text>
                          <Text style={styles.recentTripMeta}>
                            {trip.places.length} place{trip.places.length !== 1 ? 's' : ''} · {formatRelativeDate(trip.last_accessed || trip.created_at)}
                          </Text>
                        </View>
                        <View style={styles.addToRouteBtn}>
                          <Text style={styles.addToRouteBtnText}>Add to Route</Text>
                          <Ionicons name="chevron-forward" size={14} color="#22C55E" />
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Firestore-backed itineraries */}
              {loadingItineraries ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>Loading trips...</Text>
                </View>
              ) : itineraries.length === 0 && recentTrips.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="map-outline" size={56} color="#E5E5EA" />
                  <Text style={styles.emptyTitle}>No recent trips</Text>
                  <Text style={styles.emptyText}>
                    Trips you generate will be saved here automatically.
                  </Text>
                  <TouchableOpacity
                    style={styles.exploreBtn}
                    onPress={() => navigation.navigate('Create Trip')}
                  >
                    <Text style={styles.exploreBtnText}>Generate Itinerary</Text>
                  </TouchableOpacity>
                </View>
              ) : itineraries.length > 0 ? (
                itineraries.map((item, index) => (
                  <View key={item.id || `itinerary-${item.tripId}-${index}`} style={styles.itineraryCardWrapper}>
                    <TouchableOpacity
                      style={styles.itineraryCard}
                      onPress={() => navigation.navigate('Itinerary', {
                        places: item.stops.map(s => ({
                          placeId: s.placeId,
                          name: s.placeName,
                          photoUrl: s.imageUrl,
                          category: '',
                          description: s.shortDescription,
                          rating: s.rating,
                          distanceKm: s.distanceKm,
                          walkMinutes: s.travelTimeMinutes,
                          coordinates: { lat: s.latitude, lng: s.longitude }
                        } as any)),
                        destination: item.destination,
                        tripId: item.tripId
                      })}
                    >
                      <Image source={{ uri: item.coverPhotoUrl || FALLBACK_IMAGE }} style={styles.itineraryImage} />
                      <View style={styles.itineraryDetails}>
                        <Text style={styles.itineraryTitle}>{item.destination}</Text>
                        <Text style={styles.itinerarySub}>
                          {item.totalStops} places · {item.createdAt ? formatRelativeDate(new Date(item.createdAt.toMillis()).toISOString()) : 'Recent'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteItineraryBtn}
                      onPress={() => {
                        Alert.alert(
                          'Delete Trip',
                          'Are you sure you want to delete this trip?',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Delete',
                              style: 'destructive',
                              onPress: async () => {
                                if (item.id) {
                                  try {
                                    await deleteItinerary(item.id);
                                    setItineraries(prev => prev.filter(i => i.id !== item.id));
                                  } catch (e) {
                                    Alert.alert('Error', 'Failed to delete itinerary.');
                                  }
                                }
                              }
                            }
                          ]
                        );
                      }}
                    >
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))
              ) : null}
            </>
          }
          contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 20 }]}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Temp itinerary banner (Floating) */}
      {tempPlaces.length > 0 && (
        <TouchableOpacity style={styles.tempBanner} onPress={() => setShowCreateModal(true)} activeOpacity={0.9}>
          <View style={{ backgroundColor: '#BBF7D0', padding: 6, borderRadius: 8, marginRight: 10 }}>
            <Ionicons name="map-outline" size={18} color="#166534" />
          </View>
          <Text style={styles.tempBannerText}>
            {tempPlaces.length} place{tempPlaces.length !== 1 ? 's' : ''} ready · Create Trip
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#166534" />
        </TouchableOpacity>
      )}

      {/* ── Modals ─────────────────────────────────────────────────── */}

      {/* Create Your Trip */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowCreateModal(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.sheet}>
                <View style={styles.sheetHandle} />
                <View style={styles.sheetIconWrap}>
                  <Ionicons name="map-outline" size={32} color="#22C55E" />
                </View>
                <Text style={styles.sheetTitle}>Create Your Trip</Text>
                <Text style={styles.sheetMessage}>
                  You need to create a trip before adding places. Build your itinerary from your saved places.
                </Text>
                {tempPlaces.length > 0 && (
                  <Text style={styles.sheetMeta}>
                    {tempPlaces.length} of {TEMP_MAX_PLACES} places selected
                  </Text>
                )}
                <TouchableOpacity style={styles.primaryBtn} onPress={handleCreateTrip}>
                  <Ionicons name="map-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryBtnText}>Create Trip</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.ghostBtn}
                  onPress={() => setShowCreateModal(false)}
                >
                  <Text style={styles.ghostBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Different City */}
      <Modal
        visible={showDiffCityModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDiffCityModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowDiffCityModal(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.sheet}>
                <View style={styles.sheetHandle} />
                <View style={[styles.sheetIconWrap, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="location-outline" size={32} color="#F59E0B" />
                </View>
                <Text style={styles.sheetTitle}>Different City</Text>
                <Text style={styles.sheetMessage}>
                  Places can only be added to an itinerary within the same city.
                </Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={handleCreateNewTrip}>
                  <Ionicons name="add-circle-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryBtnText}>Create New Trip</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.ghostBtn}
                  onPress={() => setShowDiffCityModal(false)}
                >
                  <Text style={styles.ghostBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Itinerary Full */}
      <Modal
        visible={showFullModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFullModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowFullModal(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.sheet}>
                <View style={styles.sheetHandle} />
                <View style={[styles.sheetIconWrap, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="warning-outline" size={32} color="#EF4444" />
                </View>
                <Text style={styles.sheetTitle}>Itinerary Full</Text>
                <Text style={styles.sheetMessage}>
                  You have reached the maximum number of places allowed in this itinerary.
                </Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={handleCreateTrip}>
                  <Text style={styles.primaryBtnText}>Go to Itinerary</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.ghostBtn}
                  onPress={() => setShowFullModal(false)}
                >
                  <Text style={styles.ghostBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Guest Gate Modal */}
      <GuestGateModal
        visible={showGate}
        onDismiss={() => setShowGate(false)}
        onLogin={() => { setShowGate(false); navigation.navigate('Login'); }}
        onRegister={() => { setShowGate(false); navigation.navigate('Register'); }}
        onContinueAsGuest={() => setShowGate(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
  },
  logo: { width: 44, height: 44, resizeMode: 'contain' },
  topBarTitle: { fontSize: 24, fontFamily: F.bold, color: '#111827', letterSpacing: -0.5 },
  avatarCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#22C55E', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  avatarText: { color: '#fff', fontFamily: F.bold, fontSize: 16 },
  header: { paddingHorizontal: 16, paddingTop: 8, backgroundColor: '#fff' },
  title: { fontSize: 28, fontFamily: F.bold, color: '#111827', marginBottom: 16, letterSpacing: -0.5 },
  tabRow: { flexDirection: 'row', gap: 24 },
  tab: { paddingBottom: 12, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#22C55E' },
  tabText: { fontSize: 16, color: '#6B7280', fontFamily: F.semibold },
  tabTextActive: { color: '#111827' },
  searchRow: { paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F3F4F6', borderRadius: 16,
    paddingHorizontal: 16, height: 48,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#111827', fontFamily: F.medium },
  guestBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#EFF6FF', marginHorizontal: 16,
    borderRadius: 14, padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  guestBannerText: { flex: 1, fontSize: 13, color: '#1D4ED8', fontFamily: F.semibold },
  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 110 },
  itineraryCardWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 20, marginBottom: 16,
    borderWidth: 1, borderColor: '#F2F2F7', paddingRight: 8,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  itineraryCard: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 14 },
  deleteItineraryBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#FEF2F2',
    alignItems: 'center', justifyContent: 'center', marginLeft: 4,
  },
  itineraryImage: { width: 70, height: 70, borderRadius: 14, backgroundColor: '#E5E7EB', marginRight: 16 },
  itineraryDetails: { flex: 1 },
  itineraryTitle: { fontSize: 17, fontFamily: F.bold, color: '#111827', marginBottom: 4 },
  itinerarySub: { fontSize: 13, color: '#6B7280', fontFamily: F.medium },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, marginTop: 40 },
  emptyTitle: { fontSize: 18, fontFamily: F.bold, color: '#111827', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 32, fontFamily: F.regular },
  exploreBtn: { backgroundColor: '#22C55E', borderRadius: 18, paddingHorizontal: 32, paddingVertical: 14 },
  exploreBtnText: { color: '#fff', fontFamily: F.bold, fontSize: 16 },
  tempBanner: {
    position: 'absolute', bottom: 32, left: 16, right: 16, zIndex: 100,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 22, padding: 18,
    borderWidth: 1, borderColor: '#22C55E',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 15, shadowOffset: { width: 0, height: 10 }, elevation: 10,
  },
  tempBannerText: { flex: 1, fontSize: 15, color: '#166534', fontFamily: F.bold },

  // ── Modals ───────────────────────────────────────────────────────────
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 48,
    alignItems: 'center',
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E5E5EA', marginBottom: 24,
  },
  sheetIconWrap: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: '#F0FDF4',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 22, fontFamily: F.bold, color: '#111827',
    marginBottom: 10, textAlign: 'center',
  },
  sheetMessage: {
    fontSize: 14, color: '#57636C', textAlign: 'center',
    lineHeight: 22, marginBottom: 8, paddingHorizontal: 4,
  },
  sheetMeta: {
    fontSize: 13, color: '#22C55E', fontFamily: F.medium,
    marginBottom: 20,
  },
  primaryBtn: {
    width: '100%', backgroundColor: '#22C55E', borderRadius: 16,
    height: 54, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 16, marginBottom: 4,
    shadowColor: '#22C55E', shadowOpacity: 0.3,
    shadowRadius: 10, shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontFamily: F.semibold },
  ghostBtn: { paddingVertical: 14, paddingHorizontal: 20 },
  ghostBtnText: { color: '#9CA3AF', fontSize: 14, fontFamily: F.medium },
  recentTripsSection: { marginBottom: 20 },
  recentTripsSectionTitle: { fontSize: 16, fontFamily: F.bold, color: '#111827', marginBottom: 10 },
  recentTripCard: {
    backgroundColor: '#fff', borderRadius: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#F2F2F7',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  recentTripRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  recentTripIconWrap: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center',
  },
  recentTripCity: { fontSize: 15, fontFamily: F.bold, color: '#111827', marginBottom: 3 },
  recentTripMeta: { fontSize: 13, color: '#6B7280', fontFamily: F.medium },
  addToRouteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F0FDF4', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  addToRouteBtnText: { fontSize: 12, color: '#22C55E', fontFamily: F.bold },
});
