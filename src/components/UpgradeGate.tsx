import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  visible: boolean;
  message: string;
  onUpgrade: () => void;
  onDismiss: () => void;
};

export default function UpgradeGate({ visible, message, onUpgrade, onDismiss }: Props) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.popup}>
          <View style={styles.iconRing}>
            <Ionicons name="star" size={32} color="#22C55E" />
          </View>
          <Text style={styles.title}>Fynd Plus Required</Text>
          <Text style={styles.message}>{message}</Text>
          <TouchableOpacity style={styles.upgradeBtn} onPress={onUpgrade}>
            <Text style={styles.upgradeBtnText}>Upgrade to Fynd Plus</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss}>
            <Text style={styles.dismissText}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  popup: { backgroundColor: '#fff', borderRadius: 24, padding: 32, alignItems: 'center', width: 300, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  iconRing: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 10, textAlign: 'center' },
  message: { fontSize: 14, color: '#57636C', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  upgradeBtn: { backgroundColor: '#22C55E', borderRadius: 16, height: 50, width: '100%', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  upgradeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  dismissBtn: { padding: 8 },
  dismissText: { fontSize: 14, color: '#8E8E93' },
});
