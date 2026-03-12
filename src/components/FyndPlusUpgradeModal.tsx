import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { F } from '../theme/fonts';

type Props = {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  title: string;
  message: string;
  /** Ionicons icon name shown in the modal header circle */
  icon?: string;
};

export default function FyndPlusUpgradeModal({
  visible,
  onClose,
  onUpgrade,
  title,
  message,
  icon = 'star-outline',
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              <View style={styles.handle} />

              <View style={styles.iconWrap}>
                <Ionicons name={icon as any} size={30} color="#22C55E" />
              </View>

              {/* FyndPlus badge */}
              <View style={styles.plusBadge}>
                <Ionicons name="star" size={11} color="#fff" />
                <Text style={styles.plusBadgeText}>FyndPlus</Text>
              </View>

              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>

              <TouchableOpacity style={styles.upgradeBtn} onPress={onUpgrade}>
                <Ionicons name="star" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.upgradeBtnText}>Upgrade to FyndPlus</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.ghostBtn} onPress={onClose}>
                <Text style={styles.ghostBtnText}>Maybe Later</Text>
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
    marginBottom: 10,
  },
  plusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#22C55E', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
    marginBottom: 14,
  },
  plusBadgeText: {
    color: '#fff', fontSize: 12, fontFamily: F.bold, letterSpacing: 0.3,
  },
  title: {
    fontSize: 22, fontFamily: F.bold, color: '#111827',
    marginBottom: 10, textAlign: 'center',
  },
  message: {
    fontSize: 14, color: '#57636C', textAlign: 'center',
    lineHeight: 22, marginBottom: 24, paddingHorizontal: 4,
  },
  upgradeBtn: {
    width: '100%', backgroundColor: '#22C55E', borderRadius: 16,
    height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#22C55E', shadowOpacity: 0.3, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  upgradeBtnText: { color: '#fff', fontSize: 16, fontFamily: F.bold },
  ghostBtn: { paddingVertical: 10, paddingHorizontal: 20 },
  ghostBtnText: { color: '#9CA3AF', fontSize: 14, fontFamily: F.medium },
});
