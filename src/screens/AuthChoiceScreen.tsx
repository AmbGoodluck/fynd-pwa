import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, ImageBackground, StatusBar, Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useGuestStore } from '../store/useGuestStore';

type Props = { navigation: any };

export default function AuthChoiceScreen({ navigation }: Props) {
  const { setGuest, setHasSeenOnboarding, hasUsedGuestMode, markGuestModeUsed } = useGuestStore();
  const [showGuestInfoModal, setShowGuestInfoModal] = useState(false);
  const [showAlreadyUsedModal, setShowAlreadyUsedModal] = useState(false);

  const handleGuest = () => {
    if (hasUsedGuestMode) {
      setShowAlreadyUsedModal(true);
    } else {
      setShowGuestInfoModal(true);
    }
  };

  const confirmGuestEntry = () => {
    setShowGuestInfoModal(false);
    markGuestModeUsed();
    setGuest(true);
    setHasSeenOnboarding(true);
    navigation.replace('MainTabs');
  };

  const handleLogin = () => {
    navigation.navigate('Login');
  };

  const handleRegister = () => {
    navigation.navigate('Register');
  };

  return (
    <ImageBackground
      source={require('../../assets/auth-bg.jpg')}
      style={styles.bg}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={styles.overlay} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Logo */}
        <View style={styles.header}>
          <Image source={require('../../assets/logo-icon.png')} style={styles.logo} />
        </View>

        {/* Feature highlights */}
        <View style={styles.features}>
          {[
            { icon: 'map-outline', text: 'Discover hidden gems near you' },
            { icon: 'calendar-outline', text: 'Build flexible, curated itineraries' },
            { icon: 'navigate-outline', text: 'Navigate with live turn-by-turn' },
            { icon: 'heart-outline', text: 'Save places across all your devices' },
            { icon: 'share-social-outline', text: 'Create and Share Trip as a group' },
          ].map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon as any} size={18} color="#22C55E" />
              </View>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* Action buttons */}
        <View style={styles.buttons}>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleRegister}>
            <Text style={styles.primaryBtnText}>Create Account</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.outlineBtn} onPress={handleLogin}>
            <Text style={styles.outlineBtnText}>Log In</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.ghostBtn} onPress={handleGuest}>
            <Text style={styles.ghostBtnText}>Continue as Guest</Text>
            <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          <Text style={styles.guestNote}>
            Guest mode: full trip building, no place saving across sessions
          </Text>
        </View>
      </SafeAreaView>

      {/* Guest Access Info Modal */}
      <Modal
        visible={showGuestInfoModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGuestInfoModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowGuestInfoModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalSheet}>
                <View style={styles.modalHandle} />
                <View style={styles.modalIconWrap}>
                  <Ionicons name="person-outline" size={32} color="#22C55E" />
                </View>
                <Text style={styles.modalTitle}>Guest Access</Text>
                <Text style={styles.modalBody}>
                  You are using Fynd in guest mode. Guest access is limited. You can explore the map and create a trip, but some features require an account.
                </Text>
                <View style={styles.modalPermissions}>
                  <Text style={styles.permissionHeader}>Allowed:</Text>
                  {['Create Trip', 'View Suggested Places', 'Generate Itinerary', 'Use Map Navigation'].map(item => (
                    <View key={item} style={styles.permissionRow}>
                      <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                      <Text style={styles.permissionText}>{item}</Text>
                    </View>
                  ))}
                  <Text style={[styles.permissionHeader, { marginTop: 10 }]}>Restricted:</Text>
                  {['Saved Places', 'ServiceHub', 'Profile Features', 'Account Settings'].map(item => (
                    <View key={item} style={styles.permissionRow}>
                      <Ionicons name="close-circle" size={16} color="#EF4444" />
                      <Text style={[styles.permissionText, { color: '#6B7280' }]}>{item}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity style={styles.modalPrimaryBtn} onPress={confirmGuestEntry}>
                  <Text style={styles.modalPrimaryBtnText}>Continue as Guest</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalOutlineBtn} onPress={() => { setShowGuestInfoModal(false); navigation.navigate('Register'); }}>
                  <Text style={styles.modalOutlineBtnText}>Create Account Instead</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Guest Already Used Modal */}
      <Modal
        visible={showAlreadyUsedModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAlreadyUsedModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowAlreadyUsedModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalSheet}>
                <View style={styles.modalHandle} />
                <View style={[styles.modalIconWrap, { backgroundColor: '#FEF2F2' }]}>
                  <Ionicons name="alert-circle-outline" size={32} color="#EF4444" />
                </View>
                <Text style={styles.modalTitle}>Guest Access Already Used</Text>
                <Text style={styles.modalBody}>
                  Guest mode is available only once. Please create an account or sign in to continue using Fynd.
                </Text>
                <TouchableOpacity style={styles.modalPrimaryBtn} onPress={() => { setShowAlreadyUsedModal(false); navigation.navigate('Register'); }}>
                  <Text style={styles.modalPrimaryBtnText}>Create Account</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalOutlineBtn} onPress={() => { setShowAlreadyUsedModal(false); navigation.navigate('Login'); }}>
                  <Text style={styles.modalOutlineBtnText}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  safe: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 28 },
  header: { alignItems: 'center', paddingTop: 32 },
  logo: { width: 72, height: 72, resizeMode: 'contain', marginBottom: 10, borderRadius: 12 },
  features: { gap: 14 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  featureIcon: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(34,197,94,0.18)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.4)',
  },
  featureText: { fontSize: 15, color: 'rgba(255,255,255,0.88)', flex: 1, lineHeight: 22 },
  buttons: { paddingBottom: 8, alignItems: 'center', gap: 12 },
  primaryBtn: {
    width: '100%', backgroundColor: '#22C55E', borderRadius: 18,
    height: 56, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#22C55E', shadowOpacity: 0.5,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  outlineBtn: {
    width: '100%', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 18, height: 56, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  outlineBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  ghostBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 8,
  },
  ghostBtnText: { color: 'rgba(255,255,255,0.6)', fontSize: 15 },
  guestNote: {
    fontSize: 11, color: 'rgba(255,255,255,0.4)',
    textAlign: 'center', lineHeight: 16,
    paddingHorizontal: 12,
  },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 44, alignItems: 'center',
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E5E5EA', marginBottom: 20,
  },
  modalIconWrap: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#F0FDF4',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22, fontWeight: '700', color: '#111827',
    marginBottom: 10, textAlign: 'center',
  },
  modalBody: {
    fontSize: 14, color: '#57636C', textAlign: 'center',
    lineHeight: 22, marginBottom: 16, paddingHorizontal: 4,
  },
  modalPermissions: { width: '100%', marginBottom: 20 },
  permissionHeader: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 6 },
  permissionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  permissionText: { fontSize: 13, color: '#374151' },
  modalPrimaryBtn: {
    width: '100%', backgroundColor: '#22C55E', borderRadius: 16,
    height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  modalPrimaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalOutlineBtn: {
    width: '100%', borderWidth: 1.5, borderColor: '#22C55E',
    borderRadius: 16, height: 52, alignItems: 'center', justifyContent: 'center',
  },
  modalOutlineBtnText: { color: '#22C55E', fontSize: 16, fontWeight: '600' },
});
