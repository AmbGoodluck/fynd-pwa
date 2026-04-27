import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS } from '../theme/tokens';

type Props = { navigation: any };

const LEGAL_ITEMS = [
  { id: 'terms', label: 'Terms & Conditions', icon: 'document-text-outline' },
  { id: 'privacy', label: 'Privacy Policy', icon: 'shield-checkmark-outline' },
  { id: 'ai', label: 'AI Disclaimer', icon: 'sparkles-outline' },
  { id: 'servicehub', label: 'Service Hub Disclaimer', icon: 'compass-outline' },
  { id: 'subscription', label: 'Subscription Terms', icon: 'card-outline' },
  { id: 'safety', label: 'Safety Notice', icon: 'alert-circle-outline' },
  { id: 'datadeletion', label: 'Data Deletion Request', icon: 'trash-outline' },
];

export default function LegalScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color="#111827" style={{ opacity: 0.6 }} />
        </TouchableOpacity>
        <View style={{ width: 28 }} />
      </View>
      <View style={styles.header}>
        <Text style={styles.title}>Legal & Privacy</Text>
        <Text style={styles.subtitle}>How we protect you and your data</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          {LEGAL_ITEMS.map((item, index) => (
            <View key={item.id}>
              <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('LegalDetail', { pageId: item.id, title: item.label })}>
                <View style={styles.rowLeft}>
                  <View style={styles.iconWrap}>
                    <Ionicons name={item.icon as any} size={18} color={COLORS.accent.primary} />
                  </View>
                  <Text style={styles.rowLabel}>{item.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#57636C" style={{ opacity: 0.4 }} />
              </TouchableOpacity>
              {index < LEGAL_ITEMS.length - 1 && <View style={styles.separator} />}
            </View>
          ))}
        </View>
        <Text style={styles.lastUpdated}>Last Updated: March 2026</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 0, paddingBottom: 8 },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  title: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#57636C' },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: { width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.accent.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowLabel: { fontSize: 15, color: '#111827', fontWeight: '500' },
  separator: { height: 1, backgroundColor: '#F2F2F7', marginLeft: 60 },
  lastUpdated: { fontSize: 12, color: '#8E8E93', textAlign: 'center', marginTop: 24 },
});
