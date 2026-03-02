import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';

type Props = { navigation: any; route: any };

export default function ProcessingScreen({ navigation, route }: Props) {
  const params = route?.params || {};

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('SuggestedPlaces', params);
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LottieView
        source={require('../../assets/loading.json')}
        autoPlay
        loop
        style={styles.lottie}
      />
      <Text style={styles.title}>Finding the best places for you...</Text>
      <Text style={styles.subtitle}>
        Discovering top spots in {params.destination || 'your destination'}
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  lottie: { width: 200, height: 200 },
  title: { fontSize: 18, fontWeight: '600', color: '#111827', marginTop: 24, textAlign: 'center', paddingHorizontal: 40 },
  subtitle: { fontSize: 14, color: '#57636C', marginTop: 8, textAlign: 'center', paddingHorizontal: 40 },
});
