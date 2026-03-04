import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { F } from '../theme/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import { searchPlacesByVibe } from '../services/googlePlacesService';

const MESSAGES = [
  'Matching your vibe\u2026',
  'Finding hidden gems\u2026',
  'Building your journey\u2026',
];

type Props = { navigation: any; route: any };

export default function ProcessingScreen({ navigation, route }: Props) {
  const { destination, vibeKeywords, vibes, explorationHours, distanceMiles, timeOfDay, latitude, longitude } = route?.params || {};
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const msgTimer = setInterval(() => {
      setMsgIndex(i => (i + 1) % MESSAGES.length);
    }, 1100);

    const apiCall = searchPlacesByVibe(destination || '', vibeKeywords || [], latitude || 0, longitude || 0)
      .catch(() => []);
    const minDelay = new Promise<void>(res => setTimeout(res, 5000));

    Promise.all([apiCall, minDelay]).then(([places]) => {
      if (cancelled) return;
      navigation.replace('SuggestedPlaces', {
        places, destination, vibes, explorationHours, distanceMiles, timeOfDay, latitude, longitude,
      });
    });

    return () => {
      cancelled = true;
      clearInterval(msgTimer);
    };
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.inner}>
        <View style={styles.animationWrap}>
          <LottieView
            source={require('../../assets/loading.json')}
            autoPlay
            loop
            style={styles.lottie}
          />
        </View>
        <Text style={styles.message}>{MESSAGES[msgIndex]}</Text>
        <View style={styles.dotRow}>
          {MESSAGES.map((_, i) => (
            <View key={i} style={[styles.dot, i === msgIndex && styles.dotActive]} />
          ))}
        </View>
        <Text style={styles.subMessage}>Hang tight, this won't take long.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  animationWrap: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
    shadowColor: '#22C55E',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  lottie: { width: 180, height: 180 },
  message: {
    fontSize: 22,
    fontFamily: F.bold,
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 30,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
  },
  dotActive: {
    backgroundColor: '#22C55E',
    width: 18,
  },
  subMessage: {
    fontSize: 14,
    fontFamily: F.regular,
    color: '#9CA3AF',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});
