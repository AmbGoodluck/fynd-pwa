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
import { F } from '../theme/fonts';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400';

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
      <View style={styles.card}>
        {/* Place image — fills card width */}
        <Image
          source={{ uri: item.photoUrl || FALLBACK_IMG }}
          style={styles.cardImage}
          resizeMode="cover"
        />

        {/* Place info */}
        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.cardCity} numberOfLines={1}>{item.city || item.address || ''}</Text>
          <View style={styles.metaRow}>
            {item.rating > 0 && (
              <>
                <Ionicons name="star" size={12} color="#F59E0B" />
                <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
              </>
            )}
            {item.category ? (
              <Text style={styles.categoryText}>
                {item.rating > 0 ? ' · ' : ''}{item.category.replace(/_/g, ' ')}
              </Text>
            ) : null}
            {item.bookingUrl ? (
              <View style={styles.bookBadge}>
                <Ionicons name="calendar-outline" size={10} color="#22C55E" />
                <Text style={styles.bookBadgeText}>Bookable</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Footer: Add to Itinerary + delete */}
        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={[styles.addBtn, inTemp && styles.addBtnAdded]}
            onPress={() => handleAddToItinerary(item)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={inTemp ? 'checkmark-circle-outline' : 'add-circle-outline'}
              size={16}
              color="#fff"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.addBtnText}>
              {inTemp ? 'Added' : 'Add to Itinerary'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => unsavePlace(item.placeId)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
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

      {/* Temp itinerary banner */}
      {tempPlaces.length > 0 && (
        <TouchableOpacity style={styles.tempBanner} onPress={() => setShowCreateModal(true)}>
          <Ionicons name="map-outline" size={16} color="#166534" />
          <Text style={styles.tempBannerText}>
            {tempPlaces.length} place{tempPlaces.length !== 1 ? 's' : ''} ready · Tap to create itinerary
          </Text>
          <Ionicons name="chevron-forward" size={14} color="#166534" />
        </TouchableOpacity>
      )}

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
          contentContainerStyle={styles.listContent}
        />
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
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F0FDF4', marginHorizontal: 14, marginTop: 4,
    borderRadius: 12, padding: 10, marginBottom: 4,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  tempBannerText: { flex: 1, fontSize: 13, color: '#166534', fontFamily: F.medium },

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

  // ── Card ────────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  cardImage: {
    width: '100%',
    height: 160,
  },
  cardBody: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  cardName: { fontSize: 16, fontFamily: F.semibold, color: '#111827', marginBottom: 2 },
  cardCity: { fontSize: 13, color: '#57636C', marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  ratingText: { fontSize: 12, color: '#57636C', marginLeft: 3 },
  categoryText: { fontSize: 12, color: '#9CA3AF', textTransform: 'capitalize' },
  bookBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#F0FDF4', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 3, marginLeft: 6,
  },
  bookBadgeText: { fontSize: 10, color: '#22C55E', fontFamily: F.semibold },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 14,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  addBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
    borderRadius: 12,
    height: 42,
    shadowColor: '#22C55E',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  addBtnAdded: {
    backgroundColor: '#16A34A',
  },
  addBtnText: { color: '#fff', fontSize: 14, fontFamily: F.semibold },

  deleteBtn: {
    width: 40, height: 42,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
  },

  // ── Empty state ──────────────────────────────────────────────────────
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
