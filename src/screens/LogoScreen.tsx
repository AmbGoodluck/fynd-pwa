import React, { useEffect } from 'react';
import { View, Image, Text, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import { getUserDoc } from '../services/database';
import { useAuthStore } from '../store/useAuthStore';
import { useGuestStore } from '../store/useGuestStore';

// Short brand display -- just enough to feel polished, not a loading gate
const LOGO_DELAY = Platform.OS === 'web' ? 800 : 1000;

// Key used by useGuestStore persist middleware
const GUEST_STORE_KEY = 'fynd-guest-store';

type Props = { navigation: any };

/** Read hasSeenOnboarding directly from AsyncStorage to avoid Zustand rehydration race */
async function getHasSeenOnboarding(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(GUEST_STORE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed?.state?.hasSeenOnboarding === true;
  } catch {
    return false;
  }
}

export default function LogoScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const { login } = useAuthStore();

  useEffect(() => {
    let navigated = false;
    const go = (screen: string) => {
      if (!navigated) {
        navigated = true;
        navigation.replace(screen);
      }
    };

    // Minimum logo display time (brand feel, not a loading barrier)
    const minDelay = new Promise<void>((resolve) => setTimeout(resolve, LOGO_DELAY));

    // Parallel auth check -- resolves with the destination screen name
    const authCheck = new Promise<string>(async (resolve) => {
      const hasSeenOnboarding = await getHasSeenOnboarding();

      // onAuthStateChanged fires once with the persisted Firebase session or null
      const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
        unsub();
        if (firebaseUser) {
          // Clear any stale persisted guest state for authenticated users
          useGuestStore.getState().logout();
          // Restore session state from Firestore
          try {
            const userDoc = await getUserDoc(firebaseUser.uid);
            login({
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              fullName: userDoc?.fullName || firebaseUser.displayName || '',
              isPremium: userDoc?.isPremium ?? false,
              travelPreferences: userDoc?.travelPreferences ?? [],
            });
          } catch {
            // Firestore unavailable -- log in with minimal Firebase profile so
            // isAuthenticated is still set to true and auth gates don't block the user
            login({
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              fullName: firebaseUser.displayName || '',
              isPremium: false,
              travelPreferences: [],
            });
          }
          resolve('MainTabs');
        } else {
          // No active session -- route based on onboarding state
          resolve(hasSeenOnboarding ? 'AuthChoice' : 'Onboarding1');
        }
      });
    });

    // Navigate only after both logo display time and auth check complete
    Promise.all([minDelay, authCheck]).then(([, screen]) => go(screen));
  }, []);

  const logoWidth = Math.min(width * 0.55, 240);

  return (
    <View style={styles.container}>
      <View style={styles.logoWrap}>
        <Image
          source={require('../../assets/logo.png')}
          style={[styles.logo, { width: logoWidth }]}
          resizeMode="contain"
        />
      </View>
      <Text style={styles.version}>v1.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoWrap: {
    alignItems: 'center',
  },
  logo: {
    height: 130,
  },
  version: {
    position: 'absolute',
    bottom: 36,
    fontSize: 12,
    color: '#D1D5DB',
    letterSpacing: 1,
  },
});
