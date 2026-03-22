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
      <View style={[styles.card, styles.cardH]}>
        {/* Left: image */}
        <View style={styles.imageContainerH}>
          <Image source={{ uri: photoUrl || fallbackImage }} style={styles.imageH} />
          {onSave && (
            <TouchableOpacity style={styles.heartBtnTL} onPress={onSave}>
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
            <Text style={styles.descriptionH} numberOfLines={2}>{description || category}</Text>
          ) : null}

          <View style={styles.metaRowH}>
            {distance ? (
              <View style={styles.metaItem}>
                <Ionicons name="walk-outline" size={12} color="#57636C" />
                <Text style={styles.metaText}>{distance}</Text>
              </View>
            ) : null}
            {duration ? (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={12} color="#57636C" />
                <Text style={styles.metaText}>{duration}</Text>
              </View>
            ) : null}
            {rating != null ? (
              <View style={styles.metaItem}>
                <Ionicons name="star" size={12} color="#F59E0B" />
                <Text style={styles.metaText}>{rating.toFixed(1)}</Text>
              </View>
            ) : null}
          </View>

          {(onAdd || onBook) ? (
            <View style={styles.actionRowH}>
              {onBook ? (
                <TouchableOpacity style={styles.bookBtnH} onPress={onBook}>
                  <Text style={styles.bookBtnHText}>Book Now</Text>
                  <Ionicons name="chevron-forward" size={12} color="#1D4ED8" />
                </TouchableOpacity>
              ) : null}
              {onAdd ? (
                <TouchableOpacity
                  style={[styles.addBtnH, isAdded && styles.addBtnHSelected]}
                  onPress={onAdd}
                >
                  <Ionicons
                    name={isAdded ? 'checkmark-circle' : 'add-circle-outline'}
                    size={14}
                    color="#fff"
                  />
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
    top: 14,
    left: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(34, 197, 94, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  badgeText: { fontSize: 13, fontFamily: F.bold, color: '#fff' },
  heartBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  body: { padding: 20 },
  name: { fontSize: 20, fontFamily: F.bold, color: '#111827', marginBottom: 6, letterSpacing: -0.4 },
  description: { fontSize: 14, fontFamily: F.regular, color: '#4B5563', marginBottom: 12, lineHeight: 22 },
  metaRow: { flexDirection: 'row', gap: 12, marginBottom: 14, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, fontFamily: F.medium, color: '#57636C' },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    paddingTop: 14,
    flexWrap: 'wrap',
  },
  addBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#22C55E',
  },
  addBtnSelected: { backgroundColor: '#22C55E' },
  addBtnText: { fontSize: 13, fontFamily: F.semibold, color: '#22C55E' },
  addBtnTextSelected: { color: '#fff' },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1D4ED8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  bookBtnText: { fontSize: 13, fontFamily: F.bold, color: '#fff' },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#22C55E',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  navBtnText: { fontSize: 13, fontFamily: F.semibold, color: '#22C55E' },

  // ── Horizontal variant ─────────────────────────────────────────
  cardH: {
    flexDirection: 'row',
    borderRadius: 18,
    marginBottom: 12,
    minHeight: 130,
  },
  imageContainerH: {
    width: 110,
  },
  imageH: {
    width: 110,
    height: 130,
    resizeMode: 'cover',
  },
  heartBtnTL: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.38)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyH: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  nameH: { fontSize: 15, fontFamily: F.bold, color: '#111827', marginBottom: 3 },
  descriptionH: { fontSize: 12, fontFamily: F.regular, color: '#6B7280', lineHeight: 17, marginBottom: 6, flex: 1 },
  metaRowH: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 8 },
  actionRowH: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  bookBtnH: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 6,
    backgroundColor: '#EFF6FF',
  },
  bookBtnHText: { fontSize: 11, fontFamily: F.semibold, color: '#1D4ED8' },
  addBtnH: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#22C55E',
  },
  addBtnHSelected: { backgroundColor: '#16A34A' },
  addBtnHText: { fontSize: 11, fontFamily: F.semibold, color: '#fff' },
});

export default PlaceCard;
