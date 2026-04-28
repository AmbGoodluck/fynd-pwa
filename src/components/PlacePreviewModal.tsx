import React, { useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  TouchableWithoutFeedback, Image, Linking, Platform, Alert,
  ScrollView, NativeSyntheticEvent, NativeScrollEvent, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FALLBACK_IMAGE } from '../constants';
import { COLORS } from '../theme/tokens';

const SCREEN_WIDTH = Dimensions.get('window').width;

export type PreviewPlace = {
  placeId: string;
  name: string;
  description: string;
  rating: number;
  distanceKm?: number;
  photoUrl: string;
  photoUrls?: string[];
  vibes?: string[];
  bookingUrl?: string;
  category?: string;
  address?: string;
};

type Props = {
  visible: boolean;
  place: PreviewPlace | null;
  isInItinerary?: boolean;
  isSaved?: boolean;
  onClose: () => void;
  onViewDetails?: () => void;
  onAddToItinerary?: () => void;
  onRemoveFromItinerary?: () => void;
  onSave?: () => void;
  onUnsave?: () => void;
};

export default function PlacePreviewModal({
  visible, place, isInItinerary, isSaved, onClose,
  onViewDetails, onAddToItinerary, onRemoveFromItinerary, onSave, onUnsave,
}: Props) {
  if (!place) return null;

  const [currentPage, setCurrentPage] = useState(0);

  const photos = place.photoUrls?.length
    ? place.photoUrls
    : [place.photoUrl || FALLBACK_IMAGE];

  const openBooking = () => {
    if (!place.bookingUrl) return;
    const url = place.bookingUrl;
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url).catch(() =>
        Alert.alert('Error', 'Could not open booking page.')
      );
    }
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(
      e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width
    );
    setCurrentPage(page);
  };

  const stars = Math.round(place.rating);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              <View style={styles.handle} />

              {/* Image slider */}
              <View style={styles.sliderContainer}>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  scrollEventThrottle={16}
                  onScroll={handleScroll}
                >
                  {photos.map((uri, index) => (
                    <Image
                      key={index}
                      source={{ uri }}
                      style={styles.heroImage}
                    />
                  ))}
                </ScrollView>
                {photos.length > 1 && (
                  <View style={styles.dotsRow}>
                    {photos.map((_, index) => (
                      <View
                        key={index}
                        style={[styles.dot, index === currentPage && styles.dotActive]}
                      />
                    ))}
                  </View>
                )}
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
                {/* Name + save */}
                <View style={styles.nameRow}>
                  <Text style={styles.name} numberOfLines={2}>{place.name}</Text>
                  <TouchableOpacity style={styles.saveBtn} onPress={isSaved ? onUnsave : onSave}>
                    <Ionicons
                      name={isSaved ? 'heart' : 'heart-outline'}
                      size={22}
                      color={isSaved ? '#EF4444' : '#9CA3AF'}
                    />
                  </TouchableOpacity>
                </View>

                {/* Meta row */}
                <View style={styles.metaRow}>
                  {/* Stars */}
                  <View style={styles.metaChip}>
                    <Ionicons name="star" size={13} color="#F59E0B" />
                    <Text style={styles.metaText}>{place.rating?.toFixed(1) || '4.0'}</Text>
                  </View>

                  {place.distanceKm !== undefined && (
                    <View style={styles.metaChip}>
                      <Ionicons name="walk-outline" size={13} color="#57636C" />
                      <Text style={styles.metaText}>{place.distanceKm} km away</Text>
                    </View>
                  )}

                  {place.category ? (
                    <View style={[styles.metaChip, styles.categoryChip]}>
                      <Text style={styles.categoryText}>{place.category}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Booking availability badge */}
                {place.bookingUrl ? (
                  <View style={styles.bookingBadge}>
                    <Ionicons name="calendar-outline" size={14} color={COLORS.accent.primary} />
                    <Text style={styles.bookingBadgeText}>Booking available</Text>
                  </View>
                ) : null}

                {/* Description */}
                {place.description ? (
                  <Text style={styles.description}>{place.description}</Text>
                ) : null}

                {/* Address */}
                {place.address ? (
                  <View style={styles.addressRow}>
                    <Ionicons name="location-outline" size={14} color="#57636C" />
                    <Text style={styles.addressText} numberOfLines={2}>{place.address}</Text>
                  </View>
                ) : null}

                {/* Interest Match */}
                {place.vibes && place.vibes.length > 0 && (
                  <View style={styles.interestMatchSection}>
                    <Text style={styles.interestMatchLabel}>Interest Match</Text>
                    <View style={styles.vibesRow}>
                      {place.vibes.map((vibe, index) => (
                        <View key={index} style={styles.vibeChip}>
                          <Text style={styles.vibeChipText}>{vibe}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                <View style={{ height: 8 }} />
              </ScrollView>

              {/* Action buttons */}
              <View style={styles.actions}>
                {/* Row 1: Cancel + Add/Remove Itinerary */}
                <View style={styles.actionsRow}>
                  {/* Cancel */}
                  <TouchableOpacity
                    style={styles.viewDetailsBtn}
                    onPress={onClose}
                  >
                    <Text style={styles.viewDetailsBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  {/* Add / Remove itinerary */}
                  {onAddToItinerary || onRemoveFromItinerary ? (
                    <TouchableOpacity
                      style={[styles.actionBtn, isInItinerary && styles.actionBtnRemove]}
                      onPress={isInItinerary ? onRemoveFromItinerary : onAddToItinerary}
                    >
                      <Ionicons
                        name={isInItinerary ? 'remove-circle-outline' : 'add-circle-outline'}
                        size={16}
                        color={isInItinerary ? '#EF4444' : '#fff'}
                      />
                      <Text style={[styles.actionBtnText, isInItinerary && styles.actionBtnTextRemove]}>
                        {isInItinerary ? 'Remove' : 'Add to Itinerary'}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Row 2: Book Now (full width, only if available) */}
                {place.bookingUrl ? (
                  <TouchableOpacity style={styles.bookBtn} onPress={openBooking}>
                    <Ionicons name="calendar" size={16} color="#fff" />
                    <Text style={styles.bookBtnText}>BOOK NOW</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E5E5EA',
    alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  // Image slider
  sliderContainer: {
    position: 'relative',
  },
  heroImage: {
    width: SCREEN_WIDTH, height: 200,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#D1D5DB',
  },
  dotActive: {
    backgroundColor: COLORS.accent.primary,
    width: 8, height: 8, borderRadius: 4,
  },
  // Content
  content: {
    paddingHorizontal: 20, paddingTop: 16, flexGrow: 0,
    maxHeight: 280,
  },
  nameRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', marginBottom: 10,
  },
  name: {
    fontSize: 20, fontWeight: '700', color: '#111827',
    flex: 1, marginRight: 10, lineHeight: 26,
  },
  saveBtn: {
    padding: 4, marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10,
  },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F2F2F7', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  categoryChip: { backgroundColor: COLORS.accent.primaryLight },
  metaText: { fontSize: 12, color: '#57636C' },
  categoryText: { fontSize: 12, color: COLORS.accent.primary, fontWeight: '600' },
  bookingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.accent.primaryLight, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
    alignSelf: 'flex-start', marginBottom: 10,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  bookingBadgeText: { fontSize: 12, color: COLORS.accent.primary, fontWeight: '600' },
  description: {
    fontSize: 14, color: '#374151', lineHeight: 22, marginBottom: 10,
  },
  addressRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 4,
  },
  addressText: { fontSize: 13, color: '#57636C', flex: 1, lineHeight: 18 },
  // Interest Match
  interestMatchSection: {
    marginTop: 12, marginBottom: 4,
  },
  interestMatchLabel: {
    fontSize: 12, color: '#9CA3AF', fontWeight: '600',
    marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  vibesRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  vibeChip: {
    backgroundColor: COLORS.accent.primaryLight, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  vibeChipText: { fontSize: 12, color: COLORS.accent.primary, fontWeight: '600' },
  // Actions
  actions: {
    flexDirection: 'column', gap: 10,
    paddingHorizontal: 20, paddingVertical: 14,
    paddingBottom: 32,
    borderTopWidth: 1, borderTopColor: '#F2F2F7',
  },
  actionsRow: {
    flexDirection: 'row', gap: 10,
  },
  viewDetailsBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: COLORS.accent.primary,
    borderRadius: 14, height: 48,
  },
  viewDetailsBtnText: { color: COLORS.accent.primary, fontSize: 13, fontWeight: '600' },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
    backgroundColor: COLORS.accent.primary, borderRadius: 14, height: 48,
    shadowColor: COLORS.accent.primary, shadowOpacity: 0.3,
    shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  actionBtnRemove: {
    backgroundColor: '#FEF2F2', borderWidth: 1.5, borderColor: '#FCA5A5',
    shadowOpacity: 0,
  },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  actionBtnTextRemove: { color: '#EF4444' },
  bookBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#1D4ED8', borderRadius: 14, height: 48,
    paddingHorizontal: 16,
    shadowColor: '#1D4ED8', shadowOpacity: 0.3,
    shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  bookBtnText: { color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
});
