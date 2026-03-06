import React from 'react';
import { View, Text, Image, StyleSheet, useWindowDimensions } from 'react-native';
import FyndButton from '../components/FyndButton';

type Props = { navigation: any };

export default function Onboarding3Screen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const imageSize = Math.max(220, Math.min(width * 0.8, 340));
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Discover{'\n'}Hidden Gems</Text>
      <View style={styles.dots}>
        <View style={styles.dot} />
        <View style={styles.dot} />
        <View style={[styles.dot, styles.activeDot]} />
        <View style={styles.dot} />
      </View>
      <Image source={require('../../assets/logo-icon.png')} style={[styles.image, { width: imageSize, height: imageSize }]} />
      <View style={[styles.button, { width: Math.max(260, Math.min(width - 64, 420)) }]}>
        <FyndButton title="Next" onPress={() => navigation.navigate('Onboarding4')} />
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
  image: { resizeMode: 'contain', marginTop: 32 },
  button: { position: 'absolute', bottom: 48 },
});

