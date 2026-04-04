import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

type Props = { navigation: any; route: any };

const LEGAL_CONTENT: Record<string, { sections: { heading: string; bullets?: string[]; body?: string }[] }> = {
  terms: { sections: [
    { heading: 'Acceptance of Terms', body: 'By using Fynd, you agree to these terms. If you do not agree, please do not use the app.' },
    { heading: 'Use of the App', bullets: ['You must be 13 or older to use Fynd', 'You are responsible for your account activity', 'Do not misuse or attempt to hack the service'] },
    { heading: 'User Content', body: 'Any preferences, saved places, or itineraries you create remain yours. You grant Fynd a license to use this data to improve your experience.' },
    { heading: 'Termination', body: 'We reserve the right to suspend accounts that violate these terms without prior notice.' },
    { heading: 'Changes to Terms', body: 'We may update these terms periodically. Continued use of Fynd after changes means you accept the new terms.' },
  ]},
  privacy: { sections: [
    { heading: 'What We Collect', bullets: ['Email address and name', 'Location (only when enabled)', 'Travel preferences and saved places', 'App usage patterns'] },
    { heading: 'How We Use It', bullets: ['Personalise your travel recommendations', 'Power AI-generated itineraries', 'Improve app performance and features', 'Send relevant notifications (if enabled)'] },
    { heading: 'What We Do Not Do', bullets: ['We never sell your data to third parties', 'We never share personal info without consent', 'We never store payment details  Stripe handles all payments securely'] },
    { heading: 'Data Retention', body: 'Your data is retained as long as your account is active. You may request full deletion at any time via the Data Deletion page.' },
    { heading: 'Your Rights', bullets: ['Access your data at any time', 'Request corrections or deletion', 'Opt out of non-essential data collection'] },
  ]},
  ai: { sections: [
    { heading: 'AI Recommendations Notice', body: 'Fynd uses artificial intelligence to suggest places, generate itineraries, and personalise your travel experience based on your vibes and preferences.' },
    { heading: 'How AI Works in Fynd', bullets: ['Your selected vibes and destination are sent to an AI model', 'The AI returns a personalised list of places and a suggested itinerary', 'Results are ranked by relevance to your preferences'] },
    { heading: 'Important Limitations', bullets: ['AI suggestions may not always be accurate or up to date', 'Always verify opening hours, availability, and safety before visiting', 'Fynd is not responsible for experiences based on AI suggestions'] },
    { heading: 'Your Judgment Matters', body: 'AI is a tool to help you discover  not a replacement for personal judgment. Always use common sense when exploring new places.' },
  ]},
  servicehub: { sections: [
    { heading: 'What is Service Hub?', body: 'Service Hub helps you locate essential nearby services including medical facilities, currency exchange, public bathrooms, transport, and police stations.' },
    { heading: 'Data Source', body: 'Service Hub results are powered by the Google Places API. Fynd does not verify or guarantee the accuracy of these listings.' },
    { heading: 'Important Disclaimer', bullets: ['Results are based on your current location', 'Listings may change without notice', 'Always confirm details before visiting', 'Fynd is not liable for inaccurate or outdated service information'] },
    { heading: 'Emergency Services', body: 'Service Hub is not a substitute for emergency services. In an emergency, always contact your local emergency number directly.' },
  ]},
  subscription: { sections: [
    { heading: 'Fynd Plus Subscription', body: 'Fynd Plus is a monthly subscription that unlocks unlimited places, itineraries, Service Hub access, and an ad-free experience.' },
    { heading: 'Free Trial', bullets: ['New users get a 7-day free trial', 'No charges during the trial period', 'Cancel anytime before trial ends to avoid billing'] },
    { heading: 'Billing', bullets: ['$9.99 per month after the free trial', 'Billed monthly to your chosen payment method', 'Payments processed securely via Stripe'] },
    { heading: 'Cancellation', body: 'You may cancel your subscription at any time from your Profile. Access continues until the end of the current billing period.' },
    { heading: 'Refunds', body: 'Fynd does not offer refunds for partial months. If you believe you were charged in error, contact support.' },
  ]},
  safety: { sections: [
    { heading: 'Your Safety Matters', body: 'Fynd is designed to help you explore confidently. Please read these safety guidelines before using the app during travel.' },
    { heading: 'General Safety', bullets: ['Always share your itinerary with someone you trust', 'Stay aware of your surroundings when following map directions', 'Do not rely solely on Fynd for navigation in remote areas'] },
    { heading: 'AI & Map Accuracy', bullets: ['AI-generated itineraries are suggestions only', 'Map data may not reflect real-time road or venue changes', 'Always check local conditions before visiting a new place'] },
    { heading: 'Emergency Situations', body: 'Use Service Hub to locate nearby medical or police services. In a life-threatening emergency, call local emergency services immediately.' },
    { heading: 'Reporting Issues', body: 'If you encounter unsafe or inaccurate content within Fynd, please report it via Support & Feedback in your Profile.' },
  ]},
  datadeletion: { sections: [
    { heading: 'Your Right to Deletion', body: 'You have the right to permanently delete your Fynd account and all associated data at any time.' },
    { heading: 'What Gets Deleted', bullets: ['Your profile and account information', 'All saved places and itineraries', 'Travel preferences and vibe selections', 'Subscription records (cancellation handled via Stripe)'] },
    { heading: 'What Happens After', body: 'Once deleted, your data cannot be recovered. You will be immediately logged out and your account permanently removed from our systems.' },
    { heading: 'How to Delete', body: 'Go to Profile  Account & Settings  Delete Account. Follow the on-screen confirmation steps.' },
    { heading: 'Need Help?', body: 'If you are having trouble deleting your account, contact us via Support & Feedback and we will process your request within 7 business days.' },
  ]},
};

export default function LegalDetailScreen({ navigation, route }: Props) {
  const { pageId = 'terms', title = 'Legal' } = route?.params || {};
  const content = LEGAL_CONTENT[pageId];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="#111827" style={{ opacity: 0.6 }} />
          <Text style={styles.backLabel}>{title}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {pageId === 'ai' && (
          <View style={styles.noticeBox}>
            <Ionicons name="sparkles" size={18} color="#22C55E" style={{ marginBottom: 6 }} />
            <Text style={styles.noticeTitle}>AI Recommendations Notice</Text>
            <Text style={styles.noticeText}>Fynd uses AI to suggest places and itineraries. Always use personal judgment when exploring.</Text>
          </View>
        )}
        {content?.sections.map((section, i) => (
          <View key={i} style={styles.section}>
            <Text style={styles.sectionHeading}>{section.heading}</Text>
            {section.body && <Text style={styles.sectionBody}>{section.body}</Text>}
            {section.bullets?.map((bullet, j) => (
              <View key={j} style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>{bullet}</Text>
              </View>
            ))}
          </View>
        ))}
        <Text style={styles.lastUpdated}>Last Updated: March 2026</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  topBar: { paddingHorizontal: 14, paddingTop: 40, paddingBottom: 8 },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  backLabel: { fontSize: 17, fontWeight: '600', color: '#111827', marginLeft: 4 },
  scroll: { paddingHorizontal: 20, paddingBottom: 60 },
  noticeBox: { backgroundColor: '#F2F2F7', borderRadius: 14, padding: 16, marginBottom: 24, marginTop: 8 },
  noticeTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  noticeText: { fontSize: 14, color: '#57636C', lineHeight: 20 },
  section: { marginBottom: 24 },
  sectionHeading: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 },
  sectionBody: { fontSize: 15, color: '#374151', lineHeight: 24 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E', marginTop: 8, marginRight: 10 },
  bulletText: { flex: 1, fontSize: 15, color: '#374151', lineHeight: 24 },
  lastUpdated: { fontSize: 12, color: '#8E8E93', textAlign: 'center', marginTop: 8 },
});
