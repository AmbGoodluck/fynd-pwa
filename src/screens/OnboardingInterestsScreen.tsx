import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/useAuthStore';
import { useGuestStore } from '../store/useGuestStore';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

// Same IDs as TravelPreferenceScreen
const INTERESTS = [
  { id: 'food_drinks',   label: 'Food & Drinks' },
  { id: 'outdoor_park',  label: 'Outdoors' },
  { id: 'work_friendly', label: 'Coffee & Study' },
  { id: 'arts_culture',  label: 'Arts & Culture' },
  { id: 'shopping',      label: 'Shopping' },
  { id: 'nightlife',     label: 'Nightlife' },
  { id: 'photography',   label: 'Photography' },
  { id: 'history',       label: 'History' },
  { id: 'music',         label: 'Music & Events' },
  { id: 'wellness',      label: 'Wellness' },
  { id: 'adventure',     label: 'Adventure' },
  { id: 'hidden_gems',   label: 'Hidden Gems' },
  { id: 'family',        label: 'Family' },
  { id: 'beaches',       label: 'Beaches' },
];

type Props = { navigation: any };

export default function OnboardingInterestsScreen({ navigation }: Props) {
  const { user, isAuthenticated, setUser } = useAuthStore();
  const { setPendingInterests } = useOnboardingStore();
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggle = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id],
    );
  };

  const canContinue = selected.length >= 3;

  const handleContinue = async () => {
    if (!canContinue || saving) return;
    setSaving(true);
    try {
      if (isAuthenticated && user?.id) {
        // Authenticated: save immediately to Firestore
        await updateDoc(doc(db, 'users', user.id), { travelPreferences: selected });
        if (setUser) setUser({ ...user, travelPreferences: selected });
      } else {
        // Not authenticated: store temporarily for after account creation
        setPendingInterests(selected);
      }
    } catch (e) {
      // Non-fatal: continue even if save fails
    } finally {
      setSaving(false);
    }
    navigation.navigate('OnboardingLocation');
  };

  const handleSkip = () => {
    navigation.navigate('OnboardingLocation');
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFAF8" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>What are you into?</Text>
        <Text style={styles.subtitle}>
          Pick at least 3. We'll find places that match.
        </Text>
        {selected.length > 0 && (
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{selected.length} selected</Text>
          </View>
        )}
      </View>

      {/* Chips */}
      <ScrollView
        contentContainerStyle={styles.chipsContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.chipsWrap}>
          {INTERESTS.map(item => {
            const isSelected = selected.includes(item.id);
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => toggle(item.id)}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottom}>
        {/* Dot indicators */}
        <View style={styles.dots}>
          <View style={styles.dot} />
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, !canContinue && styles.primaryBtnDisabled]}
          onPress={handleContinue}
          activeOpacity={0.88}
          disabled={!canContinue || saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.primaryBtnText}>Continue</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFAF8',
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontFamily: 'Nunito_800ExtraBold',
    color: '#1A1019',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Nunito_500Medium',
    color: '#6E6577',
    textAlign: 'center',
    marginBottom: 12,
  },
  countPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    backgroundColor: '#FFF0EE',
  },
  countPillText: {
    fontSize: 11,
    fontFamily: 'Nunito_700Bold',
    color: '#C93E2B',
  },

  chipsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: 'rgba(26, 16, 25, 0.08)',
    backgroundColor: '#FFFFFF',
  },
  chipSelected: {
    backgroundColor: '#FFF0EE',
    borderColor: '#E8503A',
  },
  chipText: {
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
    color: '#6E6577',
  },
  chipTextSelected: {
    color: '#C93E2B',
  },

  bottom: {
    paddingHorizontal: 20,
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
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Nunito_700Bold',
  },

  skipText: {
    fontSize: 13,
    fontFamily: 'Nunito_600SemiBold',
    color: '#9E95A8',
    textAlign: 'center',
  },
});
