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
import ResetPasswordScreen from '../screens/ResetPasswordScreen';

// ── Bottom Tabs (eagerly loaded — critical path) ────────────────────────────────
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

const MapTabScreen = (props: any) => <MapScreen {...props} />;
const ServiceHubTabScreen = (props: any) => <ServiceHubScreen {...props} />;

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

// PWA bottom nav: Home | Create | Map | Services | Saved
const TAB_ICONS: Record<string, { default: string; active: string }> = {
  Home:           { default: 'home-outline',         active: 'home' },
  'Create Trip':  { default: 'add-circle-outline',   active: 'add-circle' },
  Map:            { default: 'map-outline',           active: 'map' },
  ServiceHub:     { default: 'compass-outline',       active: 'compass' },
  Saved:          { default: 'heart-outline',          active: 'heart' },
};

// Shorter display labels for the tab bar
const TAB_LABELS: Record<string, string> = {
  Home:           'Home',
  'Create Trip':  'Create Trip',
  Map:            'Map',
  ServiceHub:     'Services',
  Saved:          'Saved',
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
          tabBarActiveTintColor:   '#10B981',
          tabBarInactiveTintColor: '#9CA3AF',
          tabBarLabel: ({ focused, color }) =>
            React.createElement(
              Text,
              { style: { fontSize: 11, fontWeight: focused ? '600' : '500', color, marginBottom: 2 } },
              TAB_LABELS[route.name] ?? route.name,
            ),
          tabBarStyle: isMobile
            ? {
                // Include safeBottom on web too: with viewport-fit=cover,
                // env(safe-area-inset-bottom) is non-zero on iOS PWA (home indicator).
                height: Platform.OS === 'web' ? 56 + safeBottom : 60 + safeBottom,
                paddingBottom: Platform.OS === 'web' ? Math.max(4, safeBottom) : Math.max(6, safeBottom),
                paddingTop: 4,
                // On web: normal document flow (NOT absolute) so the bar sits
                // above the mobile browser chrome. flexShrink:0 ensures it
                // is never compressed when content is tall.
                ...(Platform.OS === 'web'
                  ? ({ flexShrink: 0 } as object)
                  : {}),
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

      {/* Saved Tab / ServiceHub Guest Modal */}
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
                  <Ionicons name="heart-outline" size={32} color="#10B981" />
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
  const { setUser, login, isAuthenticated } = useAuthStore();
  const navRef = React.useRef<any>(null);
  // On web, pin the root frame to the current visual viewport height so that
  // react-navigation's CardContent (which uses minHeight:'100%' in full-screen
  // mode) is properly bounded.  Without this, FlatList/ScrollView children
  // with flex:1 expand to their full content height and push bottom CTAs off-screen.
  const { height: _webWindowHeight } = useWindowDimensions();

  // ── Web / PWA: resolve auth BEFORE first render so returning users
  //    land directly on MainTabs with no logo / login flash. ───────────
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
      setInitialRoute('Logo');
    })();
    return () => { cancelled = true; };
  }, []);

  // Keep auth store in sync with Supabase session (token refresh, cross-tab sign-out)
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

  // While resolving auth on web, show a blank white screen (instant, no flash).
  if (!initialRoute) {
    return <View style={{ flex: 1, backgroundColor: '#fff' }} />;
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
            // On web, override react-navigation's CardContent style so it uses
            // flex:1 (bounded) instead of minHeight:'100%' (unbounded).
            // This ensures FlatList/ScrollView+bottom-bar layouts fit the screen.
            ...(Platform.OS === 'web'
              ? ({ cardStyle: { flex: 1, overflow: 'hidden' } } as object)
              : {}),
          }}
        >
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
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />

          {/* ── Main App ──────────────────────────────── */}
          <Stack.Screen name="MainTabs">
            {(props) => <MainTabs {...props} navigation={props.navigation} />}
          </Stack.Screen>

          {/* ── Trip flow ─────────────────────────────── */}
          <Stack.Screen name="Create Trip"     component={CreateTripScreen} />
          <Stack.Screen name="Processing"      component={ProcessingScreen} />
          <Stack.Screen name="SuggestedPlaces" component={SuggestedPlacesScreen} />
          <Stack.Screen name="Itinerary" component={ItineraryScreen} />
          <Stack.Screen name="TripMap"      component={MapScreen} />
          <Stack.Screen name="ServiceHub"   component={ServiceHubScreen} />

          {/* ── Profile / settings ────────────────────── */}
          <Stack.Screen name="Profile"          component={ProfileScreen} />
          <Stack.Screen name="AccountSettings"  component={AccountSettingsScreen} />

          <Stack.Screen name="DeleteAccount"    component={DeleteAccountScreen} />
          <Stack.Screen name="Legal"            component={LegalScreen} />
          <Stack.Screen name="LegalDetail"      component={LegalDetailScreen} />
          <Stack.Screen name="TravelPreference" component={TravelPreferenceScreen} />
          <Stack.Screen name="SupportFeedback"  component={SupportFeedbackScreen} />
          <Stack.Screen name="Subscription"     component={SubscriptionScreen} />

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
    // overflow: hidden prevents horizontal scroll on web; on Android it can
    // clip shadows and modals so we only apply it on web.
    ...(Platform.OS === 'web' ? ({ overflow: 'hidden' } as object) : {}),
  },
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
    width: '100%', backgroundColor: '#10B981', borderRadius: 16,
    height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  outlineBtn: {
    width: '100%', borderWidth: 1.5, borderColor: '#10B981',
    borderRadius: 16, height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  outlineBtnText: { color: '#10B981', fontSize: 16, fontWeight: '600' },
  ghostBtn: { paddingVertical: 10, paddingHorizontal: 20 },
  ghostBtnText: { color: '#9CA3AF', fontSize: 14, fontWeight: '500' },
});
