import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported, logEvent as firebaseLogEvent, Analytics } from 'firebase/analytics';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureGoogle } from './authService';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Validate required config is present at startup
const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'appId'] as const;
const missingKeys = requiredKeys.filter(k => !firebaseConfig[k]);
if (missingKeys.length > 0) {
  console.error('[Firebase] Missing config keys:', missingKeys.join(', '), '— check EXPO_PUBLIC_FIREBASE_* env vars.');
}

let auth: any;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (e) {
  // initializeAuth throws if already initialized — getAuth returns existing instance
  auth = getAuth(app);
}

try { configureGoogle(); } catch (e) { /* ignore */ }

// Analytics — only available in native builds, not Expo Go
let analytics: Analytics | null = null;
isSupported().then((supported) => {
  if (supported) analytics = getAnalytics(app);
}).catch(() => {});

// Helper — safe to call anywhere, silently no-ops in Expo Go
export function logEvent(event: string, params?: Record<string, any>) {
  if (analytics) firebaseLogEvent(analytics, event, params);
}

export { auth };

// Enable offline persistence on web via IndexedDB.
// initializeFirestore must be called before any getFirestore() call on the
// same app instance — the try/catch handles the "already initialized" case.
let db: ReturnType<typeof getFirestore>;
try {
  db = Platform.OS === 'web'
    ? initializeFirestore(app, { localCache: persistentLocalCache() })
    : getFirestore(app);
} catch {
  db = getFirestore(app);
}
export { db };

export const storage = getStorage(app);
export default app;