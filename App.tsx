import React, { useEffect } from 'react';
import { Platform } from 'react-native';
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

// On web production builds, Cloudflare Pages fails to serve files whose URL
// contains "@" (e.g. /assets/node_modules/@expo/vector-icons/…Ionicons.ttf)
// because the SPA catch-all redirect in _redirects intercepts the request
// before the static-file handler. We copy the font to /fonts/Ionicons.ttf at
// build time (a clean path) and reference it here. On native, require() is
// used so Metro bundles the asset normally.
const ioniconsSource =
  Platform.OS === 'web' && !__DEV__
    ? { uri: '/fonts/Ionicons.ttf' }
    : // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf');

function App() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    ionicons: ioniconsSource,
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
