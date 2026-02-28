import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import HomeScreen from '../screens/HomeScreen';
import CreateTripScreen from '../screens/CreateTripScreen';
import MapScreen from '../screens/MapScreen';
import ServiceHubScreen from '../screens/ServiceHubScreen';
import SavedScreen from '../screens/SavedScreen';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size }) => {
            const icons: Record<string, string> = {
              Home: '🏠',
              'Create Trip': '✈️',
              Map: '🗺️',
              ServiceHub: '🔧',
              Saved: '❤️',
            };
            return <Text style={{ fontSize: size, color }}>{icons[route.name]}</Text>;
          },
          tabBarActiveTintColor: '#22C55E',
          tabBarInactiveTintColor: 'gray',
          headerShown: false,
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Create Trip" component={CreateTripScreen} />
        <Tab.Screen name="Map" component={MapScreen} />
        <Tab.Screen name="ServiceHub" component={ServiceHubScreen} />
        <Tab.Screen name="Saved" component={SavedScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}