import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  Linking, Platform, Alert, Modal, TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Sentry from '@sentry/react-native';
import { F } from '../theme/fonts';
import AppHeader from '../components/AppHeader';
import FyndScrollContainer from '../components/FyndScrollContainer';
import PlacePreviewModal, { type PreviewPlace } from '../components/PlacePreviewModal';
import GuestGateModal from '../components/GuestGateModal';
import { useGuestStore } from '../store/useGuestStore';

type Props = { navigation: any; route: any };

export default function SuggestedPlacesScreen({ navigation, route }: Props) {
  const mountAtRef = useRef(Date.now());
  const params = route?.params || {};
  const places: any[] = params.places || [];
  const tripId = params.tripId || null;
  const destination = params.destination || '';
  const tripVibes = params.vibes || [];
  const explorationHours = params.explorationHours || 3;
  const timeOfDay = params.timeOfDay || 'morning';
  const userLatitude: number | null = params.latitude ?? null;
  const userLongitude: number | null = params.longitude ?? null;

  const { bottom: bottomInset } = useSafeAreaInsets();
  const { isGuest, savePlace, unsavePlace, isPlaceSaved } = useGuestStore();

  const GUEST_MAX_PLACES = 4;

  const [selectedForItinerary, setSelectedForItinerary] = useState<any[]>([]);
  const [previewPlace, setPreviewPlace] = useState<PreviewPlace | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showGate, setShowGate] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    const navStart = typeof params.perfSuggestedNavAt === 'number' ? params.perfSuggestedNavAt : mountAtRef.current;
    Sentry.addBreadcrumb({
      category: 'perf.suggested',
      message: 'suggested_first_render',
      level: 'info',
      data: { firstRenderMs: Date.now() - navStart, placeCount: places.length },
    });
  }, []);

  const handleAddToItinerary = (place: any) => {
    const isSelected = selectedForItinerary.find(p => p.placeId === place.placeId);
    if (isSelected) {
      setSelectedForItinerary(prev => prev.filter(p => p.placeId !== place.placeId));
    } else {
      if (isGuest && selectedForItinerary.length >= GUEST_MAX_PLACES) {
        setShowUpgradeModal(true);
        return;
      }
      setSelectedForItinerary(prev => [...prev, place]);
    }
  };

  const handleSave = (place: any) => {
    if (isGuest) { setShowGate(true); return; }
    if (isPlaceSaved(place.placeId)) {
      unsavePlace(place.placeId);
    } else {
      savePlace(place);
    }
  };

  const handleLongPress = (place: any) => {
    setPreviewPlace({
      placeId: place.placeId,
      name: place.name,
      description: place.description || place.category || '',
      rating: place.rating || 4.0,
      distanceKm: place.distanceKm,
      photoUrl: place.photoUrl,
      bookingUrl: place.bookingUrl,
      category: place.category,
      address: place.address,
    });
    setShowPreview(true);
  };

  const openBookingUrl = (url: string) => {
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open booking page.'));
    }
  };

  const handleGenerateItinerary = () => {
    if (selectedForItinerary.length === 0) return;
    navigation.navigate('Itinerary', {
      places: selectedForItinerary,
      tripId, destination, vibes: tripVibes,
      explorationHours, timeOfDay,
      userLatitude, userLongitude,
    });
  };

  const renderPlace = ({ item }: { item: any }) => {
    const isSelected = !!selectedForItinerary.find(p => p.placeId === item.placeId);
    const saved = isPlaceSaved(item.placeId);

    return (
      <TouchableOpacity
        activeOpacity={0.95}
        onLongPress={() => handleLongPress(item)}
        delayLongPress={350}
      >
        <View style={styles.card}>
          <Image
            source={{ uri: item.photoUrl || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400' }}
            style={styles.cardImage}
          />

          {/* Save heart */}
          <TouchableOpacity style={styles.heartBtn} onPress={() => handleSave(item)}>
            <Ionicons
              name={saved ? 'heart' : 'heart-outline'}
              size={20}
              color={saved ? '#EF4444' : '#fff'}
            />
          </TouchableOpacity>

          <View style={styles.cardBody}>
            <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.cardDesc} numberOfLines={2}>
              {item.description || item.category || 'A great place to visit'}
            </Text>
            <View style={styles.cardMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="star" size={13} color="#F59E0B" />
                <Text style={styles.metaText}>{item.rating?.toFixed(1) || '4.0'}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={13} color="#57636C" />
                <Text style={styles.metaText} numberOfLines={1}>
                  {item.address?.split(',')[0] || destination}
                </Text>
              </View>
              {item.distanceKm ? (
                <View style={styles.metaItem}>
                  <Ionicons name="walk-outline" size={13} color="#57636C" />
                  <Text style={styles.metaText}>{item.distanceKm} km</Text>
                </View>
              ) : null}
            </View>

            {/* Action row: Add to Itinerary + Book Now */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.addBtn, isSelected && styles.addBtnSelected]}
                onPress={() => handleAddToItinerary(item)}
              >
                <Text style={[styles.addBtnText, isSelected && styles.addBtnTextSelected]}>
                  {isSelected ? '✓ Added' : '+ Add to Itinerary'}
                </Text>
              </TouchableOpacity>

              {item.bookingUrl ? (
                <TouchableOpacity
                  style={styles.bookBtn}
                  onPress={() => openBookingUrl(item.bookingUrl)}
                >
                  <Ionicons name="calendar-outline" size={13} color="#fff" />
                  <Text style={styles.bookBtnText}>BOOK NOW</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="Suggested Places" onBack={() => navigation.goBack()} />

      {destination ? (
        <View style={styles.destRow}>
          <Ionicons name="location" size={13} color="#22C55E" />
          <Text style={styles.destinationTag}>{destination}</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{places.length} places</Text>
          </View>
        </View>
      ) : null}

      {places.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="search" size={60} color="#E5E5EA" />
          <Text style={styles.emptyTitle}>No places found</Text>
          <Text style={styles.emptySubtitle}>Try different vibes or adjust your trip preferences</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FyndScrollContainer style={styles.scrollView} contentContainerStyle={styles.list}>
          {places.map(item => (
            <View key={item.placeId}>{renderPlace({ item })}</View>
          ))}
        </FyndScrollContainer>
      )}

      <View style={[styles.ctaBar, { paddingBottom: Math.max(12, bottomInset) }]}>
        <TouchableOpacity
          style={[styles.ctaBtn, selectedForItinerary.length === 0 && styles.ctaBtnDisabled]}
          onPress={handleGenerateItinerary}
          disabled={selectedForItinerary.length === 0}
          activeOpacity={0.8}
        >
          <Ionicons name="map-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.ctaBtnText}>
            {selectedForItinerary.length === 0
              ? 'Select places to continue'
              : `Build Itinerary (${selectedForItinerary.length})`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Long-press Place Preview Modal */}
      <PlacePreviewModal
        visible={showPreview}
        place={previewPlace}
        isInItinerary={previewPlace ? !!selectedForItinerary.find(p => p.placeId === previewPlace.placeId) : false}
        isSaved={previewPlace ? isPlaceSaved(previewPlace.placeId) : false}
        onViewDetails={() => setShowPreview(false)}
        onClose={() => setShowPreview(false)}
        onAddToItinerary={() => {
          if (previewPlace) {
            const full = places.find(p => p.placeId === previewPlace.placeId);
            if (full) handleAddToItinerary(full);
          }
          setShowPreview(false);
        }}
        onRemoveFromItinerary={() => {
          if (previewPlace) {
            const full = places.find(p => p.placeId === previewPlace.placeId);
            if (full) handleAddToItinerary(full); // toggles off
          }
          setShowPreview(false);
        }}
        onSave={() => {
          if (!previewPlace) return;
          const full = places.find(p => p.placeId === previewPlace.placeId);
          if (full) handleSave(full);
        }}
        onUnsave={() => {
          if (previewPlace) unsavePlace(previewPlace.placeId);
        }}
      />

      {/* Guest Gate Modal */}
      <GuestGateModal
        visible={showGate}
        onDismiss={() => setShowGate(false)}
        onLogin={() => { setShowGate(false); navigation.navigate('Login'); }}
        onRegister={() => { setShowGate(false); navigation.navigate('Register'); }}
        onContinueAsGuest={() => setShowGate(false)}
      />

      {/* Guest Itinerary Limit Modal */}
      <Modal
        visible={showUpgradeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowUpgradeModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowUpgradeModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalSheet}>
                <View style={styles.modalHandle} />
                <View style={styles.modalIconWrap}>
                  <Text style={styles.modalEmoji}>🔒</Text>
                </View>
                <Text style={styles.modalTitle}>Upgrade Your Access</Text>
                <Text style={styles.modalBody}>
                  Create an account to add more places and unlock unlimited trip planning.
                </Text>
                <TouchableOpacity
                  style={styles.modalPrimaryBtn}
                  onPress={() => { setShowUpgradeModal(false); navigation.navigate('Register'); }}
                >
                  <Text style={styles.modalPrimaryBtnText}>Create Account</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalOutlineBtn}
                  onPress={() => { setShowUpgradeModal(false); navigation.navigate('Login'); }}
                >
                  <Text style={styles.modalOutlineBtnText}>Sign In</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalGhostBtn}
                  onPress={() => setShowUpgradeModal(false)}
                >
                  <Text style={styles.modalGhostBtnText}>Continue as Guest</Text>
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
  container: { flex: 1, minHeight: 0, backgroundColor: '#F9FAFB' },
  scrollView: { flex: 1, minHeight: 0 },
  destRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F2F2F7',
  },
  destinationTag: { fontSize: 13, color: '#374151', fontWeight: '500', flex: 1 },
  countBadge: {
    backgroundColor: '#F0FDF4', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 3,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  countBadgeText: { fontSize: 12, color: '#22C55E', fontWeight: '600' },
  list: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 16 },
  card: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderRadius: 18, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }, elevation: 3, overflow: 'hidden',
  },
  cardImage: { width: 100, minWidth: 80, height: 160 },
  heartBtn: {
    position: 'absolute', top: 8, left: 8,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { flex: 1, padding: 12, justifyContent: 'space-between' },
  cardName: {
    fontSize: 15, fontFamily: F.semibold,
    color: '#111827', marginBottom: 3,
  },
  cardDesc: {
    fontSize: 12, color: '#6B7280',
    lineHeight: 18, marginBottom: 6, flex: 1,
  },
  cardMeta: { flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 12, color: '#57636C', maxWidth: 90 },
  actionRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  addBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, borderRadius: 12,
    backgroundColor: '#F0FDF4', borderWidth: 1.5, borderColor: '#22C55E',
  },
  addBtnSelected: { backgroundColor: '#22C55E' },
  addBtnText: { fontSize: 11, fontFamily: F.semibold, color: '#22C55E' },
  addBtnTextSelected: { color: '#fff' },
  bookBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#1D4ED8', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 8,
  },
  bookBtnText: { fontSize: 10, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyTitle: {
    fontSize: 18, fontFamily: F.semibold,
    color: '#111827', marginTop: 16, marginBottom: 8,
  },
  emptySubtitle: { fontSize: 14, color: '#57636C', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  backBtn: { backgroundColor: '#22C55E', borderRadius: 16, paddingHorizontal: 40, paddingVertical: 14 },
  backBtnText: { color: '#fff', fontSize: 16, fontFamily: F.semibold },
  ctaBar: {
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F2F2F7',
  },
  ctaBtn: {
    backgroundColor: '#22C55E', borderRadius: 16, height: 54,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#22C55E', shadowOpacity: 0.35, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  ctaBtnDisabled: { backgroundColor: '#9CA3AF', shadowOpacity: 0 },
  ctaBtnText: { color: '#fff', fontSize: 16, fontFamily: F.bold },
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
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#FEF9C3',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  modalEmoji: { fontSize: 28 },
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
  modalGhostBtnText: { color: '#9CA3AF', fontSize: 14, fontFamily: F.semibold },
});
