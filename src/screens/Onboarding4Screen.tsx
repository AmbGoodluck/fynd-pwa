import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ImageBackground, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useGuestStore } from '../store/useGuestStore';

// Navigate With Confidence: person in city using phone for navigation
const IMAGE_URI = 'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?w=900&q=85';

// Floating service hub icon bubbles (matches Figma reference)
const SERVICE_BUBBLES = [
  { icon: 'medkit-outline',  label: 'Clinic',    top: '32%', left: '8%',  size: 56, color: '#EF4444' },
  { icon: 'cash-outline',    label: 'Forex',     top: '50%', left: '4%',  size: 52, color: '#2A0BBF' },
  { icon: 'car-outline',     label: 'Transport', top: '36%', right: '6%', size: 56, color: '#047433' },
  { icon: 'shield-outline',  label: 'Police',    top: '56%', right: '8%', size: 52, color: '#1D3557' },
];

type Props = { navigation: any };

export default function Onboarding4Screen({ navigation }: Props) {
  const { setHasSeenOnboarding } = useGuestStore();

  const handleGetStarted = () => {
    setHasSeenOnboarding(true);
    navigation.navigate('AuthChoice');
  };

  return (
    <ImageBackground source={{ uri: IMAGE_URI }} style={styles.bg} resizeMode="cover">
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={styles.scrim} />

      {/* Floating service hub bubbles overlaid on the photo */}
      {SERVICE_BUBBLES.map((b, i) => (
        <View
          key={i}
          style={[
            styles.bubble,
            { top: b.top as any, left: (b as any).left, right: (b as any).right, width: b.size, height: b.size, borderRadius: b.size / 2 },
          ]}
        >
          <Ionicons name={b.icon as any} size={b.size * 0.42} color={b.color} />
          <Text style={styles.bubbleLabel}>{b.label}</Text>
        </View>
      ))}

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>

        <View style={styles.topContent}>
          <Text style={styles.title}>Navigate{'\n'}With Confidence</Text>
          <View style={styles.dots}>
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={[styles.dot, styles.dotActive]} />
          </View>
        </View>

        <View style={{ flex: 1 }} />

        <View style={styles.bottomContent}>
          <TouchableOpacity
            style={styles.getStartedBtn}
            onPress={handleGetStarted}
            activeOpacity={0.88}
          >
            <Text style={styles.getStartedBtnText}>Get Started</Text>
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
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  safe: { flex: 1, paddingHorizontal: 28 },
  topContent: { alignItems: 'center', paddingTop: 40 },
  title: {
    fontSize: 30, fontWeight: '800', color: '#fff',
    textAlign: 'center', lineHeight: 38,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  dots: { flexDirection: 'row', gap: 8, marginTop: 16, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.45)' },
  dotActive: { backgroundColor: '#22C55E', width: 24 },
  bubble: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.15,
    shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
    elevation: 4, gap: 2,
  },
  bubbleLabel: { fontSize: 9, fontWeight: '600', color: '#374151', textAlign: 'center' },
  bottomContent: { paddingBottom: 20, alignItems: 'center' },
  getStartedBtn: {
    width: '100%', maxWidth: 340,
    backgroundColor: '#22C55E', borderRadius: 50,
    height: 56, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#22C55E', shadowOpacity: 0.45,
    shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 6,
  },
  getStartedBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
