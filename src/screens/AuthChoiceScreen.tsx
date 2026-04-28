import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, ImageBackground, StatusBar, Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useGuestStore } from '../store/useGuestStore';
import { F } from '../theme/fonts';
import { COLORS } from '../theme/tokens';


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
                <Ionicons name={f.icon as any} size={18} color={COLORS.accent.primary} />
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
                  <Ionicons name="person-outline" size={32} color={COLORS.accent.primary} />
                </View>
                <Text style={styles.modalTitle}>Guest Access</Text>
                <Text style={styles.modalBody}>
                  You are using Fynd in guest mode. Guest access is limited. You can explore the map and create a trip, but some features require an account.
                </Text>
                <View style={styles.modalPermissions}>
                  <Text style={styles.permissionHeader}>Allowed:</Text>
                  {['Create Trip', 'View Suggested Places', 'Generate Itinerary', 'Use Map Navigation'].map(item => (
                    <View key={item} style={styles.permissionRow}>
                      <Ionicons name="checkmark-circle" size={16} color={COLORS.accent.sage} />
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
  bg: { flex: 1, width: '100%', height: '100%' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  safe: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 32 },
  header: { alignItems: 'center', paddingTop: 48 },
  logo: { width: 80, height: 80, resizeMode: 'contain', marginBottom: 12, borderRadius: 16 },
  features: { gap: 16 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  featureIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(232,80,58,0.15)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  featureText: { fontSize: 16, color: 'rgba(255,255,255,0.95)', flex: 1, lineHeight: 24, fontFamily: F.medium },
  buttons: { paddingBottom: 16, alignItems: 'center', gap: 14 },
  primaryBtn: {
    width: '100%', backgroundColor: COLORS.accent.primary, borderRadius: 20,
    height: 60, alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.accent.primary, shadowOpacity: 0.4,
    shadowRadius: 15, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  primaryBtnText: { color: COLORS.text.inverse, fontSize: 18, fontFamily: F.bold },
  outlineBtn: {
    width: '100%', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 20, height: 60, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  outlineBtnText: { color: COLORS.text.inverse, fontSize: 18, fontFamily: F.bold },
  ghostBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10,
  },
  ghostBtnText: { color: 'rgba(255,255,255,0.7)', fontSize: 16, fontFamily: F.medium },
  guestNote: {
    fontSize: 12, color: 'rgba(255,255,255,0.4)',
    textAlign: 'center', lineHeight: 18,
    paddingHorizontal: 16, fontFamily: F.regular,
  },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 52, alignItems: 'center',
  },
  modalHandle: {
    width: 44, height: 4, borderRadius: 2,
    backgroundColor: '#E5E7EB', marginBottom: 24,
  },
  modalIconWrap: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.accent.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24, fontFamily: F.bold, color: COLORS.text.primary,
    marginBottom: 12, textAlign: 'center', letterSpacing: -0.5,
  },
  modalBody: {
    fontSize: 15, color: COLORS.text.secondary, textAlign: 'center',
    lineHeight: 24, marginBottom: 20, paddingHorizontal: 4, fontFamily: F.medium,
  },
  modalPermissions: { width: '100%', marginBottom: 24, padding: 16, backgroundColor: COLORS.surface, borderRadius: 20 },
  permissionHeader: { fontSize: 14, fontFamily: F.bold, color: COLORS.text.primary, marginBottom: 10 },
  permissionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  permissionText: { fontSize: 14, color: COLORS.text.primary, fontFamily: F.medium },
  modalPrimaryBtn: {
    width: '100%', backgroundColor: COLORS.accent.primary, borderRadius: 18,
    height: 56, alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  modalPrimaryBtnText: { color: COLORS.text.inverse, fontSize: 16, fontFamily: F.bold },
  modalOutlineBtn: {
    width: '100%', borderWidth: 2, borderColor: COLORS.accent.primary,
    borderRadius: 18, height: 56, alignItems: 'center', justifyContent: 'center',
  },
  modalOutlineBtnText: { color: COLORS.accent.primary, fontSize: 16, fontFamily: F.bold },

});
