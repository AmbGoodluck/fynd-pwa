import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  Linking,
  Platform,
  TextInput,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { F } from '../theme/fonts';
import AppHeader from '../components/AppHeader';
import PlaceCard from '../components/PlaceCard';
import BookingWebViewModal, { isValidBookingUrl } from '../components/BookingWebViewModal';
import { useSharedTripStore } from '../store/useSharedTripStore';
import { useBookingLinksStore } from '../store/useBookingLinksStore';
import {
  getSharedTrip,
  getTripMembers,
  removeMember,
  leaveTrip,
  deleteSharedTrip,
  buildShareLink,
} from '../services/sharedTripService';
import type { SharedTrip, TripMember, SharedTripPlace } from '../types/sharedTrip';
import { useGuestStore } from '../store/useGuestStore';
import { useAuthStore } from '../store/useAuthStore';

type Props = { navigation: any; route?: any };

// ── Member Avatar ─────────────────────────────────────────────────────────────
function MemberAvatar({
  member,
  isCurrentUser,
  isOwnerViewing,
  onRemove,
}: {
  member: TripMember;
  isCurrentUser: boolean;
  isOwnerViewing: boolean;
  onRemove: () => void;
}) {
  const initial = member.user_name?.[0]?.toUpperCase() ?? '?';
  const isOwner = member.role === 'owner';

  return (
    <View style={memberStyles.wrap}>
      <View style={[memberStyles.avatar, isOwner && memberStyles.ownerAvatar]}>
        <Text style={memberStyles.initial}>{initial}</Text>
        {isOwner && (
          <View style={memberStyles.crownBadge}>
            <Ionicons name="star" size={9} color="#fff" />
          </View>
        )}
      </View>
      <Text style={memberStyles.name} numberOfLines={1}>
        {isCurrentUser ? 'You' : member.user_name}
      </Text>
      {isOwnerViewing && !isOwner && (
        <TouchableOpacity style={memberStyles.removeBtn} onPress={onRemove}>
          <Ionicons name="close-circle" size={16} color="#EF4444" />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function SharedTripDetailScreen({ navigation, route }: Props) {
  const trip_id: string = route?.params?.trip_id ?? '';

  const { sessionUserId, sessionUserName, setActiveTrip, setActiveMembers, removeMemberLocally, removeJoinedTrip, removeMyTrip, addMyTrip } =
    useSharedTripStore();
  const { savePlace } = useGuestStore();
  const { user: authUser } = useAuthStore();
  // Prefer Firebase Auth UID so owner check works correctly for authenticated users
  const effectiveUserId = authUser?.id || sessionUserId;

  const [trip, setTrip] = useState<SharedTrip | null>(null);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [removedFromTrip, setRemovedFromTrip] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // In-app confirmation modals (web-safe — no Alert.alert)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [pendingRemoveMember, setPendingRemoveMember] = useState<TripMember | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [bookingUrl, setBookingUrl] = useState<string | null>(null);
  const [bookingTitle, setBookingTitle] = useState('');
  const [bookingPlaceId, setBookingPlaceId] = useState<string | null>(null);

  const applyBookingFeedback = useBookingLinksStore(s => s.applyFeedback);

  const { bottom: bottomInset } = useSafeAreaInsets();

  const myMembership = members.find((m) => m.user_id === effectiveUserId);
  const isOwner = myMembership?.role === 'owner';

  const loadData = useCallback(async () => {
    if (!trip_id) { setNotFound(true); setLoading(false); return; }
    try {
      const [fetchedTrip, fetchedMembers] = await Promise.all([
        getSharedTrip(trip_id),
        getTripMembers(trip_id),
      ]);

      if (!fetchedTrip) {
        setNotFound(true);
      } else {
        // Check if current user was removed
        const membershipExists = fetchedMembers.some((m) => m.user_id === effectiveUserId);
        if (!membershipExists) {
          setRemovedFromTrip(true);
        } else {
          setTrip(fetchedTrip);
          setMembers(fetchedMembers);
          setActiveTrip(fetchedTrip);
          setActiveMembers(fetchedMembers);
        }
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [trip_id, sessionUserId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Owner: remove a member ────────────────────────────────────────────────
  const handleRemoveMember = (member: TripMember) => {
    setPendingRemoveMember(member);
  };

  const handleConfirmRemoveMember = async () => {
    if (!pendingRemoveMember) return;
    const member = pendingRemoveMember;
    setPendingRemoveMember(null);
    setActionLoading(true);
    try {
      await removeMember(member.member_id, trip_id, member.user_id);
      setMembers((prev) => prev.filter((m) => m.member_id !== member.member_id));
      removeMemberLocally(member.member_id);
      if (trip) setTrip({ ...trip, member_count: Math.max(1, trip.member_count - 1) });
    } catch {
      // silently fail — member will still appear; user can retry
    } finally {
      setActionLoading(false);
    }
  };

  // ── Owner: delete trip entirely ───────────────────────────────────────────
  const handleDeleteTrip = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!trip) return;
    setShowDeleteConfirm(false);
    const savedTrip = trip;
    // Optimistic: remove from store and navigate back immediately
    removeMyTrip(trip_id);
    navigation.goBack();
    try {
      await deleteSharedTrip(trip_id);
    } catch {
      // Rollback: restore trip in store
      addMyTrip(savedTrip);
    }
  };

  // ── Member: leave trip ────────────────────────────────────────────────────
  const handleLeave = () => {
    setShowLeaveConfirm(true);
  };

  const handleConfirmLeave = async () => {
    setShowLeaveConfirm(false);
    setActionLoading(true);
    try {
      await leaveTrip(trip_id, effectiveUserId);
      removeJoinedTrip(trip_id);
      navigation.goBack();
    } catch {
      // silently fail
    } finally {
      setActionLoading(false);
    }
  };

  // ── Save to my trips ──────────────────────────────────────────────────────
  const handleSave = () => {
    if (!trip) return;
    // Require authentication — savePlace silently drops guest saves
    if (!authUser) { setShowSaveModal(false); return; }
    trip.places.forEach((p) => {
      savePlace({
        placeId: p.placeId,
        name: p.name,
        address: p.address ?? '',
        photoUrl: p.photoUrl ?? '',
        rating: p.rating ?? 4.0,
        description: p.description ?? '',
        coordinates: p.coordinates ?? { lat: 0, lng: 0 },
        category: p.category,
        bookingUrl: p.bookingUrl,
      } as any);
    });
    setSaved(true);
    setShowSaveModal(false);
  };

  // ── Navigate to in-app map ────────────────────────────────────────────────
  const handleViewMap = () => {
    if (!trip) return;
    const stops = trip.places.map((p, i) => ({
      id: p.placeId || String(i),
      name: p.name,
      description: p.description || p.category || '',
      distance: p.distanceKm ? `${p.distanceKm} km` : '',
      time: p.walkMinutes ? `${p.walkMinutes} min` : '',
      rating: p.rating ? String(p.rating.toFixed(1)) : '4.0',
      image: p.photoUrl || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400',
      coordinate: {
        latitude: p.coordinates?.lat ?? 0,
        longitude: p.coordinates?.lng ?? 0,
      },
      bookingUrl: p.bookingUrl,
    }));
    navigation.navigate('TripMap', { stops });
  };

  // ── Share link ────────────────────────────────────────────────────────────
  const handleShare = () => {
    setLinkCopied(false);
    setShowShareModal(true);
  };

  const shareLink = trip ? buildShareLink(trip.trip_id) : '';

  const copyShareLink = async () => {
    if (!shareLink) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try { await navigator.clipboard.writeText(shareLink); setLinkCopied(true); return; } catch {}
    }
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      try {
        const el = document.createElement('textarea');
        el.value = shareLink;
        el.style.position = 'fixed'; el.style.opacity = '0';
        document.body.appendChild(el); el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        setLinkCopied(true);
      } catch {}
    }
  };

  // ── Navigate to a single place ────────────────────────────────────────────
  const navigateToPlace = (place: SharedTripPlace) => {
    const stop = {
      id: place.placeId,
      name: place.name,
      description: place.description || place.category || '',
      distance: place.distanceKm ? `${place.distanceKm} km` : '',
      time: place.walkMinutes ? `${place.walkMinutes} min` : '',
      rating: place.rating ? String(place.rating.toFixed(1)) : '4.0',
      image: place.photoUrl || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400',
      coordinate: {
        latitude: place.coordinates?.lat ?? 0,
        longitude: place.coordinates?.lng ?? 0,
      },
    };
    navigation.navigate('TripMap', { stops: [stop] });
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <AppHeader title="Trip" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#22C55E" />
        </View>
      </SafeAreaView>
    );
  }

  // ── Trip not found ────────────────────────────────────────────────────────
  if (notFound) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <AppHeader title="Trip" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={64} color="#E5E5EA" />
          <Text style={styles.stateTitle}>This trip is no longer available.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Removed from trip ─────────────────────────────────────────────────────
  if (removedFromTrip) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <AppHeader title="Trip" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <Ionicons name="person-remove-outline" size={64} color="#E5E5EA" />
          <Text style={styles.stateTitle}>You are no longer part of this trip.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title={trip?.trip_name ?? 'Trip'} onBack={() => navigation.goBack()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: 100 + bottomInset }]}
      >
        {/* ── Trip Header ─────────────────────────────────── */}
        <View style={styles.tripHeader}>
          <Text style={styles.tripName}>{trip?.trip_name}</Text>

          <View style={styles.tripMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={14} color="#6B7280" />
              <Text style={styles.metaText}>{trip?.trip_date}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="person-outline" size={14} color="#6B7280" />
              <Text style={styles.metaText}>Created by {trip?.owner_name}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={14} color="#6B7280" />
              <Text style={styles.metaText}>
                {trip?.member_count} Explorer{(trip?.member_count ?? 0) !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          {/* Quick action row */}
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickBtn} onPress={handleShare}>
              <Ionicons name="share-outline" size={18} color="#22C55E" />
              <Text style={styles.quickBtnText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickBtn} onPress={handleViewMap}>
              <Ionicons name="map-outline" size={18} color="#22C55E" />
              <Text style={styles.quickBtnText}>View Map</Text>
            </TouchableOpacity>
            {!isOwner && (
              <TouchableOpacity style={styles.quickBtn} onPress={() => setShowSaveModal(true)}>
                <Ionicons
                  name={saved ? 'bookmark' : 'bookmark-outline'}
                  size={18}
                  color={saved ? '#22C55E' : '#22C55E'}
                />
                <Text style={styles.quickBtnText}>{saved ? 'Saved' : 'Save'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Members Section ─────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Members</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.membersRow}
          >
            {members.map((m) => (
              <MemberAvatar
                key={m.member_id}
                member={m}
                isCurrentUser={m.user_id === effectiveUserId}
                isOwnerViewing={isOwner}
                onRemove={() => handleRemoveMember(m)}
              />
            ))}
          </ScrollView>
        </View>

        {/* ── Places Section ──────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Places · {trip?.places.length} stop{(trip?.places.length ?? 0) !== 1 ? 's' : ''}
          </Text>
          {trip?.places.map((p, i) => (
            <PlaceCard
              horizontal
              key={p.placeId || i}
              name={p.name}
              category={p.category}
              description={p.description}
              distance={p.distanceKm ? `${p.distanceKm} km` : undefined}
              rating={p.rating}
              photoUrl={p.photoUrl}
              indexBadge={i + 1}
              onNavigate={() => navigateToPlace(p)}
              onBook={isValidBookingUrl(p.bookingUrl) ? () => {
                setBookingTitle(p.name);
                setBookingUrl(p.bookingUrl!);
                setBookingPlaceId(p.placeId || null);
              } : undefined}
            />
          ))}
        </View>
      </ScrollView>

      {/* ── Bottom bar ──────────────────────────────────── */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(12, bottomInset) }]}>
        <TouchableOpacity style={styles.mapBtn} onPress={handleViewMap}>
          <Ionicons name="navigate-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.mapBtnText}>View Trip Map</Text>
        </TouchableOpacity>

        {isOwner ? (
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteTrip}>
            <Ionicons name="trash-outline" size={16} color="#EF4444" style={{ marginRight: 6 }} />
            <Text style={styles.deleteBtnText}>Delete Trip</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave}>
            <Text style={styles.leaveBtnText}>Leave Trip</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Save Trip Modal ──────────────────────────────── */}
      <Modal
        visible={showSaveModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSaveModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSaveModal(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalIconWrap}>
              <Ionicons name="bookmark-outline" size={32} color="#22C55E" />
            </View>
            <Text style={styles.modalTitle}>Save to My Trips</Text>
            <Text style={styles.modalBody}>
              All {trip?.places.length} places will be saved to your Saved list so you can
              access them anytime.
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleSave}>
              <Text style={styles.primaryBtnText}>Save Trip</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghostBtn} onPress={() => setShowSaveModal(false)}>
              <Text style={styles.ghostBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Share Trip Modal ─────────────────────────────── */}
      <Modal
        visible={showShareModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowShareModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowShareModal(false)}>
          <View style={styles.confirmOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.confirmSheet}>
                <View style={styles.confirmHandle} />
                <View style={[styles.confirmIconWrap, { backgroundColor: '#F0FDF4' }]}>
                  <Ionicons name="share-social-outline" size={30} color="#22C55E" />
                </View>
                <Text style={styles.confirmTitle}>Share Trip</Text>
                <Text style={styles.shareSubtitle}>
                  Anyone with this link can join "{trip?.trip_name}"
                </Text>

                {/* Link box */}
                <View style={styles.shareLinkBox}>
                  <TextInput
                    style={styles.shareLinkText}
                    value={shareLink}
                    editable={false}
                    selectTextOnFocus
                    numberOfLines={1}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.confirmDestructiveBtn, { backgroundColor: '#22C55E', shadowColor: '#22C55E' }]}
                  onPress={copyShareLink}
                >
                  <Ionicons
                    name={linkCopied ? 'checkmark-circle-outline' : 'copy-outline'}
                    size={18}
                    color="#fff"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.confirmDestructiveBtnText}>
                    {linkCopied ? 'Link Copied!' : 'Copy Link'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmCancelBtn} onPress={() => setShowShareModal(false)}>
                  <Text style={styles.confirmCancelBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Delete Trip Confirmation ─────────────────────── */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowDeleteConfirm(false)}>
          <View style={styles.confirmOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.confirmSheet}>
                <View style={styles.confirmHandle} />
                <View style={[styles.confirmIconWrap, { backgroundColor: '#FEF2F2' }]}>
                  <Ionicons name="trash-outline" size={32} color="#EF4444" />
                </View>
                <Text style={styles.confirmTitle}>Delete Trip?</Text>
                <Text style={styles.confirmBody}>
                  "{trip?.trip_name}" will be removed for all members and cannot be undone.
                </Text>
                <TouchableOpacity style={styles.confirmDestructiveBtn} onPress={handleConfirmDelete}>
                  <Text style={styles.confirmDestructiveBtnText}>Delete Trip</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmCancelBtn} onPress={() => setShowDeleteConfirm(false)}>
                  <Text style={styles.confirmCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Leave Trip Confirmation ──────────────────────── */}
      <Modal
        visible={showLeaveConfirm}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLeaveConfirm(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowLeaveConfirm(false)}>
          <View style={styles.confirmOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.confirmSheet}>
                <View style={styles.confirmHandle} />
                <View style={[styles.confirmIconWrap, { backgroundColor: '#FEF2F2' }]}>
                  <Ionicons name="exit-outline" size={32} color="#EF4444" />
                </View>
                <Text style={styles.confirmTitle}>Leave Trip?</Text>
                <Text style={styles.confirmBody}>
                  Are you sure you want to leave "{trip?.trip_name}"? You will need a new invite link to rejoin.
                </Text>
                <TouchableOpacity
                  style={styles.confirmDestructiveBtn}
                  onPress={handleConfirmLeave}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.confirmDestructiveBtnText}>Leave Trip</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmCancelBtn} onPress={() => setShowLeaveConfirm(false)}>
                  <Text style={styles.confirmCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Remove Member Confirmation ───────────────────── */}
      <Modal
        visible={!!pendingRemoveMember}
        transparent
        animationType="slide"
        onRequestClose={() => setPendingRemoveMember(null)}
      >
        <TouchableWithoutFeedback onPress={() => setPendingRemoveMember(null)}>
          <View style={styles.confirmOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.confirmSheet}>
                <View style={styles.confirmHandle} />
                <View style={[styles.confirmIconWrap, { backgroundColor: '#FEF2F2' }]}>
                  <Ionicons name="person-remove-outline" size={32} color="#EF4444" />
                </View>
                <Text style={styles.confirmTitle}>Remove Member?</Text>
                <Text style={styles.confirmBody}>
                  Remove {pendingRemoveMember?.user_name} from this trip?
                </Text>
                <TouchableOpacity
                  style={styles.confirmDestructiveBtn}
                  onPress={handleConfirmRemoveMember}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.confirmDestructiveBtnText}>Remove</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmCancelBtn} onPress={() => setPendingRemoveMember(null)}>
                  <Text style={styles.confirmCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* In-app Booking WebView */}
      <BookingWebViewModal
        visible={!!bookingUrl}
        url={bookingUrl ?? ''}
        title={bookingTitle}
        placeId={bookingPlaceId ?? undefined}
        onClose={() => { setBookingUrl(null); setBookingPlaceId(null); }}
        onFeedback={applyBookingFeedback}
      />
    </SafeAreaView>
  );
}



// ── Member avatar styles ──────────────────────────────────────────────────────
const memberStyles = StyleSheet.create({
  wrap: { alignItems: 'center', marginRight: 16, position: 'relative' },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  ownerAvatar: { backgroundColor: '#22C55E' },
  initial: { fontSize: 20, fontFamily: F.bold, color: '#fff' },
  crownBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  name: { fontSize: 11, color: '#374151', textAlign: 'center', maxWidth: 56 },
  removeBtn: { position: 'absolute', top: -4, right: -4 },
});

// ── Main screen styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  scroll: { padding: 16 },

  stateTitle: {
    fontSize: 18,
    fontFamily: F.semibold,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 26,
  },

  tripHeader: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tripName: { fontSize: 22, fontFamily: F.bold, color: '#111827', marginBottom: 10 },
  tripMeta: { gap: 6, marginBottom: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: '#6B7280' },

  quickActions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    paddingTop: 12,
  },
  quickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    paddingVertical: 10,
  },
  quickBtnText: { fontSize: 13, fontFamily: F.semibold, color: '#22C55E' },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontFamily: F.bold, color: '#111827', marginBottom: 12 },

  membersRow: { paddingBottom: 4, paddingLeft: 2 },

  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    gap: 8,
  },
  mapBtn: {
    backgroundColor: '#22C55E',
    borderRadius: 16,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22C55E',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  mapBtnText: { color: '#fff', fontSize: 15, fontFamily: F.semibold },
  leaveBtn: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaveBtnText: { color: '#EF4444', fontSize: 14, fontFamily: F.medium },
  deleteBtn: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF5F5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: { color: '#EF4444', fontSize: 14, fontFamily: F.semibold },

  primaryBtn: {
    width: '100%',
    backgroundColor: '#22C55E',
    borderRadius: 16,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22C55E',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontFamily: F.semibold },

  ghostBtn: { alignItems: 'center', paddingVertical: 10 },
  ghostBtnText: { color: '#9CA3AF', fontSize: 14 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 44,
    alignItems: 'center',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E5EA',
    marginBottom: 20,
    alignSelf: 'center',
  },
  modalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontFamily: F.bold, color: '#111827', marginBottom: 8, textAlign: 'center' },
  modalBody: {
    fontSize: 14,
    color: '#57636C',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },

  // ── Shared confirmation sheet styles ─────────────────────────────────────
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  confirmSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 44,
    alignItems: 'center',
  },
  confirmHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E5E5EA', marginBottom: 24,
  },
  confirmIconWrap: {
    width: 68, height: 68, borderRadius: 34,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 22, fontFamily: F.bold, color: '#111827',
    marginBottom: 10, textAlign: 'center',
  },
  confirmBody: {
    fontSize: 14, color: '#57636C', textAlign: 'center',
    lineHeight: 22, marginBottom: 24, paddingHorizontal: 4,
  },
  confirmDestructiveBtn: {
    width: '100%', backgroundColor: '#EF4444', borderRadius: 16,
    height: 54, alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#EF4444', shadowOpacity: 0.3, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  confirmDestructiveBtnText: { color: '#fff', fontSize: 16, fontFamily: F.bold },
  confirmCancelBtn: { paddingVertical: 14, paddingHorizontal: 20 },
  confirmCancelBtnText: { color: '#9CA3AF', fontSize: 14, fontFamily: F.medium },

  shareSubtitle: {
    fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 20,
    paddingHorizontal: 8,
  },
  shareLinkBox: {
    width: '100%', backgroundColor: '#F3F4F6', borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16,
  },
  shareLinkText: {
    fontSize: 13, color: '#374151', fontFamily: F.medium,
  },
});
