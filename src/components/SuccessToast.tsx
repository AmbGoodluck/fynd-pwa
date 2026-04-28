import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/tokens';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  onDone?: () => void;
};

export default function SuccessToast({ visible, title, message, onDone }: Props) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }).start();
      const timer = setTimeout(() => { onDone && onDone(); }, 2500);
      return () => clearTimeout(timer);
    } else {
      scaleAnim.setValue(0.8);
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <Animated.View style={[styles.popup, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.iconRing}>
            <Ionicons name="checkmark" size={32} color={COLORS.accent.sage} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  popup: { backgroundColor: '#fff', borderRadius: 24, padding: 32, alignItems: 'center', width: 280, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  iconRing: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.accent.sageLight, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8, textAlign: 'center' },
  message: { fontSize: 14, color: '#57636C', textAlign: 'center', lineHeight: 20 },
});
