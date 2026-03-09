import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ImageBackground, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Full-screen travel planning: woman with phone against soft travel backdrop
const IMAGE_URI = 'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=900&q=85';

type Props = { navigation: any };

export default function Onboarding1Screen({ navigation }: Props) {
  return (
    <ImageBackground source={{ uri: IMAGE_URI }} style={styles.bg} resizeMode="cover">
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>

        {/* Title + dots pinned at top */}
        <View style={styles.topContent}>
          <Text style={styles.title}>Personalized{'\n'}Travel Planning</Text>
          <View style={styles.dots}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </View>

        <View style={{ flex: 1 }} />

        {/* Button overlaid at the bottom over the image */}
        <View style={styles.bottomContent}>
          <TouchableOpacity
            style={styles.nextBtn}
            onPress={() => navigation.navigate('Onboarding2')}
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
  safe: { flex: 1, paddingHorizontal: 28 },
  topContent: { alignItems: 'center', paddingTop: 40 },
  title: {
    fontSize: 30, fontWeight: '800', color: '#111827',
    textAlign: 'center', lineHeight: 38,
    textShadowColor: 'rgba(255,255,255,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  dots: { flexDirection: 'row', gap: 8, marginTop: 16, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.2)' },
  dotActive: { backgroundColor: '#22C55E', width: 24 },
  bottomContent: { paddingBottom: 20, alignItems: 'center' },
  nextBtn: {
    width: '100%', maxWidth: 340,
    backgroundColor: '#22C55E', borderRadius: 50,
    height: 56, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#22C55E', shadowOpacity: 0.4,
    shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 6,
  },
  nextBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
