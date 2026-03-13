import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, Modal, TextInput, Alert, Linking, Platform,
  PanResponder, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Sentry from '../services/sentry';
import { F } from '../theme/fonts';
import AppHeader from '../components/AppHeader';
import FyndScrollContainer from '../components/FyndScrollContainer';
import { reverseGeocode, autocompletePlaces, AutocompleteSuggestion } from '../services/googlePlacesService';
import { logEvent } from '../services/firebase';

const WEB_PROXY_FALLBACK = 'https://fynd-api.jallohosmanamadu311.workers.dev';

// ── Vibes (current step 5, design unchanged) ───────────────────────────
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

const TIME_OF_DAY = [
  { id: 'morning', label: 'Morning', icon: 'sunny-outline' },
  { id: 'afternoon', label: 'Afternoon', icon: 'partly-sunny-outline' },
  { id: 'evening', label: 'Evening', icon: 'cloudy-night-outline' },
  { id: 'night', label: 'Night', icon: 'moon-outline' },
];

// ── Slider component ───────────────────────────────────────────────────
function FyndSlider({ min, max, value, step = 1, onChange }: {
  min: number; max: number; value: number; step?: number; onChange: (v: number) => void;
}) {
  const containerRef = useRef<View>(null);
  const metricsRef = useRef({ x: 0, width: 300 }); // onLayout corrects immediately
  const cbRef = useRef(onChange);
  cbRef.current = onChange;
  const [renderW, setRenderW] = useState(300); // onLayout corrects immediately

  const THUMB = 22;
  const HPAD = 16;
  const trackW = renderW - HPAD * 2;
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));

  function applyPageX(pageX: number) {
    const tw = metricsRef.current.width - HPAD * 2;
    const r = Math.max(0, Math.min(1, (pageX - metricsRef.current.x - HPAD) / tw));
    const snapped = Math.round((min + r * (max - min)) / step) * step;
    cbRef.current(Math.max(min, Math.min(max, snapped)));
  }

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const pageX = e.nativeEvent.pageX;
        containerRef.current?.measure((_, __, w, ___, ox) => {
          metricsRef.current = { x: ox, width: w };
          setRenderW(w);
          applyPageX(pageX);
        });
      },
      onPanResponderMove: (e) => applyPageX(e.nativeEvent.pageX),
    })
  ).current;

  return (
    <View
      ref={containerRef}
      style={{ paddingHorizontal: HPAD, paddingVertical: 14 }}
      onLayout={() =>
        containerRef.current?.measure((_, __, w, ___, ox) => {
          metricsRef.current = { x: ox, width: w };
          setRenderW(w);
        })
      }
      {...pan.panHandlers}
    >
      <View style={{ height: 4, backgroundColor: '#E5E5EA', borderRadius: 2 }}>
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: ratio * trackW, backgroundColor: '#22C55E', borderRadius: 2 }} />
      </View>
      <View
        style={{
          position: 'absolute',
          top: 5,
          left: HPAD + ratio * trackW - THUMB / 2,
          width: THUMB, height: THUMB, borderRadius: THUMB / 2,
          backgroundColor: '#22C55E',
          shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
        }}
      />
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────
type Props = { navigation: any };

export default function CreateTripScreen({ navigation }: Props) {
  const [step, setStep] = useState(1);

  const { bottom: bottomInset } = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  // Step 1 state
  const [destination, setDestination] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [explorationHours, setExplorationHours] = useState(4);
  const [distanceMiles, setDistanceMiles] = useState(6);
  const [timeOfDay, setTimeOfDay] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationInput, setLocationInput] = useState('');

  // Autosuggest state
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const suggestDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current);
    if (!locationInput.trim() || locationInput.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    setSuggestionsLoading(true);
    suggestDebounceRef.current = setTimeout(async () => {
      const results = await autocompletePlaces(locationInput);
      setSuggestions(results);
      setSuggestionsLoading(false);
    }, 350);
    return () => {
      if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current);
    };
  }, [locationInput]);

  const handleSelectSuggestion = (suggestion: AutocompleteSuggestion) => {
    setDestination(suggestion.mainText || suggestion.description);
    setSuggestions([]);
    setShowLocationModal(false);
    setLocationInput('');
  };

  // Step 2 state
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);

  const canGoToStep2 = destination.trim().length > 0 && timeOfDay !== '';
  const canFindPlaces = selectedVibes.length > 0;

  const openSettings = () => {
    // Linking.openSettings() is only supported on native platforms
    if (Platform.OS === 'web') {
      Alert.alert('Location Blocked', 'Please enable location in your browser settings (click the lock icon in the address bar) and reload the page.');
    } else {
      Linking.openSettings();
    }
  };

  const handleUseLocation = async () => {
    setLocationLoading(true);
    try {
      Sentry.addBreadcrumb({ category: 'location', message: `Requesting location on ${Platform.OS}`, level: 'info' });

      if (Platform.OS === 'web') {
        // Use browser Geolocation API directly for maximum web compatibility
        if (!navigator.geolocation) {
          Alert.alert('Not Supported', 'Geolocation is not supported by your browser.');
          return;
        }
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false, timeout: 15000, maximumAge: 60000,
          });
        });
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);
        // Use our cross-platform reverse geocoder (goes through proxy on web)
        const name = await reverseGeocode(lat, lng);
        setDestination(name);
        Sentry.addBreadcrumb({ category: 'location', message: `Web location found: ${name} (${lat.toFixed(4)}, ${lng.toFixed(4)})`, level: 'info' });
        return;
      }

      // ── Native (Android/iOS) ──
      const existing = await Location.getForegroundPermissionsAsync();

      if (existing.status === 'denied' && !existing.canAskAgain) {
        Alert.alert(
          'Location Permission Required',
          'Fynd needs location access to find places near you. Please enable it in your device Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: openSettings },
          ]
        );
        return;
      }

      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        if (!canAskAgain) {
          Alert.alert(
            'Location Disabled',
            'Location access was denied. Open Settings to enable it for Fynd.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: openSettings },
            ]
          );
        } else {
          Alert.alert('Location Access', 'Enable location access to use this feature.');
        }
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: lat, longitude: lng } = loc.coords;
      setLatitude(lat);
      setLongitude(lng);
      // Use cross-platform reverse geocode that works on all platforms
      const name = await reverseGeocode(lat, lng);
      setDestination(name);
      Sentry.addBreadcrumb({ category: 'location', message: `Native location found: ${name} (${lat.toFixed(4)}, ${lng.toFixed(4)})`, level: 'info' });
    } catch (err: any) {
      // Web GeolocationPositionError has a code property
      if (err?.code === 1) {
        // PERMISSION_DENIED
        Alert.alert('Location Blocked', 'Please allow location access in your browser settings and try again.');
      } else if (err?.code === 2) {
        // POSITION_UNAVAILABLE
        Alert.alert('Location Unavailable', 'Your device could not determine your location. Try again or enter it manually.');
      } else if (err?.code === 3) {
        // TIMEOUT
        Alert.alert('Location Timeout', 'Getting your location took too long. Please try again or enter it manually.');
      } else {
        Alert.alert('Error', 'Could not get your location. Please enter it manually.');
      }
      Sentry.captureException(err, {
        tags: { context: 'handleUseLocation', platform: Platform.OS },
        extra: { code: err?.code, message: err?.message },
      });
    } finally {
      setLocationLoading(false);
    }
  };

  const handleConfirmLocation = async () => {
    const input = locationInput.trim();

    // Close modal immediately so the user can continue without waiting
    setShowLocationModal(false);
    setLocationInput('');
    setSuggestions([]);

    if (!input) return;

    setDestination(input);

    // Geocode in background — lat/lng used only for distance sorting, not blocking
    try {
      const PROXY = ((process.env.EXPO_PUBLIC_OPENAI_PROXY || '').replace(/\/$/, '')) || WEB_PROXY_FALLBACK;
      const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || 'AIzaSyAXJbrM6TImUPguLUnXUNKUkPzTdXKV53c';
      let url: string;
      if (Platform.OS === 'web' && PROXY) {
        url = `${PROXY}/api/places/textsearch?query=${encodeURIComponent(input)}`;
      } else {
        url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(input)}&key=${API_KEY}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === 'OK' && data.results?.[0]?.geometry?.location) {
        const loc = data.results[0].geometry.location;
        setLatitude(loc.lat);
        setLongitude(loc.lng);
      } else {
        setLatitude(null);
        setLongitude(null);
      }
    } catch (err: any) {
      setLatitude(null);
      setLongitude(null);
      Sentry.captureException(err, {
        tags: { context: 'CreateTripScreen.handleConfirmLocation', platform: Platform.OS },
        extra: { input, destination, proxyConfigured: !!WEB_PROXY_FALLBACK },
      });
    }
  };

  const toggleVibe = (id: string) => {
    setSelectedVibes(prev =>
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  const handleFindPlaces = () => {
    const vibeKeywords = selectedVibes.map(id => {
      const vibe = VIBES.find(v => v.id === id);
      return vibe?.keyword || vibe?.label || id;
    });
    logEvent('trip_started', { destination, vibes: selectedVibes.join(','), explorationHours, distanceMiles, timeOfDay });
    navigation.navigate('Processing', {
      vibeKeywords, destination, vibes: selectedVibes,
      explorationHours, distanceMiles, timeOfDay, latitude, longitude,
    });
  };

  return (
    <SafeAreaView style={[styles.container, { paddingBottom: tabBarHeight }]} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      <AppHeader
        title="Create Trip"
        onBack={step === 2 ? () => setStep(1) : undefined}
      />

      {/* Progress */}
      <View style={styles.progressWrapper}>
        <View style={styles.progressContainer}>
          {[1, 2].map(i => (
            <View key={i} style={[styles.progressSegment, i <= step && styles.progressActive]} />
          ))}
        </View>
        <Text style={styles.stepLabel}>Step {step} of 2</Text>
      </View>

      {/* ── STEP 1: Preferences ── */}
      {step === 1 && (
        <View style={{ flex: 1 }}>
          <FyndScrollContainer
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={styles.sectionTitle}>Select your preference</Text>

            {/* Location card */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Where are you exploring from?</Text>
              <View style={styles.locationBtnRow}>
                <TouchableOpacity
                  style={[styles.locationBtn, styles.locationBtnOutline]}
                  onPress={() => setShowLocationModal(true)}
                >
                  <Ionicons name="pencil-outline" size={14} color="#57636C" style={{ marginRight: 5 }} />
                  <Text style={styles.locationBtnOutlineText} numberOfLines={1}>Input location</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.locationBtn, styles.locationBtnFilled]}
                  onPress={handleUseLocation}
                  disabled={locationLoading}
                >
                  {locationLoading
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <>
                        <Ionicons name="locate-outline" size={14} color="#fff" style={{ marginRight: 5 }} />
                        <Text style={styles.locationBtnFilledText} numberOfLines={1}>Use my location</Text>
                      </>
                  }
                </TouchableOpacity>
              </View>
              {destination ? (
                <View style={styles.destinationBadge}>
                  <Ionicons name="location" size={13} color="#22C55E" />
                  <Text style={styles.destinationBadgeText} numberOfLines={1}> {destination}</Text>
                </View>
              ) : null}
            </View>

            {/* Time card */}
            <View style={styles.card}>
              <View style={styles.cardLabelRow}>
                <Text style={styles.cardLabel}>How long do you wish to explore for?</Text>
                <Text style={styles.cardValue}>{explorationHours} hr</Text>
              </View>
              <FyndSlider min={1} max={8} value={explorationHours} step={1} onChange={setExplorationHours} />
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabelText}>1 hr</Text>
                <Text style={styles.sliderLabelText}>4 hr</Text>
                <Text style={styles.sliderLabelText}>8 hr</Text>
              </View>
            </View>

            {/* Distance card */}
            <View style={styles.card}>
              <View style={styles.cardLabelRow}>
                <Text style={styles.cardLabel}>How far do you wish to go?</Text>
                <Text style={styles.cardValue}>{distanceMiles} mi</Text>
              </View>
              <FyndSlider min={1} max={21} value={distanceMiles} step={1} onChange={setDistanceMiles} />
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabelText}>1 mile</Text>
                <Text style={styles.sliderLabelText}>12 miles</Text>
                <Text style={styles.sliderLabelText}>21+ miles</Text>
              </View>
            </View>

            {/* Time of day card */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>What time of the day do you prefer?</Text>
              <View style={styles.chipRow}>
                {TIME_OF_DAY.map(t => (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.timeChip, timeOfDay === t.id && styles.timeChipActive]}
                    onPress={() => setTimeOfDay(t.id)}
                  >
                    <Ionicons
                      name={t.icon as any}
                      size={12}
                      color={timeOfDay === t.id ? '#fff' : '#57636C'}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.timeChipText, timeOfDay === t.id && styles.timeChipTextActive]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </FyndScrollContainer>

          {/* Always-visible bottom bar — Select Vibe CTA */}
          <View style={[styles.bottomBar, { paddingBottom: Math.max(8, bottomInset) }]}>
            <TouchableOpacity
              style={[styles.findBtn, { flex: 1 }, canGoToStep2 && styles.findBtnEnabled]}
              onPress={() => canGoToStep2 && setStep(2)}
              activeOpacity={canGoToStep2 ? 0.8 : 1}
            >
              <Text style={[styles.findBtnText, canGoToStep2 && styles.findBtnTextEnabled]}>
                Select Vibe
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── STEP 2: Vibes ── */}
      {step === 2 && (
        <View style={{ flex: 1 }}>
          <FyndScrollContainer
            style={{ flex: 1 }}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 }]}
          >
            <View style={styles.iconCircle}>
              <Ionicons name="sparkles-outline" size={30} color="#fff" />
            </View>
            <View style={styles.vibeTitleRow}>
              <Text style={styles.vibeTitle}>What Interests You?</Text>
            </View>
            <View style={styles.vibeSubtitleRow}>
              <Text style={styles.vibeSubtitle}>Select activities you wish to explore</Text>
            </View>
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
          </FyndScrollContainer>

          {/* Always-visible bottom bar — Back + Find My Places */}
          <View style={[styles.bottomBar, { paddingBottom: Math.max(8, bottomInset) }]}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.findBtn, canFindPlaces && styles.findBtnEnabled]}
              onPress={() => canFindPlaces && handleFindPlaces()}
              activeOpacity={canFindPlaces ? 0.8 : 1}
            >
              <Text style={[styles.findBtnText, canFindPlaces && styles.findBtnTextEnabled]}>
                Fynd Places
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Input Location Modal */}
      <Modal visible={showLocationModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Enter your location</Text>

            {/* Search input with icon */}
            <View style={styles.searchInputWrap}>
              <Ionicons name="search-outline" size={16} color="#8E8E93" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.modalInput}
                placeholder="City, state or country…"
                placeholderTextColor="#8E8E93"
                value={locationInput}
                onChangeText={setLocationInput}
                autoFocus
                onSubmitEditing={handleConfirmLocation}
                returnKeyType="search"
              />
              {suggestionsLoading && (
                <ActivityIndicator size="small" color="#22C55E" style={{ marginLeft: 6 }} />
              )}
            </View>

            {/* Autocomplete suggestion list */}
            {suggestions.length > 0 && (
              <ScrollView
                style={styles.suggestionList}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {suggestions.map((item, index) => (
                  <TouchableOpacity
                    key={item.placeId}
                    style={[
                      styles.suggestionItem,
                      index < suggestions.length - 1 && styles.suggestionItemBorder,
                    ]}
                    onPress={() => handleSelectSuggestion(item)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="location-outline" size={14} color="#22C55E" style={{ marginRight: 8 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.suggestionMain} numberOfLines={1}>{item.mainText}</Text>
                      {item.secondaryText ? (
                        <Text style={styles.suggestionSecondary} numberOfLines={1}>{item.secondaryText}</Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => { setShowLocationModal(false); setLocationInput(''); setSuggestions([]); }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleConfirmLocation}>
                <Text style={styles.modalConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  progressWrapper: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 4 },
  progressContainer: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  progressSegment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB' },
  progressActive: { backgroundColor: '#22C55E' },
  stepLabel: { color: '#9CA3AF', fontSize: 12, fontFamily: F.regular, marginBottom: 2 },

  scrollContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 4 },
  sectionTitle: { fontSize: 22, fontFamily: F.semibold, color: '#111827', marginBottom: 16, marginTop: 6 },

  card: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  cardLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { fontSize: 15, fontFamily: F.medium, color: '#111827', flex: 1 },
  cardValue: { fontSize: 15, fontFamily: F.bold, color: '#22C55E', marginLeft: 8 },

  locationBtnRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  locationBtn: { flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', paddingHorizontal: 10 },
  locationBtnOutline: { borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: '#fff' },
  locationBtnOutlineText: { fontSize: 13, fontFamily: F.medium, color: '#374151' },
  locationBtnFilled: { backgroundColor: '#22C55E' },
  locationBtnFilledText: { fontSize: 13, fontFamily: F.semibold, color: '#fff' },
  destinationBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 12, backgroundColor: '#F0FDF4', paddingVertical: 7, paddingHorizontal: 10, borderRadius: 8 },
  destinationBadgeText: { fontSize: 13, fontFamily: F.medium, color: '#16A34A', flex: 1 },

  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 2 },
  sliderLabelText: { fontSize: 12, fontFamily: F.regular, color: '#9CA3AF' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  timeChip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#fff' },
  timeChipActive: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  timeChipText: { fontSize: 13, fontFamily: F.medium, color: '#374151' },
  timeChipTextActive: { fontFamily: F.semibold, color: '#fff' },

  ctaBtn: { marginTop: 8, height: 52, borderRadius: 14, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  ctaBtnEnabled: { backgroundColor: '#22C55E' },
  ctaBtnText: { fontSize: 16, fontFamily: F.semibold, color: '#9CA3AF' },
  ctaBtnTextEnabled: { color: '#fff' },

  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  vibeTitleRow: { width: '100%', marginBottom: 6 },
  vibeTitle: { fontSize: 26, fontFamily: F.bold, color: '#111827', lineHeight: 32 },
  vibeSubtitleRow: { width: '100%', marginBottom: 16 },
  vibeSubtitle: { fontSize: 14, fontFamily: F.semibold, color: '#6B7280' },
  vibeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  vibeChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 50, paddingVertical: 11, paddingHorizontal: 16, borderWidth: 1.5, borderColor: 'transparent' },
  vibeChipActive: { borderColor: '#22C55E', backgroundColor: '#F0FDF4' },
  vibeLabel: { fontSize: 14, fontFamily: F.medium, color: '#111827' },
  vibeLabelActive: { fontFamily: F.semibold, color: '#22C55E' },

  bottomBar: { flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 10, paddingTop: 2, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB', gap: 12 },
  backBtn: { flex: 1, height: 54, borderRadius: 27, borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  backBtnText: { fontSize: 16, fontFamily: F.semibold, color: '#374151' },
  findBtn: { flex: 2, height: 54, borderRadius: 27, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  findBtnEnabled: { backgroundColor: '#22C55E' },
  findBtnText: { fontSize: 16, fontFamily: F.semibold, color: '#9CA3AF' },
  findBtnTextEnabled: { color: '#fff' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  modalBox: { width: '90%', backgroundColor: '#fff', borderRadius: 20, padding: 24, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontFamily: F.bold, color: '#111827', marginBottom: 14 },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  modalInput: { flex: 1, paddingVertical: 12, fontSize: 15, fontFamily: F.regular, color: '#111827' },
  suggestionList: {
    maxHeight: 200,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 14,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  suggestionItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  suggestionMain: { fontSize: 14, fontFamily: F.semibold, color: '#111827' },
  suggestionSecondary: { fontSize: 12, fontFamily: F.regular, color: '#6B7280', marginTop: 1 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 6 },
  modalCancel: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  modalCancelText: { fontSize: 15, fontFamily: F.medium, color: '#374151' },
  modalConfirm: { flex: 1, height: 44, borderRadius: 12, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center' },
  modalConfirmText: { fontSize: 15, fontFamily: F.semibold, color: '#fff' },
});
