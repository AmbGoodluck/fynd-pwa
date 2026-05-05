import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Sentry from '../services/sentry';
import { useAuthStore } from '../store/useAuthStore';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import SuccessToast from '../components/SuccessToast';
import GuestGateModal from '../components/GuestGateModal';

const INTERESTS = [
  { id: 'food_drinks',      label: 'Food & Drinks' },
  { id: 'coffee_study',     label: 'Coffee & Study Spots' },
  { id: 'nightlife',        label: 'Nightlife & Bars' },
  { id: 'outdoor_park',     label: 'Parks & Outdoors' },
  { id: 'hiking_trails',    label: 'Hiking & Trails' },
  { id: 'fitness_gym',      label: 'Fitness & Gyms' },
  { id: 'thrift_vintage',   label: 'Thrift & Vintage Shops' },
  { id: 'shopping',         label: 'Shopping' },
  { id: 'arts_culture',     label: 'Arts & Culture' },
  { id: 'live_music',       label: 'Live Music & Events' },
  { id: 'photography',      label: 'Photo Spots' },
  { id: 'budget_friendly',  label: 'Budget Friendly' },
  { id: 'late_night',       label: 'Late Night Eats' },
  { id: 'brunch_breakfast', label: 'Brunch & Breakfast' },
  { id: 'desserts_bakery',  label: 'Desserts & Bakeries' },
  { id: 'hidden_gems',      label: 'Hidden Gems' },
  { id: 'scenic_views',     label: 'Scenic Views' },
  { id: 'history',          label: 'History & Heritage' },
  { id: 'wellness',         label: 'Wellness & Relaxation' },
  { id: 'family_friendly',  label: 'Family Friendly' },
  { id: 'free_activities',  label: 'Free Activities' },
  { id: 'coworking',        label: 'Coworking Spaces' },
  { id: 'pet_friendly',     label: 'Pet Friendly Places' },
  { id: 'date_spots',       label: 'Date Spots' },
];

type Props = { navigation: any };

export default function TravelPreferenceScreen({ navigation }: Props) {
  const { user, isAuthenticated, setUser } = useAuthStore();
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showGate, setShowGate] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => { loadPreferences(); }, []);

  const loadPreferences = async () => {
    try {
      if (!user?.id) return;
      const docSnap = await getDoc(doc(db, 'users', user.id));
      if (docSnap.exists()) setSelected(docSnap.data().travelPreferences || []);
    } catch (e) {
      Sentry.captureException(e, { tags: { context: 'TravelPreferenceScreen.loadPreferences' } });
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id: string) => {
    if (!isAuthenticated || !user?.id) {
      setShowGate(true);
      return;
    }
    setSelected(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]);
  };

  const savePreferences = async () => {
    if (!isAuthenticated || !user?.id) {
      setShowGate(true);
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.id), { travelPreferences: selected });
      if (setUser) setUser({ ...user, travelPreferences: selected });
      setShowToast(true);
    } catch (e) {
      Sentry.captureException(e, { tags: { context: 'TravelPreferenceScreen.savePreferences' } });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <ActivityIndicator size="large" color="#E8503A" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <>
      <GuestGateModal
        visible={showGate}
        onDismiss={() => setShowGate(false)}
        onLogin={() => { setShowGate(false); navigation.navigate('AuthChoice'); }}
        onRegister={() => { setShowGate(false); navigation.navigate('AuthChoice'); }}
        onContinueAsGuest={() => setShowGate(false)}
      />

      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFAF8" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={26} color="#1A1019" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Preferences</Text>
            <Text style={styles.subtitle}>Select your interests to personalize your experience</Text>
            {selected.length > 0 && (
              <View style={styles.countPill}>
                <Text style={styles.countPillText}>{selected.length} selected</Text>
              </View>
            )}
          </View>
          <View style={{ width: 40 }} />
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
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            onPress={savePreferences}
            activeOpacity={0.88}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>Save Preferences</Text>
            }
          </TouchableOpacity>
        </View>

        <SuccessToast
          visible={showToast}
          title="Preferences Saved!"
          message="Your travel vibes have been updated."
          onDone={() => { setShowToast(false); navigation.goBack(); }}
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFAF8' },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 4,
  },
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 8, gap: 6 },
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
    lineHeight: 19,
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

  chipsContainer: { paddingHorizontal: 20, paddingBottom: 16 },
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
  chipTextSelected: { color: '#C93E2B' },

  bottom: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#FFFAF8',
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  saveBtn: {
    width: '100%',
    backgroundColor: '#E8503A',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Nunito_700Bold',
  },
});
