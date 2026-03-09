import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ImageBackground, FlatList, useWindowDimensions, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import { useGuestStore } from '../store/useGuestStore';
import { useTripStore } from '../store/useTripStore';

const BANNER_IMAGES = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800',
];

const SERVICE_QUICK = [
  { id: 'Medical',           label: 'Medical',    icon: 'medkit-outline',  color: '#EF4444' },
  { id: 'Currency Exchange', label: 'Currency',   icon: 'cash-outline',    color: '#2A0BBF' },
  { id: 'Transport',         label: 'Transport',  icon: 'car-outline',     color: '#047433' },
  { id: 'Police',            label: 'Police',     icon: 'shield-outline',  color: '#1D3557' },
  { id: 'seeAll',            label: 'See All',    icon: 'compass-outline', color: '#22C55E' },
];

type Props = { navigation: any };

export default function HomeScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const { user } = useAuthStore();
  const { isGuest, savedPlaces } = useGuestStore();
  const { destination, selectedVibes, explorationHours } = useTripStore();

  const [bannerIndex, setBannerIndex] = useState(0);
  const bannerRef = useRef<FlatList>(null);

  const displayName = user?.fullName?.split(' ')[0] || (isGuest ? 'Explorer' : 'Traveller');

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const next = (bannerIndex + 1) % BANNER_IMAGES.length;
      setBannerIndex(next);
      bannerRef.current?.scrollToIndex({ index: next, animated: true });
    }, 3500);
    return () => clearInterval(interval);
  }, [bannerIndex]);

  const hasSessionTrip = !!destination;

  const handleServicePress = (id: string) => {
    if (id === 'seeAll') {
      navigation.navigate('ServiceHub');
    } else {
      navigation.navigate('ServiceHub', { initialCategory: id });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Top bar ──────────────────────────────────────── */}
        <View style={styles.topBar}>
          <Image source={require('../../assets/logo-icon.png')} style={styles.logo} />
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.profileInitial}>{displayName[0].toUpperCase()}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Hero Banner ──────────────────────────────────── */}
        <View style={styles.bannerWrap}>
          <FlatList
            ref={bannerRef}
            data={BANNER_IMAGES}
            horizontal pagingEnabled scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => i.toString()}
            renderItem={({ item }) => (
              <ImageBackground
                source={{ uri: item }}
                style={[styles.banner, { width: width - 28 }]}
                imageStyle={styles.bannerImage}
              >
                <View style={styles.bannerOverlay}>
                  <Text style={styles.greeting}>{getGreeting()}, {displayName}</Text>
                  <Text style={styles.heroTitle}>Where's your next adventure?</Text>
                  <TouchableOpacity
                    style={styles.createTripBtn}
                    onPress={() => navigation.navigate('Create Trip')}
                  >
                    <Ionicons name="add" size={16} color="#fff" />
                    <Text style={styles.createTripBtnText}>Create Trip</Text>
                  </TouchableOpacity>
                </View>
              </ImageBackground>
            )}
          />
          <View style={styles.bannerDots}>
            {BANNER_IMAGES.map((_, i) => (
              <View key={i} style={[styles.bannerDot, i === bannerIndex && styles.bannerDotActive]} />
            ))}
          </View>
        </View>

        {/* ── ServiceHub quick icons ───────────────────────── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionLeft}>
            <Ionicons name="compass-outline" size={18} color="#111827" />
            <Text style={styles.sectionTitle}>ServiceHub</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('ServiceHub')} style={styles.seeAllBtn}>
            <Text style={styles.seeAllText}>See All</Text>
            <Ionicons name="chevron-forward" size={15} color="#22C55E" />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.serviceRow}>
          {SERVICE_QUICK.map(item => (
            <TouchableOpacity
              key={item.id}
              style={styles.serviceCard}
              onPress={() => handleServicePress(item.id)}
            >
              <Ionicons name={item.icon as any} size={26} color={item.color} />
              <Text style={styles.serviceLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Saved Places ─────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionLeft}>
            <Ionicons name="bookmark-outline" size={18} color="#111827" />
            <Text style={styles.sectionTitle}>Saved Places</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Saved')} style={styles.seeAllBtn}>
            <Text style={styles.seeAllText}>See All</Text>
            <Ionicons name="chevron-forward" size={15} color="#22C55E" />
          </TouchableOpacity>
        </View>

        {savedPlaces.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="bookmark-outline" size={36} color="#E5E5EA" />
            <Text style={styles.emptyTitle}>No saved places yet</Text>
            <Text style={styles.emptySubtitle}>Heart a place while browsing to save it here</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.savedRow}>
            {savedPlaces.slice(0, 8).map(place => (
              <TouchableOpacity key={place.placeId} style={styles.savedCard}>
                <ImageBackground
                  source={{ uri: place.photoUrl || BANNER_IMAGES[0] }}
                  style={styles.savedCardBg}
                  imageStyle={{ borderRadius: 16 }}
                >
                  <View style={styles.savedCardOverlay}>
                    <Text style={styles.savedCardName} numberOfLines={1}>{place.name}</Text>
                    {place.city ? <Text style={styles.savedCardCity}>{place.city}</Text> : null}
                  </View>
                </ImageBackground>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* ── Recent Trip (session-based) ───────────────────── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionLeft}>
            <Ionicons name="calendar-outline" size={18} color="#111827" />
            <Text style={styles.sectionTitle}>Recent Trip</Text>
          </View>
        </View>

        {hasSessionTrip ? (
          <TouchableOpacity
            style={styles.recentTripCard}
            onPress={() => navigation.navigate('Create Trip')}
          >
            <View style={styles.recentTripContent}>
              <View style={styles.recentTripIcon}>
                <Ionicons name="location" size={22} color="#22C55E" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.recentTripDest}>{destination}</Text>
                <Text style={styles.recentTripMeta}>
                  {explorationHours}h{selectedVibes.length > 0 ? ` · ${selectedVibes.slice(0, 2).join(', ')}` : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="map-outline" size={36} color="#E5E5EA" />
            <Text style={styles.emptyTitle}>No trips yet</Text>
            <Text style={styles.emptySubtitle}>Create your first trip to get started!</Text>
            <TouchableOpacity
              style={styles.startBtn}
              onPress={() => navigation.navigate('Create Trip')}
            >
              <Text style={styles.startBtnText}>Create Trip</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { paddingBottom: 20 },
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingTop: 8, paddingBottom: 4,
  },
  logo: { width: 50, height: 44, resizeMode: 'contain' },
  profileBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center',
  },
  profileInitial: { color: '#fff', fontWeight: '700', fontSize: 15 },
  bannerWrap: { marginHorizontal: 14, marginTop: 4, marginBottom: 16 },
  banner: { height: 210, borderRadius: 20, overflow: 'hidden' },
  bannerImage: { borderRadius: 20 },
  bannerOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.38)',
    borderRadius: 20, padding: 20, justifyContent: 'flex-end',
  },
  greeting: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 14, lineHeight: 28 },
  createTripBtn: {
    alignSelf: 'flex-start', backgroundColor: '#22C55E',
    borderRadius: 20, paddingHorizontal: 18, paddingVertical: 8,
    flexDirection: 'row', alignItems: 'center', gap: 5,
  },
  createTripBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  bannerDots: { flexDirection: 'row', justifyContent: 'center', marginTop: 8, gap: 6 },
  bannerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E5E5EA' },
  bannerDotActive: { backgroundColor: '#22C55E', width: 18 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, marginBottom: 10, marginTop: 6,
  },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { fontSize: 13, color: '#22C55E', fontWeight: '500' },
  serviceRow: { paddingLeft: 14, marginBottom: 18 },
  serviceCard: {
    width: 76, height: 76, borderRadius: 18,
    borderWidth: 1, borderColor: '#E5E5EA',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10, backgroundColor: '#fff', gap: 4,
  },
  serviceLabel: { fontSize: 10, textAlign: 'center', color: '#57636C', fontWeight: '500' },
  savedRow: { paddingLeft: 14, marginBottom: 18 },
  savedCard: { width: 140, height: 110, borderRadius: 16, marginRight: 12, overflow: 'hidden' },
  savedCardBg: { width: 140, height: 110, justifyContent: 'flex-end' },
  savedCardOverlay: {
    backgroundColor: 'rgba(0,0,0,0.42)',
    padding: 10, borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
  },
  savedCardName: { fontSize: 13, fontWeight: '700', color: '#fff' },
  savedCardCity: { fontSize: 11, color: 'rgba(255,255,255,0.75)' },
  emptyCard: {
    alignItems: 'center', paddingVertical: 28,
    marginHorizontal: 14, borderRadius: 18,
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#F2F2F7',
    marginBottom: 18,
  },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginTop: 10, marginBottom: 4 },
  emptySubtitle: { fontSize: 13, color: '#57636C', textAlign: 'center', paddingHorizontal: 20, marginBottom: 14 },
  startBtn: { backgroundColor: '#22C55E', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 10 },
  startBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  recentTripCard: {
    marginHorizontal: 14, borderRadius: 16,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E5EA',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2, marginBottom: 16,
  },
  recentTripContent: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  recentTripIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center',
  },
  recentTripDest: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 2 },
  recentTripMeta: { fontSize: 13, color: '#57636C' },
});
