import React, { useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';

// SplashScreen is no longer in the active launch flow.
// LogoScreen now handles session restoration and routing.
// This file is kept for backwards compatibility only.
type Props = { navigation: any };

export default function SplashScreen({ navigation }: Props) {
  useEffect(() => {
    // Fallback: redirect to AuthChoice if somehow navigated here
    const timer = setTimeout(() => navigation.replace('AuthChoice'), 300);
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
  container: { ...StyleSheet.absoluteFillObject, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  splashImage: { width: '100%', height: '100%' },
});
