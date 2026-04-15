import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Image, Keyboard } from 'react-native';
import { COLORS } from '../theme/tokens';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase } from '../services/supabase';
import { getUserDoc, createUserDoc } from '../services/database';
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
  const [info, setInfo] = useState('');
  const [showResend, setShowResend] = useState(false);

  const handleResendConfirmation = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    setInfo('');
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
      });
      if (resendError) throw resendError;
      setInfo('Confirmation email resent. Please check your inbox.');
    } catch (e: any) {
      console.error('Resend error:', e.message);
      setError('Failed to resend confirmation email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    Keyboard.dismiss();
    
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError('');
    setInfo('');
    setShowResend(false);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;
      if (!data.user) throw new Error('Login failed — no user returned.');

      const uid = data.user.id;
      let userDoc = null;

      try {
        userDoc = await getUserDoc(uid);
        if (!userDoc) {
          const fullName = data.user.user_metadata?.full_name || email.trim().split('@')[0];
          await createUserDoc(uid, fullName, data.user.email || email.trim());
          userDoc = { fullName, isPremium: false, travelPreferences: [] };
        }
      } catch (dbErr: any) {
        console.warn('Firestore user fetch/create failed, bypassing:', dbErr.message);
        const fullName = data.user.user_metadata?.full_name || email.trim().split('@')[0];
        userDoc = { fullName, isPremium: false, travelPreferences: [] };
      }

      clearGuest();
      login({
        id: uid,
        email: data.user.email || email.trim(),
        fullName: userDoc?.fullName || data.user.user_metadata?.full_name || '',
        isPremium: userDoc?.isPremium || false,
        travelPreferences: userDoc?.travelPreferences || [],
      });
      try {
        await useGuestStore.getState().hydrateSavedPlaces();
      } catch (err: any) {
        console.warn('Hydrate saved places failed:', err.message);
      }
      navigation.replace('MainTabs');
    } catch (e: any) {
      console.error('Login error:', e.message);
      const isInvalidCreds = e.message?.includes('Invalid login credentials') || e.message?.includes('invalid_grant');
      const msg = isInvalidCreds
        ? 'Incorrect email or password.'
        : e.message?.includes('Email not confirmed')
          ? 'Please confirm your email address first.'
          : e.message?.includes('too many') || e.status === 429
            ? 'Too many attempts. Please try again later.'
            : e.message?.includes('Network') || e.status === 0
              ? 'Network error. Check your connection and try again.'
              : 'Login failed. Please try again.';
      setError(msg);
      
      if (e.message?.includes('Email not confirmed')) {
        setShowResend(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    Keyboard.dismiss();
    navigation.navigate('ResetPassword', { defaultEmail: email.trim() });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Image source={require('../../assets/logo-icon.png')} style={styles.logo} />
      <Text style={styles.title}>Welcome to Fynd</Text>
      <Text style={styles.subtitle}>Let us make every travel count</Text>

      {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
      {info ? <View style={styles.infoBox}><Text style={styles.infoText}>{info}</Text></View> : null}

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

      {showResend && (
        <TouchableOpacity style={styles.resendBtn} onPress={handleResendConfirmation} disabled={loading}>
          <Text style={styles.resendBtnText}>Resend Confirmation Email</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.registerWrap}>
        <Text style={styles.registerText}>Don't have an account? <Text style={styles.registerLink}>Sign up</Text></Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 80, paddingBottom: 40 },
  logo: { width: 80, height: 80, resizeMode: 'contain', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text.primary, marginBottom: 6 },
  subtitle: { fontSize: 15, color: COLORS.text.secondary, marginBottom: 28 },
  errorBox: { width: '100%', backgroundColor: COLORS.accent.dangerLight, borderRadius: 12, padding: 12, marginBottom: 12 },
  errorText: { color: COLORS.accent.danger, fontSize: 13, textAlign: 'center' },
  infoBox: { width: '100%', backgroundColor: COLORS.accent.sageLight, borderRadius: 12, padding: 12, marginBottom: 12 },
  infoText: { color: COLORS.accent.sage, fontSize: 13, textAlign: 'center' },
  resendBtn: { marginBottom: 16 },
  resendBtnText: { color: COLORS.accent.primary, fontWeight: '600', fontSize: 14, textAlign: 'center' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', width: '100%', backgroundColor: COLORS.surface, borderRadius: 14, paddingHorizontal: 14, height: 50, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border.light },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: COLORS.text.primary },
  forgotWrap: { alignSelf: 'flex-end', marginBottom: 20 },
  forgotText: { fontSize: 13, color: COLORS.accent.primary, fontWeight: '500' },
  loginBtn: { width: '100%', backgroundColor: COLORS.accent.primary, borderRadius: 16, height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  loginBtnText: { color: COLORS.text.inverse, fontSize: 16, fontWeight: '700' },
  registerWrap: { marginTop: 8 },
  registerText: { fontSize: 14, color: COLORS.text.secondary },
  registerLink: { color: COLORS.accent.primary, fontWeight: '600' },
});
