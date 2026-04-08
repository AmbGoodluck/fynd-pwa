import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../services/firebase';
import { getUserDoc } from '../services/database';
import { useAuthStore } from '../store/useAuthStore';
import { useGuestStore } from '../store/useGuestStore';

type Props = { navigation: any };

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuthStore();
  const { logout: clearGuest } = useGuestStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      let userDoc = await getUserDoc(cred.user.uid);
      // Lazy create user doc if missing
      if (!userDoc) {
        await setDoc(doc(db, 'users', cred.user.uid), {
          id: cred.user.uid,
          email: cred.user.email || '',
          fullName: cred.user.displayName || '',
          profilePhoto: null,
          createdAt: new Date(),
          homeCity: '',
          travelStyle: [],
          isPremium: false,
        });
        userDoc = await getUserDoc(cred.user.uid);
      }
      clearGuest(); // ensure guest state is cleared on sign-in
      login({
        id: cred.user.uid,
        email: cred.user.email || '',
        fullName: userDoc?.fullName || cred.user.displayName || '',
        isPremium: userDoc?.isPremium || false,
        travelPreferences: userDoc?.travelPreferences || [],
      });
      await useGuestStore.getState().hydrateSavedPlaces();
      navigation.replace('MainTabs');
    } catch (e: any) {
      const isBlocked = e.code?.includes('blocked') || e.message?.includes('blocked') || e.message?.includes('403');
      const msg = e.code === 'auth/invalid-credential' ? 'Incorrect email or password.' :
                  e.code === 'auth/user-not-found' ? 'No account found with this email.' :
                  e.code === 'auth/wrong-password' ? 'Incorrect email or password.' :
                  e.code === 'auth/too-many-requests' ? 'Too many attempts. Please try again later.' :
                  e.code === 'auth/network-request-failed' ? 'Network error. Check your connection and try again.' :
                  isBlocked ? 'Login is temporarily unavailable. Please try again later.' :
                  'Login failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) { setError('Enter your email above first.'); return; }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setError('Password reset email sent! Check your inbox.');
    } catch {
      setError('Could not send reset email. Check your email address.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Image source={require('../../assets/logo-icon.png')} style={styles.logo} />
      <Text style={styles.title}>Welcome to Fynd</Text>
      <Text style={styles.subtitle}>Let us make every travel count</Text>

      {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

      <View style={styles.inputWrap}>
        <Ionicons name="mail-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#8E8E93"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
      </View>

      <View style={styles.inputWrap}>
        <Ionicons name="lock-closed-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#8E8E93"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#8E8E93" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotWrap}>
        <Text style={styles.forgotText}>Forgot Password?</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>Log In</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.registerWrap}>
        <Text style={styles.registerText}>Don't have an account? <Text style={styles.registerLink}>Sign up</Text></Text>
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
  forgotWrap: { alignSelf: 'flex-end', marginBottom: 20 },
  forgotText: { fontSize: 13, color: '#22C55E', fontWeight: '500' },
  loginBtn: { width: '100%', backgroundColor: '#22C55E', borderRadius: 16, height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  registerWrap: { marginTop: 8 },
  registerText: { fontSize: 14, color: '#57636C' },
  registerLink: { color: '#22C55E', fontWeight: '600' },
});
