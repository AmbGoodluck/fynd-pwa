import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePremiumStore } from '../store/usePremiumStore';

type Props = { navigation: any };

const FEATURES = [
  'Unlimited Places',
  'Unlimited Itineraries',
  'Access ServiceHub',
  'Personalized Travel Locations',
  'No Ads',
];

export default function SubscriptionScreen({ navigation }: Props) {
  const { setIsPremium, isPremium } = usePremiumStore();

  const handleStartTrial = () => {
    setIsPremium(true);
    Alert.alert(
      'Welcome to FyndPlus! 🎉',
      'Your 7-day free trial has started. Enjoy unlimited places, itineraries, and ServiceHub access.',
      [{ text: 'Explore Now', onPress: () => navigation.goBack() }]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={44} color="#111827" style={{ opacity: 0.6 }} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Image source={require('../../assets/logo-icon.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>Upgrade to Fynd Plus</Text>
          <Text style={styles.subtitle}>Unlock a world of exclusive travel experiences.</Text>
        </View>

        <View style={styles.featuresCard}>
          {FEATURES.map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <Ionicons name="checkmark" size={24} color="#20CF76" style={{ opacity: 0.8 }} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <View style={styles.pricingCard}>
          <View style={styles.trialBadge}>
            <Text style={styles.trialBadgeText}>7-Day Free Trial</Text>
          </View>
          <Text style={styles.price}>Then $9.99/Month</Text>
          <Text style={styles.cancelText}>Cancel anytime</Text>

          <TouchableOpacity style={styles.trialBtn} onPress={handleStartTrial} disabled={isPremium}>
            <Text style={styles.trialBtnText}>{isPremium ? 'Already FyndPlus ✓' : 'Start Free Trial'}</Text>
          </TouchableOpacity>

          <Text style={styles.termsNote}>
            No charges until February 8. Renew for $9.99/month afterwards. Terms apply
          </Text>
        </View>

        <View style={styles.termsRow}>
          <Text style={styles.termsText}>By continuing, you agree to the </Text>
          <TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('LegalDetail', { pageId: 'subscription', title: 'Subscription Terms' })}><TouchableOpacity onPress={() => navigation.navigate('LegalDetail', { pageId: 'subscription', title: 'Subscription Terms' })}><TouchableOpacity onPress={() => navigation.navigate('LegalDetail', { pageId: 'subscription', title: 'Subscription Terms' })}><Text style={styles.termsLink}>Terms of Service</Text></TouchableOpacity></TouchableOpacity></TouchableOpacity>
          </TouchableOpacity>
        </View>

        <TouchableOpacity>
          <Text style={styles.restoreText}>Restore Purchase</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { paddingBottom: 40, alignItems: 'center' },
  back: { alignSelf: 'flex-start', paddingLeft: 10, paddingTop: 10 },
  header: { alignItems: 'center', paddingVertical: 20, width: '100%' },
  logo: { width: 180, height: 120, marginBottom: 10 },
  title: { fontSize: 20, fontWeight: '500', color: '#111827', opacity: 0.8, marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#57636C', textAlign: 'center' },
  featuresCard: { width: '85%', borderRadius: 16, borderWidth: 0.5, borderColor: '#E5E5E7', backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 1, shadowOffset: { width: 0, height: 2 }, elevation: 2, paddingVertical: 8, paddingHorizontal: 10, marginBottom: 16 },
  featureRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 4 },
  featureText: { fontSize: 16, color: '#111827', opacity: 0.8, marginLeft: 8 },
  pricingCard: { width: '85%', borderRadius: 16, borderWidth: 0.5, borderColor: '#E5E5E7', backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 1, shadowOffset: { width: 0, height: 2 }, elevation: 2, padding: 14, marginBottom: 16 },
  trialBadge: { backgroundColor: '#20CF76', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 8 },
  trialBadgeText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  price: { fontSize: 18, fontWeight: '500', color: '#111827', marginBottom: 4 },
  cancelText: { fontSize: 12, color: '#57636C', marginBottom: 10 },
  trialBtn: { backgroundColor: '#22C55E', borderRadius: 16, height: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  trialBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  termsNote: { fontSize: 12, color: '#111827', opacity: 0.8, textAlign: 'center', lineHeight: 18 },
  termsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 4 },
  termsText: { fontSize: 12, color: '#111827', opacity: 0.8 },
  termsLink: { fontSize: 12, color: '#22C55E', opacity: 0.8 },
  restoreText: { fontSize: 12, color: '#111827', marginTop: 10 },
});
