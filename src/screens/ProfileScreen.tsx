import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';

type Props = { navigation: any };

const MENU_ITEMS = [
  { id: 'subscription', label: 'Fynd Plus', icon: 'star', screen: 'Subscription' },
  { id: 'account', label: 'Account & Setting', icon: 'settings', screen: 'AccountSettings' },
  { id: 'legal', label: 'Legal & Privacy', icon: 'trending-up', screen: null },
  { id: 'travel', label: 'Travel Preference', icon: 'heart-outline', screen: 'VibeSelection' },
  { id: 'support', label: 'Support & Feedback', icon: 'person-outline', screen: null },
];

export default function ProfileScreen({ navigation }: Props) {
  const { user } = useAuthStore();
  const firstName = user?.fullName || 'Anika';
  const email = user?.email || 'wvdiv@anika.com';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{firstName[0].toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{firstName}</Text>
          <Text style={styles.email}>{email}</Text>
        </View>

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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { paddingTop: 40, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', paddingBottom: 20 },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 32 },
  name: { fontSize: 16, fontWeight: '500', color: '#111827', marginBottom: 4 },
  email: { fontSize: 12, fontWeight: '300', color: '#57636C' },
  menuSection: { paddingHorizontal: 14, gap: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 14, borderWidth: 0.5, borderColor: '#E5E5EA', paddingHorizontal: 12, height: 50, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 1, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  menuLeft: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: { opacity: 0.6, marginRight: 10 },
  menuLabel: { fontSize: 16, color: '#111827', opacity: 0.6 },
});
