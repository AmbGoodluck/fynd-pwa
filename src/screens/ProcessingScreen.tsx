import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Alert, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import { F } from '../theme/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import * as Sentry from '@sentry/react-native';
import { searchPlacesByVibe } from '../services/googlePlacesService';

const MESSAGES = [
  'Matching your vibe\u2026',
  'Finding hidden gems\u2026',
  'Building your journey\u2026',
];
const MAX_RETRIES = 2;

type Props = { navigation: any; route: any };

export default function ProcessingScreen({ navigation, route }: Props) {
  const { destination, vibeKeywords, vibes, explorationHours, distanceMiles, timeOfDay, latitude, longitude } = route?.params || {};
  const [msgIndex, setMsgIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const retryCount = useRef(0);
  const cancelledRef = useRef(false);

  const lastError = useRef<string | null>(null);

  const fetchPlaces = async (): Promise<any[]> => {
    try {
      console.log(`[Processing] Fetching places for "${destination}" on ${Platform.OS}, attempt ${retryCount.current + 1}`);
      console.log(`[Processing] vibeKeywords:`, vibeKeywords);
      console.log(`[Processing] lat=${latitude} lng=${longitude}`);
      Sentry.addBreadcrumb({
        category: 'processing',
        message: `Searching places for "${destination}" (attempt ${retryCount.current + 1}/${MAX_RETRIES + 1})`,
        level: 'info',
        data: { destination, vibeKeywords, latitude, longitude, platform: Platform.OS },
      });
      const places = await searchPlacesByVibe(destination || '', vibeKeywords || [], latitude || 0, longitude || 0);
      console.log(`[Processing] Got ${places?.length || 0} places`);
      lastError.current = null;
      return places;
    } catch (err: any) {
      const msg = err?.message || String(err);
      console.error('[Processing] searchPlacesByVibe error:', msg);
      lastError.current = msg;
      Sentry.captureException(err, {
        tags: { context: 'ProcessingScreen.searchPlacesByVibe', platform: Platform.OS },
        extra: { destination, vibeKeywords, latitude, longitude, attempt: retryCount.current + 1 },
      });
      return [];
    }
  };

  const run = async () => {
    setErrorMsg(null);
    setLoading(true);
    const minDelay = new Promise<void>(res => setTimeout(res, 3000));
    let places = await fetchPlaces();

    // Retry up to MAX_RETRIES times if first attempt returns empty
    while ((!places || places.length === 0) && retryCount.current < MAX_RETRIES && !cancelledRef.current) {
      retryCount.current += 1;
      console.log(`[Processing] Retry ${retryCount.current}/${MAX_RETRIES} for "${destination}"`);
      await new Promise(res => setTimeout(res, 1500));
      places = await fetchPlaces();
    }

    await minDelay;

    if (cancelledRef.current) return;

    if (!places || places.length === 0) {
      setLoading(false);
      const errDetail = lastError.current ? `\n\nError: ${lastError.current}` : '';
      const msg = `No places found for "${destination}" after ${retryCount.current + 1} attempts.${errDetail}\n\nCheck your connection or try a different city.`;
      setErrorMsg(msg);
      if (lastError.current) {
        Sentry.captureMessage('ProcessingScreen: no places found after all retries', {
          level: 'warning',
          extra: { destination, vibeKeywords, latitude, longitude, retries: retryCount.current, platform: Platform.OS, error: lastError.current },
        });
      } else {
        Sentry.addBreadcrumb({
          category: 'processing',
          message: 'No places found after retries (no underlying exception)',
          level: 'info',
          data: { destination, vibeKeywords, latitude, longitude, retries: retryCount.current, platform: Platform.OS },
        });
      }
      return;
    }

    navigation.replace('SuggestedPlaces', {
      places, destination, vibes, explorationHours, distanceMiles, timeOfDay, latitude, longitude,
    });
  };

  useEffect(() => {
    cancelledRef.current = false;

    const msgTimer = setInterval(() => {
      setMsgIndex(i => (i + 1) % MESSAGES.length);
    }, 1100);

    run();

    return () => {
      cancelledRef.current = true;
      clearInterval(msgTimer);
    };
  }, []);

  if (errorMsg) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.inner}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => { retryCount.current = 0; run(); }}
          >
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorTitle: {
    fontSize: 22,
    fontFamily: F.bold,
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    fontFamily: F.regular,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryBtn: {
    backgroundColor: '#22C55E',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginBottom: 12,
  },
  retryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: F.bold,
  },
  backBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  backBtnText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontFamily: F.regular,
  },
});
