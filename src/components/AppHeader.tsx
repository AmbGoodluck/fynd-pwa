import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';

type Props = {
  navigation: any;
  title?: string;
  showBack?: boolean;
  showLogo?: boolean;
  showAvatar?: boolean;
};

export default function AppHeader({ navigation, title, showBack = false, showLogo = false, showAvatar = false }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const firstName = user?.fullName?.split(' ')[0] || 'U';

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.side}>
        {showBack && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={26} color="#111827" style={{ opacity: 0.7 }} />
          </TouchableOpacity>
        )}
        {showLogo && (
          <Image source={require('../../assets/logo-icon.png')} style={styles.logo} />
        )}
      </View>
      <View style={styles.center}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
      </View>
      <View style={[styles.side, { alignItems: 'flex-end' }]}>
        {showAvatar && (
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{firstName[0].toUpperCase()}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 10,
    backgroundColor: '#fff',
  },
  side: { width: 50, justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '600', color: '#111827' },
  iconBtn: { padding: 2 },
  logo: { width: 55, height: 50, resizeMode: 'contain' },
  avatarCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
