import React, { useEffect } from 'react';
import { View, Image, StyleSheet, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SPLASH_DELAY = Platform.OS === 'web' ? 1600 : 2800;
const GUEST_STORE_KEY = 'fynd-guest-store';

type Props = { navigation: any };

export default function SplashScreen({ navigation }: Props) {
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const raw = await AsyncStorage.getItem(GUEST_STORE_KEY);
        const state = raw ? (JSON.parse(raw)?.state ?? {}) : {};
        const hasSeenOnboarding = !!state.hasSeenOnboarding;
        const isGuest = !!state.isGuest;

        if (!hasSeenOnboarding) {
          // First launch — show full onboarding flow
          navigation.replace('Onboarding1');
        } else if (isGuest) {
          // Returning guest — skip straight into the app
          navigation.replace('MainTabs');
        } else {
          // Returning registered user — show auth choice
          // (Login screen will redirect to MainTabs on success)
          navigation.replace('AuthChoice');
        }
      } catch {
        navigation.replace('Onboarding1');
      }
    }, SPLASH_DELAY);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/find-splash.jpg')}
        style={styles.splashImage}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashImage: {
    width: '100%',
    height: '100%',
  },
});
