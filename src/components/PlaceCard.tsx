import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { F } from '../theme/fonts';
import { FALLBACK_IMAGE } from '../constants';

type Props = {
  name: string;
  description?: string;
  category?: string;
  distance?: string;
  duration?: string;
  rating?: number;
  photoUrl?: string;

  // Layout
  horizontal?: boolean;

  // Badge
  indexBadge?: number;

  // Actions
  onSave?: () => void;
  isSaved?: boolean;

  onAdd?: () => void;
  isAdded?: boolean;

  onNavigate?: () => void;
  onBook?: () => void;
};

const PlaceCard = React.memo(function PlaceCard({
  name,
  description,
  category,
  distance,
  duration,
  rating,
  photoUrl,
  horizontal,
  indexBadge,
  onSave,
  isSaved,
  onAdd,
  isAdded,
  onNavigate,
  onBook,
}: Props) {
  const fallbackImage = FALLBACK_IMAGE;

  if (horizontal) {
    return (
      <View style={styles.cardH}>
        {/* Left: image with left-only rounded corners */}
        <View style={styles.imageContainerH}>
          <Image
            source={{ uri: photoUrl || fallbackImage }}
            style={styles.imageH}
          />
          {/* Heart icon — top-right of image */}
          {onSave && (
            <TouchableOpacity style={styles.heartBtnTR} onPress={onSave}>
              <Ionicons
                name={isSaved ? 'heart' : 'heart-outline'}
                size={16}
                color={isSaved ? '#EF4444' : '#fff'}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Right: content */}
        <View style={styles.bodyH}>
          <Text style={styles.nameH} numberOfLines={1}>{name}</Text>

          {(description || category) ? (
            <Text style={styles.descriptionH} numberOfLines={2}>
              {description || category}
            </Text>
          ) : null}

          {/* Meta row: distance · time · rating */}
          <View style={styles.metaRowH}>
            {distance ? (
              <View style={styles.metaItem}>
                <Ionicons name="walk-outline" size={14} color="#57636C" />
                <Text style={styles.metaText}>{distance}</Text>
              </View>
            ) : null}
            {duration ? (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={14} color="#57636C" />
                <Text style={styles.metaText}>{duration}</Text>
              </View>
            ) : null}
            {rating != null ? (
              <View style={styles.metaItem}>
                <Ionicons name="star-half-outline" size={16} color="#F59E0B" />
                <Text style={styles.metaText}>{rating.toFixed(1)}</Text>
              </View>
            ) : null}
          </View>

          {/* Buttons row */}
          {(onAdd || onBook) ? (
            <View style={styles.actionRowH}>
              {onBook ? (
                <TouchableOpacity style={styles.bookBtnH} onPress={onBook}>
                  <Text style={styles.bookBtnHText}>Book Now</Text>
                  <Ionicons name="chevron-forward" size={13} color="#111827" />
                </TouchableOpacity>
              ) : null}
              {onAdd ? (
                <TouchableOpacity
                  style={[styles.addBtnH, isAdded && styles.addBtnHSelected]}
                  onPress={onAdd}
                >
                  <Text style={styles.addBtnHText}>
                    {isAdded ? 'Added' : 'Add to Itinerary'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  // ── Default vertical layout ──────────────────────────────────
  return (
    <View style={styles.card}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: photoUrl || fallbackImage }} style={styles.image} />

        {indexBadge !== undefined && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{indexBadge}</Text>
          </View>
        )}

        {onSave && (
          <TouchableOpacity style={styles.heartBtn} onPress={onSave}>
            <Ionicons
              name={isSaved ? 'heart' : 'heart-outline'}
              size={22}
              color={isSaved ? '#EF4444' : '#111827'}
            />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>

        {description ? (
          <Text style={styles.description} numberOfLines={2}>{description}</Text>
        ) : category ? (
          <Text style={styles.description} numberOfLines={1}>{category}</Text>
        ) : null}

        <View style={styles.metaRow}>
          {rating != null && (
            <View style={styles.metaItem}>
              <Ionicons name="star" size={13} color="#F59E0B" />
              <Text style={styles.metaText}>{rating.toFixed(1)}</Text>
            </View>
          )}
          {distance ? (
            <View style={styles.metaItem}>
              <Ionicons name="walk-outline" size={13} color="#57636C" />
              <Text style={styles.metaText}>{distance}</Text>
            </View>
          ) : null}
          {duration ? (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={13} color="#57636C" />
              <Text style={styles.metaText}>{duration}</Text>
            </View>
          ) : null}
        </View>

        {(onAdd || onNavigate || onBook) && (
          <View style={styles.actionRow}>
            {onAdd && (
              <TouchableOpacity
                style={[styles.addBtn, isAdded && styles.addBtnSelected]}
                onPress={onAdd}
              >
                <Ionicons name={isAdded ? 'checkmark-circle' : 'add-circle-outline'} size={16} color={isAdded ? '#fff' : '#22C55E'} />
                <Text style={[styles.addBtnText, isAdded && styles.addBtnTextSelected]}>
                  {isAdded ? 'Added' : 'Add to Itinerary'}
                </Text>
              </TouchableOpacity>
            )}
            {onBook && (
              <TouchableOpacity style={styles.bookBtn} onPress={onBook}>
                <Ionicons name="calendar-outline" size={14} color="#fff" />
                <Text style={styles.bookBtnText}>Book Now</Text>
              </TouchableOpacity>
            )}
            {onNavigate && (
              <TouchableOpacity style={styles.navBtn} onPress={onNavigate}>
                <Ionicons name="navigate-outline" size={14} color="#22C55E" />
                <Text style={styles.navBtnText}>Navigate</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  // ── Vertical (default) ─────────────────────────────────────────
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F2F2F7',
  },
  imageContainer: { position: 'relative' },
  image: { width: '100%', height: 200, resizeMode: 'cover' },
  badge: {
    position: 'absolute',
    top: 14, left: 14,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(34, 197, 94, 0.9)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  badgeText: { fontSize: 13, fontFamily: F.bold, color: '#fff' },
  heartBtn: {
    position: 'absolute', top: 14, right: 14,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  body: { padding: 20 },
  name: { fontSize: 20, fontFamily: F.bold, color: '#111827', marginBottom: 6, letterSpacing: -0.4 },
  description: { fontSize: 14, fontFamily: F.regular, color: '#4B5563', marginBottom: 12, lineHeight: 22 },
  metaRow: { flexDirection: 'row', gap: 12, marginBottom: 14, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, fontFamily: F.medium, color: '#57636C' },
  actionRow: {
    flexDirection: 'row', gap: 8,
    borderTopWidth: 1, borderTopColor: '#F2F2F7',
    paddingTop: 14, flexWrap: 'wrap',
  },
  addBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 12,
    backgroundColor: '#F0FDF4', borderWidth: 1.5, borderColor: '#22C55E',
  },
  addBtnSelected: { backgroundColor: '#22C55E' },
  addBtnText: { fontSize: 13, fontFamily: F.semibold, color: '#22C55E' },
  addBtnTextSelected: { color: '#fff' },
  bookBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#1D4ED8', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10,
  },
  bookBtnText: { fontSize: 13, fontFamily: F.bold, color: '#fff' },
  navBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: '#22C55E', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  navBtnText: { fontSize: 13, fontFamily: F.semibold, color: '#22C55E' },

  // ── Horizontal variant (Flutter-matched) ──────────────────────
  cardH: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 0.5,
    borderColor: '#E5E5E7',
    overflow: 'hidden',
    minHeight: 144,
  },
  imageContainerH: {
    width: 116,
    position: 'relative',
  },
  imageH: {
    width: 116,
    height: 144,
    resizeMode: 'cover',
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  // Heart at top-RIGHT of image
  heartBtnTR: {
    position: 'absolute',
    top: 8,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyH: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: 'space-between',
  },
  nameH: { fontSize: 15, fontFamily: F.semibold, color: '#111827', marginBottom: 3 },
  descriptionH: {
    fontSize: 12, fontFamily: F.regular, color: '#57636C',
    lineHeight: 17, opacity: 0.85, flex: 1, marginBottom: 5,
  },
  metaRowH: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 6, alignItems: 'center' },
  actionRowH: { flexDirection: 'row', gap: 6 },
  // "Book Now" — outline style matching Flutter
  bookBtnH: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3,
    backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#E5E5E7',
    borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 6,
    opacity: 0.9,
  },
  bookBtnHText: { fontSize: 12, fontFamily: F.medium, color: '#111827' },
  // "Add to Itinerary" — solid green
  addBtnH: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#22C55E',
    borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 6,
    opacity: 0.9,
  },
  addBtnHSelected: { backgroundColor: '#16A34A', opacity: 1 },
  addBtnHText: { fontSize: 12, fontFamily: F.medium, color: '#fff' },
});

export default PlaceCard;
