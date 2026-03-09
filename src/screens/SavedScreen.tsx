import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Image, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import { useGuestStore, type SavedPlace } from '../store/useGuestStore';
import GuestGateModal from '../components/GuestGateModal';

type Props = { navigation: any };

export default function SavedScreen({ navigation }: Props) {
  const { user } = useAuthStore();
  const { isGuest, savedPlaces, unsavePlace } = useGuestStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showGate, setShowGate] = useState(false);

  const displayName = user?.fullName?.split(' ')[0] || 'U';

  const filtered = savedPlaces.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.city || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAttemptAction = () => {
    if (isGuest) {
      setShowGate(true);
      return false;
    }
    return true;
  };

  const renderItem = ({ item }: { item: SavedPlace }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.photoUrl || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400' }} style={styles.cardImage} />
      <View style={styles.cardContent}>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardCity} numberOfLines={1}>{item.city || item.address || ''}</Text>
        {item.rating > 0 ? (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={12} color="#F59E0B" />
            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.cardActions}>
        {item.bookingUrl ? (
          <View style={styles.bookBadge}>
            <Ionicons name="calendar-outline" size={11} color="#22C55E" />
            <Text style={styles.bookBadgeText}>Bookable</Text>
          </View>
        ) : null}
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => unsavePlace(item.placeId)}
        >
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

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
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

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
    paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4,
  },
  logo: { width: 50, height: 44, resizeMode: 'contain' },
  topBarTitle: { fontSize: 22, fontWeight: '600', color: '#111827' },
  avatarCircle: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  header: { paddingHorizontal: 14, paddingBottom: 10 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 2 },
  subtitle: { fontSize: 13, color: '#57636C' },
  searchRow: { paddingHorizontal: 14, marginBottom: 10 },
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
    borderRadius: 12, padding: 10, marginBottom: 10,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  guestBannerText: { flex: 1, fontSize: 12, color: '#1D4ED8', fontWeight: '500' },
  card: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 14, marginVertical: 5,
    borderRadius: 16, backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
    padding: 10,
  },
  cardImage: { width: 68, height: 68, borderRadius: 12, resizeMode: 'cover' },
  cardContent: { flex: 1, paddingLeft: 10 },
  cardName: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 3 },
  cardCity: { fontSize: 12, color: '#57636C', marginBottom: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 12, color: '#57636C' },
  cardActions: { alignItems: 'flex-end', gap: 8 },
  bookBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#F0FDF4', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 3,
  },
  bookBadgeText: { fontSize: 10, color: '#22C55E', fontWeight: '600' },
  deleteBtn: { padding: 6 },
  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#111827', marginTop: 14, marginBottom: 6 },
  emptyText: { fontSize: 14, color: '#57636C', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  exploreBtn: {
    backgroundColor: '#22C55E', borderRadius: 16,
    paddingHorizontal: 32, paddingVertical: 12,
  },
  exploreBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
