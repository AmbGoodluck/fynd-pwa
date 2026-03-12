import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { F } from '../theme/fonts';
import {
  getSharedTrip,
  getMembership,
  joinSharedTrip,
} from '../services/sharedTripService';
import { useSharedTripStore } from '../store/useSharedTripStore';
import type { SharedTrip } from '../types/sharedTrip';

type Props = { navigation: any; route?: any };

export default function JoinTripScreen({ navigation, route }: Props) {
  const trip_id: string = route?.params?.trip_id ?? '';

  const { sessionUserId, sessionUserName, addJoinedTrip } = useSharedTripStore();

  const [trip, setTrip] = useState<SharedTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [alreadyMember, setAlreadyMember] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!trip_id) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const [fetchedTrip, membership] = await Promise.all([
          getSharedTrip(trip_id),
          getMembership(trip_id, sessionUserId),
        ]);

        if (!fetchedTrip) {
          setNotFound(true);
        } else {
          setTrip(fetchedTrip);
          if (membership) {
            setAlreadyMember(true);
          }
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [trip_id]);

  const handleJoin = async () => {
    if (!trip) return;
    setJoining(true);
    try {
      await joinSharedTrip({
        trip_id: trip.trip_id,
        user_id: sessionUserId,
        user_name: sessionUserName,
      });
      addJoinedTrip(trip);
      navigation.replace('SharedTripDetail', { trip_id: trip.trip_id });
    } catch (e: any) {
      if (e?.message === 'TRIP_NOT_FOUND') {
        Alert.alert('Trip Not Found', 'This trip is no longer available.');
      } else {
        Alert.alert('Error', 'Could not join the trip. Please try again.');
      }
    } finally {
      setJoining(false);
    }
  };

  const handleAlreadyMember = () => {
    navigation.replace('SharedTripDetail', { trip_id: trip_id });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#22C55E" />
          <Text style={styles.loadingText}>Loading trip...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (notFound) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={64} color="#E5E5EA" />
          <Text style={styles.notFoundTitle}>Trip Not Available</Text>
          <Text style={styles.notFoundSub}>This trip is no longer available.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (alreadyMember && trip) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <View style={styles.iconWrap}>
            <Ionicons name="checkmark-circle" size={48} color="#22C55E" />
          </View>
          <Text style={styles.alreadyTitle}>You're already in this trip!</Text>
          <Text style={styles.alreadySub}>{trip.trip_name}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleAlreadyMember}>
            <Text style={styles.primaryBtnText}>Open Trip</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghostBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.ghostBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.inviteHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>
              {trip?.owner_name?.[0]?.toUpperCase() ?? 'F'}
            </Text>
          </View>
          <Text style={styles.inviteTitle}>
            {trip?.owner_name} invited you to explore a trip
          </Text>
        </View>

        {/* Trip card */}
        <View style={styles.tripCard}>
          {/* Preview images */}
          {trip && trip.places.length > 0 && (
            <View style={styles.imageRow}>
              {trip.places.slice(0, 2).map((p, i) => (
                <Image
                  key={i}
                  source={{
                    uri:
                      p.photoUrl ||
                      'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400',
                  }}
                  style={[styles.previewImage, i === 1 && { marginLeft: 4 }]}
                />
              ))}
            </View>
          )}

          <View style={styles.tripInfo}>
            <Text style={styles.tripName}>{trip?.trip_name}</Text>

            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={15} color="#6B7280" />
              <Text style={styles.infoText}>{trip?.trip_date}</Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={15} color="#6B7280" />
              <Text style={styles.infoText}>
                {trip?.places.length} place{(trip?.places.length ?? 0) !== 1 ? 's' : ''}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="people-outline" size={15} color="#6B7280" />
              <Text style={styles.infoText}>
                {trip?.member_count} explorer{(trip?.member_count ?? 0) !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          {/* Place list preview */}
          {trip && trip.places.length > 0 && (
            <View style={styles.placeList}>
              {trip.places.map((p, i) => (
                <View key={i} style={styles.placeRow}>
                  <View style={styles.placeBadge}>
                    <Text style={styles.placeBadgeText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.placeName} numberOfLines={1}>
                    {p.name}
                  </Text>
                  {p.rating != null && (
                    <View style={styles.ratingRow}>
                      <Ionicons name="star" size={11} color="#F59E0B" />
                      <Text style={styles.ratingText}>{p.rating.toFixed(1)}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* CTA buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primaryBtn, joining && { opacity: 0.7 }]}
            onPress={handleJoin}
            disabled={joining}
          >
            {joining ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="people-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.primaryBtnText}>Join Trip</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.outlineBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.outlineBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  scroll: { padding: 20, paddingBottom: 48 },

  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },

  notFoundTitle: { fontSize: 20, fontFamily: F.bold, color: '#111827', marginTop: 16, textAlign: 'center' },
  notFoundSub: { fontSize: 14, color: '#6B7280', marginTop: 8, textAlign: 'center', marginBottom: 32 },

  alreadyTitle: { fontSize: 20, fontFamily: F.bold, color: '#111827', marginTop: 16, textAlign: 'center' },
  alreadySub: { fontSize: 15, color: '#6B7280', marginTop: 4, marginBottom: 28, textAlign: 'center' },

  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },

  inviteHeader: { alignItems: 'center', marginBottom: 24 },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarInitial: { fontSize: 28, fontFamily: F.bold, color: '#fff' },
  inviteTitle: {
    fontSize: 18,
    fontFamily: F.semibold,
    color: '#111827',
    textAlign: 'center',
    lineHeight: 26,
  },

  tripCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    marginBottom: 28,
  },

  imageRow: { flexDirection: 'row', height: 140 },
  previewImage: { flex: 1, resizeMode: 'cover' },

  tripInfo: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
  tripName: { fontSize: 20, fontFamily: F.bold, color: '#111827', marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  infoText: { fontSize: 14, color: '#6B7280' },

  placeList: { padding: 16, gap: 10 },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  placeBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeBadgeText: { fontSize: 11, fontFamily: F.bold, color: '#fff' },
  placeName: { flex: 1, fontSize: 14, color: '#374151', fontFamily: F.medium },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingText: { fontSize: 12, color: '#F59E0B', fontFamily: F.medium },

  actions: { gap: 12 },
  primaryBtn: {
    backgroundColor: '#22C55E',
    borderRadius: 16,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22C55E',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontFamily: F.semibold },
  outlineBtn: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 16,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtnText: { color: '#57636C', fontSize: 15, fontFamily: F.medium },
  ghostBtn: { alignItems: 'center', paddingVertical: 12 },
  ghostBtnText: { color: '#9CA3AF', fontSize: 14 },
});
