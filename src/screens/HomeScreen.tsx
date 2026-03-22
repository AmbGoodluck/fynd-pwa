import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ImageBackground, FlatList, useWindowDimensions, Image, Modal,
  TouchableWithoutFeedback, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import { useGuestStore } from '../store/useGuestStore';
import { useTripStore } from '../store/useTripStore';
import { useRecentTripStore } from '../store/useRecentTripStore';
import { useTabBarHeight } from '../hooks/useTabBarHeight';
import { F } from '../theme/fonts';
import PWATopBar from '../components/PWATopBar';
import { LOGO_SIZE } from '../theme/sizes';


const BANNER_IMAGES = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800',
  'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=800',
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800',
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
  const { user, isAuthenticated } = useAuthStore();
  const { isGuest } = useGuestStore();
  const { destination, selectedVibes, explorationHours } = useTripStore();
  const { recentTrips } = useRecentTripStore();
  const [bannerIndex, setBannerIndex] = useState(0);
  const bannerRef = useRef<FlatList>(null);
  const [showServiceHubGuestModal, setShowServiceHubGuestModal] = useState(false);
  const tabBarHeight = useTabBarHeight();

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
      // scrollToOffset is more reliable on web than scrollToIndex
      const itemWidth = width - 40; // matches bannerWrap marginHorizontal: 20
      bannerRef.current?.scrollToOffset({ offset: itemWidth * next, animated: true });
    }, 4000);
    return () => clearInterval(interval);
  }, [bannerIndex, width]);

  const hasSessionTrip = !!destination;

  const handleServicePress = (id: string) => {
    if (isGuest || !isAuthenticated) {
      setShowServiceHubGuestModal(true);
      return;
    }
    if (id === 'seeAll') {
      navigation.navigate('ServiceHub');
    } else {
      navigation.navigate('ServiceHub', { initialCategory: id });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={Platform.OS === 'web' ? [] : ['top']}>
      {/* ── Web: PWATopBar replaces native topBar ─────────────────── */}
      {Platform.OS === 'web' && (
        <PWATopBar
          onSharedTripsPress={() => navigation.navigate('SharedTrips')}
          onProfilePress={() => navigation.navigate('Profile')}
        />
      )}
      {/* ── Native only topBar ──────────────────────────────────────── */}
      {Platform.OS !== 'web' && <View style={styles.topBar}>
        <Image source={require('../../assets/logo-icon.png')} style={styles.logo} />
        <View style={styles.premiumBadge}>
          <Ionicons name="star" size={10} color="#fff" />
          <Text style={styles.premiumBadgeText}>Plus</Text>
        </View>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={styles.sharedTripsBtn}
          onPress={() => navigation.navigate('SharedTrips')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="people-outline" size={22} color="#22C55E" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('Profile')}>
          <Text style={styles.profileInitial}>{displayName?.[0]?.toUpperCase() ?? '?'}</Text>
        </TouchableOpacity>
      </View>}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Hero Banner ──────────────────────────────────── */}
        <View style={styles.bannerWrap}>
          <FlatList
            ref={bannerRef}
            data={BANNER_IMAGES}
            horizontal pagingEnabled scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => i.toString()}
            getItemLayout={(_: any, index: number) => ({
              length: width - 40,
              offset: (width - 40) * index,
              index,
            })}
            renderItem={({ item }: { item: string }) => (
              <ImageBackground
                source={{ uri: item }}
                style={[styles.banner, { width: width - 40 }]}
                imageStyle={styles.bannerImage}
              >
                <View style={styles.bannerOverlay}>
                  <Text style={styles.greeting}>{getGreeting()}, {displayName}</Text>
                  <Text style={styles.heroTitle}>Where's your next adventure?</Text>
                  <TouchableOpacity
                    style={styles.createTripBtn}
                    onPress={() => navigation.navigate('Create Trip')}
                  >
                    <Ionicons name="add" size={18} color="#fff" />
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
            <Ionicons name="compass-outline" size={20} color="#111827" />
            <Text style={styles.sectionTitle}>ServiceHub</Text>
          </View>
          {!isGuest && isAuthenticated && (
            <TouchableOpacity onPress={() => navigation.navigate('ServiceHub')} style={styles.seeAllBtn}>
              <Text style={styles.seeAllText}>See All</Text>
              <Ionicons name="chevron-forward" size={15} color="#22C55E" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.serviceRow} contentContainerStyle={{ paddingRight: 20 }}>
          {SERVICE_QUICK.map(item => (
            <TouchableOpacity
              key={item.id}
              style={styles.serviceCard}
              onPress={() => handleServicePress(item.id)}
            >
              <View style={[styles.serviceIconWrap, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon as any} size={32} color={item.color} />
              </View>
              <Text style={styles.serviceLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Recent Trips ──────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionLeft}>
            <Ionicons name="calendar-outline" size={18} color="#111827" />
            <Text style={styles.sectionTitle}>Recent Trips</Text>
          </View>
        </View>

        {recentTrips.length > 0 ? (
          // Firestore-backed list (populated after login + after Navigate tap)
          recentTrips.slice(0, 3).map((trip) => (
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
                destination: trip.city || 'Your Trip',
                tripId: trip.trip_id,
              })}
            >
              <View style={styles.recentTripContent}>
                <View style={styles.recentTripIcon}>
                  <Ionicons name="location" size={24} color="#22C55E" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recentTripDest}>{trip.city || 'Your Trip'}</Text>
                  <Text style={styles.recentTripMeta}>
                    {trip.places.length} place{trip.places.length !== 1 ? 's' : ''}
                    {trip.places[0] ? ` · ${trip.places[0].name}` : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          ))
        ) : hasSessionTrip ? (
          // Session fallback — shown before first login / before first Navigate tap
          <TouchableOpacity
            style={styles.recentTripCard}
            onPress={() => navigation.navigate('Create Trip')}
          >
            <View style={styles.recentTripContent}>
              <View style={styles.recentTripIcon}>
                <Ionicons name="location" size={24} color="#22C55E" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.recentTripDest}>{destination}</Text>
                <Text style={styles.recentTripMeta}>
                  {explorationHours}h{(selectedVibes?.length ?? 0) > 0 ? ` · ${selectedVibes.slice(0, 2).join(', ')}` : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="map-outline" size={44} color="#22C55E" />
            </View>
            <Text style={styles.emptyTitle}>Your next story starts here</Text>
            <Text style={styles.emptySubtitle}>Plan a custom itinerary and explore the world like a local.</Text>
            <TouchableOpacity
              style={styles.startBtn}
              onPress={() => navigation.navigate('Create Trip')}
            >
              <Ionicons name="sparkles" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.startBtnText}>Start Planning</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: tabBarHeight + 20 }} />
      </ScrollView>

      {/* ServiceHub Guest Restriction Modal */}
      <Modal
        visible={showServiceHubGuestModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowServiceHubGuestModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowServiceHubGuestModal(false)}>
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
                  onPress={() => { setShowServiceHubGuestModal(false); navigation.navigate('Login'); }}
                >
                  <Text style={styles.modalPrimaryBtnText}>Sign In</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalOutlineBtn}
                  onPress={() => { setShowServiceHubGuestModal(false); navigation.navigate('Register'); }}
                >
                  <Text style={styles.modalOutlineBtnText}>Create Account</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalGhostBtn}
                  onPress={() => setShowServiceHubGuestModal(false)}
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
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  scroll: { paddingBottom: 24 },
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16,
  },
  logo: { width: LOGO_SIZE, height: LOGO_SIZE, resizeMode: 'contain' },
  premiumBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#22C55E', borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 3, marginLeft: 6,
  },
  premiumBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  sharedTripsBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center',
    marginRight: 8,
  },
  profileBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#22C55E', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  profileInitial: { color: '#fff', fontWeight: '700', fontSize: 16 },
  bannerWrap: { marginHorizontal: 20, marginTop: 8, marginBottom: 20 },
  banner: { height: 260, borderRadius: 24, overflow: 'hidden' },
  bannerImage: { borderRadius: 24 },
  bannerOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 24, padding: 24, justifyContent: 'flex-end',
  },
  greeting: { fontSize: 16, fontFamily: F.medium, color: 'rgba(255,255,255,0.9)', marginBottom: 6, letterSpacing: 0.2 },
  heroTitle: { fontSize: 30, fontFamily: F.bold, color: '#fff', marginBottom: 20, lineHeight: 36, letterSpacing: -0.5 },
  createTripBtn: {
    alignSelf: 'flex-start', backgroundColor: '#22C55E',
    borderRadius: 22, paddingHorizontal: 24, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    shadowColor: '#22C55E', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  createTripBtnText: { color: '#fff', fontFamily: F.bold, fontSize: 15 },
  bannerDots: { flexDirection: 'row', justifyContent: 'center', marginTop: 12, gap: 6 },
  bannerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D1D5DB' },
  bannerDotActive: { backgroundColor: '#22C55E', width: 22, borderRadius: 3 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 16, marginTop: 12,
  },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { fontSize: 20, fontFamily: F.bold, color: '#111827', letterSpacing: -0.3 },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  seeAllText: { fontSize: 13, color: '#22C55E', fontFamily: F.bold },
  serviceRow: { paddingLeft: 20, marginBottom: 24 },
  serviceCard: {
    width: 90, height: 110, borderRadius: 24,
    borderWidth: 1.5, borderColor: '#F2F2F7',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 16, backgroundColor: '#fff', gap: 8,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  serviceIconWrap: {
    width: 56, height: 56, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  serviceLabel: { fontSize: 12, textAlign: 'center', color: '#4B5563', fontFamily: F.semibold },
  recentTripDest: { fontSize: 17, fontFamily: F.bold, color: '#111827', marginBottom: 4 },
  recentTripMeta: { fontSize: 14, fontFamily: F.medium, color: '#6B7280' },
  emptyCard: {
    alignItems: 'center', paddingVertical: 40,
    marginHorizontal: 20, borderRadius: 28,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#F2F2F7',
    marginBottom: 24,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15, shadowOffset: { width: 0, height: 5 }, elevation: 2,
  },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#F0FDF4', alignItems: 'center',
    justifyContent: 'center', marginBottom: 20,
  },
  emptyTitle: { fontSize: 18, fontFamily: F.bold, color: '#111827', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', paddingHorizontal: 32, marginBottom: 24, lineHeight: 22, fontFamily: F.regular },
  startBtn: { backgroundColor: '#22C55E', borderRadius: 20, paddingHorizontal: 32, paddingVertical: 14, flexDirection: 'row', alignItems: 'center' },
  startBtnText: { color: '#fff', fontFamily: F.bold, fontSize: 16 },
  recentTripCard: {
    marginHorizontal: 20, borderRadius: 24,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#F2F2F7',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 2, marginBottom: 18,
  },
  recentTripContent: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 16 },
  recentTripIcon: {
    width: 50, height: 50, borderRadius: 16,
    backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center',
  },
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
    fontSize: 22, fontFamily: F.bold, color: '#111827',
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
  modalPrimaryBtnText: { color: '#fff', fontSize: 16, fontFamily: F.bold },
  modalOutlineBtn: {
    width: '100%', borderWidth: 1.5, borderColor: '#22C55E',
    borderRadius: 16, height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  modalOutlineBtnText: { color: '#22C55E', fontSize: 16, fontFamily: F.semibold },
  modalGhostBtn: { paddingVertical: 10, paddingHorizontal: 20 },
  modalGhostBtnText: { color: '#9CA3AF', fontSize: 14, fontFamily: F.medium },
});
