import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, ImageBackground, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useGuestStore } from '../store/useGuestStore';

type Props = { navigation: any };

export default function AuthChoiceScreen({ navigation }: Props) {
  const { setGuest, setHasSeenOnboarding } = useGuestStore();

  const handleGuest = () => {
    setGuest(true);
    setHasSeenOnboarding(true);
    navigation.replace('MainTabs');
  };

  const handleLogin = () => {
    navigation.navigate('Login');
  };

  const handleRegister = () => {
    navigation.navigate('Register');
  };

  return (
    <ImageBackground
      source={{ uri: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=900&q=80' }}
      style={styles.bg}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={styles.overlay} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Logo + brand */}
        <View style={styles.header}>
          <Image source={require('../../assets/logo-icon.png')} style={styles.logo} />
          <Text style={styles.brand}>Fynd</Text>
          <Text style={styles.tagline}>Your world, your way.</Text>
        </View>

        {/* Feature highlights */}
        <View style={styles.features}>
          {[
            { icon: 'map-outline', text: 'Discover hidden gems near you' },
            { icon: 'calendar-outline', text: 'Build flexible, curated itineraries' },
            { icon: 'navigate-outline', text: 'Navigate with live turn-by-turn' },
            { icon: 'heart-outline', text: 'Save places across all your devices' },
          ].map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon as any} size={18} color="#22C55E" />
              </View>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* Action buttons */}
        <View style={styles.buttons}>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleRegister}>
            <Text style={styles.primaryBtnText}>Create Account</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.outlineBtn} onPress={handleLogin}>
            <Text style={styles.outlineBtnText}>Log In</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.ghostBtn} onPress={handleGuest}>
            <Text style={styles.ghostBtnText}>Continue as Guest</Text>
            <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          <Text style={styles.guestNote}>
            Guest mode: full trip building, no place saving across sessions
          </Text>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  safe: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 28 },
  header: { alignItems: 'center', paddingTop: 32 },
  logo: { width: 72, height: 72, resizeMode: 'contain', marginBottom: 10 },
  brand: { fontSize: 38, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  tagline: { fontSize: 16, color: 'rgba(255,255,255,0.75)', marginTop: 4, fontWeight: '400' },
  features: { gap: 14 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  featureIcon: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(34,197,94,0.18)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.4)',
  },
  featureText: { fontSize: 15, color: 'rgba(255,255,255,0.88)', flex: 1, lineHeight: 22 },
  buttons: { paddingBottom: 8, alignItems: 'center', gap: 12 },
  primaryBtn: {
    width: '100%', backgroundColor: '#22C55E', borderRadius: 18,
    height: 56, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#22C55E', shadowOpacity: 0.5,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  outlineBtn: {
    width: '100%', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 18, height: 56, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  outlineBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  ghostBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 8,
  },
  ghostBtnText: { color: 'rgba(255,255,255,0.6)', fontSize: 15 },
  guestNote: {
    fontSize: 11, color: 'rgba(255,255,255,0.4)',
    textAlign: 'center', lineHeight: 16,
    paddingHorizontal: 12,
  },
});
