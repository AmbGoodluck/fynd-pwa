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
import AppNavigator from './src/navigation/AppNavigator';
import DeviceWarning from './src/components/DeviceWarning';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  debug: __DEV__,
  enableInExpoDevelopment: true,
  tracesSampleRate: 1.0,
});

function App() {
  // Load all fonts — Inter text fonts + Ionicons icon font — in one call.
  // Using require() directly for Ionicons forces Metro to include the TTF as a
  // direct bundle dependency of this file, which guarantees it's available on
  // every platform (web, Android, iOS). The font key 'ionicons' must match
  // exactly what @expo/vector-icons uses internally when rendering glyphs.
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ionicons: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
  });

  useEffect(() => {
    if (fontError) {
      Sentry.captureException(fontError instanceof Error ? fontError : new Error(String(fontError)), {
        tags: { context: 'App.useFonts' },
      });
    }
  }, [fontError]);

  // Block render until fonts are ready. If loading fails (fontError), render
  // anyway so the app is not permanently stuck — icons may be invisible but
  // the rest of the UI stays functional.
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <DeviceWarning />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(App);
