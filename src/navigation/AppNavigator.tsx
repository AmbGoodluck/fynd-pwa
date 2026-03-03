import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// V1 active screens
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
        tabBarStyle: { paddingBottom: 4, height: 56 },
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
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="Processing" component={ProcessingScreen} />
        <Stack.Screen name="SuggestedPlaces" component={SuggestedPlacesScreen} />
        <Stack.Screen name="Itinerary" component={ItineraryScreen} />
        <Stack.Screen name="TripMap" component={MapScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
