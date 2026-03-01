import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';

type Props = { navigation: any };

export default function AccountSettingsScreen({ navigation }: Props) {
  const { user } = useAuthStore();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [reenterPassword, setReenterPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showReenter, setShowReenter] = useState(false);

  const name = user?.fullName || 'Anika';
  const email = user?.email || 'wvdiv@anika.com';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={28} color="#111827" style={{ opacity: 0.6 }} />
        </TouchableOpacity>

        <Text style={styles.name}>{name}</Text>
        <Text style={styles.email}>{email}</Text>

        <View style={styles.card}>
          <TouchableOpacity style={styles.menuRow}>
            <View style={styles.menuLeft}>
              <Ionicons name="star" size={20} color="#22C55E" style={styles.menuIcon} />
              <Text style={styles.menuLabel}>Account  & Security</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#57636C" style={{ opacity: 0.5 }} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuRow} onPress={() => { setChangePasswordOpen(false); setDeleteAccountOpen(false); }}>
            <View style={styles.menuLeft}>
              <Ionicons name="lock-closed" size={20} color="#22C55E" style={styles.menuIcon} />
              <Text style={styles.menuLabel}>Change Password</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#57636C" style={{ opacity: 0.5 }} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate('DeleteAccount')}>
            <View style={styles.menuLeft}>
              <Ionicons name="lock-closed" size={20} color="#22C55E" style={styles.menuIcon} />
              <Text style={styles.menuLabel}>Delete Account</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#57636C" style={{ opacity: 0.5 }} />
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <TouchableOpacity style={styles.menuRow} onPress={() => setChangePasswordOpen(!changePasswordOpen)}>
            <View style={styles.menuLeft}>
              <Ionicons name="star" size={20} color="#22C55E" style={styles.menuIcon} />
              <Text style={styles.menuLabel}>Change Password</Text>
            </View>
            <Ionicons name={changePasswordOpen ? 'chevron-up' : 'chevron-down'} size={28} color="#57636C" style={{ opacity: 0.5 }} />
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

              <TouchableOpacity style={styles.changeBtn}>
                <Text style={styles.changeBtnText}>Change Password</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {deleteAccountOpen && (
          <View style={styles.card}>
            <TouchableOpacity style={styles.menuRow} onPress={() => setDeleteAccountOpen(false)}>
              <View style={styles.menuLeft}>
                <Ionicons name="star" size={20} color="#22C55E" style={styles.menuIcon} />
                <Text style={styles.menuLabel}>Delete Account</Text>
              </View>
              <Ionicons name="chevron-down" size={28} color="#57636C" style={{ opacity: 0.5 }} />
            </TouchableOpacity>
            <View style={styles.divider} />
            <View style={styles.deleteBox}>
              <Text style={styles.deleteText}>Deleting your account could erase all data from Fynd, including saved places, itineraries, etc.</Text>
              <View style={styles.deleteActions}>
                <TouchableOpacity style={styles.pauseBtn}>
                  <Text style={styles.pauseBtnText}>Pause Instead</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn}>
                  <Text style={styles.deleteBtnText}>Continue with delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { paddingBottom: 40, paddingTop: 60 },
  back: { padding: 10 },
  name: { fontSize: 16, fontWeight: '500', color: '#111827', textAlign: 'center', marginBottom: 4 },
  email: { fontSize: 12, fontWeight: '300', color: '#57636C', textAlign: 'center', marginBottom: 20 },
  card: { marginHorizontal: 14, marginBottom: 12, borderRadius: 14, borderWidth: 0.5, borderColor: '#E5E5EA', backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 1, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  menuRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, height: 50 },
  menuLeft: { flexDirection: 'row', alignItems: 'center' },
  menuIcon: { opacity: 0.6, marginRight: 8 },
  menuLabel: { fontSize: 15, color: '#111827', opacity: 0.6 },
  divider: { height: 1, backgroundColor: '#F2F2F7', marginHorizontal: 8 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F2F7', borderRadius: 14, borderWidth: 1, borderColor: '#E5E5EA', marginHorizontal: 14, marginVertical: 6, paddingHorizontal: 12, height: 46 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 14, color: '#111827' },
  changeBtn: { backgroundColor: '#22C55E', borderRadius: 16, height: 40, alignItems: 'center', justifyContent: 'center', marginHorizontal: 40, marginVertical: 10 },
  changeBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  deleteBox: { padding: 14 },
  deleteText: { fontSize: 13, color: '#57636C', textAlign: 'center', marginBottom: 16, lineHeight: 20 },
  deleteActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  pauseBtn: { flex: 1, backgroundColor: '#22C55E', borderRadius: 20, height: 38, alignItems: 'center', justifyContent: 'center' },
  pauseBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  deleteBtn: { flex: 1, backgroundColor: '#111827', borderRadius: 20, height: 38, alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { color: '#fff', fontSize: 13, fontWeight: '500' },
});
