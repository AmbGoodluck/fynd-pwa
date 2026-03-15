import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, StatusBar, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { height } = Dimensions.get('window');

type Props = { navigation: any };

export default function Onboarding2Screen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Top: title + dots */}
      <View style={styles.header}>
        <Text style={styles.title}>Plan Your{'\n'}Perfect Trip</Text>
        <View style={styles.dots}>
          <View style={styles.dot} />
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      </View>

      {/* Illustration */}
      <View style={styles.imgWrap}>
        <Image
          source={require('../../assets/onboarding2.png')}
          style={styles.img}
          resizeMode="contain"
        />
      </View>

      {/* Bottom: subtitle + button */}
      <View style={styles.bottom}>
        <Text style={styles.subtitle}>
          Build flexible, curated itineraries. Navigate live between stops and make the most of every moment.
        </Text>
        <TouchableOpacity
          style={styles.nextBtn}
          onPress={() => navigation.navigate('Onboarding3')}
          activeOpacity={0.88}
        >
          <Text style={styles.nextBtnText}>Next</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 12,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#111827',
    lineHeight: 38,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  dots: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E5E7EB' },
  dotActive: { backgroundColor: '#22C55E', width: 24 },
  imgWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  img: {
    width: '100%',
    height: height * 0.59,
  },
  bottom: {
    paddingHorizontal: 28,
    paddingBottom: 32,
    paddingTop: 8,
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
