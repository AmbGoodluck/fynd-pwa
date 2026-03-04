import React from 'react';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Sentry from '@sentry/react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import AppNavigator from './src/navigation/AppNavigator';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  debug: false,
  enableInExpoDevelopment: false,
  tracesSampleRate: 1.0,
});

// Apply Inter Regular as the default font for all Text in the app
// Weighted styles (600, 700) are set per-component via the F constants
(Text as any).defaultProps = (Text as any).defaultProps ?? {};
(Text as any).defaultProps.style = [{ fontFamily: 'Inter_400Regular' }];

function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(App);
