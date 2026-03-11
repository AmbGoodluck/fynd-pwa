import React from 'react';
import AppHeader from '../components/AppHeader';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import { useGuestStore } from '../store/useGuestStore';

type Props = { navigation: any };

const MENU_ITEMS = [
  { id: 'subscription', label: 'Fynd Plus', icon: 'star', screen: 'Subscription' },
  { id: 'account', label: 'Account & Settings', icon: 'settings', screen: 'AccountSettings' },
  { id: 'legal', label: 'Legal & Privacy', icon: 'trending-up', screen: 'Legal' },
  { id: 'travel', label: 'Travel Preference', icon: 'heart-outline', screen: 'TravelPreference' },
  { id: 'support', label: 'Support & Feedback', icon: 'person-outline', screen: 'SupportFeedback' },
];

export default function ProfileScreen({ navigation }: Props) {
  const { user } = useAuthStore();
  const { logout } = useGuestStore();
  const firstName = user?.fullName || 'Anika';
  const email = user?.email || 'wvdiv@anika.com';

  const handleLogout = () => {
    logout();
    navigation.reset({ index: 0, routes: [{ name: 'AuthChoice' }] });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Back button */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color="#111827" style={{ opacity: 0.6 }} />
          </TouchableOpacity>
        </View>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{firstName[0].toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{firstName}</Text>
          <Text style={styles.email}>{email}</Text>
        </View>

        {/* Menu */}
        <View style={styles.menuSection}>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => item.screen && navigation.navigate(item.screen)}
            >
              <View style={styles.menuLeft}>
                <View style={styles.iconWrap}>
                  <Ionicons name={item.icon as any} size={20} color="#22C55E" />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#57636C" style={{ opacity: 0.5 }} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" style={{ marginRight: 8 }} />
            <Text style={styles.logoutBtnText}>Log Out</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { paddingBottom: 48 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 0, paddingBottom: 8 },
  avatarSection: { alignItems: 'center', paddingBottom: 24, paddingTop: 0 },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 32 },
  name: { fontSize: 16, fontWeight: '500', color: '#111827', marginBottom: 4 },
  email: { fontSize: 12, fontWeight: '300', color: '#57636C' },
  menuSection: { paddingHorizontal: 14, gap: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 14, borderWidth: 0.5, borderColor: '#E5E5EA', paddingHorizontal: 12, height: 50, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 1, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  menuLeft: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: { opacity: 0.6, marginRight: 10 },
  menuLabel: { fontSize: 16, color: '#111827', opacity: 0.6 },
  logoutSection: { paddingHorizontal: 14, marginTop: 24 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FEE2E2',
    backgroundColor: '#FFF5F5',
    height: 52,
  },
  logoutBtnText: { fontSize: 16, fontWeight: '600', color: '#EF4444' },
});


