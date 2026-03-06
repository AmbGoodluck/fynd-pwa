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
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  //
  // Using absoluteFillObject on the CONTAINER (not just the image) is
  // deliberate. React Navigation's Stack Navigator renders each screen
  // inside an Animated.View that itself uses absoluteFillObject.
  // By making our container also absolute, we anchor directly to that
  // screen wrapper — bypassing the flex chain entirely.
  // This guarantees full-screen coverage on every browser and device
  // regardless of any intermediate flex container collapsing.
  //
  container: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000' },
  splash: { ...StyleSheet.absoluteFillObject },
});
