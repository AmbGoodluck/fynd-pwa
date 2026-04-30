import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

type Props = { navigation: any };

export default function OnboardingLocationScreen({ navigation }: Props) {
  const [requesting, setRequesting] = useState(false);

  const proceed = () => {
    navigation.navigate('OnboardingReady');
  };

  const handleAllowLocation = async () => {
    if (requesting) return;
    setRequesting(true);
    try {
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            () => proceed(),
            () => proceed(), // denied — proceed anyway
            { timeout: 8000, enableHighAccuracy: false },
          );
        } else {
          proceed();
        }
      } else {
        // Native: use expo-location
        import('expo-location').then(async (Loc) => {
          try {
            await Loc.requestForegroundPermissionsAsync();
          } catch {
            // ignored — proceed regardless
          }
          proceed();
        }).catch(() => proceed());
      }
    } catch {
      proceed();
    }
  };

  const handleManualCity = () => {
    proceed();
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFAF8" />

      {/* Centered content */}
      <View style={styles.hero}>
        {/* Location pin icon */}
        <View style={styles.iconCircle}>
          <Ionicons name="location-sharp" size={28} color="#E8503A" />
        </View>

        <Text style={styles.title}>Where are you?</Text>
        <Text style={styles.subtitle}>
          We need your location to find places near you. We never share or store your exact position.
        </Text>
      </View>

      {/* Bottom CTA */}
      <View style={styles.bottom}>
        {/* Dot indicators */}
        <View style={styles.dots}>
          <View style={styles.dot} />
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
        </View>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleAllowLocation}
          activeOpacity={0.88}
          disabled={requesting}
        >
          <Ionicons name="location-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.primaryBtnText}>Allow location</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleManualCity} activeOpacity={0.7}>
          <Text style={styles.skipText}>Enter city manually</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFAF8',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },

  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },

  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF0EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  title: {
    fontSize: 22,
    fontFamily: 'Nunito_800ExtraBold',
    color: '#1A1019',
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 13,
    fontFamily: 'Nunito_500Medium',
    color: '#6E6577',
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 20,
  },

  bottom: {
    paddingBottom: 12,
    alignItems: 'center',
    gap: 16,
  },

  dots: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C8C2CE',
  },
  dotActive: {
    width: 22,
    backgroundColor: '#E8503A',
  },

  primaryBtn: {
    width: '100%',
    backgroundColor: '#E8503A',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Nunito_700Bold',
  },

  skipText: {
    fontSize: 13,
    fontFamily: 'Nunito_600SemiBold',
    color: '#9E95A8',
    textAlign: 'center',
  },
});
