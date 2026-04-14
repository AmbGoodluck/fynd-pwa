import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { usePremiumStore } from '../store/usePremiumStore';
import { logEvent } from '../services/firebase';
import { F } from '../theme/fonts';

type Props = { navigation: any };

type Plan = 'monthly' | 'annual';

const FEATURES = [
  {
    icon: 'map-outline',
    color: '#22C55E',
    bg: '#F0FDF4',
    title: 'Unlimited Trip Planning',
    desc: 'Plan as many trips as you want without weekly limits.',
  },
  {
    icon: 'heart-outline',
    color: '#3B82F6',
    bg: '#EFF6FF',
    title: 'Unlimited Saved Places',
    desc: 'Save every place you want to explore later.',
  },
  {
    icon: 'people-outline',
    color: '#8B5CF6',
    bg: '#F5F3FF',
    title: 'Shared Trips',
    desc: 'Plan and explore together with friends and travel teams.',
  },
  {
    icon: 'compass-outline',
    color: '#F59E0B',
    bg: '#FFFBEB',
    title: 'ServiceHub Access',
    desc: 'Find nearby medical help, transport, and currency exchange instantly.',
  },
  {
    icon: 'bulb-outline',
    color: '#6366F1',
    bg: '#EEF2FF',
    title: 'Priority Discovery',
    desc: 'Get smarter recommendations tailored to your interests.',
  },
];

export default function SubscriptionScreen({ navigation }: Props) {
  const { setIsPremium, isPremium } = usePremiumStore();
  const [selectedPlan, setSelectedPlan] = useState<Plan>('annual');
  const [upgraded, setUpgraded] = useState(isPremium);
  const { bottom: bottomInset } = useSafeAreaInsets();

  useEffect(() => {
    if (!isPremium) {
      logEvent('premium_viewed');
    }
  }, []);

  const handleUpgrade = () => {
    logEvent('premium_upgrade_clicked', { plan: selectedPlan });
    // In production this would trigger in-app purchase. For now, grant premium directly.
    setIsPremium(true);
    setUpgraded(true);
    logEvent('premium_purchase_success', { plan: selectedPlan });
  };

  const handleDismiss = () => {
    logEvent('premium_purchase_cancel');
    navigation.goBack();
  };

  // ── Confirmation screen after upgrade ────────────────────────────────────────
  if (upgraded) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.confirmWrap}>
          <View style={styles.confirmIconCircle}>
            <Ionicons name="checkmark" size={40} color="#22C55E" />
          </View>
          <View style={styles.plusBadge}>
            <Ionicons name="star" size={11} color="#fff" />
            <Text style={styles.plusBadgeText}>FyndPlus Explorer</Text>
          </View>
          <Text style={styles.confirmTitle}>Welcome to FyndPlus</Text>
          <Text style={styles.confirmMsg}>
            You now have unlimited access to trip planning, ServiceHub, saved places, and shared adventures.
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { marginTop: 32 }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.primaryBtnText}>Start Exploring</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Paywall ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Close / back */}
      <TouchableOpacity
        style={styles.closeBtn}
        onPress={handleDismiss}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={22} color="#6B7280" />
      </TouchableOpacity>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(32, bottomInset + 16) }]}
      >
        {/* ── Hero ─────────────────────────────────────────── */}
        <View style={styles.hero}>
          <Image
            source={require('../../assets/logo-icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.plusBadge}>
            <Ionicons name="star" size={11} color="#fff" />
            <Text style={styles.plusBadgeText}>FyndPlus</Text>
          </View>
          <Text style={styles.heroTitle}>Explore Deeper{'\n'}with FyndPlus</Text>
          <Text style={styles.heroSubtitle}>
            Plan better adventures with unlimited trip planning{'\n'}and powerful travel tools.
          </Text>
        </View>

        {/* ── Features ─────────────────────────────────────── */}
        <View style={styles.featuresSection}>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.featureCard}>
              <View style={[styles.featureIconWrap, { backgroundColor: f.bg }]}>
                <Ionicons name={f.icon as any} size={22} color={f.color} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Pricing ──────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Choose your plan</Text>
        <View style={styles.pricingRow}>
          {/* Monthly */}
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'monthly' && styles.planCardSelected,
            ]}
            onPress={() => setSelectedPlan('monthly')}
            activeOpacity={0.85}
          >
            {selectedPlan === 'monthly' && (
              <View style={styles.planSelectedDot} />
            )}
            <Text style={styles.planInterval}>Monthly</Text>
            <Text style={styles.planPrice}>$4.99</Text>
            <Text style={styles.planPer}>per month</Text>
          </TouchableOpacity>

          {/* Annual — highlighted */}
          <TouchableOpacity
            style={[
              styles.planCard,
              styles.planCardAnnual,
              selectedPlan === 'annual' && styles.planCardSelected,
            ]}
            onPress={() => setSelectedPlan('annual')}
            activeOpacity={0.85}
          >
            <View style={styles.bestValueBadge}>
              <Text style={styles.bestValueText}>Best Value</Text>
            </View>
            {selectedPlan === 'annual' && (
              <View style={styles.planSelectedDot} />
            )}
            <Text style={styles.planInterval}>Annual</Text>
            <Text style={styles.planPrice}>$39</Text>
            <Text style={styles.planPer}>per year</Text>
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsText}>Save 35%</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.billingNote}>
          {selectedPlan === 'annual'
            ? 'Billed $39.00 annually · Cancel anytime'
            : 'Billed $4.99 monthly · Cancel anytime'}
        </Text>

        {/* ── CTA ──────────────────────────────────────────── */}
        <TouchableOpacity style={styles.primaryBtn} onPress={handleUpgrade} activeOpacity={0.88}>
          <Ionicons name="star" size={17} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.primaryBtnText}>Start Exploring with FyndPlus</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.ghostBtn} onPress={handleDismiss}>
          <Text style={styles.ghostBtnText}>Maybe Later</Text>
        </TouchableOpacity>

        {/* ── Footer ───────────────────────────────────────── */}
        <View style={styles.footer}>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('LegalDetail', {
                pageId: 'subscription',
                title: 'Subscription Terms',
              })
            }
          >
            <Text style={styles.footerLink}>Terms of Service</Text>
          </TouchableOpacity>
          <Text style={styles.footerDot}>·</Text>
          <TouchableOpacity>
            <Text style={styles.footerLink}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={styles.footerDot}>·</Text>
          <TouchableOpacity>
            <Text style={styles.footerLink}>Restore Purchase</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },

  closeBtn: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: { paddingHorizontal: 20, paddingTop: 8 },

  // ── Hero ──────────────────────────────────────────────────────────────────
  hero: { alignItems: 'center', paddingTop: 48, paddingBottom: 28 },
  logo: { width: 68, height: 68, marginBottom: 14 },
  plusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#22C55E', borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 5,
    marginBottom: 18,
  },
  plusBadgeText: { color: '#fff', fontSize: 12, fontFamily: F.bold, letterSpacing: 0.4 },
  heroTitle: {
    fontSize: 30, fontFamily: F.bold, color: '#111827',
    textAlign: 'center', lineHeight: 38, marginBottom: 12, letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 15, color: '#57636C', textAlign: 'center',
    lineHeight: 23, paddingHorizontal: 8,
  },

  // ── Features ──────────────────────────────────────────────────────────────
  featuresSection: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 4,
    marginBottom: 28,
    shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  featureCard: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    gap: 14,
  },
  featureIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  featureText: { flex: 1 },
  featureTitle: { fontSize: 15, fontFamily: F.semibold, color: '#111827', marginBottom: 2 },
  featureDesc: { fontSize: 13, color: '#6B7280', lineHeight: 19 },

  // ── Pricing ───────────────────────────────────────────────────────────────
  sectionLabel: {
    fontSize: 13, fontFamily: F.semibold, color: '#9CA3AF',
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 12,
  },
  pricingRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  planCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 18,
    padding: 18, alignItems: 'center',
    borderWidth: 2, borderColor: '#F2F2F7',
    shadowColor: '#000', shadowOpacity: 0.05,
    shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1,
    position: 'relative', overflow: 'hidden',
  },
  planCardAnnual: {
    borderColor: '#D1FAE5', backgroundColor: '#F9FFFE',
  },
  planCardSelected: {
    borderColor: '#22C55E',
    shadowColor: '#22C55E', shadowOpacity: 0.15, shadowRadius: 12, elevation: 3,
  },
  planSelectedDot: {
    position: 'absolute', top: 12, right: 12,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#22C55E',
    alignItems: 'center', justifyContent: 'center',
  },
  bestValueBadge: {
    position: 'absolute', top: 0, left: 0, right: 0,
    backgroundColor: '#22C55E', paddingVertical: 4, alignItems: 'center',
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
  },
  bestValueText: { color: '#fff', fontSize: 11, fontFamily: F.bold, letterSpacing: 0.3 },
  planInterval: {
    fontSize: 13, fontFamily: F.semibold, color: '#6B7280',
    marginTop: 22, marginBottom: 4,
  },
  planPrice: { fontSize: 28, fontFamily: F.bold, color: '#111827' },
  planPer: { fontSize: 12, color: '#9CA3AF', marginBottom: 6 },
  savingsBadge: {
    backgroundColor: '#F0FDF4', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3, marginTop: 4,
  },
  savingsText: { fontSize: 11, fontFamily: F.semibold, color: '#22C55E' },

  billingNote: {
    fontSize: 12, color: '#9CA3AF', textAlign: 'center',
    marginBottom: 24,
  },

  // ── CTA ───────────────────────────────────────────────────────────────────
  primaryBtn: {
    backgroundColor: '#22C55E', borderRadius: 18, height: 56,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#22C55E', shadowOpacity: 0.35,
    shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 4,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontFamily: F.bold },
  ghostBtn: { alignItems: 'center', paddingVertical: 14 },
  ghostBtnText: { color: '#9CA3AF', fontSize: 14, fontFamily: F.medium },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    flexWrap: 'wrap', gap: 4, marginTop: 8,
  },
  footerLink: { fontSize: 11, color: '#9CA3AF' },
  footerDot: { fontSize: 11, color: '#D1D5DB' },

  // ── Confirmation ──────────────────────────────────────────────────────────
  confirmWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32,
  },
  confirmIconCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#22C55E', shadowOpacity: 0.2,
    shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3,
  },
  confirmTitle: {
    fontSize: 28, fontFamily: F.bold, color: '#111827',
    marginTop: 16, marginBottom: 12, textAlign: 'center',
  },
  confirmMsg: {
    fontSize: 15, color: '#57636C', textAlign: 'center',
    lineHeight: 24, paddingHorizontal: 8,
  },
});
