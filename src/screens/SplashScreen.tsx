import React, { useEffect } from 'react';
import { View, Image, StyleSheet, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SPLASH_DELAY = Platform.OS === 'web' ? 1600 : 2800;
const GUEST_STORE_KEY = 'fynd-guest-store';

type Props = { navigation: any };

export default function SplashScreen({ navigation }: Props) {
  useEffect(() => {
    // DEV: auth disabled — always go straight to MainTabs
    const timer = setTimeout(() => {
      navigation.replace('MainTabs');
    }, SPLASH_DELAY);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/find-splash.jpg')}
        style={styles.splashImage}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashImage: {
    width: '100%',
    height: '100%',
  },
});
