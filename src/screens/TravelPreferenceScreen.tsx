import GuestGateModal from '../components/GuestGateModal';
import SuccessToast from '../components/SuccessToast';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Sentry from '../services/sentry';
import { useAuthStore } from '../store/useAuthStore';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function TravelPreferenceScreen({ navigation }: any) {
  const { user, isAuthenticated, setUser } = useAuthStore();
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showGate, setShowGate] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const toastAnim = React.useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => { loadPreferences(); }, []);

  // ...existing code for loadPreferences, toggleVibe, showSuccessToast, savePreferences, renderVibe...

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ActivityIndicator size="large" color="#22C55E" style={{ flex: 1 }} />
        <SuccessToast visible={showToast} title="Preferences Saved!" message="Your travel vibes have been updated." onDone={() => { setShowToast(false); navigation.goBack(); }} />
      </SafeAreaView>
    );
  }

  return (
    <>
      <GuestGateModal
        visible={showGate}
        onDismiss={() => setShowGate(false)}
        onLogin={() => { setShowGate(false); navigation.navigate('AuthChoice'); }}
        onRegister={() => { setShowGate(false); navigation.navigate('AuthChoice'); }}
        onContinueAsGuest={() => setShowGate(false)}
      />
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={32} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Travel Preferences</Text>
          <View style={{ width: 32 }} />
        </View>

        <View style={styles.header}>
          <Text style={styles.subtitle}>Tell us what you love so we can personalise your experience</Text>
          {selected.length > 0 && (
            <View style={styles.selectedPill}>
              <Text style={styles.selectedPillText}>Selected {selected.length}</Text>
            </View>
          )}
        </View>
        {/* ...existing code... */}
      </SafeAreaView>
    </>
  );
}
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const toastAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => { loadPreferences(); }, []);

  const loadPreferences = async () => {
    try {
      if (!user?.id) return;
      const docSnap = await getDoc(doc(db, 'users', user.id));
      if (docSnap.exists()) setSelected(docSnap.data().travelPreferences || []);
    } catch (e) {
      Sentry.captureException(e, { tags: { context: 'TravelPreferenceScreen.loadPreferences' } });
    } finally {
      setLoading(false);
    }
  };

  const toggleVibe = (id: string) => {
    if (!isAuthenticated || !user?.id) {
      setShowGate(true);
      return;
    }
    setSelected(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]);
  };

  const showSuccessToast = () => {
    setShowToast(true);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => { setShowToast(false); setShowToast(true); });
  };

  const savePreferences = async () => {
    if (!isAuthenticated || !user?.id) {
      setShowGate(true);
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.id), { travelPreferences: selected });
      if (setUser) setUser({ ...user, travelPreferences: selected });
      showSuccessToast();
    } catch (e) {
      Sentry.captureException(e, { tags: { context: 'TravelPreferenceScreen.savePreferences' } });
    } finally {
      setSaving(false);
    }
  };

  const renderVibe = ({ item }: { item: typeof VIBES[0] }) => {
    const isSelected = selected.includes(item.id);
    return (
      <TouchableOpacity style={styles.vibeCard} onPress={() => toggleVibe(item.id)}>
        <Image source={{ uri: item.image }} style={styles.vibeImage} />
        <View style={[styles.vibeOverlay, isSelected && styles.vibeOverlaySelected]} />
        {isSelected && (
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark" size={14} color="#fff" />
          </View>
        )}
        <Text style={styles.vibeLabel}>{item.label}</Text>
        <View style={[styles.vibeBorder, isSelected && styles.vibeBorderSelected]} />
      </TouchableOpacity>
    );
  };

  // Duplicate misplaced return blocks removed. Only the main export default function and its return remain.

      <>
        <FlatList
          data={VIBES}
          keyExtractor={item => item.id}
          numColumns={2}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.grid, { paddingBottom: 16 }]}
          renderItem={renderVibe}
        />

        <View style={[styles.bottomBar, { paddingBottom: Math.max(12, insets.bottom) }] }>
          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={savePreferences} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Preferences</Text>}
          </TouchableOpacity>
        </View>

        {showToast && (
          <Animated.View style={[styles.toast, { opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}> 
            <View style={styles.toastInner}>
              <View style={styles.toastIcon}>
                <Ionicons name="checkmark" size={18} color="#fff" />
              </View>
              <Text style={styles.toastText}>Preferences saved!</Text>
            </View>
          </Animated.View>
        )}
        <SuccessToast visible={showToast} title="Preferences Saved!" message="Your travel vibes have been updated." onDone={() => { setShowToast(false); navigation.goBack(); }} />
      </>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 8, paddingTop: 0 },
  topBarTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  header: { paddingHorizontal: 20, paddingBottom: 10 },
  subtitle: { fontSize: 14, color: '#57636C', lineHeight: 20 },
  selectedPill: { marginTop: 8, alignSelf: 'flex-start', backgroundColor: '#F0FDF4', borderRadius: 20, borderWidth: 1, borderColor: '#22C55E', paddingHorizontal: 14, paddingVertical: 4 },
  selectedPillText: { fontSize: 13, color: '#22C55E', fontWeight: '600' },
  grid: { paddingHorizontal: 14, paddingBottom: 16 },
  vibeCard: { flex: 1, margin: 6, height: 120, borderRadius: 16, overflow: 'hidden', position: 'relative' },
  vibeImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  vibeOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 16 },
  vibeOverlaySelected: { backgroundColor: 'rgba(34,197,94,0.35)' },
  vibeBorder: { ...StyleSheet.absoluteFillObject, borderRadius: 16, borderWidth: 2, borderColor: 'transparent' },
  vibeBorderSelected: { borderColor: '#22C55E' },
  checkBadge: { position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center' },
  vibeLabel: { position: 'absolute', bottom: 10, left: 10, fontSize: 14, fontWeight: '600', color: '#fff' },
  bottomBar: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F2F2F7', flexShrink: 0 },
  saveBtn: { backgroundColor: '#22C55E', borderRadius: 16, height: 50, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  toast: { position: 'absolute', bottom: 90, left: 20, right: 20, alignItems: 'center' },
  toastInner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12, gap: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  toastIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center' },
  toastText: { color: '#fff', fontSize: 15, fontWeight: '500' },
});





