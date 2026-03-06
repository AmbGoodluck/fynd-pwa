import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Sentry from '@sentry/react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import Ionicons from '@expo/vector-icons/Ionicons';
import AppNavigator from './src/navigation/AppNavigator';
import DeviceWarning from './src/components/DeviceWarning';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  debug: __DEV__,
  enableInExpoDevelopment: true,
  tracesSampleRate: 1.0,
});

function App() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    ...Ionicons.font,
  });

  useEffect(() => {
    if (fontError) {
      Sentry.captureException(fontError, {
        tags: { context: 'App.useFonts' },
        extra: { platform: 'runtime-font-load' },
      });
    }
  }, [fontError]);

  // If font loading fails on some devices, continue rendering to avoid blank screens.
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <DeviceWarning />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(App);
