import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Sentry from '@sentry/react-native';
import * as Font from 'expo-font';
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

function normalizeError(err: unknown, fallback: string): Error {
  if (err instanceof Error) return err;
  if (typeof err === 'string') return new Error(err);
  try {
    return new Error(`${fallback}: ${JSON.stringify(err)}`);
  } catch {
    return new Error(fallback);
  }
}

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  debug: __DEV__,
  enableInExpoDevelopment: true,
  tracesSampleRate: 1.0,
});

function App() {
  const [textFontsLoaded, textFontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [iconsReady, setIconsReady] = useState(false);

  useEffect(() => {
    // Icon font is critical; rendering before this loads causes square glyphs on web.
    let mounted = true;
    Font.loadAsync(Ionicons.font)
      .then(() => {
        if (mounted) setIconsReady(true);
      })
      .catch((err) => {
        Sentry.captureException(normalizeError(err, 'Ionicons font load failed'), {
          tags: { context: 'App.loadIoniconsFont' },
          extra: { platform: 'runtime-font-load', rawError: String(err) },
        });
        // Do not block app start forever on font load failures.
        if (mounted) setIconsReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (textFontError) {
      Sentry.captureException(normalizeError(textFontError, 'Text font load failed'), {
        tags: { context: 'App.useFonts' },
        extra: { platform: 'runtime-font-load', rawError: String(textFontError) },
      });
    }
  }, [textFontError]);

  if (!iconsReady) return null;
  // Text fonts are non-critical; continue with system fallback if needed.
  void textFontsLoaded;

  return (
    <SafeAreaProvider>
      <DeviceWarning />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(App);
