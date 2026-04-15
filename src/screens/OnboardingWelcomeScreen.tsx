import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useGuestStore } from '../store/useGuestStore';

type Props = { navigation: any };

export default function OnboardingWelcomeScreen({ navigation }: Props) {
  const { setHasSeenOnboarding } = useGuestStore();

  const handleGetStarted = () => {
    navigation.navigate('OnboardingInterests');
  };

  const handleSignIn = () => {
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFAF8" />

      {/* Centered hero content */}
      <View style={styles.hero}>
        {/* Fynd pin icon */}
        <View style={styles.pinWrap}>
          <Ionicons name="location-sharp" size={36} color="#E8503A" />
          <View style={styles.pinDot} />
        </View>

        {/* Brand name */}
        <Text style={styles.brandName}>
          fynd<Text style={styles.brandDot}>.</Text>
        </Text>

        <View style={{ height: 20 }} />

        {/* Headline */}
        <Text style={styles.headline}>
          Discover places you'll{'\n'}actually love
        </Text>

        {/* Subline */}
        <Text style={styles.subline}>
          Personalized recommendations based on what you're into. Not trends. Not reviews. You.
        </Text>
      </View>

      {/* Bottom CTA area */}
      <View style={styles.bottom}>
        {/* Dot indicators */}
        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>

        {/* Primary button */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleGetStarted}
          activeOpacity={0.88}
        >
          <Text style={styles.primaryBtnText}>Get started</Text>
        </TouchableOpacity>

        {/* Sign in link */}
        <TouchableOpacity onPress={handleSignIn} activeOpacity={0.7}>
          <Text style={styles.signInText}>
            Already have an account?{' '}
            <Text style={styles.signInLink}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFAF8',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },

  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },

  pinWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF0EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  pinDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    top: 14,
    left: 23,
  },

  brandName: {
    fontSize: 28,
    fontFamily: 'Nunito_800ExtraBold',
    color: '#1A1019',
    letterSpacing: -0.5,
  },
  brandDot: {
    color: '#E8503A',
  },

  headline: {
    fontSize: 22,
    fontFamily: 'Nunito_700Bold',
    color: '#1A1019',
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: 14,
  },

  subline: {
    fontSize: 13,
    fontFamily: 'Nunito_500Medium',
    color: '#6E6577',
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 20,
  },

  bottom: {
    paddingBottom: 12,
    alignItems: 'center',
    gap: 16,
  },

  dots: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C8C2CE',
  },
  dotActive: {
    width: 22,
    backgroundColor: '#E8503A',
  },

  primaryBtn: {
    width: '100%',
    backgroundColor: '#E8503A',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Nunito_700Bold',
  },

  signInText: {
    fontSize: 13,
    fontFamily: 'Nunito_600SemiBold',
    color: '#9E95A8',
    textAlign: 'center',
  },
  signInLink: {
    color: '#E8503A',
  },
});
