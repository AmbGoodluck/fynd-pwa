import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ImageBackground, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Phone mockup showing Active Itinerary screen against travel backdrop
const IMAGE_URI = 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=900&q=85';

type Props = { navigation: any };

export default function Onboarding2Screen({ navigation }: Props) {
  return (
    <ImageBackground source={{ uri: IMAGE_URI }} style={styles.bg} resizeMode="cover">
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={styles.scrim} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={{ flex: 1 }} />

        <View style={styles.bottomCard}>
          <View style={styles.featurePill}>
            <Ionicons name="globe-outline" size={14} color="#22C55E" />
            <Text style={styles.featurePillText}>Travel Discovery</Text>
          </View>

          <Text style={styles.title}>Explore the World{'\n'}Your Way</Text>
          <Text style={styles.subtitle}>
            Discover amazing hidden gems tailored to your travel style and interests in any city, anywhere.
          </Text>

          <View style={styles.dots}>
            <View style={styles.dot} />
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>

          <TouchableOpacity
            style={styles.nextBtn}
            onPress={() => navigation.navigate('Onboarding3')}
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
    backgroundColor: 'rgba(0,0,0,0.44)',
  },
  safe: { flex: 1, paddingHorizontal: 20 },
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
