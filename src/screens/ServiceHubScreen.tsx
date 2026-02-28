import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = {
  navigation: any;
};

export default function SplashScreen({ navigation }: Props) {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Onboarding1');
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>fynd</Text>
      <Text style={styles.tagline}>... for your experience</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  logo: { fontSize: 48, fontWeight: '700', color: '#111827' },
  tagline: { position: 'absolute', bottom: 60, color: '#22C55E', fontSize: 14 },
});
