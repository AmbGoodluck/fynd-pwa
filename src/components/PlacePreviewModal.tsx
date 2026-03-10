import React from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  TouchableWithoutFeedback, Image, Linking, Platform, Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type PreviewPlace = {
  placeId: string;
  name: string;
  description: string;
  rating: number;
  distanceKm?: number;
  photoUrl: string;
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

              {/* Hero image */}
              <Image
                source={{ uri: place.photoUrl || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600' }}
                style={styles.heroImage}
              />

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
                    <Ionicons name="calendar-outline" size={14} color="#22C55E" />
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

                <View style={{ height: 8 }} />
              </ScrollView>

              {/* Action buttons */}
              <View style={styles.actions}>
                {/* Row 1: View Details + Add/Remove Itinerary */}
                <View style={styles.actionsRow}>
                  {/* View Details */}
                  <TouchableOpacity
                    style={styles.viewDetailsBtn}
                    onPress={onViewDetails ?? onClose}
                  >
                    <Ionicons name="eye-outline" size={16} color="#22C55E" />
                    <Text style={styles.viewDetailsBtnText}>View Details</Text>
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
  heroImage: {
    width: '100%', height: 200,
  },
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
  categoryChip: { backgroundColor: '#F0FDF4' },
  metaText: { fontSize: 12, color: '#57636C' },
  categoryText: { fontSize: 12, color: '#22C55E', fontWeight: '600' },
  bookingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F0FDF4', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
    alignSelf: 'flex-start', marginBottom: 10,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  bookingBadgeText: { fontSize: 12, color: '#22C55E', fontWeight: '600' },
  description: {
    fontSize: 14, color: '#374151', lineHeight: 22, marginBottom: 10,
  },
  addressRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 4,
  },
  addressText: { fontSize: 13, color: '#57636C', flex: 1, lineHeight: 18 },
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
    borderWidth: 1.5, borderColor: '#22C55E',
    borderRadius: 14, height: 48,
  },
  viewDetailsBtnText: { color: '#22C55E', fontSize: 13, fontWeight: '600' },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
    backgroundColor: '#22C55E', borderRadius: 14, height: 48,
    shadowColor: '#22C55E', shadowOpacity: 0.3,
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
