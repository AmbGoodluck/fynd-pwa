import React, { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import LottieView from 'lottie-react-native';

type Props = { navigation: any };

export default function ProcessingScreen({ navigation }: Props) {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Home');
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <LottieView
        source={require('../../assets/loading.json')}
        autoPlay
        loop
        style={styles.animation}
      />
      <Text style={styles.title}>Finding the best places for you...</Text>
      <Text style={styles.subtitle}>Personalizing your experience</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center' },
  animation: { width: 280, height: 280 },
  title: { fontSize: 20, fontWeight: '600', color: '#111827', marginTop: 24, textAlign: 'center', paddingHorizontal: 32 },
  subtitle: { fontSize: 15, color: '#8E8E93', marginTop: 8, textAlign: 'center' },
});
