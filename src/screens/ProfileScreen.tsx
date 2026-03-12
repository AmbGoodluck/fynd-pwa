import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import { useGuestStore } from '../store/useGuestStore';
import { usePremiumStore } from '../store/usePremiumStore';

type Props = { navigation: any };

const MENU_ITEMS = [
  { id: 'subscription', label: 'Fynd Plus',           icon: 'star-outline',          screen: 'Subscription' },
  { id: 'account',      label: 'Account & Settings',  icon: 'settings-outline',      screen: 'AccountSettings' },
  { id: 'legal',        label: 'Legal & Privacy',     icon: 'document-text-outline', screen: 'Legal' },
  { id: 'travel',       label: 'Travel Preference',   icon: 'heart-outline',         screen: 'TravelPreference' },
  { id: 'support',      label: 'Support & Feedback',  icon: 'chatbubble-outline',    screen: 'SupportFeedback' },
];

export default function ProfileScreen({ navigation }: Props) {
  const { user, logout: firebaseLogout } = useAuthStore();
  const { isGuest, logout: guestLogout } = useGuestStore();
  const { isPremium } = usePremiumStore();

  const displayName = user?.fullName?.split(' ')[0] || (isGuest ? 'Explorer' : 'Traveller');
  const displayEmail = user?.email || (isGuest ? 'Guest Session' : '');
  const avatarLetter = displayName[0]?.toUpperCase() ?? '?';

  const handleLogout = async () => {
    try { await firebaseLogout(); } catch { /* ignore */ }
    guestLogout();
    navigation.reset({ index: 0, routes: [{ name: 'AuthChoice' }] });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color="#111827" style={{ opacity: 0.6 }} />
          </TouchableOpacity>
        </View>

        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{avatarLetter}</Text>
          </View>
          <Text style={styles.name}>{displayName}</Text>
          {!!displayEmail && <Text style={styles.email}>{displayEmail}</Text>}

          {isPremium && (
            <View style={styles.premiumBadge}>
              <Ionicons name="star" size={11} color="#fff" />
              <Text style={styles.premiumBadgeText}>FyndPlus Explorer</Text>
            </View>
          )}

          {isGuest && !isPremium && (
            <TouchableOpacity style={styles.guestBadge} onPress={() => navigation.navigate('AuthChoice')}>
              <Ionicons name="person-outline" size={11} color="#6B7280" />
              <Text style={styles.guestBadgeText}>Guest · Create account</Text>
              <Ionicons name="chevron-forward" size={11} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.menuSection}>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity key={item.id} style={styles.menuItem} onPress={() => item.screen && navigation.navigate(item.screen)}>
              <View style={styles.menuLeft}>
                <View style={styles.iconWrap}>
                  <Ionicons name={item.icon as any} size={20} color="#22C55E" />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
              </View>
              <View style={styles.menuRight}>
                {item.id === 'subscription' && isPremium && (
                  <View style={styles.activeBadge}><Text style={styles.activeBadgeText}>Active</Text></View>
                )}
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" style={{ marginRight: 8 }} />
            <Text style={styles.logoutBtnText}>{isGuest ? 'Exit Guest Mode' : 'Log Out'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { paddingBottom: 48 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 8 },
  avatarSection: { alignItems: 'center', paddingBottom: 24, paddingTop: 4, gap: 6 },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center', marginBottom: 4, shadowColor: '#22C55E', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 32 },
  name: { fontSize: 18, fontWeight: '600', color: '#111827' },
  email: { fontSize: 13, color: '#6B7280' },
  premiumBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#22C55E', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5 },
  premiumBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  guestBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F2F2F7', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  guestBadgeText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  menuSection: { paddingHorizontal: 14, gap: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 14, borderWidth: 0.5, borderColor: '#E5E5EA', paddingHorizontal: 14, height: 52, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontSize: 15, color: '#111827', fontWeight: '500' },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  activeBadge: { backgroundColor: '#F0FDF4', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  activeBadgeText: { fontSize: 11, color: '#22C55E', fontWeight: '600' },
  logoutSection: { paddingHorizontal: 14, marginTop: 28 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 16, borderWidth: 1.5, borderColor: '#FEE2E2', backgroundColor: '#FFF5F5', height: 52 },
  logoutBtnText: { fontSize: 16, fontWeight: '600', color: '#EF4444' },
});
