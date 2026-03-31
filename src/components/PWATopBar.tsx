// ─── PWA Top Bar ──────────────────────────────────────────────────────────────
// Persistent top navigation bar for the PWA web build.
// Renders null on native platforms (which use screen-level AppHeaders).
//
// Contains: Logo (left), Shared Trips icon + Profile icon (right).
// Respects env(safe-area-inset-top) for notch/island devices.
// All touch targets meet the 48px minimum.

import React from 'react';
import {
  View, TouchableOpacity, StyleSheet, Platform, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LOGO_SIZE } from '../theme/sizes';
import NotificationBell from './notifications/NotificationBell';

interface Props {
  onSharedTripsPress: () => void;
  onProfilePress: () => void;
  onNotificationsPress: () => void;
}

export default function PWATopBar({ onSharedTripsPress, onProfilePress, onNotificationsPress }: Props) {
  if (Platform.OS !== 'web') return null;

  return (
    <View style={styles.bar}>
      {/* Logo mark */}
      <Image
        source={require('../../assets/logo-icon.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      {/* Right actions */}
      <View style={styles.actions}>
        <NotificationBell onPress={onNotificationsPress} />

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onSharedTripsPress}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Shared Trips"
          accessibilityRole="button"
        >
          <Ionicons name="people-outline" size={22} color="#374151" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onProfilePress}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Profile"
          accessibilityRole="button"
        >
          <Ionicons name="person-circle-outline" size={24} color="#374151" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    // 48px bar height + safe area top
    height: 52,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    // Pad for device notch/status bar via CSS env()
    // RN doesn't natively read env() but SafeAreaContext does; web uses CSS var
    ...(Platform.OS === 'web'
      ? ({ paddingTop: 'env(safe-area-inset-top, 0px)' } as any)
      : {}),
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  // Minimum 48x48 touch target
  iconBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
