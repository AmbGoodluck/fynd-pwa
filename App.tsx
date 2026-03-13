import React, { useEffect, useState } from 'react';
import { Platform, View, Text, ScrollView } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Sentry from './src/services/sentry';
import {
  useFonts,
} from '@expo-google-fonts/inter';
import AppNavigator from './src/navigation/AppNavigator';
import { injectWebGlobalStyles, registerServiceWorker } from './src/web/globalStyles';
import WebAppViewport from './src/web/WebAppViewport';

// Inject 440 px max-width container, one-finger scroll, and PWA meta tags
// before anything renders. Safe no-op on native.
injectWebGlobalStyles();
// Register service worker for offline support and PWA installability.
registerServiceWorker();

// sentry.web.ts stub is a no-op on web; real init only runs on native.
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  debug: __DEV__,
  enableInExpoDevelopment: true,
  tracesSampleRate: 1.0,
});

// On production web, load fonts from /fonts/* to avoid @-scoped asset URLs
// that can be misrouted by SPA redirect rules on some deployments.
const useWebFontUris = Platform.OS === 'web' && !__DEV__;

const fontSources = {
  Inter_400Regular: useWebFontUris
    ? { uri: '/fonts/Inter_400Regular.ttf' }
    : // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
  Inter_500Medium: useWebFontUris
    ? { uri: '/fonts/Inter_500Medium.ttf' }
    : // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'),
  Inter_600SemiBold: useWebFontUris
    ? { uri: '/fonts/Inter_600SemiBold.ttf' }
    : // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
  Inter_700Bold: useWebFontUris
    ? { uri: '/fonts/Inter_700Bold.ttf' }
    : // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf'),
  ionicons: useWebFontUris
    ? { uri: '/fonts/Ionicons.ttf' }
    : // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
};

// Catches React render errors so we see the message instead of blank screen.
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <ScrollView style={{ flex: 1, backgroundColor: '#fff', padding: 20 }}>
          <Text style={{ color: 'red', fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>
            App crashed — open DevTools console for full trace
          </Text>
          <Text style={{ color: '#333', fontSize: 12, fontFamily: 'monospace' }}>
            {String(this.state.error)}
          </Text>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [fontsLoaded, fontError] = useFonts(fontSources);
  // Safety valve: if fonts neither load nor error within 4 s (e.g. SPA redirect
  // returns HTML instead of a TTF file), proceed anyway so the app is not blank.
  const [fontTimeout, setFontTimeout] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setFontTimeout(true), 4000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (fontError) {
      Sentry.captureException(fontError instanceof Error ? fontError : new Error(String(fontError)), {
        tags: { context: 'App.useFonts' },
      });
    }
  }, [fontError]);

  // Block render until fonts are ready. If loading fails (fontError) or times
  // out (fontTimeout), render anyway — icons may be missing but app is functional.
  if (!fontsLoaded && !fontError && !fontTimeout) return null;

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <WebAppViewport>
          <AppNavigator />
        </WebAppViewport>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

export default Sentry.wrap(App);
