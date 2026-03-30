import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = { navigation: any };

export default function Onboarding3Screen({ navigation }: Props) {
  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      <View style={styles.imgWrap}>
        <Image
          source={require('../../assets/onboarding3.png')}
          style={styles.img}
          resizeMode="cover"
        />
      </View>

      <SafeAreaView style={styles.card} edges={['bottom']}>
        <View style={styles.dots}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
        <Text style={styles.title}>Discover Hidden{'\n'}Gems Together</Text>
        <Text style={styles.subtitle}>
          Walk new paths and explore the world around you. Every adventure starts with a single step.
        </Text>
        <TouchableOpacity
          style={styles.nextBtn}
          onPress={() => navigation.navigate('Onboarding4')}
          activeOpacity={0.88}
        >
          <Text style={styles.nextBtnText}>Next</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },
  imgWrap: { flex: 1, overflow: 'hidden' },
  img: { width: '100%', height: '100%' },
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 32,
    marginTop: -28,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  dots: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 18 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E5E7EB' },
  dotActive: { backgroundColor: '#22C55E', width: 24 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    lineHeight: 36,
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 23,
    marginBottom: 24,
  },
  nextBtn: {
    backgroundColor: '#22C55E',
    borderRadius: 50,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22C55E',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  nextBtnText: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },
});
