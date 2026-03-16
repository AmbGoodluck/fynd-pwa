import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Image, FlatList, Modal, TouchableWithoutFeedback, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import { useGuestStore, type SavedPlace } from '../store/useGuestStore';
import { useTempItineraryStore, TEMP_MAX_PLACES } from '../store/useTempItineraryStore';
import GuestGateModal from '../components/GuestGateModal';
import PlaceCard from '../components/PlaceCard';
import { F } from '../theme/fonts';

import { FALLBACK_IMAGE } from '../constants';

type Props = { navigation: any };

export default function SavedScreen({ navigation }: Props) {
  const { user, isAuthenticated } = useAuthStore();
  const { isGuest, savedPlaces, unsavePlace } = useGuestStore();
  const { places: tempPlaces, addPlace, clear: clearTemp } = useTempItineraryStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showGate, setShowGate] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDiffCityModal, setShowDiffCityModal] = useState(false);
  const [showFullModal, setShowFullModal] = useState(false);

  const displayName = user?.fullName?.split(' ')[0] || 'U';

  const filtered = savedPlaces.filter(p =>
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
    const inTemp = tempPlaces.some(p => p.placeId === item.placeId);

    return (
      <View style={{ marginBottom: 16 }}>
        <PlaceCard
          name={item.name}
          category={item.category || item.city}
          description={item.description}
          rating={item.rating > 0 ? item.rating : undefined}
          photoUrl={item.photoUrl || FALLBACK_IMAGE}
          isSaved={true}
          onSave={() => unsavePlace(item.placeId)}
          isAdded={inTemp}
          onAdd={() => handleAddToItinerary(item)}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Image source={require('../../assets/logo-icon.png')} style={styles.logo} />
        <Text style={styles.topBarTitle}>Fynd</Text>
        <TouchableOpacity
          style={styles.avatarCircle}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.avatarText}>{displayName[0].toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Saved Places</Text>
        <Text style={styles.subtitle}>
          {savedPlaces.length > 0
            ? `${savedPlaces.length} place${savedPlaces.length !== 1 ? 's' : ''} saved`
            : 'Heart places to save them here'}
        </Text>
      </View>



      {/* Search */}
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
      {filtered.length === 0 ? (
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
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          initialNumToRender={5}
          maxToRenderPerBatch={6}
          windowSize={7}
          removeClippedSubviews
          contentContainerStyle={styles.listContent}
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
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4,
    backgroundColor: '#fff',
  },
  logo: { width: 50, height: 44, resizeMode: 'contain' },
  topBarTitle: { fontSize: 22, fontWeight: '600', color: '#111827' },
  avatarCircle: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10, backgroundColor: '#fff' },
  title: { fontSize: 22, fontFamily: F.bold, color: '#111827', marginBottom: 2 },
  subtitle: { fontSize: 13, color: '#57636C' },

  tempBanner: {
    position: 'absolute', bottom: 24, left: 16, right: 16, zIndex: 100,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F0FDF4', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: '#BBF7D0',
    shadowColor: '#166534', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  tempBannerText: { flex: 1, fontSize: 14, color: '#166534', fontFamily: F.semibold },

  searchRow: { paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#fff' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F2F2F7', borderRadius: 14,
    borderWidth: 1, borderColor: '#E5E5EA',
    paddingHorizontal: 12, height: 42,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },

  guestBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#EFF6FF', marginHorizontal: 14,
    borderRadius: 12, padding: 10, marginBottom: 8,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  guestBannerText: { flex: 1, fontSize: 12, color: '#1D4ED8', fontWeight: '500' },

  listContent: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 110 },

  // ── Modals ───────────────────────────────────────────────────────────
  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 40, paddingVertical: 16,
  },
  emptyTitle: { fontSize: 17, fontFamily: F.semibold, color: '#111827', marginTop: 14, marginBottom: 6 },
  emptyText: { fontSize: 14, color: '#57636C', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  exploreBtn: {
    backgroundColor: '#22C55E', borderRadius: 16,
    paddingHorizontal: 32, paddingVertical: 12,
  },
  exploreBtnText: { color: '#fff', fontFamily: F.semibold, fontSize: 15 },

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
});
