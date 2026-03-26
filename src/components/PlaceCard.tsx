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

  // Badge (order number shown on image — used in trip detail lists)
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

  // ── Horizontal layout (primary / unified design) ─────────────
  if (horizontal) {
    return (
      <View style={styles.cardH}>
        {/* Left: image */}
        <View style={styles.imageContainerH}>
          <Image
            source={{ uri: photoUrl || fallbackImage }}
            style={styles.imageH}
          />
          {/* Order badge — top-left of image */}
          {indexBadge !== undefined && (
            <View style={styles.badgeH}>
              <Text style={styles.badgeHText}>{indexBadge}</Text>
            </View>
          )}
          {/* Save heart — top-right of image */}
          {onSave && (
            <TouchableOpacity
              style={[styles.heartBtnH, isSaved && styles.heartBtnHSaved]}
              onPress={onSave}
            >
              <Ionicons
                name={isSaved ? 'heart' : 'heart-outline'}
                size={15}
                color="#fff"
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Right: content */}
        <View style={styles.bodyH}>
          <Text style={styles.nameH} numberOfLines={2}>{name}</Text>

          {(description || category) ? (
            <Text style={styles.descriptionH} numberOfLines={2}>
              {description || category}
            </Text>
          ) : null}

          {/* Meta row: ⭐ rating · 🚶 distance · ⏱ duration */}
          <View style={styles.metaRowH}>
            {rating != null ? (
              <View style={styles.metaItem}>
                <Ionicons name="star" size={12} color="#F59E0B" />
                <Text style={styles.metaText}>{rating.toFixed(1)}</Text>
              </View>
            ) : null}
            {distance ? (
              <View style={styles.metaItem}>
                <Ionicons name="walk-outline" size={12} color="#6B7280" />
                <Text style={styles.metaText}>{distance}</Text>
              </View>
            ) : null}
            {duration ? (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={12} color="#6B7280" />
                <Text style={styles.metaText}>{duration}</Text>
              </View>
            ) : null}
          </View>

          {/* Action buttons */}
          {(onAdd || onBook || onNavigate) ? (
            <View style={styles.actionRowH}>
              {onNavigate ? (
                <TouchableOpacity style={styles.pillBtnH} onPress={onNavigate}>
                  <Ionicons name="navigate-outline" size={12} color="#fff" />
                  <Text style={styles.pillBtnHText}>Navigate</Text>
                </TouchableOpacity>
              ) : null}
              {onBook ? (
                <TouchableOpacity style={styles.bookBtnH} onPress={onBook}>
                  <Text style={styles.bookBtnHText}>Book Now</Text>
                </TouchableOpacity>
              ) : null}
              {onAdd ? (
                <TouchableOpacity
                  style={[styles.addBtnH, isAdded && styles.addBtnHSelected]}
                  onPress={onAdd}
                >
                  <Text style={[styles.addBtnHText, isAdded && styles.addBtnHTextSelected]}>
                    {isAdded ? '✓ Added' : 'Add to itinerary'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  // ── Vertical layout (legacy fallback) ────────────────────────
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
              color={isSaved ? '#EF4444' : '#1A1A1A'}
            />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>{name}</Text>

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
              <Ionicons name="walk-outline" size={13} color="#6B7280" />
              <Text style={styles.metaText}>{distance}</Text>
            </View>
          ) : null}
          {duration ? (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={13} color="#6B7280" />
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
                <Ionicons
                  name={isAdded ? 'checkmark-circle' : 'add-circle-outline'}
                  size={16}
                  color={isAdded ? '#fff' : '#10B981'}
                />
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
                <Ionicons name="navigate-outline" size={14} color="#fff" />
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
  // ── Horizontal (unified primary card) ──────────────────────────
  cardH: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    minHeight: 120,
  },
  imageContainerH: {
    width: 100,
    position: 'relative',
  },
  imageH: {
    width: 100,
    height: '100%',
    minHeight: 120,
    resizeMode: 'cover',
  },
  // Order badge — green circle top-left of image
  badgeH: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  badgeHText: { fontSize: 11, fontFamily: F.bold, color: '#fff' },
  // Save heart — top-right of image
  heartBtnH: {
    position: 'absolute',
    top: 8,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartBtnHSaved: {
    backgroundColor: '#EF4444',
  },

  bodyH: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'space-between',
  },
  nameH: {
    fontSize: 15,
    fontFamily: F.semibold,
    color: '#1A1A1A',
    marginBottom: 3,
  },
  descriptionH: {
    fontSize: 12,
    fontFamily: F.regular,
    color: '#6B7280',
    lineHeight: 17,
    marginBottom: 6,
    flex: 1,
  },
  metaRowH: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 8,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 12, fontFamily: F.medium, color: '#6B7280' },

  actionRowH: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  // Navigate — dark pill
  pillBtnH: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1A1A1A',
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillBtnHText: { fontSize: 12, fontFamily: F.semibold, color: '#fff' },
  // Book Now — subtle outline
  bookBtnH: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  bookBtnHText: { fontSize: 12, fontFamily: F.medium, color: '#374151' },
  // Add to Itinerary — dark fill or confirmed state
  addBtnH: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  addBtnHSelected: { backgroundColor: '#10B981' },
  addBtnHText: { fontSize: 12, fontFamily: F.semibold, color: '#fff' },
  addBtnHTextSelected: { color: '#fff' },

  // ── Vertical (legacy fallback) ────────────────────────────────
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  imageContainer: { position: 'relative' },
  image: { width: '100%', height: 200, resizeMode: 'cover' },
  badge: {
    position: 'absolute',
    top: 14, left: 14,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#10B981',
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
  body: { padding: 18 },
  name: { fontSize: 18, fontFamily: F.bold, color: '#1A1A1A', marginBottom: 6, letterSpacing: -0.3 },
  description: { fontSize: 14, fontFamily: F.regular, color: '#4B5563', marginBottom: 12, lineHeight: 22 },
  metaRow: { flexDirection: 'row', gap: 12, marginBottom: 14, flexWrap: 'wrap' },
  actionRow: {
    flexDirection: 'row', gap: 8,
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
    paddingTop: 14, flexWrap: 'wrap',
  },
  addBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 12,
    backgroundColor: '#F0FDF4', borderWidth: 1.5, borderColor: '#10B981',
  },
  addBtnSelected: { backgroundColor: '#10B981' },
  addBtnText: { fontSize: 13, fontFamily: F.semibold, color: '#10B981' },
  addBtnTextSelected: { color: '#fff' },
  bookBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#1A1A1A', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10,
  },
  bookBtnText: { fontSize: 13, fontFamily: F.bold, color: '#fff' },
  navBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#1A1A1A', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  navBtnText: { fontSize: 13, fontFamily: F.semibold, color: '#fff' },
});

export default PlaceCard;
