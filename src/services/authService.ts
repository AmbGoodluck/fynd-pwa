import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { auth, db } from './firebase';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { createUserDoc } from './database';
import { GOOGLE_WEB_CLIENT_ID } from '../constants/config';

// call once during app initialization
export function configureGoogle() {
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
  });
}

export async function signInWithGoogle() {
  // ensure play services (android) / config
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  // signIn returns a platform-specific response; typing is loose so cast to any
  const res: any = await GoogleSignin.signIn();
  const { idToken, user } = res;
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, credential);
  const uid = result.user.uid;

  // if user doc doesn't exist yet, create it
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    await createUserDoc(uid, user.name || '', user.email || '');
  }

  // fetch again
  const finalSnap = await getDoc(userRef);
  return { uid, doc: finalSnap.data() };
}
