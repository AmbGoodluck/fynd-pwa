import { Platform, Alert } from 'react-native';
import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import { createUserDoc } from './database';
import { GOOGLE_WEB_CLIENT_ID } from '../constants/config';

// Lazy native-only import — @react-native-google-signin calls
// TurboModuleRegistry.getEnforcing at module level, which throws on web.
// Importing it conditionally prevents the entire JS bundle from crashing.
function getGoogleSignin() {
  if (Platform.OS === 'web') return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@react-native-google-signin/google-signin').GoogleSignin;
}

// call once during app initialization
export function configureGoogle() {
  const GoogleSignin = getGoogleSignin();
  if (!GoogleSignin) return;
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
  });
}

export async function signInWithGoogle() {
  if (Platform.OS === 'web') {
    alert('Google sign-in is not implemented yet.');
  } else {
    Alert.alert('Not Implemented', 'Google sign-in is not implemented yet.');
  }
  return Promise.reject(new Error('Google sign-in is not implemented with Supabase.'));
}
