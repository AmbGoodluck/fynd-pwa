import { Platform } from 'react-native';
import { auth, db } from './firebase';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
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
  const GoogleSignin = getGoogleSignin();
  if (!GoogleSignin) throw new Error('Google Sign-In is not available on web');
  // ensure play services (android) / config
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  // signIn returns a platform-specific response; typing is loose so cast to any
  const res: any = await GoogleSignin.signIn();
  const { idToken, user } = res;
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, credential);
  const uid = result.user.uid;

  // ...existing code...
  return { uid };
}
