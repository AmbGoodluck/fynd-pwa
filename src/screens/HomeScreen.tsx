import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ImageBackground, Modal, TouchableWithoutFeedback, Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuthStore } from '../store/useAuthStore';
import { useGuestStore } from '../store/useGuestStore';
import { useRecentTripStore } from '../store/useRecentTripStore';
import { useTabBarHeight } from '../hooks/useTabBarHeight';
import { F } from '../theme/fonts';
import { COLORS } from '../theme/tokens';
import PWATopBar from '../components/PWATopBar';
import AppBar from '../components/AppBar';
import { FALLBACK_IMAGE } from '../constants';
import { formatRelativeDate } from '../utils/date';
import { deleteItinerary } from '../services/database';
import CampusBanner from '../components/home/CampusBanner';
import ThingsToDoSection from '../components/home/ThingsToDoSection';

const SERVICE_QUICK = [
  { id: 'Medical',           label: 'Medical',    icon: 'medkit-outline',  color: '#EF4444' },
  { id: 'Currency Exchange', label: 'Currency',   icon: 'cash-outline',    color: '#2A0BBF' },
  { id: 'Transport',         label: 'Transport',  icon: 'car-outline',     color: '#047433' },
  { id: 'Police',            label: 'Police',     icon: 'shield-outline',  color: '#1D3557' },
  { id: 'seeAll',            label: 'See All',    icon: 'compass-outline', color: '#10B981' },
];

type Props = { navigation: any };

export default function HomeScreen({ navigation }: Props) {
  const { isAuthenticated } = useAuthStore();
  const { isGuest } = useGuestStore();
  const { recentTrips, isHydrating, fetchError, removeTrip } = useRecentTripStore();
  const [showServiceHubGuestModal, setShowServiceHubGuestModal] = useState(false);
  const tabBarHeight = useTabBarHeight();

  const handleDeleteTrip = (trip_id: string) => {
    removeTrip(trip_id);
    deleteItinerary(trip_id).catch(() => {});
  };

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
      {/* ── Web: PWATopBar ──────────────────────────────────────────── */}
      {Platform.OS === 'web' && (
        <PWATopBar
          onSharedTripsPress={() => navigation.navigate('SharedTrips')}
          onProfilePress={() => navigation.navigate('Profile')}
          onNotificationsPress={() => navigation.navigate('Notifications')}
        />
      )}
      {/* ── Native: AppBar ──────────────────────────────────────────── */}
      {Platform.OS !== 'web' && (
        <AppBar
          variant="root"
          onProfilePress={() => navigation.navigate('Profile')}
        />
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* 1. Campus banner */}
        <CampusBanner />


        {/* 3. Things to Do — real Firestore places */}
        <ThingsToDoSection navigation={navigation} />

        {/* 4. ServiceHub quick icons */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionLeft}>
            <Ionicons name="compass-outline" size={20} color={COLORS.text.primary} />
            <Text style={styles.sectionTitle}>ServiceHub</Text>
          </View>
          {!isGuest && isAuthenticated && (
            <TouchableOpacity onPress={() => navigation.navigate('ServiceHub')} style={styles.seeAllBtn}>
              <Text style={styles.seeAllText}>See All</Text>
              <Ionicons name="chevron-forward" size={15} color="#10B981" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.serviceRow}
          contentContainerStyle={{ paddingRight: 20 }}
        >
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

        {/* 5. Recent Itineraries — hidden when list is empty and not loading */}
        {(isHydrating || fetchError || recentTrips.length > 0) && <View style={styles.sectionHeader}>
          <View style={styles.sectionLeft}>
            <Ionicons name="calendar-outline" size={18} color={COLORS.text.primary} />
            <Text style={styles.sectionTitle}>Recent Itineraries</Text>
          </View>
          {recentTrips.length > 0 && (
            <TouchableOpacity onPress={() => navigation.navigate('Saved')} style={styles.seeAllBtn}>
              <Text style={styles.seeAllText}>See All</Text>
              <Ionicons name="chevron-forward" size={15} color="#10B981" />
            </TouchableOpacity>
          )}
        </View>}

        {isHydrating && recentTrips.length === 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.itineraryRow}
            contentContainerStyle={{ paddingLeft: 20, paddingRight: 8 }}
            scrollEnabled={false}
          >
            {[0, 1, 2].map(i => (
              <View key={i} style={[styles.itineraryCard, styles.skeletonCard]}>
                <ActivityIndicator size="small" color="#E5E7EB" style={{ opacity: 0 }} />
              </View>
            ))}
          </ScrollView>
        ) : fetchError ? (
          <View style={styles.fetchErrorCard}>
            <Ionicons name="cloud-offline-outline" size={32} color="#9CA3AF" />
            <Text style={styles.fetchErrorText}>Couldn't load your trips</Text>
            <TouchableOpacity
              style={styles.fetchRetryBtn}
              onPress={() => {
                if (Platform.OS === 'web') (window as any).location.reload();
              }}
            >
              <Text style={styles.fetchRetryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : recentTrips.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.itineraryRow}
            contentContainerStyle={{ paddingLeft: 20, paddingRight: 8 }}
          >
            {recentTrips.slice(0, 6).map(trip => {
              const coverImage = trip.places[0]?.image || FALLBACK_IMAGE;
              const cityLabel = trip.city || 'My Trip';
              const dateLabel = formatRelativeDate(trip.last_accessed || trip.created_at);
              return (
                <View key={trip.trip_id} style={styles.itineraryCard}>
                  <TouchableOpacity
                    style={{ flex: 1 }}
                    activeOpacity={0.85}
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
                      destination: cityLabel,
                      tripId: trip.trip_id,
                    })}
                  >
                    <ImageBackground
                      source={{ uri: coverImage }}
                      style={styles.itineraryCardBg}
                      imageStyle={styles.itineraryCardImg}
                    >
                      <View style={styles.itineraryCardOverlay}>
                        <Text style={styles.itineraryCardCity} numberOfLines={1}>{cityLabel}</Text>
                        <Text style={styles.itineraryCardDate}>{dateLabel}</Text>
                      </View>
                    </ImageBackground>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.itineraryDeleteBtn}
                    onPress={() => handleDeleteTrip(trip.trip_id)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="close" size={12} color="#fff" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        ) : (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="map-outline" size={44} color="#10B981" />
            </View>
            <Text style={styles.emptyTitle}>Your next story starts here</Text>
            <Text style={styles.emptySubtitle}>
              Plan a custom itinerary and explore the world like a local.
            </Text>
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

      {/* ServiceHub Guest Modal */}
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
                  <Ionicons name="compass-outline" size={32} color="#10B981" />
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
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll:    { paddingBottom: 24 },

  // Section header
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 16, marginTop: 24,
  },
  sectionLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { fontSize: 17, fontFamily: F.semibold, color: COLORS.text.primary },
  seeAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
  },
  seeAllText: { fontSize: 13, color: '#10B981', fontFamily: F.bold },

  // ServiceHub row
  serviceRow: { paddingLeft: 20, marginBottom: 8 },
  serviceCard: {
    width: 90, height: 110, borderRadius: 24,
    borderWidth: 1.5, borderColor: '#F2F2F7',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 16, backgroundColor: '#fff', gap: 8,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  serviceIconWrap: {
    width: 56, height: 56, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  serviceLabel: { fontSize: 12, textAlign: 'center', color: '#4B5563', fontFamily: F.semibold },

  // Recent itineraries
  itineraryRow: { marginBottom: 24 },
  skeletonCard: { backgroundColor: '#E5E7EB' },
  itineraryCard: {
    width: 140, height: 140, borderRadius: 20,
    marginRight: 12, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  itineraryCardBg:      { flex: 1 },
  itineraryCardImg:     { borderRadius: 20 },
  itineraryCardOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.38)',
    borderRadius: 20, justifyContent: 'flex-end', padding: 12,
  },
  itineraryCardCity: { fontSize: 14, fontFamily: F.bold, color: '#fff', letterSpacing: -0.2 },
  itineraryCardDate: { fontSize: 11, fontFamily: F.medium, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  itineraryDeleteBtn: {
    position: 'absolute', top: 8, right: 8,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Empty state
  emptyCard: {
    alignItems: 'center', paddingVertical: 40,
    marginHorizontal: 20, borderRadius: 28,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#F2F2F7',
    marginBottom: 24,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15,
    shadowOffset: { width: 0, height: 5 }, elevation: 2,
  },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#F0FDF4', alignItems: 'center',
    justifyContent: 'center', marginBottom: 20,
  },
  emptyTitle:    { fontSize: 18, fontFamily: F.bold, color: COLORS.text.primary, marginBottom: 8 },
  emptySubtitle: {
    fontSize: 14, color: COLORS.text.secondary, textAlign: 'center',
    paddingHorizontal: 32, marginBottom: 24, lineHeight: 22, fontFamily: F.regular,
  },
  startBtn: {
    backgroundColor: '#10B981', borderRadius: 20,
    paddingHorizontal: 32, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center',
  },
  startBtnText: { color: '#fff', fontFamily: F.bold, fontSize: 16 },

  // Error card
  fetchErrorCard: {
    alignItems: 'center', paddingVertical: 28,
    marginHorizontal: 20, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#F2F2F7',
    marginBottom: 24, gap: 8,
  },
  fetchErrorText: { fontSize: 14, fontFamily: F.medium, color: COLORS.text.secondary },
  fetchRetryBtn: {
    marginTop: 4, backgroundColor: '#F0FDF4', borderRadius: 14,
    paddingHorizontal: 20, paddingVertical: 8,
    borderWidth: 1, borderColor: '#10B981',
  },
  fetchRetryBtnText: { fontSize: 13, fontFamily: F.semibold, color: '#10B981' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
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
  modalTitle: { fontSize: 22, fontFamily: F.bold, color: COLORS.text.primary, marginBottom: 10, textAlign: 'center' },
  modalBody: { fontSize: 14, color: '#57636C', textAlign: 'center', lineHeight: 22, marginBottom: 24, paddingHorizontal: 4 },
  modalPrimaryBtn: {
    width: '100%', backgroundColor: '#10B981', borderRadius: 16,
    height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  modalPrimaryBtnText: { color: '#fff', fontSize: 16, fontFamily: F.bold },
  modalOutlineBtn: {
    width: '100%', borderWidth: 1.5, borderColor: '#10B981',
    borderRadius: 16, height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  modalOutlineBtnText: { color: '#10B981', fontSize: 16, fontFamily: F.semibold },
  modalGhostBtn: { paddingVertical: 10, paddingHorizontal: 20 },
  modalGhostBtnText: { color: '#9CA3AF', fontSize: 14, fontFamily: F.medium },
});
