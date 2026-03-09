import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ImageBackground, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Discover Hidden Gems: two hikers walking through a lush forest tunnel
const IMAGE_URI = 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=900&q=85';

type Props = { navigation: any };

export default function Onboarding2Screen({ navigation }: Props) {
  return (
    <ImageBackground source={{ uri: IMAGE_URI }} style={styles.bg} resizeMode="cover">
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      {/* Dark scrim so white text reads on the dark forest image */}
      <View style={styles.scrim} />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>

        <View style={styles.topContent}>
          <Text style={styles.title}>Discover{'\n'}Hidden Gems</Text>
          <View style={styles.dots}>
            <View style={styles.dot} />
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </View>

        <View style={{ flex: 1 }} />

        <View style={styles.bottomContent}>
          <TouchableOpacity
            style={styles.nextBtn}
            onPress={() => navigation.navigate('Onboarding3')}
            activeOpacity={0.88}
          >
            <Text style={styles.nextBtnText}>Next</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  safe: { flex: 1, paddingHorizontal: 28 },
  topContent: { alignItems: 'center', paddingTop: 40 },
  title: {
    fontSize: 30, fontWeight: '800', color: '#fff',
    textAlign: 'center', lineHeight: 38,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  dots: { flexDirection: 'row', gap: 8, marginTop: 16, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.45)' },
  dotActive: { backgroundColor: '#22C55E', width: 24 },
  bottomContent: { paddingBottom: 20, alignItems: 'center' },
  nextBtn: {
    width: '100%', maxWidth: 340,
    backgroundColor: '#22C55E', borderRadius: 50,
    height: 56, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#22C55E', shadowOpacity: 0.45,
    shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 6,
  },
  nextBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
