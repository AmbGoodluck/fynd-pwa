import React from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ── Core flow ──────────────────────────────────────────────────────────────────
import LogoScreen from '../screens/LogoScreen';
import SplashScreen from '../screens/SplashScreen';

// ── Onboarding ─────────────────────────────────────────────────────────────────
import Onboarding1Screen from '../screens/Onboarding1Screen';
import Onboarding2Screen from '../screens/Onboarding2Screen';
import Onboarding3Screen from '../screens/Onboarding3Screen';
import Onboarding4Screen from '../screens/Onboarding4Screen';
import AuthChoiceScreen from '../screens/AuthChoiceScreen';

// ── Auth ────────────────────────────────────────────────────────────────────────
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

// ── Bottom Tabs ─────────────────────────────────────────────────────────────────
import HomeScreen from '../screens/HomeScreen';
import CreateTripScreen from '../screens/CreateTripScreen';
import MapScreen from '../screens/MapScreen';
import ServiceHubScreen from '../screens/ServiceHubScreen';
import SavedScreen from '../screens/SavedScreen';

// ── Stack (trip flow) ───────────────────────────────────────────────────────────
import ProcessingScreen from '../screens/ProcessingScreen';
import SuggestedPlacesScreen from '../screens/SuggestedPlacesScreen';
import ItineraryScreen from '../screens/ItineraryScreen';

// ── Profile / settings ──────────────────────────────────────────────────────────
import ProfileScreen from '../screens/ProfileScreen';
import AccountSettingsScreen from '../screens/AccountSettingsScreen';
import LegalScreen from '../screens/LegalScreen';
import LegalDetailScreen from '../screens/LegalDetailScreen';
import TravelPreferenceScreen from '../screens/TravelPreferenceScreen';
import SupportFeedbackScreen from '../screens/SupportFeedbackScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, { default: string; active: string }> = {
  Home:          { default: 'home-outline',        active: 'home' },
  'Create Trip': { default: 'add-circle-outline',  active: 'add-circle' },
  Map:           { default: 'map-outline',          active: 'map' },
  ServiceHub:    { default: 'compass-outline',      active: 'compass' },
  Saved:         { default: 'bookmark-outline',     active: 'bookmark' },
};

function MainTabs() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isMobile = Platform.OS === 'web' ? width <= 900 : true;
  const safeBottom = insets.bottom;

  return (
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
        tabBarActiveTintColor: '#22C55E',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500', marginBottom: 2 },
        tabBarStyle: isMobile
          ? {
              height: 60 + safeBottom,
              paddingBottom: Math.max(6, safeBottom),
              paddingTop: 6,
              position: 'absolute' as const,
              left: 0,
              right: 0,
              bottom: 0,
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
      <Tab.Screen name="Home"         component={HomeScreen} />
      <Tab.Screen name="Create Trip"  component={CreateTripScreen} />
      <Tab.Screen name="Map"          component={MapScreen} />
      <Tab.Screen name="ServiceHub"   component={ServiceHubScreen} />
      <Tab.Screen name="Saved"        component={SavedScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <View style={styles.appFrame}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {/* ── Intro ────────────────────────────────────────── */}
          <Stack.Screen name="Logo"        component={LogoScreen} />
          <Stack.Screen name="Splash"      component={SplashScreen} />

          {/* ── Onboarding ───────────────────────────────────── */}
          <Stack.Screen name="Onboarding1" component={Onboarding1Screen} />
          <Stack.Screen name="Onboarding2" component={Onboarding2Screen} />
          <Stack.Screen name="Onboarding3" component={Onboarding3Screen} />
          <Stack.Screen name="Onboarding4" component={Onboarding4Screen} />
          <Stack.Screen name="AuthChoice"  component={AuthChoiceScreen} />

          {/* ── Auth ─────────────────────────────────────────── */}
          <Stack.Screen name="Login"    component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />

          {/* ── Main App ─────────────────────────────────────── */}
          <Stack.Screen name="MainTabs" component={MainTabs} />

          {/* ── Trip flow (stack on top of tabs) ─────────────── */}
          <Stack.Screen name="Processing"      component={ProcessingScreen} />
          <Stack.Screen name="SuggestedPlaces" component={SuggestedPlacesScreen} />
          <Stack.Screen name="Itinerary"       component={ItineraryScreen} />
          <Stack.Screen name="TripMap"         component={MapScreen} />

          {/* ── Profile / settings ───────────────────────────── */}
          <Stack.Screen name="Profile"           component={ProfileScreen} />
          <Stack.Screen name="AccountSettings"   component={AccountSettingsScreen} />
          <Stack.Screen name="Legal"             component={LegalScreen} />
          <Stack.Screen name="LegalDetail"       component={LegalDetailScreen} />
          <Stack.Screen name="TravelPreference"  component={TravelPreferenceScreen} />
          <Stack.Screen name="SupportFeedback"   component={SupportFeedbackScreen} />
          <Stack.Screen name="Subscription"      component={SubscriptionScreen} />

          {/* ── Legacy compat (Feedback tab used in V1) ──────── */}
          <Stack.Screen name="Feedback" component={SupportFeedbackScreen} />
        </Stack.Navigator>
      </View>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  appFrame: { flex: 1, maxWidth: '100%', overflow: 'hidden' as const },
});
