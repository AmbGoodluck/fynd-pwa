import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { useGuestStore } from '../store/useGuestStore';

type Props = { navigation: any };

export default function RegisterScreen({ navigation }: Props) {
  const { login } = useAuthStore();
  const { logout: clearGuest } = useGuestStore();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields.'); return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.'); return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.'); return;
    }
    setLoading(true);
    setError('');
    try {
      // Step 1: Create Firebase Auth user
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const uid = cred.user.uid;
      // Ensure auth token is refreshed before Firestore writes
      await cred.user.getIdToken(true);

      // Step 2: Create user doc in Firestore (with retry)
      let userDocError = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          await setDoc(doc(db, 'users', uid), {
            id: uid,
            email: email.trim(),
            fullName: fullName.trim(),
            profilePhoto: null,
            createdAt: serverTimestamp(),
            homeCity: '',
            travelStyle: [],
            isPremium: false,
          });
          await setDoc(doc(db, 'subscriptions', uid), {
            userId: uid,
            isPremium: false,
            plan: 'free',
            status: 'active',
            stripeCustomerId: null,
            stripeSubscriptionId: null,
            currentPeriodEnd: null,
            tripsUsedThisMonth: 0,
            itinerariesGenerated: 0,
            savedPlacesCount: 0,
            tripLimit: 3,
            itineraryLimit: 1,
            savedPlacesLimit: 5,
            placesPerTripLimit: 5,
          });
          userDocError = null;
          break;
        } catch (err) {
          userDocError = err;
          if (attempt === 0) await new Promise(res => setTimeout(res, 1000));
        }
      }
      if (userDocError) {
        setError('Account created but setup failed. Please close the app and sign in again.');
        return;
      }

      // Step 4: Update auth store and navigate
      clearGuest(); // ensure guest state is cleared on registration
      login({
        id: uid,
        email: email.trim(),
        fullName: fullName.trim(),
        isPremium: false,
        travelPreferences: [],
      });
      await useGuestStore.getState().hydrateSavedPlaces();

      navigation.replace('MainTabs');

    } catch (e: any) {
      console.error('Register error:', e.code, e.message);
      const isBlocked = e.code?.includes('blocked') || e.message?.includes('blocked') || e.message?.includes('403');
      const msg = e.code === 'auth/email-already-in-use' ? 'This email is already registered. Try logging in.' :
                  e.code === 'auth/invalid-email' ? 'Please enter a valid email address.' :
                  e.code === 'auth/weak-password' ? 'Password must be at least 6 characters.' :
                  e.code === 'auth/network-request-failed' ? 'Network error. Check your connection and try again.' :
                  isBlocked ? 'Sign-up is temporarily unavailable. Please try again later.' :
                  'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Image source={require('../../assets/logo-icon.png')} style={styles.logo} />
      <Text style={styles.title}>Welcome to Fynd</Text>
      <Text style={styles.subtitle}>Let us make every travel count</Text>

      {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

      <View style={styles.inputWrap}>
        <Ionicons name="person-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
        <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor="#8E8E93"
          value={fullName} onChangeText={setFullName} />
      </View>

      <View style={styles.inputWrap}>
        <Ionicons name="mail-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
        <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#8E8E93"
          keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
      </View>

      <View style={styles.inputWrap}>
        <Ionicons name="lock-closed-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
        <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#8E8E93"
          secureTextEntry={!showPassword} value={password} onChangeText={setPassword} />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#8E8E93" />
        </TouchableOpacity>
      </View>

      <View style={styles.inputWrap}>
        <Ionicons name="lock-closed-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
        <TextInput style={styles.input} placeholder="Confirm Password" placeholderTextColor="#8E8E93"
          secureTextEntry={!showConfirm} value={confirmPassword} onChangeText={setConfirmPassword} />
        <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
          <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color="#8E8E93" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.registerBtn} onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.registerBtnText}>Create Account</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.loginWrap}>
        <Text style={styles.loginText}>Already have an account? <Text style={styles.loginLink}>Log in</Text></Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 80, paddingBottom: 40 },
  logo: { width: 80, height: 80, resizeMode: 'contain', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 6 },
  subtitle: { fontSize: 15, color: '#57636C', marginBottom: 28 },
  errorBox: { width: '100%', backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, marginBottom: 12 },
  errorText: { color: '#EF4444', fontSize: 13, textAlign: 'center' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', width: '100%', backgroundColor: '#F2F2F7', borderRadius: 14, paddingHorizontal: 14, height: 50, marginBottom: 12 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#111827' },
  registerBtn: { width: '100%', backgroundColor: '#22C55E', borderRadius: 16, height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 16, marginTop: 8 },
  registerBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  loginWrap: { marginTop: 8 },
  loginText: { fontSize: 14, color: '#57636C' },
  loginLink: { color: '#22C55E', fontWeight: '600' },
});
