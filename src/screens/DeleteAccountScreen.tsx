import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';

type Props = { navigation: any };

export default function DeleteAccountScreen({ navigation }: Props) {
  const { user, logout } = useAuthStore();
  const name = user?.fullName || 'Anika';
  const email = user?.email || 'wvdiv@anika.com';
  const [showModal, setShowModal] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showModal) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 60,
        friction: 8,
      }).start(() => {
        Animated.timing(checkAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      });
      const timer = setTimeout(async () => {
        await logout();
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      }, 2500);
      return () => clearTimeout(timer);
    } else {
      scaleAnim.setValue(0);
      checkAnim.setValue(0);
    }
  }, [showModal]);

  const handleDelete = () => {
    setShowModal(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color="#111827" style={{ opacity: 0.6 }} />
        </TouchableOpacity>
        <View style={styles.userInfo}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.email}>{email}</Text>
        </View>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.card}>
        <TouchableOpacity style={styles.menuRow} onPress={() => navigation.goBack()}>
          <View style={styles.menuLeft}>
            <Ionicons name="star" size={20} color="#22C55E" style={styles.menuIcon} />
            <Text style={styles.menuLabel}>Delete Account</Text>
          </View>
          <Ionicons name="chevron-down" size={20} color="#57636C" style={{ opacity: 0.5 }} />
        </TouchableOpacity>

        <View style={styles.divider} />

        <View style={styles.deleteBox}>
          <Text style={styles.deleteText}>
            Deleting your account could erase{'\n'}all data from Fynd, including{'\n'}saved places, itineraries, etc.
          </Text>
          <View style={styles.deleteActions}>
            <TouchableOpacity style={styles.pauseBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.pauseBtnText}>Pause Instead</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Text style={styles.deleteBtnText}>Continue with delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Modal transparent visible={showModal} animationType="fade">
        <View style={styles.overlay}>
          <Animated.View style={[styles.popup, { transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.popupIconRing}>
              <Animated.View style={{ opacity: checkAnim }}>
                <Ionicons name="checkmark" size={36} color="#fff" />
              </Animated.View>
            </View>
            <Text style={styles.popupTitle}>Account Deleted</Text>
            <Text style={styles.popupSubtitle}>Your account has been successfully deleted. We hope to see you again someday.</Text>
            <View style={styles.popupDivider} />
            <View style={styles.popupDots}>
              <View style={[styles.dot, styles.dotActive]} />
              <View style={styles.dot} />
              <View style={styles.dot} />
            </View>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 16, paddingTop: 36 },
  userInfo: { alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '500', color: '#111827' },
  email: { fontSize: 12, fontWeight: '300', color: '#57636C' },
  card: { marginHorizontal: 14, marginTop: 10, borderRadius: 14, borderWidth: 0.5, borderColor: '#E5E5EA', backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 1, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  menuRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, height: 50 },
  menuLeft: { flexDirection: 'row', alignItems: 'center' },
  menuIcon: { opacity: 0.6, marginRight: 8 },
  menuLabel: { fontSize: 15, color: '#111827', opacity: 0.6 },
  divider: { height: 1, backgroundColor: '#F2F2F7' },
  deleteBox: { padding: 16 },
  deleteText: { fontSize: 14, color: '#111827', textAlign: 'center', opacity: 0.6, lineHeight: 22, marginBottom: 20 },
  deleteActions: { flexDirection: 'row', justifyContent: 'space-evenly' },
  pauseBtn: { backgroundColor: '#22C55E', borderRadius: 16, paddingHorizontal: 16, height: 36, alignItems: 'center', justifyContent: 'center' },
  pauseBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  deleteBtn: { backgroundColor: 'rgba(20,24,27,0.7)', borderRadius: 16, paddingHorizontal: 16, height: 36, alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  popup: { width: 300, backgroundColor: '#fff', borderRadius: 24, padding: 28, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
  popupIconRing: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center', marginBottom: 18, shadowColor: '#22C55E', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  popupTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 10 },
  popupSubtitle: { fontSize: 13, color: '#57636C', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  popupDivider: { width: '100%', height: 1, backgroundColor: '#F2F2F7', marginBottom: 16 },
  popupDots: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E5E5EA' },
  dotActive: { backgroundColor: '#22C55E', width: 20 },
});
