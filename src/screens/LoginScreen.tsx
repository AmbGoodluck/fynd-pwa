import React, { useState } from 'react';
import {
  View, Text, Image, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../services/firebase';

const { width, height } = Dimensions.get('window');
type Props = { navigation: any };

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('All fields are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigation.replace('MainTabs');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Enter your email first');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setError('Password reset email sent!');
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('Google Sign-In will be available in the full build. Please use email/password for now.');
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Image source={require('../../assets/logo-icon.png')} style={styles.logo} />
        <Text style={styles.title}>Welcome to Fynd</Text>
        <Text style={styles.subtitle}>Let s make every travel counts</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={18} color="#8E8E93" style={styles.icon} />
          <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#8E8E93" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={18} color="#8E8E93" style={styles.icon} />
          <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#8E8E93" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoCapitalize="none" />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={18} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity onPress={handleForgotPassword}>
          <Text style={styles.forgot}>Forgot Password ?</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleLogin} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Logging in...' : 'Log In'}</Text>
        </TouchableOpacity>

        <Text style={styles.or}>or</Text>

        <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleSignIn}>
          <Ionicons name="logo-google" size={20} color="#111827" style={{ marginRight: 10 }} />
          <Text style={styles.googleText}>Continue with Google</Text>
        </TouchableOpacity>

        <View style={styles.bottomRow}>
          <Text style={styles.bottomText}>Don t have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.link}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#fff' },
  header: { width, height: height * 0.47, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingTop: 150 },
  logo: { width: 188, height: 106, resizeMode: 'contain', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '500', color: '#111827', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 16, color: '#3C3C43', textAlign: 'center', marginBottom: 40 },
  form: { alignItems: 'center', paddingBottom: 32 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', width: 320, backgroundColor: '#F2F2F7', borderRadius: 14, borderWidth: 1, borderColor: '#E5E5EA', paddingHorizontal: 14, marginVertical: 8, height: 50 },
  icon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#111827', height: 50 },
  error: { color: '#EF4444', fontSize: 13, marginBottom: 4, width: 320 },
  forgot: { color: '#3C3C43', fontSize: 14, textAlign: 'right', width: 320, marginBottom: 8, marginTop: 2 },
  button: { width: 320, height: 50, backgroundColor: '#22C55E', borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginVertical: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  or: { color: '#3C3C43', fontSize: 14, marginVertical: 8 },
  googleBtn: { flexDirection: 'row', alignItems: 'center', width: 320, height: 50, backgroundColor: '#F2F2F7', borderRadius: 14, paddingHorizontal: 14, marginVertical: 8 },
  googleText: { color: '#8E8E93', fontSize: 15 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  bottomText: { color: '#3C3C43', fontSize: 14 },
  link: { color: '#22C55E', fontSize: 14, fontWeight: '600' },
});
