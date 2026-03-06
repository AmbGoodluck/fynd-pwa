import React, { useEffect } from 'react';
import { View, Image, Text, StyleSheet, Platform, useWindowDimensions } from 'react-native';

// Web users expect near-instant feedback; native needs time for the OS splash.
const LOGO_DELAY = Platform.OS === 'web' ? 1200 : 3500;

type Props = { navigation: any };

export default function LogoScreen({ navigation }: Props) {
  // useWindowDimensions is reactive — updates on resize/orientation change.
  // Never use module-level Dimensions.get() which captures a stale snapshot.
  const { width } = useWindowDimensions();

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        navigation.replace('Splash');
      } catch (error) {
        console.error('Navigation error:', error);
      }
    }, LOGO_DELAY);
    return () => clearTimeout(timer);
  }, [navigation]);

  // Logo width: 55% of container, capped at 240px for tablet/desktop.
  // Fixed height of 130px with resizeMode="contain" maintains aspect ratio
  // regardless of screen size (phone, tablet, desktop, iPad).
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
    // width is set dynamically above; height is fixed so it looks consistent
    // across all screen sizes. resizeMode="contain" handles aspect ratio.
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
