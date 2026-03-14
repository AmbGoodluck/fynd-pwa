import React, { useState, Suspense } from 'react';
import {
  Platform, StyleSheet, View, useWindowDimensions,
  Modal, Text, TouchableOpacity, TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGuestStore } from '../store/useGuestStore';
import { usePremiumStore } from '../store/usePremiumStore';
import { useAuthStore } from '../store/useAuthStore';
import FyndPlusUpgradeModal from '../components/FyndPlusUpgradeModal';
import PWAInstallModal from '../components/PWAInstallModal';
import { usePWAInstall } from '../hooks/usePWAInstall';

// ── Core flow ──────────────────────────────────────────────────────────────────
import LogoScreen from '../screens/LogoScreen';
import SplashScreen from '../screens/SplashScreen';

// ── Onboarding ─────────────────────────────────────────────────────────────────
import Onboarding1Screen from '../screens/Onboarding1Screen';
import Onboarding2Screen from '../screens/Onboarding2Screen';
import Onboarding3Screen from '../screens/Onboarding3Screen';
import Onboarding4Screen from '../screens/Onboarding4Screen';
import Onboarding5Screen from '../screens/Onboarding5Screen';
import AuthChoiceScreen from '../screens/AuthChoiceScreen';

// ── Auth ────────────────────────────────────────────────────────────────────────
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

// ── Bottom Tabs (eagerly loaded — critical path) ────────────────────────────────
import HomeScreen from '../screens/HomeScreen';
import CreateTripScreen from '../screens/CreateTripScreen';
import SavedScreen from '../screens/SavedScreen';
import ProfileScreen from '../screens/ProfileScreen';

// ── Lazy-loaded screens (heavy / not on critical path) ─────────────────────────
// MapScreen embeds Google Maps JS API via WebView/iframe — defer until needed
const MapScreen        = React.lazy(() => import('../screens/MapScreen'));
const ServiceHubScreen = React.lazy(() => import('../screens/ServiceHubScreen'));
const ItineraryScreen  = React.lazy(() => import('../screens/ItineraryScreen'));

// ── Navigation ─────────────────────────────────────────────────────────────────
import NavigationScreen from '../screens/NavigationScreen';

// ── Stack (trip flow) ───────────────────────────────────────────────────────────
import ProcessingScreen from '../screens/ProcessingScreen';
import SuggestedPlacesScreen from '../screens/SuggestedPlacesScreen';

// ── Settings ──────────────────────────────────────────────────────────────────
import AccountSettingsScreen from '../screens/AccountSettingsScreen';
import LegalScreen from '../screens/LegalScreen';
import LegalDetailScreen from '../screens/LegalDetailScreen';
import TravelPreferenceScreen from '../screens/TravelPreferenceScreen';
import SupportFeedbackScreen from '../screens/SupportFeedbackScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';

// ── Shared Trips ─────────────────────────────────────────────────────────────
import SharedTripsScreen from '../screens/SharedTripsScreen';
import JoinTripScreen from '../screens/JoinTripScreen';
import SharedTripDetailScreen from '../screens/SharedTripDetailScreen';

// Minimal fullscreen loader shown while lazy chunks are fetching
function LazyFallback() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' }}>
      <ActivityIndicator size="large" color="#22C55E" />
    </View>
  );
}

// Wrapper components for lazy screens — required so Tab.Screen can use both
// `component` prop and `listeners` prop at the same time (children render fn
// + listeners is not supported by React Navigation v6).
const MapTabScreen = (props: any) => (
  <Suspense fallback={<LazyFallback />}><MapScreen {...props} /></Suspense>
);
const ServiceHubTabScreen = (props: any) => (
  <Suspense fallback={<LazyFallback />}><ServiceHubScreen {...props} /></Suspense>
);

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

// PWA bottom nav: Home | Create Trip | Map | ServiceHub | Saved
const TAB_ICONS: Record<string, { default: string; active: string }> = {
  Home:           { default: 'home-outline',         active: 'home' },
  'Create Trip':  { default: 'add-circle-outline',   active: 'add-circle' },
  Map:            { default: 'map-outline',           active: 'map' },
  ServiceHub:     { default: 'compass-outline',       active: 'compass' },
  Saved:          { default: 'bookmark-outline',      active: 'bookmark' },
};

function MainTabs({ navigation: stackNavigation }: { navigation?: any }) {
  const { width } = useWindowDimensions();
  const insets    = useSafeAreaInsets();
  const isMobile  = Platform.OS === 'web' ? width <= 900 : true;
  const { isGuest }         = useGuestStore();
  const { isPremium }       = usePremiumStore();
  const { isAuthenticated } = useAuthStore();

  const [showGuestSavedModal,     setShowGuestSavedModal]     = useState(false);
  const [showPremiumServiceHubModal, setShowPremiumServiceHubModal] = useState(false);

  // PWA install prompt
  const { canInstall, showInstallPrompt, dismissForever } = usePWAInstall();
  const [showInstallModal, setShowInstallModal] = useState(false);

  // Surface install modal once canInstall becomes true
  React.useEffect(() => {
    if (canInstall) setShowInstallModal(true);
  }, [canInstall]);

  const safeBottom = insets.bottom;

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, focused }) => {
            const icons = TAB_ICONS[route.name] ?? { default: 'ellipse-outline', active: 'ellipse' };
            return (
              <Ionicons
                name={(focused ? icons.active : icons.default) as any}
                size={24}
                color={color}
              />
            );
          },
          tabBarActiveTintColor:   '#22C55E',
          tabBarInactiveTintColor: '#9CA3AF',
          tabBarLabelStyle: { fontSize: 11, fontWeight: '500', marginBottom: 2 },
          tabBarStyle: isMobile
            ? {
                height: 60 + safeBottom,
                paddingBottom: Math.max(6, safeBottom),
                paddingTop: 6,
                position: 'absolute' as const,
                left: 0, right: 0, bottom: 0,
                backgroundColor: '#fff',
                borderTopWidth: 1,
                borderTopColor: '#F2F2F7',
                shadowColor: '#000',
                shadowOpacity: 0.06,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: -2 },
                elevation: 8,
              }
            : { paddingBottom: 4, height: 60, marginHorizontal: 10 },
          headerShown: false,
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Create Trip" component={CreateTripScreen} />
        <Tab.Screen name="Map" component={MapTabScreen} />
        <Tab.Screen
          name="ServiceHub"
          component={ServiceHubTabScreen}
          listeners={{
            tabPress: (e) => {
              if (isGuest || !isAuthenticated) {
                e.preventDefault();
                setShowGuestSavedModal(true);
                return;
              }
              if (!isPremium) {
                e.preventDefault();
                setShowPremiumServiceHubModal(true);
              }
            },
          }}
        />
        <Tab.Screen
          name="Saved"
          component={SavedScreen}
          listeners={{
            tabPress: (e) => {
              if (isGuest || !isAuthenticated) {
                e.preventDefault();
                setShowGuestSavedModal(true);
              }
            },
          }}
        />
      </Tab.Navigator>

      {/* ServiceHub FyndPlus Upgrade Modal (triggered from HomeScreen) */}
      <FyndPlusUpgradeModal
        visible={showPremiumServiceHubModal}
        onClose={() => setShowPremiumServiceHubModal(false)}
        onUpgrade={() => { setShowPremiumServiceHubModal(false); stackNavigation?.navigate('Subscription'); }}
        icon="compass-outline"
        title="Unlock ServiceHub"
        message="Find medical help, transport, and essential services nearby. Upgrade to FyndPlus for instant access."
      />

      {/* Saved Tab Guest Modal */}
      <Modal
        visible={showGuestSavedModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGuestSavedModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowGuestSavedModal(false)}>
          <View style={navStyles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={navStyles.modalSheet}>
                <View style={navStyles.modalHandle} />
                <View style={navStyles.modalIconWrap}>
                  <Ionicons name="bookmark-outline" size={32} color="#22C55E" />
                </View>
                <Text style={navStyles.modalTitle}>Account Required</Text>
                <Text style={navStyles.modalBody}>
                  Create an account to save places and access your saved trips across all your devices.
                </Text>
                <TouchableOpacity
                  style={navStyles.primaryBtn}
                  onPress={() => { setShowGuestSavedModal(false); stackNavigation?.navigate('Login'); }}
                >
                  <Text style={navStyles.primaryBtnText}>Sign In</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={navStyles.outlineBtn}
                  onPress={() => { setShowGuestSavedModal(false); stackNavigation?.navigate('Register'); }}
                >
                  <Text style={navStyles.outlineBtnText}>Create Account</Text>
                </TouchableOpacity>
                <TouchableOpacity style={navStyles.ghostBtn} onPress={() => setShowGuestSavedModal(false)}>
                  <Text style={navStyles.ghostBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* PWA Install Modal */}
      <PWAInstallModal
        visible={showInstallModal}
        onInstall={() => { setShowInstallModal(false); showInstallPrompt(); }}
        onDismiss={() => { setShowInstallModal(false); dismissForever(); }}
      />
    </View>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <View style={styles.appFrame}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {/* ── Intro ─────────────────────────────────── */}
          <Stack.Screen name="Logo"        component={LogoScreen} />
          <Stack.Screen name="Splash"      component={SplashScreen} />

          {/* ── Onboarding ────────────────────────────── */}
          <Stack.Screen name="Onboarding1" component={Onboarding1Screen} />
          <Stack.Screen name="Onboarding2" component={Onboarding2Screen} />
          <Stack.Screen name="Onboarding3" component={Onboarding3Screen} />
          <Stack.Screen name="Onboarding4" component={Onboarding4Screen} />
          <Stack.Screen name="Onboarding5" component={Onboarding5Screen} />
          <Stack.Screen name="AuthChoice"  component={AuthChoiceScreen} />

          {/* ── Auth ──────────────────────────────────── */}
          <Stack.Screen name="Login"    component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />

          {/* ── Main App ──────────────────────────────── */}
          <Stack.Screen name="MainTabs">
            {(props) => <MainTabs {...props} navigation={props.navigation} />}
          </Stack.Screen>

          {/* ── Trip flow ─────────────────────────────── */}
          <Stack.Screen name="Create Trip"     component={CreateTripScreen} />
          <Stack.Screen name="Processing"      component={ProcessingScreen} />
          <Stack.Screen name="SuggestedPlaces" component={SuggestedPlacesScreen} />
          <Stack.Screen name="Itinerary">
            {(props) => <Suspense fallback={<LazyFallback />}><ItineraryScreen {...props} /></Suspense>}
          </Stack.Screen>
          <Stack.Screen name="TripMap">
            {(props) => <Suspense fallback={<LazyFallback />}><MapScreen {...props} /></Suspense>}
          </Stack.Screen>

          {/* ── Premium-gated ServiceHub ──────────────── */}
          <Stack.Screen name="ServiceHub">
            {(props) => <Suspense fallback={<LazyFallback />}><ServiceHubScreen {...props} /></Suspense>}
          </Stack.Screen>

          {/* ── Profile / settings ────────────────────── */}
          <Stack.Screen name="Profile"          component={ProfileScreen} />
          <Stack.Screen name="AccountSettings"  component={AccountSettingsScreen} />
          <Stack.Screen name="Legal"            component={LegalScreen} />
          <Stack.Screen name="LegalDetail"      component={LegalDetailScreen} />
          <Stack.Screen name="TravelPreference" component={TravelPreferenceScreen} />
          <Stack.Screen name="SupportFeedback"  component={SupportFeedbackScreen} />
          <Stack.Screen name="Subscription"     component={SubscriptionScreen} />

          {/* ── Legacy compat ─────────────────────────── */}
          <Stack.Screen name="Feedback" component={SupportFeedbackScreen} />

          {/* ── In-app Navigation ────────────────────── */}
          <Stack.Screen name="Navigation" component={NavigationScreen} />

          {/* ── Shared Trips ──────────────────────────── */}
          <Stack.Screen name="SharedTrips"      component={SharedTripsScreen} />
          <Stack.Screen name="JoinTrip"         component={JoinTripScreen} />
          <Stack.Screen name="SharedTripDetail" component={SharedTripDetailScreen} />
        </Stack.Navigator>
      </View>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  appFrame: { flex: 1, maxWidth: '100%', overflow: 'hidden' as const },
});

const navStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 44, alignItems: 'center',
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E5E5EA', marginBottom: 20,
  },
  modalIconWrap: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#F0FDF4',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22, fontWeight: '700', color: '#111827',
    marginBottom: 10, textAlign: 'center',
  },
  modalBody: {
    fontSize: 14, color: '#57636C', textAlign: 'center',
    lineHeight: 22, marginBottom: 24, paddingHorizontal: 4,
  },
  primaryBtn: {
    width: '100%', backgroundColor: '#22C55E', borderRadius: 16,
    height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  outlineBtn: {
    width: '100%', borderWidth: 1.5, borderColor: '#22C55E',
    borderRadius: 16, height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  outlineBtnText: { color: '#22C55E', fontSize: 16, fontWeight: '600' },
  ghostBtn: { paddingVertical: 10, paddingHorizontal: 20 },
  ghostBtnText: { color: '#9CA3AF', fontSize: 14, fontWeight: '500' },
});
