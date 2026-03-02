import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, Dimensions, StatusBar, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import { checkTripLimit, saveTrip } from '../services/database';
import { searchPlacesByVibe } from '../services/googlePlacesService';
import UpgradeGate from '../components/UpgradeGate';

const { width } = Dimensions.get('window');

const VIBES = [
  { id: 'arts_culture', label: 'Arts & Culture', icon: 'color-palette-outline', color: '#E91E63', keyword: 'art gallery museum culture' },
  { id: 'music', label: 'Music', icon: 'musical-notes-outline', color: '#9C27B0', keyword: 'music venue live music concert' },
  { id: 'festivals', label: 'Festivals', icon: 'sparkles-outline', color: '#FF9800', keyword: 'festival events entertainment' },
  { id: 'food_dining', label: 'Food & Dining', icon: 'restaurant-outline', color: '#FF5722', keyword: 'restaurant food dining cafe' },
  { id: 'nature', label: 'Nature', icon: 'leaf-outline', color: '#4CAF50', keyword: 'park nature garden outdoor' },
  { id: 'adventure', label: 'Adventure', icon: 'compass-outline', color: '#795548', keyword: 'adventure outdoor activities sports' },
  { id: 'history', label: 'History', icon: 'library-outline', color: '#607D8B', keyword: 'historical landmark heritage monument' },
  { id: 'nightlife', label: 'Nightlife', icon: 'moon-outline', color: '#3F51B5', keyword: 'bar nightclub nightlife lounge' },
  { id: 'shopping', label: 'Shopping', icon: 'bag-outline', color: '#E91E63', keyword: 'shopping mall market boutique' },
  { id: 'sports', label: 'Sports', icon: 'football-outline', color: '#2196F3', keyword: 'sports stadium arena recreation' },
  { id: 'wellness', label: 'Wellness', icon: 'heart-outline', color: '#00BCD4', keyword: 'spa wellness yoga meditation' },
  { id: 'photography', label: 'Photography', icon: 'camera-outline', color: '#FF9800', keyword: 'scenic viewpoint photography landmark' },
];

const TIME_OPTIONS = [1, 3, 5, 7, 9, 11, 12];
const DISTANCE_OPTIONS = [1, 11, 21, 31, 41];
const TIME_OF_DAY = [
  { id: 'morning', label: 'Morning', icon: 'sunny-outline', color: '#FF9800' },
  { id: 'afternoon', label: 'Afternoon', icon: 'partly-sunny-outline', color: '#FFC107' },
  { id: 'evening', label: 'Evening', icon: 'cloudy-night-outline', color: '#FF5722' },
  { id: 'night', label: 'Night', icon: 'moon-outline', color: '#3F51B5' },
];
const STEP_ICONS = ['location-outline', 'business-outline', 'time-outline', 'navigate-outline', 'sparkles-outline'];

type Props = { navigation: any };

export default function CreateTripScreen({ navigation }: Props) {
  const { user } = useAuthStore();
  const [step, setStep] = useState(1);
  const [destination, setDestination] = useState('');
  const [accommodation, setAccommodation] = useState('');
  const [explorationHours, setExplorationHours] = useState(3);
  const [distanceKm, setDistanceKm] = useState(10);
  const [timeOfDay, setTimeOfDay] = useState('');
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showGate, setShowGate] = useState(false);
  const [gateMessage, setGateMessage] = useState('');

  const canContinue = () => {
    if (step === 1) return destination.trim().length > 0;
    if (step === 2) return accommodation.trim().length > 0;
    if (step === 3) return true;
    if (step === 4) return timeOfDay !== '';
    if (step === 5) return selectedVibes.length > 0;
    return false;
  };

  const handleContinue = async () => {
    console.log('handleContinue called, step:', step, 'canContinue:', canContinue(), 'vibes:', selectedVibes);
    if (step < 5) { setStep(step + 1); return; }

    console.log('Step 5 fired'); // Step 5 - Find Places
    if (!user?.id) return;

    setLoading(true);
    try {
      // Check trip limit
      console.log('checking trip limit for:', user.id);
      const limitCheck = await checkTripLimit(user.id);
      console.log('limit check result:', JSON.stringify(limitCheck));
      if (!limitCheck.allowed) {
        setGateMessage(limitCheck.reason || '');
        setShowGate(true);
        setLoading(false);
        return;
      }

      // Save trip to Firestore
      const tripId = await saveTrip(user.id, {
        destination,
        accommodation,
        explorationHours,
        distanceKm,
        timeOfDay,
        vibesSelected: selectedVibes,
        tripName: `Trip to ${destination}`,
      });

      // Get vibe keywords for Google Places search
      const vibeKeywords = selectedVibes.map(id => {
        const vibe = VIBES.find(v => v.id === id);
        return vibe?.keyword || vibe?.label || id;
      });

      // Call Google Places API
      console.log('calling places API...');
      const places = await searchPlacesByVibe(destination, vibeKeywords);

      // Navigate to Suggested Places with results
      console.log('navigating to Processing with places:', places?.length);
      navigation.navigate('Processing', {
        places,
        tripId,
        destination,
        vibes: selectedVibes,
        explorationHours,
        timeOfDay,
      });

    } catch (e: any) {
      console.log('Create trip error:', e);
      // Navigate with empty places if API fails
      console.log('navigating to Processing with empty places due to error');
      navigation.navigate('Processing', {
        places: [],
        tripId: null,
        destination,
        vibes: selectedVibes,
        explorationHours,
        timeOfDay,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else navigation.goBack();
  };

  const toggleVibe = (id: string) => {
    setSelectedVibes(prev =>
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <View style={styles.loadingIconCircle}>
            <Ionicons name="search-outline" size={40} color="#22C55E" />
          </View>
          <Text style={styles.loadingTitle}>Finding Places...</Text>
          <Text style={styles.loadingSubtitle}>Discovering the best spots in {destination} for you</Text>
          <ActivityIndicator color="#22C55E" size="large" style={{ marginTop: 24 }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBack} style={{ padding: 4 }}>
          <Ionicons name="chevron-back" size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Create Trip</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.progressWrapper}>
        <View style={styles.progressContainer}>
          {[1, 2, 3, 4, 5].map(i => (
            <View key={i} style={[styles.progressSegment, i <= step && styles.progressActive]} />
          ))}
        </View>
        <Text style={styles.stepLabel}>Step {step} of 5</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.iconCircle}>
          <Ionicons name={STEP_ICONS[step - 1] as any} size={30} color="#fff" />
        </View>

        {/* Step 1 - Destination */}
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

        {/* Step 2 - Accommodation */}
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

        {/* Step 3 - Time & Distance */}
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
                  <TouchableOpacity key={h} style={[styles.chip, explorationHours === h && styles.chipActive]} onPress={() => setExplorationHours(h)}>
                    <Text style={[styles.chipText, explorationHours === h && styles.chipTextActive]}>{h}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.rangeLabels}>
                <Text style={styles.rangeText}>1 hr</Text>
                <Text style={styles.rangeText}>12 hrs</Text>
              </View>
            </View>

            <View style={styles.prefCard}>
              <View style={styles.prefHeader}>
                <Text style={styles.prefTitle}>Distance Radius</Text>
                <Text style={styles.prefValue}>{distanceKm} km</Text>
              </View>
              <View style={styles.sliderTrack}>
                <View style={[styles.sliderFill, { width: `${((distanceKm - 1) / 49) * 100}%` }]} />
              </View>
              <View style={styles.chipRow}>
                {DISTANCE_OPTIONS.map(d => (
                  <TouchableOpacity key={d} style={[styles.chip, distanceKm === d && styles.chipActive]} onPress={() => setDistanceKm(d)}>
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

        {/* Step 4 - Time of Day */}
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
                  <Text style={[styles.timeLabel, timeOfDay === t.id && styles.timeLabelActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Step 5 - Vibes */}
        {step === 5 && (
          <View>
            <Text style={styles.title}>What interests you?</Text>
            <Text style={styles.subtitle}>Select activities you'd like to experience</Text>
            {!user?.isPremium && (
              <View style={styles.freeNote}>
                <Ionicons name="information-circle-outline" size={16} color="#F59E0B" />
                <Text style={styles.freeNoteText}>Free: up to 5 places per trip</Text>
              </View>
            )}
            <View style={styles.vibeGrid}>
              {VIBES.map(v => (
                <TouchableOpacity
                  key={v.id}
                  style={[styles.vibeChip, selectedVibes.includes(v.id) && styles.vibeChipActive]}
                  onPress={() => toggleVibe(v.id)}
                >
                  <Ionicons name={v.icon as any} size={18} color={selectedVibes.includes(v.id) ? '#22C55E' : v.color} style={{ marginRight: 8 }} />
                  <Text style={[styles.vibeLabel, selectedVibes.includes(v.id) && styles.vibeLabelActive]}>{v.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        {step > 1 && (
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.continueBtn, step === 1 && { flex: 1 }, canContinue() && styles.continueBtnEnabled]}
          onPress={handleContinue}
          disabled={!canContinue()}
        >
          <Text style={[styles.continueBtnText, canContinue() && styles.continueBtnTextEnabled]}>
            {step === 5 ? 'Discover Places ' : 'Continue '}
          </Text>
        </TouchableOpacity>
      </View>

      <UpgradeGate
        visible={showGate}
        message={gateMessage}
        onUpgrade={() => { setShowGate(false); navigation.navigate('Subscription'); }}
        onDismiss={() => setShowGate(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, backgroundColor: '#fff' },
  loadingContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  loadingIconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  loadingTitle: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 8 },
  loadingSubtitle: { fontSize: 15, color: '#57636C', textAlign: 'center', lineHeight: 22 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 20, paddingBottom: 4 },
  topBarTitle: { fontSize: 17, fontWeight: '600', color: '#111827' },
  progressWrapper: { paddingHorizontal: 16, paddingTop: 8 },
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
  freeNote: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', borderRadius: 10, padding: 10, marginBottom: 16, gap: 6 },
  freeNoteText: { fontSize: 13, color: '#92400E', fontWeight: '500' },
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
