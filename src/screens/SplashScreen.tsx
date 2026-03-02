import React, { useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import { getUserDoc } from '../services/database';
import { useAuthStore } from '../store/useAuthStore';

type Props = { navigation: any };

export default function SplashScreen({ navigation }: Props) {
  const { setUser } = useAuthStore();

  useEffect(() => {
    let navigated = false;

    const navigate = async (firebaseUser: any) => {
      if (navigated) return;
      navigated = true;
      
      if (firebaseUser) {
        // Load user data into auth store
        const userDoc = await getUserDoc(firebaseUser.uid);
        if (userDoc) {
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            fullName: userDoc.fullName || firebaseUser.displayName || '',
            isPremium: userDoc.isPremium || false,
            travelPreferences: userDoc.travelPreferences || [],
          });
        }
        navigation.replace('MainTabs');
      } else {
        const done = await AsyncStorage.getItem('onboardingComplete');
        if (done === 'true') {
          navigation.replace('Login');
        } else {
          navigation.replace('Onboarding1');
        }
      }
    };

    // Timeout fallback  if Firebase takes too long, go to Login
    const timeout = setTimeout(() => navigate(null), 3000);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      clearTimeout(timeout);
      setTimeout(() => navigate(user), 1200);
    });

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [setUser]);

  return (
    <View style={styles.container}>
      <View style={styles.logoWrap}>
        <Image source={require('../../assets/logo-icon.png')} style={styles.logo} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  logoWrap: { width: 120, height: 120, borderRadius: 28, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
  logo: { width: 80, height: 80, resizeMode: 'contain' },
});
