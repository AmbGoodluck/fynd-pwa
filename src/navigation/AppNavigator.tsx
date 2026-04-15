import React, { useState } from 'react';
import {
  Platform, StyleSheet, View, useWindowDimensions,
  Modal, Text, TouchableOpacity, TouchableWithoutFeedback,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGuestStore } from '../store/useGuestStore';
import { useAuthStore } from '../store/useAuthStore';
import PWAInstallModal from '../components/PWAInstallModal';
import { usePWAInstall } from '../hooks/usePWAInstall';
import OfflineBanner from '../components/OfflineBanner';
import AddToHomeScreen from '../components/a2hs/AddToHomeScreen';
import { supabase } from '../services/supabase';

// ── Core flow ──────────────────────────────────────────────────────────────────
import LogoScreen from '../screens/LogoScreen';
import SplashScreen from '../screens/SplashScreen';

// ── Onboarding (legacy — kept for reference, no longer navigated to) ──────────
import Onboarding1Screen from '../screens/Onboarding1Screen';
import Onboarding2Screen from '../screens/Onboarding2Screen';
import Onboarding3Screen from '../screens/Onboarding3Screen';
import Onboarding4Screen from '../screens/Onboarding4Screen';
import Onboarding5Screen from '../screens/Onboarding5Screen';

// ── New Onboarding (V2) ────────────────────────────────────────────────────────
import OnboardingWelcomeScreen from '../screens/OnboardingWelcomeScreen';
import OnboardingInterestsScreen from '../screens/OnboardingInterestsScreen';
import OnboardingLocationScreen from '../screens/OnboardingLocationScreen';
import OnboardingReadyScreen from '../screens/OnboardingReadyScreen';
import AuthChoiceScreen from '../screens/AuthChoiceScreen';

// ── Auth ────────────────────────────────────────────────────────────────────────
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';

// ── Bottom Tabs ─────────────────────────────────────────────────────────────────
import HomeScreen from '../screens/HomeScreen';
import CreateTripScreen from '../screens/CreateTripScreen';
import SavedScreen from '../screens/SavedScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ItineraryScreen from '../screens/ItineraryScreen';
import MapScreen from '../screens/MapScreen';
import ServiceHubScreen from '../screens/ServiceHubScreen';

// ── Stack (trip flow) ───────────────────────────────────────────────────────────
import ProcessingScreen from '../screens/ProcessingScreen';
import SuggestedPlacesScreen from '../screens/SuggestedPlacesScreen';

// ── Settings ──────────────────────────────────────────────────────────────────
import AccountSettingsScreen from '../screens/AccountSettingsScreen';
import DeleteAccountScreen from '../screens/DeleteAccountScreen';
import LegalScreen from '../screens/LegalScreen';
import LegalDetailScreen from '../screens/LegalDetailScreen';
import TravelPreferenceScreen from '../screens/TravelPreferenceScreen';
import SupportFeedbackScreen from '../screens/SupportFeedbackScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';

// ── Shared Trips ─────────────────────────────────────────────────────────────
import SharedTripsScreen from '../screens/SharedTripsScreen';
import JoinTripScreen from '../screens/JoinTripScreen';
import SharedTripDetailScreen from '../screens/SharedTripDetailScreen';
import MomentsScreen from '../screens/MomentsScreen';
import CategoryPlacesScreen from '../screens/CategoryPlacesScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import PlaceDetailScreen from '../screens/PlaceDetailScreen';
import AllPlacesScreen from '../screens/AllPlacesScreen';

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

// 4-tab nav: Home | Services | Saved | Profile
const TAB_ICONS: Record<string, { default: string; active: string }> = {
  Home:     { default: 'home-outline',     active: 'home' },
  Services: { default: 'compass-outline',  active: 'compass' },
  Saved:    { default: 'bookmark-outline', active: 'bookmark' },
  Profile:  { default: 'person-outline',   active: 'person' },
};

const TAB_LABELS: Record<string, string> = {
  Home:     'Home',
  Services: 'Services',
  Saved:    'Saved',
  Profile:  'Profile',
};

function MainTabs({ navigation: stackNavigation }: { navigation?: any }) {
  const { width } = useWindowDimensions();
  const insets    = useSafeAreaInsets();
  const isMobile  = Platform.OS === 'web' ? width <= 900 : true;
  const { isGuest }         = useGuestStore();
  const { isAuthenticated } = useAuthStore();

  const [showGuestSavedModal, setShowGuestSavedModal] = useState(false);

  // PWA install prompt
  const { canInstall, showInstallPrompt, dismissForever } = usePWAInstall();
  const [showInstallModal, setShowInstallModal] = useState(false);

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
          tabBarActiveTintColor:   '#E8503A',
          tabBarInactiveTintColor: '#9E95A8',
          tabBarLabel: ({ focused, color }) =>
            React.createElement(
              Text,
              { style: { fontSize: 11, fontWeight: focused ? '600' : '500', color, marginBottom: 2 } },
              TAB_LABELS[route.name] ?? route.name,
            ),
          tabBarStyle: isMobile
            ? {
                height: Platform.OS === 'web' ? 56 + safeBottom : 60 + safeBottom,
                paddingBottom: Platform.OS === 'web' ? Math.max(4, safeBottom) : Math.max(6, safeBottom),
                paddingTop: 4,
                ...(Platform.OS === 'web'
                  ? ({ flexShrink: 0 } as object)
                  : {}),
                backgroundColor: '#FFFFFF',
                borderTopWidth: 1,
                borderTopColor: 'rgba(26, 16, 25, 0.05)',
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
        <Tab.Screen name="Home"     component={HomeScreen} />
        <Tab.Screen
          name="Services"
          component={ServiceHubScreen}
          listeners={{
            tabPress: (e) => {
              if (isGuest || !isAuthenticated) {
                e.preventDefault();
                setShowGuestSavedModal(true);
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
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>

      {/* Guest Modal for gated tabs */}
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
                  <Ionicons name="bookmark-outline" size={32} color="#E8503A" />
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

const linking = {
  prefixes: ['https://app.fyndplaces.com'],
  config: {
    screens: {
      JoinTrip: 'trip/:trip_id',
    },
  },
};

export default function AppNavigator() {
  useAuthStore();
  const navRef = React.useRef<any>(null);
  const { height: _webWindowHeight } = useWindowDimensions();

  // On web: resolve auth BEFORE first render — returning users land on MainTabs
  // with no logo/login flash. On native: start from Logo immediately.
  const [initialRoute, setInitialRoute] = React.useState<string | null>(
    Platform.OS === 'web' ? null : 'Logo'
  );

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      // Try Supabase session first
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (cancelled) return;
      if (session && session.user) {
        useGuestStore.getState().setGuest(false);
        useAuthStore.getState().login({
          id: session.user.id,
          email: session.user.email || '',
          fullName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '',
          isPremium: false,
          travelPreferences: [],
        });
        setInitialRoute('MainTabs');
        return;
      }
      // No session: check if onboarding has been seen
      const { hasSeenOnboarding } = useGuestStore.getState();
      setInitialRoute(hasSeenOnboarding ? 'AuthChoice' : 'OnboardingWelcome');
    })();
    return () => { cancelled = true; };
  }, []);

  // Keep auth store in sync with Supabase session changes
  React.useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        useAuthStore.getState().setUser(null);
        useGuestStore.getState().logout();
      } else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        useAuthStore.getState().login({
          id: session.user.id,
          email: session.user.email || '',
          fullName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '',
          isPremium: useAuthStore.getState().user?.isPremium ?? false,
          travelPreferences: useAuthStore.getState().user?.travelPreferences ?? [],
        });
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // While resolving auth on web, show warm background (no flash).
  if (!initialRoute) {
    return <View style={{ flex: 1, backgroundColor: '#FFFAF8' }} />;
  }

  return (
    <NavigationContainer linking={linking} ref={navRef}>
      <View style={[styles.appFrame, Platform.OS === 'web' && { height: _webWindowHeight }]}>
        <OfflineBanner />
        <AddToHomeScreen />
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{
            headerShown: false,
            ...(Platform.OS === 'web'
              ? ({ cardStyle: { flex: 1, overflow: 'hidden' } } as object)
              : {}),
          }}
        >
          {/* ── Intro ─────────────────────────────────── */}
          <Stack.Screen name="Logo"   component={LogoScreen} />
          <Stack.Screen name="Splash" component={SplashScreen} />

          {/* ── New Onboarding (V2) ───────────────────── */}
          <Stack.Screen name="OnboardingWelcome"   component={OnboardingWelcomeScreen}   options={{ headerShown: false }} />
          <Stack.Screen name="OnboardingInterests" component={OnboardingInterestsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="OnboardingLocation"  component={OnboardingLocationScreen}  options={{ headerShown: false }} />
          <Stack.Screen name="OnboardingReady"     component={OnboardingReadyScreen}     options={{ headerShown: false }} />

          {/* ── Legacy Onboarding (kept, not navigated to) ── */}
          <Stack.Screen name="Onboarding1" component={Onboarding1Screen} />
          <Stack.Screen name="Onboarding2" component={Onboarding2Screen} />
          <Stack.Screen name="Onboarding3" component={Onboarding3Screen} />
          <Stack.Screen name="Onboarding4" component={Onboarding4Screen} />
          <Stack.Screen name="Onboarding5" component={Onboarding5Screen} />
          <Stack.Screen name="AuthChoice"  component={AuthChoiceScreen} />

          {/* ── Auth ──────────────────────────────────── */}
          <Stack.Screen name="Login"         component={LoginScreen} />
          <Stack.Screen name="Register"      component={RegisterScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />

          {/* ── Main App ──────────────────────────────── */}
          <Stack.Screen name="MainTabs">
            {(props) => <MainTabs {...props} navigation={props.navigation} />}
          </Stack.Screen>

          {/* ── Trip flow ─────────────────────────────── */}
          <Stack.Screen name="Create Trip"     component={CreateTripScreen} />
          <Stack.Screen name="Processing"      component={ProcessingScreen} />
          <Stack.Screen name="SuggestedPlaces" component={SuggestedPlacesScreen} />
          <Stack.Screen name="Itinerary"       component={ItineraryScreen} />
          <Stack.Screen name="TripMap"         component={MapScreen} />
          <Stack.Screen name="ServiceHub"      component={ServiceHubScreen} />

          {/* ── Profile / settings ────────────────────── */}
          <Stack.Screen name="Profile"         component={ProfileScreen} />
          <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
          <Stack.Screen name="DeleteAccount"   component={DeleteAccountScreen} />
          <Stack.Screen name="Legal"           component={LegalScreen} />
          <Stack.Screen name="LegalDetail"     component={LegalDetailScreen} />
          <Stack.Screen name="TravelPreference" component={TravelPreferenceScreen} />
          <Stack.Screen name="SupportFeedback" component={SupportFeedbackScreen} />
          <Stack.Screen name="Subscription"    component={SubscriptionScreen} />

          {/* ── Legacy compat ─────────────────────────── */}
          <Stack.Screen name="Feedback" component={SupportFeedbackScreen} />

          {/* ── Shared Trips ──────────────────────────── */}
          <Stack.Screen name="SharedTrips"      component={SharedTripsScreen} />
          <Stack.Screen name="JoinTrip"         component={JoinTripScreen} />
          <Stack.Screen name="SharedTripDetail" component={SharedTripDetailScreen} />
          <Stack.Screen name="Moments"          component={MomentsScreen} />

          {/* ── Discovery ─────────────────────────────── */}
          <Stack.Screen name="CategoryPlaces" component={(props: any) => <CategoryPlacesScreen {...props} />} />

          {/* ── Notifications ─────────────────────────── */}
          <Stack.Screen name="Notifications" component={NotificationsScreen} />

          {/* ── Place Detail ──────────────────────────── */}
          <Stack.Screen name="PlaceDetail" component={(props: any) => <PlaceDetailScreen {...props} />} />

          {/* ── All Places (Things to Do) ─────────────── */}
          <Stack.Screen name="AllPlaces" component={AllPlacesScreen} />
        </Stack.Navigator>
      </View>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  appFrame: {
    flex: 1,
    maxWidth: '100%',
    ...(Platform.OS === 'web' ? ({ overflow: 'hidden' } as object) : {}),
  },
});

const navStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFAF8', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 44, alignItems: 'center',
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(26, 16, 25, 0.08)', marginBottom: 20,
  },
  modalIconWrap: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFF0EE',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22, fontWeight: '700', color: '#1A1019',
    marginBottom: 10, textAlign: 'center',
  },
  modalBody: {
    fontSize: 14, color: '#6E6577', textAlign: 'center',
    lineHeight: 22, marginBottom: 24, paddingHorizontal: 4,
  },
  primaryBtn: {
    width: '100%', backgroundColor: '#E8503A', borderRadius: 14,
    height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  outlineBtn: {
    width: '100%', borderWidth: 1.5, borderColor: '#E8503A',
    borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  outlineBtnText: { color: '#E8503A', fontSize: 16, fontWeight: '600' },
  ghostBtn: { paddingVertical: 10, paddingHorizontal: 20 },
  ghostBtnText: { color: '#9E95A8', fontSize: 14, fontWeight: '500' },
});
