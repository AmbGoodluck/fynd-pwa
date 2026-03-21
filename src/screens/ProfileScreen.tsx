import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import { useGuestStore } from '../store/useGuestStore';
import { usePremiumStore } from '../store/usePremiumStore';
import { useTripStore } from '../store/useTripStore';
import { useTempItineraryStore } from '../store/useTempItineraryStore';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

import { F } from '../theme/fonts';

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
  const tabBarHeight = useBottomTabBarHeight();

  const displayName = user?.fullName?.split(' ')[0] || (isGuest ? 'Explorer' : 'Traveller');
  const displayEmail = user?.email || (isGuest ? 'Guest Session' : '');
  const avatarLetter = displayName[0]?.toUpperCase() ?? '?';

  const handleLogout = async () => {
    try { await firebaseLogout(); } catch { /* ignore */ }
    guestLogout();


    useTripStore.getState().reset();
    useTempItineraryStore.getState().clear();
    navigation.reset({ index: 0, routes: [{ name: 'AuthChoice' }] });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color="#111827" />
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
  scroll: { paddingBottom: 120 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  avatarSection: { alignItems: 'center', paddingBottom: 32, paddingTop: 8, gap: 8 },
  avatarCircle: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center',
    marginBottom: 8, shadowColor: '#22C55E', shadowOpacity: 0.25,
    shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 5,
  },
  avatarText: { color: '#fff', fontFamily: F.bold, fontSize: 36 },
  name: { fontSize: 22, fontFamily: F.bold, color: '#111827', letterSpacing: -0.5 },
  email: { fontSize: 14, color: '#6B7280', fontFamily: F.medium },
  premiumBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#22C55E', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 6,
  },
  premiumBadgeText: { color: '#fff', fontSize: 13, fontFamily: F.bold, letterSpacing: 0.3 },
  guestBadge: { 
    flexDirection: 'row', alignItems: 'center', gap: 6, 
    backgroundColor: '#F3F4F6', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8 
  },
  guestBadgeText: { fontSize: 13, color: '#4B5563', fontFamily: F.semibold },
  menuSection: { paddingHorizontal: 16, gap: 12 },
  menuItem: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    backgroundColor: '#fff', borderRadius: 18, 
    borderWidth: 1, borderColor: '#F2F2F7', 
    paddingHorizontal: 16, height: 60,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontSize: 16, color: '#111827', fontFamily: F.semibold },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activeBadge: { backgroundColor: '#F0FDF4', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  activeBadgeText: { fontSize: 12, color: '#22C55E', fontFamily: F.bold },
  logoutSection: { paddingHorizontal: 16, marginTop: 32 },
  logoutBtn: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', 
    borderRadius: 18, borderWidth: 1.5, borderColor: '#FEE2E2', 
    backgroundColor: '#FFF5F5', height: 56 
  },
  logoutBtnText: { fontSize: 16, fontFamily: F.bold, color: '#EF4444' },

});
