import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FyndButton from '../components/FyndButton';

const { width } = Dimensions.get('window');

type Props = { navigation: any };

export default function Onboarding4Screen({ navigation }: Props) {
  const handleGetStarted = async () => {
    await AsyncStorage.setItem('onboardingComplete', 'true');
    navigation.replace('Register');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Journey{'\n'}Starts Here</Text>
      <View style={styles.dots}>
        <View style={styles.dot} />
        <View style={styles.dot} />
        <View style={styles.dot} />
        <View style={[styles.dot, styles.activeDot]} />
      </View>
      <Image source={require('../../assets/logo-icon.png')} style={styles.image} />
      <View style={styles.button}>
        <FyndButton title="Get Started" onPress={handleGetStarted} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', paddingTop: 80 },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', color: '#111827', lineHeight: 36 },
  dots: { flexDirection: 'row', gap: 8, marginTop: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D1FAE5' },
  activeDot: { backgroundColor: '#22C55E' },
  image: { width: width * 0.8, height: width * 0.8, resizeMode: 'contain', marginTop: 32 },
  button: { position: 'absolute', bottom: 48, width: width - 64 },
});

