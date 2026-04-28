import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { F } from '../theme/fonts';
import { COLORS } from '../theme/tokens';

const LottieView = Platform.OS !== 'web'
  ? require('lottie-react-native').default
  : null;

const MESSAGES = [
  'Matching your vibe\u2026',
  'Finding hidden gems\u2026',
  'Building your journey\u2026',
];

type Props = {
  message?: string;
};

export default function Loader({ message }: Props) {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setMsgIndex(i => (i + 1) % MESSAGES.length), 1100);
    return () => clearInterval(t);
  }, []);

  const displayMessage = message ?? MESSAGES[msgIndex];

  return (
    <View style={styles.container}>
      <View style={styles.animationWrap}>
        {Platform.OS === 'web' ? (
          <ActivityIndicator size={100} color={COLORS.accent.primary} />
        ) : (
          <LottieView
            source={require('../../assets/loading.json')}
            autoPlay
            loop
            style={styles.lottie}
          />
        )}
      </View>
      <Text style={styles.message}>{displayMessage}</Text>
      {!message && (
        <View style={styles.dotRow}>
          {MESSAGES.map((_, i) => (
            <View key={i} style={[styles.dot, i === msgIndex && styles.dotActive]} />
          ))}
        </View>
      )}
      <Text style={styles.subMessage}>Hang tight, this won't take long.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  animationWrap: {
    width: '65%',
    maxWidth: 220,
    aspectRatio: 1,
    borderRadius: 9999,
    backgroundColor: COLORS.accent.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
    shadowColor: COLORS.accent.primary,
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
  dotRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E5E7EB' },
  dotActive: { backgroundColor: COLORS.accent.primary, width: 18 },
  subMessage: {
    fontSize: 14,
    fontFamily: F.regular,
    color: '#9CA3AF',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});
