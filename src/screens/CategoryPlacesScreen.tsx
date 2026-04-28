import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';


import { F } from '../theme/fonts';
import { COLORS } from '../theme/tokens';
import { useRoute } from '@react-navigation/native';

export default function CategoryPlacesScreen({ navigation }) {
  const route = useRoute();
  const category = route?.params?.category;

  if (!category) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: 'red', fontSize: 18 }}>No category provided.</Text>
      </View>
    );
  }

  // TODO: Implement the rest of your screen logic here, using `category` safely.
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 20 }}>Category: {category.label || category.id || JSON.stringify(category)}</Text>
    </View>
  );
}


// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: {
    height: 140,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  headerPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 2,
    marginBottom: 6,
  },
  headerPillText: { fontSize: 10, color: '#fff', fontFamily: F.medium },
  headerLabel: { fontSize: 22, fontFamily: F.semibold, color: '#fff', marginBottom: 2 },
  headerCount: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: F.regular },

  // Filters
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
  },
  filterPillActive: { backgroundColor: '#111827', borderColor: '#111827' },
  filterText: { fontSize: 12, fontFamily: F.medium, color: '#6B7280' },
  filterTextActive: { color: '#fff' },

  // List
  list: { flex: 1 },
  listContent: { paddingBottom: 32 },

  // Place row
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#fff',
  },
  thumbWrap: { width: 80, height: 80, borderRadius: 10, overflow: 'hidden' },
  thumb: { width: 80, height: 80, borderRadius: 10, resizeMode: 'cover' },
  placeInfo: { flex: 1 },
  placeTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  placeName: {
    flex: 1,
    fontSize: 14,
    fontFamily: F.semibold,
    color: '#111827',
    marginRight: 8,
  },
  placeType: {
    fontSize: 11,
    fontFamily: F.regular,
    color: '#9CA3AF',
    marginBottom: 6,
    textTransform: 'capitalize',
  },
  placeBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  placeMeta: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11, fontFamily: F.regular, color: '#6B7280' },

  // Open status badges
  openBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  openDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#639922' },
  openText: { fontSize: 11, fontFamily: F.medium, color: '#639922' },
  closedText: { fontSize: 11, fontFamily: F.medium, color: '#A32D2D' },
  hoursNaText: { fontSize: 11, fontFamily: F.regular, color: '#9CA3AF' },

  // Navigate button
  navBtn: {
    backgroundColor: '#111827',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  navBtnText: { fontSize: 11, fontFamily: F.semibold, color: '#fff' },

  // State screens
  stateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  stateTitle: {
    fontSize: 16,
    fontFamily: F.semibold,
    color: '#374151',
    marginTop: 12,
    marginBottom: 6,
    textAlign: 'center',
  },
  stateHint: {
    fontSize: 13,
    fontFamily: F.regular,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  actionBtn: {
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: COLORS.accent.primary,
  },
  actionBtnText: { fontSize: 14, fontFamily: F.semibold, color: '#fff' },

  // Late night fallback note
  lateNightNote: {
    textAlign: 'center',
    fontSize: 12,
    fontFamily: F.regular,
    color: '#9CA3AF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    lineHeight: 18,
  },

  // Skeleton
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#fff',
  },
  skeletonThumb: { width: 80, height: 80, borderRadius: 10, backgroundColor: '#E5E7EB' },
  skeletonLines: { flex: 1 },
  skeletonLine: { height: 12, borderRadius: 6, backgroundColor: '#E5E7EB' },
});
