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

// Inter fonts via useFonts — bundler registers assets and expo-font injects
// @font-face CSS. Ionicons is NOT loaded here: on web it's handled by a
// synchronous CSS @font-face in injectWebGlobalStyles() (avoids async race);
// on native it's handled by the expo-font plugin in app.json.
const fontSources = {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Inter_400Regular: require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Inter_500Medium: require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Inter_600SemiBold: require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Inter_700Bold: require('@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf'),
};

// Catches React render errors so we see the message instead of blank screen.
// If the error looks like a stale lazy-chunk load failure (happens after a
// redeployment), force a hard reload so the browser fetches fresh bundles.
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) {
    const msg = String(error);
    const isChunkError =
      /Loading chunk/.test(msg) ||
      /Loading module/.test(msg) ||
      /AsyncRequireError/.test(msg) ||
      /ChunkLoadError/.test(msg) ||
      /failed to fetch dynamically imported module/i.test(msg);
    if (isChunkError && Platform.OS === 'web') {
      // Hard-reload once to pick up fresh bundles; guard against reload loops.
      const key = 'fynd_chunk_reload';
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        window.location.reload();
      }
    }
  }
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
