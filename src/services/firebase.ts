import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported, logEvent as firebaseLogEvent, Analytics } from 'firebase/analytics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureGoogle } from './authService';

const firebaseConfig = {
  apiKey: "AIzaSyBtZk65H1piPxLbSM_RS7Q9-gjogYezWMI",
  authDomain: "fynd-app-42ef4.firebaseapp.com",
  projectId: "fynd-app-42ef4",
  storageBucket: "fynd-app-42ef4.firebasestorage.app",
  messagingSenderId: "52406028380",
  appId: "1:52406028380:web:ac4669fdb019ff9581be99",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let auth: any;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (e) {
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
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;