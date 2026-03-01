import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, SafeAreaView, Dimensions, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const VIBES = [
  { id: '1', label: 'Arts & Culture', icon: 'color-palette-outline', color: '#E91E63' },
  { id: '2', label: 'Music', icon: 'musical-notes-outline', color: '#9C27B0' },
  { id: '3', label: 'Festivals', icon: 'sparkles-outline', color: '#FF9800' },
  { id: '4', label: 'Food & Dining', icon: 'restaurant-outline', color: '#FF5722' },
  { id: '5', label: 'Nature', icon: 'leaf-outline', color: '#4CAF50' },
  { id: '6', label: 'Adventure', icon: 'compass-outline', color: '#795548' },
  { id: '7', label: 'History', icon: 'library-outline', color: '#607D8B' },
  { id: '8', label: 'Nightlife', icon: 'moon-outline', color: '#3F51B5' },
  { id: '9', label: 'Shopping', icon: 'bag-outline', color: '#E91E63' },
  { id: '10', label: 'Sports', icon: 'football-outline', color: '#2196F3' },
  { id: '11', label: 'Wellness', icon: 'heart-outline', color: '#00BCD4' },
  { id: '12', label: 'Photography', icon: 'camera-outline', color: '#FF9800' },
];

const TIME_OPTIONS = [1, 3, 5, 7, 9, 11, 12];
const DISTANCE_OPTIONS = [1, 11, 21, 31, 41];

const TIME_OF_DAY = [
  { id: 'morning', label: 'Morning', icon: 'sunny-outline', color: '#FF9800' },
  { id: 'afternoon', label: 'Afternoon', icon: 'partly-sunny-outline', color: '#FFC107' },
  { id: 'evening', label: 'Evening', icon: 'cloudy-night-outline', color: '#FF5722' },
  { id: 'night', label: 'Night', icon: 'moon-outline', color: '#3F51B5' },
];

const STEP_ICONS = [
  'location-outline',
  'business-outline',
  'time-outline',
  'navigate-outline',
  'sparkles-outline',
];

type Props = { navigation: any };

export default function CreateTripScreen({ navigation }: Props) {
  const [step, setStep] = useState(1);
  const [destination, setDestination] = useState('');
  const [accommodation, setAccommodation] = useState('');
  const [explorationHours, setExplorationHours] = useState(3);
  const [distanceKm, setDistanceKm] = useState(10);
  const [timeOfDay, setTimeOfDay] = useState('');
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);

  const canContinue = () => {
    if (step === 1) return destination.trim().length > 0;
    if (step === 2) return accommodation.trim().length > 0;
    if (step === 3) return true;
    if (step === 4) return timeOfDay !== '';
    if (step === 5) return selectedVibes.length > 0;
    return false;
  };

  const handleContinue = () => {
    if (step < 5) setStep(step + 1);
    else navigation.navigate('Processing');
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const toggleVibe = (id: string) => {
    setSelectedVibes(prev =>
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Progress Bar  20px below nav */}
      <View style={styles.progressWrapper}>
        <View style={styles.progressContainer}>
          {[1, 2, 3, 4, 5].map(i => (
            <View key={i} style={[styles.progressSegment, i <= step && styles.progressActive]} />
          ))}
        </View>
        <Text style={styles.stepLabel}>Step {step} of 5</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Icon */}
        <View style={styles.iconCircle}>
          <Ionicons name={STEP_ICONS[step - 1] as any} size={30} color="#111827" />
        </View>

        {/* Step 1 */}
        {step === 1 && (
          <View>
            <Text style={styles.title}>Where do you want to go?</Text>
            <Text style={styles.subtitle}>Enter your dream destination to get started</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., New York City, Paris, Tokyo"
              placeholderTextColor="#8E8E93"
              value={destination}
              onChangeText={setDestination}
              autoFocus
            />
          </View>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <View>
            <Text style={styles.title}>Where are you staying?</Text>
            <Text style={styles.subtitle}>Enter your hotel or accommodation name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Grand Hotel, Airbnb Location"
              placeholderTextColor="#8E8E93"
              value={accommodation}
              onChangeText={setAccommodation}
              autoFocus
            />
          </View>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <View>
            <Text style={styles.title}>Exploration Preferences</Text>
            <Text style={styles.subtitle}>Set your time and distance preferences</Text>

            <View style={styles.prefCard}>
              <View style={styles.prefHeader}>
                <Text style={styles.prefTitle}>Exploration Time</Text>
                <Text style={styles.prefValue}>{explorationHours} hrs</Text>
              </View>
              <View style={styles.sliderTrack}>
                <View style={[styles.sliderFill, { width: `${((explorationHours - 1) / 11) * 100}%` }]} />
              </View>
              <View style={styles.chipRow}>
                {TIME_OPTIONS.map(h => (
                  <TouchableOpacity
                    key={h}
                    style={[styles.chip, explorationHours === h && styles.chipActive]}
                    onPress={() => setExplorationHours(h)}
                  >
                    <Text style={[styles.chipText, explorationHours === h && styles.chipTextActive]}>{h}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.rangeLabels}>
                <Text style={styles.rangeText}>1 hrs</Text>
                <Text style={styles.rangeText}>12 hrs</Text>
              </View>
            </View>

            <View style={styles.prefCard}>
              <View style={styles.prefHeader}>
                <Text style={styles.prefTitle}>Distance</Text>
                <Text style={styles.prefValue}>{distanceKm} km</Text>
              </View>
              <View style={styles.sliderTrack}>
                <View style={[styles.sliderFill, { width: `${((distanceKm - 1) / 49) * 100}%` }]} />
              </View>
              <View style={styles.chipRow}>
                {DISTANCE_OPTIONS.map(d => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.chip, distanceKm === d && styles.chipActive]}
                    onPress={() => setDistanceKm(d)}
                  >
                    <Text style={[styles.chipText, distanceKm === d && styles.chipTextActive]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.rangeLabels}>
                <Text style={styles.rangeText}>1 km</Text>
                <Text style={styles.rangeText}>50 km</Text>
              </View>
            </View>
          </View>
        )}

        {/* Step 4 */}
        {step === 4 && (
          <View>
            <Text style={styles.title}>Time of Day</Text>
            <Text style={styles.subtitle}>When do you prefer to explore?</Text>
            <View style={styles.timeGrid}>
              {TIME_OF_DAY.map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.timeCard, timeOfDay === t.id && styles.timeCardActive]}
                  onPress={() => setTimeOfDay(t.id)}
                >
                  <View style={[styles.timeIconCircle, { backgroundColor: t.color + '20' }]}>
                    <Ionicons name={t.icon as any} size={32} color={t.color} />
                  </View>
                  <Text style={[styles.timeLabel, timeOfDay === t.id && styles.timeLabelActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Step 5 */}
        {step === 5 && (
          <View>
            <Text style={styles.title}>What interests you?</Text>
            <Text style={styles.subtitle}>Select activities you'd like to experience</Text>
            <View style={styles.vibeGrid}>
              {VIBES.map(v => (
                <TouchableOpacity
                  key={v.id}
                  style={[styles.vibeChip, selectedVibes.includes(v.id) && styles.vibeChipActive]}
                  onPress={() => toggleVibe(v.id)}
                >
                  <Ionicons
                    name={v.icon as any}
                    size={18}
                    color={selectedVibes.includes(v.id) ? '#22C55E' : v.color}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={[styles.vibeLabel, selectedVibes.includes(v.id) && styles.vibeLabelActive]}>
                    {v.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

      </ScrollView>

      {/* Bottom Buttons */}
      <View style={styles.bottomBar}>
        {step > 1 && (
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.continueBtn,
            step === 1 && { flex: 1 },
            canContinue() && styles.continueBtnEnabled,
          ]}
          onPress={handleContinue}
          disabled={!canContinue()}
        >
          <Text style={[styles.continueBtnText, canContinue() && styles.continueBtnTextEnabled]}>
            {step === 5 ? 'Discovery Places  \u2192' : 'Continue  \u2192'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  progressWrapper: { paddingHorizontal: 16, paddingTop: 20 },
  progressContainer: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  progressSegment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#E5E5EA' },
  progressActive: { backgroundColor: '#22C55E' },
  stepLabel: { color: '#8E8E93', fontSize: 13, marginBottom: 4 },
  content: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 130 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '700', color: '#111827', marginBottom: 8, lineHeight: 32 },
  subtitle: { fontSize: 15, color: '#8E8E93', marginBottom: 28 },
  input: { backgroundColor: '#F2F2F7', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 16, fontSize: 16, color: '#111827' },
  prefCard: { backgroundColor: '#F2F2F7', borderRadius: 16, padding: 16, marginBottom: 16 },
  prefHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  prefTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  prefValue: { fontSize: 15, fontWeight: '700', color: '#22C55E' },
  sliderTrack: { height: 4, backgroundColor: '#E5E5EA', borderRadius: 2, marginBottom: 14 },
  sliderFill: { height: 4, backgroundColor: '#22C55E', borderRadius: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E5EA', alignItems: 'center', justifyContent: 'center' },
  chipActive: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  chipText: { fontSize: 14, color: '#111827' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  rangeLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  rangeText: { fontSize: 12, color: '#8E8E93' },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  timeCard: { width: (width - 44) / 2, backgroundColor: '#F2F2F7', borderRadius: 16, paddingVertical: 24, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  timeCardActive: { borderColor: '#22C55E', backgroundColor: '#F0FDF4' },
  timeIconCircle: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  timeLabel: { fontSize: 15, fontWeight: '500', color: '#111827' },
  timeLabelActive: { color: '#22C55E', fontWeight: '700' },
  vibeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  vibeChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F2F7', borderRadius: 50, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 2, borderColor: 'transparent' },
  vibeChipActive: { borderColor: '#22C55E', backgroundColor: '#F0FDF4' },
  vibeLabel: { fontSize: 14, color: '#111827', fontWeight: '500' },
  vibeLabelActive: { color: '#22C55E', fontWeight: '600' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 32, paddingTop: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F2F2F7', gap: 12 },
  backBtn: { flex: 1, height: 54, borderRadius: 27, borderWidth: 1.5, borderColor: '#E5E5EA', alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 16, fontWeight: '600', color: '#111827' },
  continueBtn: { flex: 2, height: 54, borderRadius: 27, backgroundColor: '#E5E5EA', alignItems: 'center', justifyContent: 'center' },
  continueBtnEnabled: { backgroundColor: '#22C55E' },
  continueBtnText: { fontSize: 16, fontWeight: '600', color: '#8E8E93' },
  continueBtnTextEnabled: { color: '#fff' },
});
