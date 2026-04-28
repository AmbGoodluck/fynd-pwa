// ─── PWA Install Prompt Modal ─────────────────────────────────────────────────
// Shown when the browser supports PWA installation and user has engaged.
// Web-only — renders null on native platforms.

import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  TouchableWithoutFeedback, Platform, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { F } from '../theme/fonts';
import { COLORS } from '../theme/tokens';

interface Props {
  visible: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}

export default function PWAInstallModal({ visible, onInstall, onDismiss }: Props) {
  if (Platform.OS !== 'web') return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              <View style={styles.handle} />

              {/* Icon */}
              <View style={styles.iconWrap}>
                <Ionicons name="phone-portrait-outline" size={32} color={COLORS.accent.primary} />
              </View>

              <Text style={styles.title}>Install Fynd</Text>
              <Text style={styles.message}>
                Explore places faster from your home screen.
              </Text>

              {/* Feature highlights */}
              <View style={styles.features}>
                {[
                  { icon: 'flash-outline',    text: 'Instant access, no browser needed' },
                  { icon: 'wifi-outline',     text: 'Works offline for saved places' },
                  { icon: 'notifications-outline', text: 'Full-screen, app-like experience' },
                ].map((f) => (
                  <View key={f.icon} style={styles.featureRow}>
                    <Ionicons name={f.icon as any} size={16} color={COLORS.accent.primary} />
                    <Text style={styles.featureText}>{f.text}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity style={styles.installBtn} onPress={onInstall}>
                <Ionicons name="download-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.installBtnText}>Install</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.laterBtn} onPress={onDismiss}>
                <Text style={styles.laterBtnText}>Maybe Later</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
    alignItems: 'center',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E5E5EA', marginBottom: 20,
  },
  iconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: COLORS.accent.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  title: {
    fontSize: 22,
    fontFamily: F.bold,
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#57636C',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  features: {
    width: '100%',
    marginBottom: 24,
    gap: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 13,
    color: '#374151',
  },
  installBtn: {
    width: '100%',
    backgroundColor: COLORS.accent.primary,
    borderRadius: 16,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: COLORS.accent.primary,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  installBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: F.bold,
  },
  laterBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  laterBtnText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontFamily: F.semibold,
  },
});
