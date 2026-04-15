// --- EARLY SENTRY INIT ---
import { initCrashReporting } from './src/services/crashReporting';
import * as Sentry from './src/services/sentry';
initCrashReporting();
// --- END SENTRY INIT ---

import React, { useEffect, useState } from 'react';
import { Platform, View, Text, ScrollView } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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

// Sentry is now initialized at the very top for early error detection.

// Font loading strategy:
// - Inter: loaded via require() so bundler registers the hashed asset URL.
// - ionicons: loaded via { uri: '/fonts/Ionicons.ttf' } — a clean path with
//   no '@' characters. The hashed bundled URL (@expo/...) causes @font-face
//   injection to fail on some CDN/Pages hosts. postbuild.js copies the file
//   to dist/fonts/ so this path is always available.
//   KEY: the font-family name MUST be 'ionicons' (lowercase) — that is the
//   exact name createIconSet() passes to Font.loadAsync and uses for rendering.
//   App.tsx gates rendering on useFonts completing, so Font.isLoaded('ionicons')
//   is already true when any icon first mounts.
const fontSources = {
  // Inter — kept for backward compat with screens not yet migrated to Nunito
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Inter_400Regular: require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Inter_500Medium: require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Inter_600SemiBold: require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Inter_700Bold: require('@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf'),
  // Nunito — new design system font
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Nunito_400Regular: require('@expo-google-fonts/nunito/400Regular/Nunito_400Regular.ttf'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Nunito_500Medium: require('@expo-google-fonts/nunito/500Medium/Nunito_500Medium.ttf'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Nunito_600SemiBold: require('@expo-google-fonts/nunito/600SemiBold/Nunito_600SemiBold.ttf'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Nunito_700Bold: require('@expo-google-fonts/nunito/700Bold/Nunito_700Bold.ttf'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Nunito_800ExtraBold: require('@expo-google-fonts/nunito/800ExtraBold/Nunito_800ExtraBold.ttf'),
  // 'ionicons' lowercase — must match createIconSet fontName exactly
  ionicons: { uri: '/fonts/Ionicons.ttf' },
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
