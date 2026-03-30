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
    // If React Navigation's linking config already resolved a deep link (e.g. /trip/:id),
    // don't run the auth-check navigation — it would override the deep link destination.
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const path = window.location.pathname ?? '';
      if (path.startsWith('/trip/')) return;
    }

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

      // authStateReady() (Firebase v10+) resolves once the SDK has finished
      // reading the persisted session — auth.currentUser is definitively set
      // after it, no race condition with onAuthStateChanged firing null first.
      async function checkWithCurrentUser() {
        const firebaseUser = (auth as any).currentUser;
        if (firebaseUser) {
          useGuestStore.getState().logout();
          let fullName = firebaseUser.displayName || '';
          let isPremium = false;
          let travelPreferences: string[] = [];
          try {
            const userDoc = await getUserDoc(firebaseUser.uid);
            if (userDoc) {
              fullName = userDoc.fullName || fullName;
              isPremium = userDoc.isPremium ?? false;
              travelPreferences = userDoc.travelPreferences ?? [];
            }
          } catch {
            // Firestore unavailable — continue with Firebase Auth info
          }
          login({
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            fullName,
            isPremium,
            travelPreferences,
          });
          useGuestStore.getState().hydrateSavedPlaces().catch(() => {});
          resolve('MainTabs');
        } else {
          resolve(hasSeenOnboarding ? 'AuthChoice' : 'Onboarding1');
        }
      }

      try {
        await (auth as any).authStateReady();
        await checkWithCurrentUser();
      } catch {
        // Fallback for environments where authStateReady isn't available
        const unsub = onAuthStateChanged(auth, async () => {
          unsub();
          await checkWithCurrentUser();
        });
      }
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
