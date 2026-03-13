import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ImageBackground, StatusBar, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Two people walking on a scenic nature path
const IMAGE_URI = 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=900&q=85';

// Mock itinerary stops matching the reference screenshot
const ITINERARY_STOPS = [
  { name: 'Terra Kulture',    time: '11 min away', status: 'In Progress', color: '#22C55E' },
  { name: 'Shiro Cafe',      time: '11 min away', status: 'In Progress', color: '#22C55E' },
  { name: 'Hidden Art Garden', time: '14 min away', status: 'Next',     color: '#F59E0B' },
];

type Props = { navigation: any };

export default function Onboarding3Screen({ navigation }: Props) {
  return (
    <ImageBackground source={{ uri: IMAGE_URI }} style={styles.bg} resizeMode="cover">
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={styles.scrim} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Mock "Active Itinerary" phone card */}
        <View style={styles.itineraryCard}>
          <Text style={styles.cardHeader}>Active itinerary</Text>
          <Text style={styles.cardDate}>Today · April 15 · 1 hr 58 min</Text>
          <View style={styles.divider} />
          {ITINERARY_STOPS.map((stop, i) => (
            <View key={i} style={styles.stopRow}>
              <View style={[styles.stopDot, { backgroundColor: stop.color }]} />
              <View style={styles.stopInfo}>
                <Text style={styles.stopName}>{stop.name}</Text>
                <Text style={styles.stopMeta}>{stop.time} · {stop.status}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ flex: 1 }} />

        {/* Bottom content */}
        <View style={styles.bottomCard}>
          <View style={styles.featurePill}>
            <Ionicons name="calendar-outline" size={14} color="#22C55E" />
            <Text style={styles.featurePillText}>Smart Itineraries</Text>
          </View>

          <Text style={styles.title}>Plan Your{'\n'}Perfect Trip</Text>
          <Text style={styles.subtitle}>
            Build flexible, curated itineraries. Drag and reorder stops, add bookings, and navigate live.
          </Text>

          <View style={styles.dots}>
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>

          <TouchableOpacity
            style={styles.nextBtn}
            onPress={() => navigation.navigate('Onboarding4')}
            activeOpacity={0.88}
          >
            <Text style={styles.nextBtnText}>Next</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  safe: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },
  itineraryCard: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 20,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  cardHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  cardDate: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#F2F2F7',
    marginBottom: 10,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  stopDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stopInfo: { flex: 1 },
  stopName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  stopMeta: { fontSize: 11, color: '#9CA3AF' },
  bottomCard: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 28,
    padding: 28,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(34,197,94,0.2)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.4)',
  },
  featurePillText: { fontSize: 12, color: '#22C55E', fontWeight: '600' },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 40,
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.82)',
    lineHeight: 22,
    marginBottom: 20,
  },
  dots: { flexDirection: 'row', gap: 8, marginBottom: 24, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.38)' },
  dotActive: { backgroundColor: '#22C55E', width: 24 },
  nextBtn: {
    backgroundColor: '#22C55E',
    borderRadius: 50,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22C55E',
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  nextBtnText: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },
});
