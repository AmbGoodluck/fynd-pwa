import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Alert, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase } from '../services/supabase';
import { getUserDoc, createUserDoc } from '../services/database';
import { useAuthStore } from '../store/useAuthStore';
import { useGuestStore } from '../store/useGuestStore';

type Props = { navigation: any; route: any };

export default function ResetPasswordScreen({ navigation, route }: Props) {
  const defaultEmail = route?.params?.defaultEmail || '';
  const { login } = useAuthStore();
  const { logout: clearGuest } = useGuestStore();
  
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState(defaultEmail);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Send the OTP code to the user's email
  const handleSendCode = async () => {
    Keyboard.dismiss();

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (resetError) throw resetError;
      
      setStep(2);
      setError('');
    } catch (e: any) {
      console.error('Reset error:', e.message);
      const msg = e.message?.includes('sending recovery email') || e.status === 500
        ? 'There was an issue sending the recovery email. Please try again later.'
        : e.status === 429 
          ? 'Too many attempts. Please wait a moment before trying again.' 
          : 'Could not send reset email. Please check the email address.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify the code and update the password
  const handleVerifyAndReset = async () => {
    Keyboard.dismiss();
    
    if (!code.trim() || !newPassword.trim()) {
      setError('Please enter the code and your new password.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      // 1. Verify OTP code
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: 'recovery',
      });
      if (verifyError) throw verifyError;
      if (!verifyData.user) throw new Error('Verification failed.');

      // 2. Update the password
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) throw updateError;

      // 3. Hydrate state and login (user is automatically signed in after successful recovery)
      const uid = updateData.user.id;
      let userDoc = null;

      try {
        userDoc = await getUserDoc(uid);
        if (!userDoc) {
          const fullName = updateData.user.user_metadata?.full_name || email.trim().split('@')[0];
          await createUserDoc(uid, fullName, updateData.user.email || email.trim());
          userDoc = { fullName, isPremium: false, travelPreferences: [] };
        }
      } catch (dbErr: any) {
        console.warn('Firestore user fetch/create failed, bypassing:', dbErr.message);
        const fullName = updateData.user.user_metadata?.full_name || email.trim().split('@')[0];
        userDoc = { fullName, isPremium: false, travelPreferences: [] };
      }

      clearGuest();
      login({
        id: uid,
        email: updateData.user.email || email.trim(),
        fullName: userDoc?.fullName || updateData.user.user_metadata?.full_name || '',
        isPremium: userDoc?.isPremium || false,
        travelPreferences: userDoc?.travelPreferences || [],
      });
      try {
        await useGuestStore.getState().hydrateSavedPlaces();
      } catch (err: any) {
        console.warn('Hydrate saved places failed:', err.message);
      }

      Alert.alert('Success', 'Your password has been reset successfully.', [
        { text: 'Continue', onPress: () => navigation.replace('MainTabs') }
      ]);

    } catch (e: any) {
      console.error('Verify error:', e.message);
      const msg = e.message?.includes('Token has expired or is invalid')
        ? 'The code you entered is invalid or expired.'
        : 'Could not reset password. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="#111827" />
        </TouchableOpacity>
      </View>
      
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          {step === 1 
            ? 'Enter your email and we will send you a code to reset your password.' 
            : `We sent a code to ${email}. Enter it below along with your new password.`}
        </Text>

        {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

        {step === 1 ? (
          <>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#8E8E93"
                keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
            </View>

            <TouchableOpacity style={styles.actionBtn} onPress={handleSendCode} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>Send Code</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.inputWrap}>
              <Ionicons name="keypad-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="6-digit Code" placeholderTextColor="#8E8E93"
                keyboardType="number-pad" autoCapitalize="none" value={code} onChangeText={setCode} />
            </View>

            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="New Password" placeholderTextColor="#8E8E93"
                secureTextEntry={!showPassword} value={newPassword} onChangeText={setNewPassword} />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.actionBtn} onPress={handleVerifyAndReset} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>Reset & Log In</Text>}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  topBar: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8 },
  backBtn: { padding: 4 },
  content: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 8, alignSelf: 'flex-start' },
  subtitle: { fontSize: 15, color: '#57636C', marginBottom: 28, alignSelf: 'flex-start', lineHeight: 22 },
  errorBox: { width: '100%', backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, marginBottom: 16 },
  errorText: { color: '#EF4444', fontSize: 13, textAlign: 'center' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', width: '100%', backgroundColor: '#F2F2F7', borderRadius: 14, paddingHorizontal: 14, height: 50, marginBottom: 12 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#111827' },
  actionBtn: { width: '100%', backgroundColor: '#22C55E', borderRadius: 16, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});