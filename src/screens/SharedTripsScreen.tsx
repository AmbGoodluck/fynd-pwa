import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { F } from '../theme/fonts';
import AppHeader from '../components/AppHeader';
import { useSharedTripStore } from '../store/useSharedTripStore';
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
}: {
  trip: SharedTrip;
  isOwner: boolean;
  onPress: () => void;
  onDelete?: () => void;
}) {
  const preview = trip.places.slice(0, 3);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
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

      {/* Actions */}
      <View style={styles.cardRight}>
        <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
        {isOwner && onDelete && (
          <TouchableOpacity
            onPress={onDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ marginTop: 8 }}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
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
  } = useSharedTripStore();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadTrips = useCallback(async () => {
    try {
      const [created, joined] = await Promise.all([
        getMyCreatedTrips(sessionUserId),
        getJoinedTrips(sessionUserId),
      ]);
      setMyTrips(created);
      setJoinedTrips(joined);
    } catch (e) {
      // silently use cached state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sessionUserId]);

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

  const confirmDelete = (trip: SharedTrip) => {
    Alert.alert(
      'Delete Trip',
      `Delete "${trip.trip_name}"? This will remove it for all members.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSharedTrip(trip.trip_id);
              removeMyTrip(trip.trip_id);
            } catch {
              Alert.alert('Error', 'Could not delete trip. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="Shared Trips" onBack={() => navigation.goBack()} />

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
          {/* ── Trips I Created ─────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trips I Created</Text>
            {myTrips.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="map-outline" size={36} color="#D1D5DB" />
                <Text style={styles.emptyText}>No trips created yet</Text>
                <Text style={styles.emptyHint}>
                  Share an itinerary to invite your team
                </Text>
              </View>
            ) : (
              myTrips.map((t) => (
                <TripCard
                  key={t.trip_id}
                  trip={t}
                  isOwner
                  onPress={() => openTrip(t)}
                  onDelete={() => confirmDelete(t)}
                />
              ))
            )}
          </View>

          {/* ── Trips Shared With Me ─────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trips Shared With Me</Text>
            {joinedTrips.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="people-outline" size={36} color="#D1D5DB" />
                <Text style={styles.emptyText}>No shared trips yet</Text>
                <Text style={styles.emptyHint}>
                  Ask someone to share a trip link with you
                </Text>
              </View>
            ) : (
              joinedTrips.map((t) => (
                <TripCard
                  key={t.trip_id}
                  trip={t}
                  isOwner={false}
                  onPress={() => openTrip(t)}
                />
              ))
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 40 },

  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 16,
    fontFamily: F.bold,
    color: '#111827',
    marginBottom: 12,
  },

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

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
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

  cardRight: { alignItems: 'center', justifyContent: 'center', paddingLeft: 8 },
});
