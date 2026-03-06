import React from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// V1 active screens
import LogoScreen from '../screens/LogoScreen';
import SplashScreen from '../screens/SplashScreen';
import CreateTripScreen from '../screens/CreateTripScreen';
import MapScreen from '../screens/MapScreen';
import SupportFeedbackScreen from '../screens/SupportFeedbackScreen';
import ProcessingScreen from '../screens/ProcessingScreen';
import SuggestedPlacesScreen from '../screens/SuggestedPlacesScreen';
import ItineraryScreen from '../screens/ItineraryScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isMobileWeb = Platform.OS === 'web' && width <= 900;
  // safeBottom: on iOS with home indicator, insets.bottom > 0; elsewhere 0.
  const safeBottom = insets.bottom;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, string> = {
            'Create Trip': 'airplane-outline',
            'Map': 'map-outline',
            'Feedback': 'chatbubble-outline',
          };
          return <Ionicons name={icons[route.name] as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#22C55E',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: isMobileWeb
          ? {
              // Always pinned to the true bottom of the viewport.
              // paddingBottom absorbs the iOS home-indicator safe area.
              height: 56 + safeBottom,
              paddingBottom: Math.max(4, safeBottom),
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
            }
          : { paddingBottom: 4, height: 56, marginHorizontal: 10 },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Create Trip" component={CreateTripScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Feedback" component={SupportFeedbackScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <View style={styles.appFrame}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Logo" component={LogoScreen} />
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="Feedback" component={SupportFeedbackScreen} />
          <Stack.Screen name="Processing" component={ProcessingScreen} />
          <Stack.Screen name="SuggestedPlaces" component={SuggestedPlacesScreen} />
          <Stack.Screen name="Itinerary" component={ItineraryScreen} />
          <Stack.Screen name="TripMap" component={MapScreen} />
        </Stack.Navigator>
      </View>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  appFrame: {
    flex: 1,
    paddingHorizontal: 10,
  },
});
