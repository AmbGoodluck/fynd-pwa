import React, { useEffect } from 'react';
import { View, Image, StyleSheet, Platform } from 'react-native';

// Web loads instantly from cache; use a shorter delay so it feels snappy.
const SPLASH_DELAY = Platform.OS === 'web' ? 1800 : 3500;

type Props = { navigation: any };

export default function SplashScreen({ navigation }: Props) {
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        navigation.replace('MainTabs');
      } catch (error) {
        console.error('Navigation error:', error);
      }
    }, SPLASH_DELAY);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/find-splash.jpg')}
        style={styles.splash}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  splash: { ...StyleSheet.absoluteFillObject },
});
