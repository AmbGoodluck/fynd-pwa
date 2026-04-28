import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../services/supabase';
import { COLORS } from '../theme/tokens';

type Props = { navigation: any };

export default function AccountSettingsScreen({ navigation }: Props) {
  const { user } = useAuthStore();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [reenterPassword, setReenterPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showReenter, setShowReenter] = useState(false);

  const [changingPassword, setChangingPassword] = useState(false);

  const name = user?.fullName || '';
  const email = user?.email || '';

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !reenterPassword) {
      Alert.alert('Error', 'Please fill in all password fields.');
      return;
    }
    if (newPassword !== reenterPassword) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters.');
      return;
    }
    if (!email) {
      Alert.alert('Error', 'No email found. Please log in again.');
      return;
    }
    setChangingPassword(true);
    try {
      // Re-authenticate with old password to verify it
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: oldPassword });
      if (signInError) throw new Error('Current password is incorrect.');

      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      Alert.alert('Success', 'Your password has been updated.');
      setOldPassword('');
      setNewPassword('');
      setReenterPassword('');
      setChangePasswordOpen(false);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update password. Please try again.');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Top bar with back arrow */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color="#111827" style={{ opacity: 0.6 }} />
          </TouchableOpacity>
          <View style={{ width: 28 }} />
        </View>

        {/* User info */}
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.email}>{email}</Text>

        {/* Header label  NOT in card, NOT clickable */}
        <Text style={styles.sectionHeader}>Account & Security</Text>

        {/* Card  only Change Password and Delete Account */}
        <View style={styles.card}>
          <TouchableOpacity style={styles.menuRow} onPress={() => setChangePasswordOpen(!changePasswordOpen)}>
            <View style={styles.menuLeft}>
              <Ionicons name="lock-closed" size={20} color={COLORS.accent.primary} style={styles.menuIcon} />
              <Text style={styles.menuLabel}>Change Password</Text>
            </View>
            <Ionicons name={changePasswordOpen ? 'chevron-up' : 'chevron-down'} size={20} color="#57636C" style={{ opacity: 0.5 }} />
          </TouchableOpacity>

          {changePasswordOpen && (
            <>
              <View style={styles.divider} />
              <View style={styles.inputWrap}>
                <Ionicons name="lock-open-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Old Password"
                  placeholderTextColor="#8E8E93"
                  secureTextEntry={!showOld}
                  value={oldPassword}
                  onChangeText={setOldPassword}
                />
                <TouchableOpacity onPress={() => setShowOld(!showOld)}>
                  <Ionicons name={showOld ? 'eye-off-outline' : 'eye-outline'} size={18} color="#8E8E93" />
                </TouchableOpacity>
              </View>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="New Password"
                  placeholderTextColor="#8E8E93"
                  secureTextEntry={!showNew}
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
                <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                  <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={18} color="#8E8E93" />
                </TouchableOpacity>
              </View>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Reenter New Password"
                  placeholderTextColor="#8E8E93"
                  secureTextEntry={!showReenter}
                  value={reenterPassword}
                  onChangeText={setReenterPassword}
                />
                <TouchableOpacity onPress={() => setShowReenter(!showReenter)}>
                  <Ionicons name={showReenter ? 'eye-off-outline' : 'eye-outline'} size={18} color="#8E8E93" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.changeBtn, changingPassword && { opacity: 0.6 }]}
                onPress={handleChangePassword}
                disabled={changingPassword}
              >
                <Text style={styles.changeBtnText}>
                  {changingPassword ? 'Updating…' : 'Change Password'}
                </Text>
              </TouchableOpacity>
            </>
          )}

          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate('DeleteAccount')}>
            <View style={styles.menuLeft}>
              <Ionicons name="trash-outline" size={20} color="#EF4444" style={styles.menuIcon} />
              <Text style={[styles.menuLabel, { color: '#EF4444', opacity: 1 }]}>Delete Account</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#57636C" style={{ opacity: 0.5 }} />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: 40 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 0, paddingBottom: 8 },
  name: { fontSize: 16, fontWeight: '500', color: '#111827', textAlign: 'center', marginBottom: 4 },
  email: { fontSize: 12, fontWeight: '300', color: '#57636C', textAlign: 'center', marginBottom: 20 },
  sectionHeader: { fontSize: 13, fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 20, marginBottom: 8 },
  card: { marginHorizontal: 14, marginBottom: 12, borderRadius: 14, borderWidth: 0.5, borderColor: '#E5E5EA', backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 1, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  menuRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, height: 50 },
  menuLeft: { flexDirection: 'row', alignItems: 'center' },
  menuIcon: { opacity: 0.8, marginRight: 10 },
  menuLabel: { fontSize: 15, color: '#111827', opacity: 0.7 },
  divider: { height: 1, backgroundColor: '#F2F2F7' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F2F7', borderRadius: 14, borderWidth: 1, borderColor: '#E5E5EA', marginHorizontal: 14, marginVertical: 6, paddingHorizontal: 12, height: 46 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 14, color: '#111827' },
  changeBtn: { backgroundColor: COLORS.accent.primary, borderRadius: 16, height: 40, alignItems: 'center', justifyContent: 'center', marginHorizontal: 40, marginVertical: 10 },
  changeBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
