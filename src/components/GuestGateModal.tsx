import React from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  visible: boolean;
  onDismiss: () => void;
  onLogin: () => void;
  onRegister: () => void;
  /** Called when the user consciously opts to stay as a guest */
  onContinueAsGuest: () => void;
};

export default function GuestGateModal({
  visible, onDismiss, onLogin, onRegister, onContinueAsGuest,
}: Props) {
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
                <Ionicons name="bookmark-outline" size={32} color="#22C55E" />
              </View>

              <Text style={styles.title}>Create an Account</Text>
              <Text style={styles.body}>
                Create an account to save places and access your saved trips from any device, any time.
              </Text>

              <TouchableOpacity style={styles.primaryBtn} onPress={onRegister}>
                <Text style={styles.primaryBtnText}>Create Account</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.outlineBtn} onPress={onLogin}>
                <Text style={styles.outlineBtnText}>Log In</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.ghostBtn} onPress={onContinueAsGuest}>
                <Text style={styles.ghostBtnText}>Continue as Guest</Text>
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
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 44,
    alignItems: 'center',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E5E5EA', marginBottom: 20,
  },
  iconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#F0FDF4',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22, fontWeight: '700', color: '#111827',
    marginBottom: 10, textAlign: 'center',
  },
  body: {
    fontSize: 14, color: '#57636C', textAlign: 'center',
    lineHeight: 22, marginBottom: 28, paddingHorizontal: 8,
  },
  primaryBtn: {
    width: '100%', backgroundColor: '#22C55E', borderRadius: 16,
    height: 52, alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#22C55E', shadowOpacity: 0.3,
    shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  outlineBtn: {
    width: '100%', borderWidth: 1.5, borderColor: '#22C55E',
    borderRadius: 16, height: 52, alignItems: 'center',
    justifyContent: 'center', marginBottom: 12,
  },
  outlineBtnText: { color: '#22C55E', fontSize: 16, fontWeight: '600' },
  ghostBtn: {
    paddingVertical: 10, paddingHorizontal: 20,
  },
  ghostBtnText: { color: '#9CA3AF', fontSize: 14, fontWeight: '500' },
});
