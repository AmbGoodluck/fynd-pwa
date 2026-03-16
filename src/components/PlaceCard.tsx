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
  indexBadge,
  onSave,
  isSaved,
  onAdd,
  isAdded,
  onNavigate,
  onBook,
}: Props) {
  const fallbackImage = FALLBACK_IMAGE;
  
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
              size={20}
              color={isSaved ? '#EF4444' : '#fff'}
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

        {/* Action Row */}
        {(onAdd || onNavigate || onBook) && (
          <View style={styles.actionRow}>
            {onAdd && (
              <TouchableOpacity
                style={[styles.addBtn, isAdded && styles.addBtnSelected]}
                onPress={onAdd}
              >
                <Ionicons name={isAdded ? "checkmark-circle" : "add-circle-outline"} size={16} color={isAdded ? "#fff" : "#22C55E"} />
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
    overflow: 'hidden',
  },
  imageContainer: { position: 'relative' },
  image: { width: '100%', height: 200, resizeMode: 'cover' },
  badge: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  badgeText: { fontSize: 13, fontFamily: F.bold, color: '#fff' },
  heartBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: 16 },
  name: { fontSize: 18, fontFamily: F.bold, color: '#111827', marginBottom: 6 },
  description: { fontSize: 14, fontFamily: F.regular, color: '#6B7280', marginBottom: 10, lineHeight: 20 },
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
});

export default PlaceCard;
