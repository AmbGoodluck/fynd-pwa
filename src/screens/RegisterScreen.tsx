import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { createUserDoc } from '../services/database';
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
      // Step 1: Create Supabase auth user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName.trim() } },
      });
      if (signUpError) throw signUpError;
      if (!data.user) throw new Error('Sign-up failed — no user returned.');

      const uid = data.user.id;

      // Step 2: Create Firestore user + subscription docs
      await createUserDoc(uid, fullName.trim(), email.trim());

      // Step 3: Update auth store and navigate
      clearGuest();
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
      console.error('Register error:', e.message);
      const msg = e.message?.includes('already registered') || e.message?.includes('already in use')
        ? 'This email is already registered. Try logging in.'
        : e.message?.includes('invalid') || e.message?.includes('email')
          ? 'Please enter a valid email address.'
          : e.message?.includes('Password') || e.message?.includes('password')
            ? 'Password must be at least 6 characters.'
            : e.message?.includes('Network') || e.status === 0
              ? 'Network error. Check your connection and try again.'
              : 'Registration failed. Please try again.';
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
