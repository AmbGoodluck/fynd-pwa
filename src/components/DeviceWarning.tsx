/**
 * DeviceWarning — shows a non-blocking modal banner when the app is
 * running on a desktop-class screen (width > 1024px, i.e. not a phone
 * or tablet/iPad).  Dismissed permanently for the session on tap.
 */
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { F } from '../theme/fonts';

// iPads (768–1024 wide) and phones (<768) are fine — only warn above 1024.
const DESKTOP_BREAKPOINT = 1024;

function isDesktopScreen(): boolean {
  const { width, height } = Dimensions.get('window');
  // On web/desktop the width will be large. On phone/tablet it stays small.
  return Math.max(width, height) > DESKTOP_BREAKPOINT && Platform.OS === 'web';
}

export default function DeviceWarning() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isDesktopScreen()) {
      setVisible(true);
    }
    // Also respond if the window is resized (web only)
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      const big = Math.max(window.width, window.height) > DESKTOP_BREAKPOINT && Platform.OS === 'web';
      setVisible(big);
    });
    return () => sub.remove();
  }, []);

  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={() => setVisible(false)}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Icon */}
          <View style={styles.iconWrap}>
            <Ionicons name="phone-portrait-outline" size={32} color="#22C55E" />
          </View>

          {/* Title */}
          <Text style={styles.title}>Best on Mobile</Text>

          {/* Message */}
          <Text style={styles.body}>
            Fynd is designed for phones and iPads. You're viewing it on a desktop screen,
            so some layouts may look off.{'\n\n'}
            For the best experience, open Fynd on your mobile device.
          </Text>

          {/* Dismiss */}
          <TouchableOpacity style={styles.btn} onPress={() => setVisible(false)} activeOpacity={0.85}>
            <Text style={styles.btnText}>Got it, continue anyway</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 28,
    maxWidth: 400,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: F.bold,
    color: '#111827',
    marginBottom: 10,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    fontFamily: F.regular,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  btn: {
    backgroundColor: '#22C55E',
    paddingVertical: 13,
    paddingHorizontal: 28,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  btnText: {
    fontSize: 15,
    fontFamily: F.semibold,
    color: '#ffffff',
  },
});
