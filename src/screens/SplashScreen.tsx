import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Props = { navigation: any };

export default function SplashScreen({ navigation }: Props) {
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const onboardingComplete = await AsyncStorage.getItem('onboardingComplete');
        if (onboardingComplete === 'true') {
          navigation.replace('Login');
        } else {
          navigation.replace('Onboarding1');
        }
      } catch {
        navigation.replace('Onboarding1');
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Image source={require('../../assets/logo-icon.png')} style={styles.logo} />
      <Text style={styles.tagline}>... for your experience</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  logo: { width: 180, height: 100, resizeMode: 'contain' },
  tagline: { color: '#22C55E', fontSize: 14, marginTop: 16 },
});
