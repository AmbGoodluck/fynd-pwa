import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ImageBackground, FlatList, useWindowDimensions, Image, Modal,
  TouchableWithoutFeedback,
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
  const { isGuest } = useGuestStore();
  const { destination, selectedVibes, explorationHours } = useTripStore();

  const [bannerIndex, setBannerIndex] = useState(0);
  const bannerRef = useRef<FlatList>(null);
  const [showServiceHubGuestModal, setShowServiceHubGuestModal] = useState(false);

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
    if (isGuest) {
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Top bar ──────────────────────────────────────── */}
        <View style={styles.topBar}>
          <Image source={require('../../assets/logo-icon.png')} style={styles.logo} />
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
          {!isGuest && (
            <TouchableOpacity onPress={() => navigation.navigate('ServiceHub')} style={styles.seeAllBtn}>
              <Text style={styles.seeAllText}>See All</Text>
              <Ionicons name="chevron-forward" size={15} color="#22C55E" />
            </TouchableOpacity>
          )}
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
                  {explorationHours}h{(selectedVibes?.length ?? 0) > 0 ? ` · ${selectedVibes.slice(0, 2).join(', ')}` : ''}
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
  scroll: { paddingBottom: 20 },
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6,
    backgroundColor: '#fff',
  },
  logo: { width: 50, height: 44, resizeMode: 'contain' },
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
  banner: { height: 220, borderRadius: 24, overflow: 'hidden' },
  bannerImage: { borderRadius: 24 },
  bannerOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.36)',
    borderRadius: 24, padding: 22, justifyContent: 'flex-end',
  },
  greeting: { fontSize: 14, color: 'rgba(255,255,255,0.82)', marginBottom: 4, letterSpacing: 0.2 },
  heroTitle: { fontSize: 23, fontWeight: '800', color: '#fff', marginBottom: 16, lineHeight: 30, letterSpacing: -0.3 },
  createTripBtn: {
    alignSelf: 'flex-start', backgroundColor: '#22C55E',
    borderRadius: 22, paddingHorizontal: 20, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    shadowColor: '#22C55E', shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
  createTripBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  bannerDots: { flexDirection: 'row', justifyContent: 'center', marginTop: 10, gap: 6 },
  bannerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D1D5DB' },
  bannerDotActive: { backgroundColor: '#22C55E', width: 20, borderRadius: 3 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 12, marginTop: 8,
  },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', letterSpacing: -0.2 },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  seeAllText: { fontSize: 13, color: '#22C55E', fontWeight: '600' },
  serviceRow: { paddingLeft: 20, marginBottom: 20 },
  serviceCard: {
    width: 80, height: 80, borderRadius: 20,
    borderWidth: 1, borderColor: '#F0F0F5',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12, backgroundColor: '#fff', gap: 5,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  serviceLabel: { fontSize: 10, textAlign: 'center', color: '#57636C', fontWeight: '600' },
  savedRow: { paddingLeft: 20, marginBottom: 20 },
  savedCard: { width: 148, height: 116, borderRadius: 18, marginRight: 12, overflow: 'hidden' },
  savedCardBg: { width: 148, height: 116, justifyContent: 'flex-end' },
  savedCardOverlay: {
    backgroundColor: 'rgba(0,0,0,0.44)',
    padding: 10, borderBottomLeftRadius: 18, borderBottomRightRadius: 18,
  },
  savedCardName: { fontSize: 13, fontWeight: '700', color: '#fff' },
  savedCardCity: { fontSize: 11, color: 'rgba(255,255,255,0.75)' },
  emptyCard: {
    alignItems: 'center', paddingVertical: 30,
    marginHorizontal: 20, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#F0F0F5',
    marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginTop: 12, marginBottom: 4 },
  emptySubtitle: { fontSize: 13, color: '#6B7280', textAlign: 'center', paddingHorizontal: 24, marginBottom: 16, lineHeight: 20 },
  startBtn: { backgroundColor: '#22C55E', borderRadius: 16, paddingHorizontal: 28, paddingVertical: 12 },
  startBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  recentTripCard: {
    marginHorizontal: 20, borderRadius: 18,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#F0F0F5',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }, elevation: 2, marginBottom: 18,
  },
  recentTripContent: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  recentTripIcon: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center',
  },
  recentTripDest: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 3 },
  recentTripMeta: { fontSize: 13, color: '#6B7280' },
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
