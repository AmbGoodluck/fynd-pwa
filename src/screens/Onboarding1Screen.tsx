import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ImageBackground, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Woman traveller with phone against world-map backdrop
const IMAGE_URI = 'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=900&q=85';

const SERVICE_BUBBLES = [
  { icon: 'medkit-outline',  label: 'Clinic',    top: '30%', left: '6%',  size: 60, color: '#EF4444' },
  { icon: 'cash-outline',    label: 'Forex',     top: '50%', left: '4%',  size: 54, color: '#2A0BBF' },
  { icon: 'car-outline',     label: 'Transport', top: '28%', right: '5%', size: 60, color: '#047433' },
  { icon: 'shield-outline',  label: 'Police',    top: '52%', right: '6%', size: 54, color: '#1D3557' },
];

type Props = { navigation: any };

export default function Onboarding1Screen({ navigation }: Props) {
  return (
    <ImageBackground source={{ uri: IMAGE_URI }} style={styles.bg} resizeMode="cover">
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={styles.scrim} />

      {/* Floating service-hub bubbles */}
      {SERVICE_BUBBLES.map((b, i) => (
        <View
          key={i}
          style={[
            styles.bubble,
            {
              top: b.top as any,
              left: (b as any).left,
              right: (b as any).right,
              width: b.size,
              height: b.size,
              borderRadius: b.size / 2,
            },
          ]}
        >
          <Ionicons name={b.icon as any} size={b.size * 0.4} color={b.color} />
          <Text style={styles.bubbleLabel}>{b.label}</Text>
        </View>
      ))}

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={{ flex: 1 }} />

        {/* Bottom content */}
        <View style={styles.bottomCard}>
          <Text style={styles.title}>Discover Local{'\n'}Services</Text>
          <Text style={styles.subtitle}>
            Find clinics, forex, transport, police and more wherever you travel — all in one place.
          </Text>

          <View style={styles.dots}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>

          <TouchableOpacity
            style={styles.nextBtn}
            onPress={() => navigation.navigate('Onboarding2')}
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
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  safe: { flex: 1, paddingHorizontal: 20 },
  bubble: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.93)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    gap: 2,
  },
  bubbleLabel: { fontSize: 9, fontWeight: '700', color: '#374151', textAlign: 'center' },
  bottomCard: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 28,
    padding: 28,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
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
