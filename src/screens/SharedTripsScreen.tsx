import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { F } from '../theme/fonts';
import AppHeader from '../components/AppHeader';
import { useSharedTripStore } from '../store/useSharedTripStore';
import { useAuthStore } from '../store/useAuthStore';
import {
  getMyCreatedTrips,
  getJoinedTrips,
  deleteSharedTrip,
} from '../services/sharedTripService';
import type { SharedTrip } from '../types/sharedTrip';

type Props = { navigation: any };

function TripCard({
  trip,
  isOwner,
  onPress,
  onDelete,
  onMoments,
}: {
  trip: SharedTrip;
  isOwner: boolean;
  onPress: () => void;
  onDelete?: () => void;
  onMoments?: () => void;
}) {
  const preview = trip.places.slice(0, 3);

  return (
    // Outer View — NOT a TouchableOpacity, so nested buttons don't conflict
    <View style={styles.card}>
      {/* Tappable content area — opens the trip */}
      <TouchableOpacity
        style={styles.cardPressable}
        onPress={onPress}
        activeOpacity={0.88}
      >
        {/* Preview thumbnails */}
        <View style={styles.thumbRow}>
          {preview.map((p, i) => (
            <Image
              key={i}
              source={{
                uri:
                  p.photoUrl ||
                  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=200',
              }}
              style={[styles.thumb, i > 0 && { marginLeft: -12 }]}
            />
          ))}
          {trip.places.length > 3 && (
            <View style={[styles.thumb, styles.thumbMore, { marginLeft: -12 }]}>
              <Text style={styles.thumbMoreText}>+{trip.places.length - 3}</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {trip.trip_name}
          </Text>
          <Text style={styles.cardSub} numberOfLines={1}>
            {isOwner ? 'Created by You' : `Created by ${trip.owner_name}`}
          </Text>

          <View style={styles.cardMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={13} color="#6B7280" />
              <Text style={styles.metaText}>{trip.places.length} place{trip.places.length !== 1 ? 's' : ''}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={13} color="#6B7280" />
              <Text style={styles.metaText}>{trip.member_count} explorer{trip.member_count !== 1 ? 's' : ''}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={13} color="#6B7280" />
              <Text style={styles.metaText}>{trip.trip_date}</Text>
            </View>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={20} color="#D1D5DB" style={{ marginLeft: 4 }} />
      </TouchableOpacity>

      {/* Moments button — opens the moments gallery for this trip */}
      {onMoments && (
        <TouchableOpacity
          onPress={onMoments}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.momentsBtn}
        >
          <Ionicons name="camera-outline" size={18} color="#22C55E" />
        </TouchableOpacity>
      )}

      {/* Delete button — sibling of the card press area, no nesting issues */}
      {isOwner && onDelete && (
        <TouchableOpacity
          onPress={onDelete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.deleteBtn}
        >
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function SharedTripsScreen({ navigation }: Props) {
  const {
    sessionUserId,
    myTrips,
    joinedTrips,
    setMyTrips,
    setJoinedTrips,
    removeMyTrip,
    addMyTrip,
  } = useSharedTripStore();

  const { user: authUser } = useAuthStore();
  const effectiveUserId = authUser?.id || sessionUserId;

  const [activeTab, setActiveTab] = useState<'created' | 'joined'>('created');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // In-app delete confirmation (web-safe — no Alert.alert)
  const [pendingDeleteTrip, setPendingDeleteTrip] = useState<SharedTrip | null>(null);

  const loadTrips = useCallback(async () => {
    setFetchError(false);
    try {
      const [created, joined] = await Promise.all([
        getMyCreatedTrips(effectiveUserId),
        getJoinedTrips(effectiveUserId),
      ]);
      setMyTrips(created);
      setJoinedTrips(joined);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [effectiveUserId]);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  const onRefresh = () => {
    setRefreshing(true);
    loadTrips();
  };

  const openTrip = (trip: SharedTrip) => {
    navigation.navigate('SharedTripDetail', { trip_id: trip.trip_id });
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteTrip) return;
    const trip = pendingDeleteTrip;
    setPendingDeleteTrip(null);
    setDeleteError(null);
    setDeleting(true);
    // Optimistic: remove immediately
    removeMyTrip(trip.trip_id);
    try {
      await deleteSharedTrip(trip.trip_id, effectiveUserId);
    } catch {
      // Rollback on failure and re-open modal with error message
      addMyTrip(trip);
      setDeleteError('Failed to delete trip. Please try again.');
      setPendingDeleteTrip(trip);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="Shared Trips" onBack={() => navigation.goBack()} />

      {/* ── Tab Bar ──────────────────────────────────────────── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'created' && styles.tabActive]}
          onPress={() => setActiveTab('created')}
        >
          <Text style={[styles.tabText, activeTab === 'created' && styles.tabTextActive]}>
            My Trips {myTrips.length > 0 ? `(${myTrips.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'joined' && styles.tabActive]}
          onPress={() => setActiveTab('joined')}
        >
          <Text style={[styles.tabText, activeTab === 'joined' && styles.tabTextActive]}>
            Shared With Me {joinedTrips.length > 0 ? `(${joinedTrips.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Fetch error banner ───────────────────────────────── */}
      {fetchError && !loading && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning-outline" size={14} color="#fff" />
          <Text style={styles.errorBannerText}>Couldn't refresh trips</Text>
          <TouchableOpacity onPress={onRefresh} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.errorBannerRetry}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#22C55E" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#22C55E"
            />
          }
        >
          {activeTab === 'created' ? (
            <View style={styles.section}>
              {myTrips.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="map-outline" size={36} color="#D1D5DB" />
                  <Text style={styles.emptyText}>No trips created yet</Text>
                  <Text style={styles.emptyHint}>
                    Share an itinerary to invite your team
                  </Text>
                </View>
              ) : (
                [...myTrips].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((t) => (
                  <TripCard
                    key={t.trip_id}
                    trip={t}
                    isOwner
                    onPress={() => openTrip(t)}
                    onDelete={() => setPendingDeleteTrip(t)}
                    onMoments={() => navigation.navigate('Moments', { trip_id: t.trip_id, tripName: t.trip_name, isMember: true })}
                  />
                ))
              )}
            </View>
          ) : (
            <View style={styles.section}>
              {joinedTrips.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="people-outline" size={36} color="#D1D5DB" />
                  <Text style={styles.emptyText}>No shared trips yet</Text>
                  <Text style={styles.emptyHint}>
                    Ask someone to share a trip link with you
                  </Text>
                </View>
              ) : (
                [...joinedTrips].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((t) => (
                  <TripCard
                    key={t.trip_id}
                    trip={t}
                    isOwner={false}
                    onPress={() => openTrip(t)}
                    onMoments={() => navigation.navigate('Moments', { trip_id: t.trip_id, tripName: t.trip_name, isMember: true })}
                  />
                ))
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Delete Confirmation Modal ─────────────────────── */}
      <Modal
        visible={!!pendingDeleteTrip}
        transparent
        animationType="slide"
        onRequestClose={() => setPendingDeleteTrip(null)}
      >
        <TouchableWithoutFeedback onPress={() => setPendingDeleteTrip(null)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.sheet}>
                <View style={styles.sheetHandle} />
                <View style={styles.sheetIconWrap}>
                  <Ionicons name="trash-outline" size={32} color="#EF4444" />
                </View>
                <Text style={styles.sheetTitle}>Delete Trip?</Text>
                <Text style={styles.sheetBody}>
                  "{pendingDeleteTrip?.trip_name}" will be removed for all members and cannot be undone.
                </Text>
                {deleteError ? (
                  <Text style={styles.sheetError}>{deleteError}</Text>
                ) : null}
                <TouchableOpacity
                  style={styles.deleteConfirmBtn}
                  onPress={handleConfirmDelete}
                  disabled={deleting}
                >
                  {deleting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.deleteConfirmBtnText}>Delete Trip</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setPendingDeleteTrip(null)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
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
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 40 },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  errorBannerText: { flex: 1, fontSize: 13, color: '#fff', fontFamily: F.medium },
  errorBannerRetry: { fontSize: 13, color: '#fff', fontFamily: F.bold, textDecorationLine: 'underline' },

  tabBar: {
    flexDirection: 'row',
    gap: 24,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  tab: {
    paddingBottom: 12,
    paddingTop: 14,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#22C55E' },
  tabText: { fontSize: 15, color: '#6B7280', fontFamily: F.semibold },
  tabTextActive: { color: '#111827' },

  section: { marginTop: 20, paddingHorizontal: 16 },

  emptyBox: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F2F2F7',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: F.semibold,
    color: '#374151',
    marginTop: 10,
  },
  emptyHint: { fontSize: 13, color: '#9CA3AF', marginTop: 4, textAlign: 'center', paddingHorizontal: 24 },

  // Card: outer View + inner tappable area + separate delete button
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    overflow: 'hidden',
  },
  cardPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },

  thumbRow: { flexDirection: 'row', alignItems: 'center', marginRight: 14 },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  thumbMore: {
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbMoreText: { fontSize: 11, fontFamily: F.bold, color: '#22C55E' },

  cardBody: { flex: 1 },
  cardTitle: { fontSize: 15, fontFamily: F.semibold, color: '#111827', marginBottom: 2 },
  cardSub: { fontSize: 12, color: '#6B7280', marginBottom: 8 },

  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 12, color: '#6B7280' },

  momentsBtn: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#F2F2F7',
  },
  deleteBtn: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F5',
    borderLeftWidth: 1,
    borderLeftColor: '#FEE2E2',
  },

  // ── Delete confirmation modal ────────────────────────────────
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 44,
    alignItems: 'center',
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E5E5EA', marginBottom: 24,
  },
  sheetIconWrap: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: '#FEF2F2',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 22, fontFamily: F.bold, color: '#111827',
    marginBottom: 10, textAlign: 'center',
  },
  sheetBody: {
    fontSize: 14, color: '#57636C', textAlign: 'center',
    lineHeight: 22, marginBottom: 24, paddingHorizontal: 4,
  },
  sheetError: {
    fontSize: 13, color: '#EF4444', textAlign: 'center',
    marginBottom: 12, paddingHorizontal: 4,
  },
  deleteConfirmBtn: {
    width: '100%', backgroundColor: '#EF4444', borderRadius: 16,
    height: 54, alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#EF4444', shadowOpacity: 0.3, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  deleteConfirmBtnText: { color: '#fff', fontSize: 16, fontFamily: F.bold },
  cancelBtn: { paddingVertical: 14, paddingHorizontal: 20 },
  cancelBtnText: { color: '#9CA3AF', fontSize: 14, fontFamily: F.medium },
});
