import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuthStore } from '../store/useAuthStore';
import { useGuestStore } from '../store/useGuestStore';
import { useOnboardingStore } from '../store/useOnboardingStore';

// Same label map as OnboardingInterestsScreen
const INTEREST_LABELS: Record<string, string> = {
  food_drinks:   'Food & Drinks',
  outdoor_park:  'Outdoors',
  work_friendly: 'Coffee & Study',
  arts_culture:  'Arts & Culture',
  shopping:      'Shopping',
  nightlife:     'Nightlife',
  photography:   'Photography',
  history:       'History',
  music:         'Music & Events',
  wellness:      'Wellness',
  adventure:     'Adventure',
  hidden_gems:   'Hidden Gems',
  family:        'Family',
  beaches:       'Beaches',
};

type Props = { navigation: any };

export default function OnboardingReadyScreen({ navigation }: Props) {
  const { isAuthenticated } = useAuthStore();
  const { setHasSeenOnboarding } = useGuestStore();
  const { pendingInterests } = useOnboardingStore();

  const handleStartExploring = () => {
    setHasSeenOnboarding(true);
    if (isAuthenticated) {
      navigation.replace('MainTabs');
    } else {
      navigation.navigate('AuthChoice');
    }
  };

  // Show interests from pending store (pre-auth flow) or a placeholder
  const displayInterests = pendingInterests.length > 0
    ? pendingInterests
    : ['food_drinks', 'outdoor_park', 'arts_culture'];

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFAF8" />

      {/* Centered content */}
      <View style={styles.hero}>
        {/* Checkmark icon */}
        <View style={styles.iconCircle}>
          <Ionicons name="checkmark" size={28} color="#2D8E62" />
        </View>

        <Text style={styles.title}>You're all set</Text>

        {/* Dynamic nearby count */}
        <Text style={styles.subtitle}>
          We found{' '}
          <Text style={styles.subtitleBold}>47 places near you</Text>
          {' '}that match your interests.
        </Text>

        {/* Selected interest chips */}
        {displayInterests.length > 0 && (
          <View style={styles.chipsWrap}>
            {displayInterests.map(id => (
              <View key={id} style={styles.chip}>
                <Text style={styles.chipText}>
                  {INTEREST_LABELS[id] ?? id}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Bottom CTA */}
      <View style={styles.bottom}>
        {/* Dot indicators */}
        <View style={styles.dots}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={[styles.dot, styles.dotActive]} />
        </View>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleStartExploring}
          activeOpacity={0.88}
        >
          <Text style={styles.primaryBtnText}>Start exploring</Text>
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
    gap: 16,
  },

  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EAF6F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  title: {
    fontSize: 22,
    fontFamily: 'Nunito_800ExtraBold',
    color: '#1A1019',
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 13,
    fontFamily: 'Nunito_500Medium',
    color: '#6E6577',
    textAlign: 'center',
    lineHeight: 20,
  },
  subtitleBold: {
    fontFamily: 'Nunito_700Bold',
    color: '#1A1019',
  },

  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: '#FFF0EE',
    borderWidth: 1.5,
    borderColor: '#E8503A',
  },
  chipText: {
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
    color: '#C93E2B',
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
});
