import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, LayoutAnimation, Platform, UIManager } from 'react-native';

if (Platform.OS === 'android') UIManager.setLayoutAnimationEnabledExperimental?.(true);
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { F } from '../theme/fonts';
import { submitFeedback } from '../services/feedbackService';
import * as Sentry from '../services/sentry';
import AppHeader from '../components/AppHeader';
import FyndScrollContainer from '../components/FyndScrollContainer';

const QUICK_OPTIONS = [
  { id: 'love', emoji: '\uD83D\uDE0D', label: 'I love Fynd' },
  { id: 'better', emoji: '\uD83E\uDD14', label: 'Something could be better' },
  { id: 'issue', emoji: '\uD83D\uDEA8', label: 'I found an issue' },
];

type Props = { navigation?: any };

export default function SupportFeedbackScreen({ navigation }: Props) {
  const [quickSelected, setQuickSelected] = useState<string | null>(null);
  const [quickComment, setQuickComment] = useState('');
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [policyOpen, setPolicyOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const togglePolicy = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPolicyOpen(v => !v);
  };

  const handleSubmitFeedback = () => {
    submitFeedback({
      type: 'quick',
      sentiment: quickSelected as any,
      comment: quickComment.trim() || undefined,
    }).catch((err) => {
      Sentry.captureException(err, { tags: { context: 'SupportFeedback.submitQuick' } });
    });
    setSubmitted('feedback');
    setQuickSelected(null);
    setQuickComment('');
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setSubmitted(null), 2500);
  };

  const handleSubmitRating = () => {
    submitFeedback({
      type: 'rating',
      rating,
    }).catch((err) => {
      Sentry.captureException(err, { tags: { context: 'SupportFeedback.submitRating' } });
    });
    setSubmitted('rating');
    setRating(0);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setSubmitted(null), 2500);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader
        title="Feedback"
        onBack={navigation?.canGoBack?.() ? () => navigation.goBack() : undefined}
      />

      <FyndScrollContainer style={{ flex: 1 }} contentContainerStyle={styles.scroll}>

        {submitted && (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
            <Text style={styles.successText}>Thank you! Your feedback was sent.</Text>
          </View>
        )}

        {/* Quick Feedback */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Feedback</Text>
          <Text style={styles.sectionSubtitle}>Help us make Fynd better.</Text>
          <View style={styles.quickRow}>
            {QUICK_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.id}
                style={[styles.quickBtn, quickSelected === opt.id && styles.quickBtnSelected]}
                onPress={() => setQuickSelected(quickSelected === opt.id ? null : opt.id)}
              >
                <Text style={styles.quickEmoji}>{opt.emoji}</Text>
                <Text style={[styles.quickLabel, quickSelected === opt.id && styles.quickLabelSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {quickSelected && (
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.textArea}
                placeholder="Tell us more (optional)..."
                placeholderTextColor="#8E8E93"
                multiline
                numberOfLines={3}
                value={quickComment}
                onChangeText={setQuickComment}
              />
              <TouchableOpacity style={styles.sendBtn} onPress={handleSubmitFeedback}>
                <Text style={styles.sendBtnText}>Send Feedback</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        {/* Rate Fynd */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rate Fynd</Text>
          <Text style={styles.sectionSubtitle}>Enjoying Fynd? Rate your experience.</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(star => (
              <TouchableOpacity key={star} onPress={() => setRating(star)}>
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={40}
                  color={star <= rating ? '#F59E0B' : '#D1D5DB'}
                  style={{ marginHorizontal: 6 }}
                />
              </TouchableOpacity>
            ))}
          </View>
          {rating > 0 && (
            <TouchableOpacity style={[styles.sendBtn, { marginTop: 16 }]} onPress={handleSubmitRating}>
              <Text style={styles.sendBtnText}>Submit Rating</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.divider} />

        {/* Privacy Policy */}
        <View style={styles.policyWrapper}>
          <TouchableOpacity style={styles.policyHeader} onPress={togglePolicy} activeOpacity={0.7}>
            <View style={styles.policyHeaderLeft}>
              <View style={styles.policyIcon}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#22C55E" />
              </View>
              <Text style={styles.policyTitle}>Privacy Policy</Text>
            </View>
            <Ionicons
              name={policyOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="#8E8E93"
            />
          </TouchableOpacity>

          {policyOpen && (
            <View style={styles.policyBody}>
              <Text style={styles.policyUpdated}>Last updated: March 2026</Text>

              <Text style={styles.policyHeading}>Overview</Text>
              <Text style={styles.policyText}>
                Fynd ("we", "our", or "us") is committed to protecting your privacy. This policy explains what information we collect, how we use it, and your rights. By using Fynd you agree to this policy.
              </Text>

              <Text style={styles.policyHeading}>Data We Collect</Text>
              <Text style={styles.policyText}>
                <Text style={styles.policyBold}>Location data</Text> — When you tap "Use my location", Fynd requests your device's GPS coordinates to find nearby places. Location data is used only within your active session and is never stored on our servers.{'\n\n'}
                <Text style={styles.policyBold}>Feedback</Text> — If you submit feedback or a rating, only the content you type and your selected rating are recorded. No account or identity is linked to this data.{'\n\n'}
                <Text style={styles.policyBold}>Usage data</Text> — We may collect anonymous, aggregated analytics (e.g. app crashes, feature usage) to improve the app. This data cannot identify you personally.
              </Text>

              <Text style={styles.policyHeading}>Data We Do NOT Collect</Text>
              <Text style={styles.policyText}>
                Fynd does not require you to create an account. We do not collect your name, email, phone number, payment details, or any persistent identifier tied to you.
              </Text>

              <Text style={styles.policyHeading}>Third-Party Services</Text>
              <Text style={styles.policyText}>
                Fynd uses the <Text style={styles.policyBold}>Google Places API</Text> and <Text style={styles.policyBold}>Google Maps</Text> to search for and display locations. When you search for places, your destination query and (if provided) approximate location are sent to Google's servers. Google's privacy policy applies to this data: <Text style={styles.policyLink}>policies.google.com/privacy</Text>
              </Text>

              <Text style={styles.policyHeading}>Data Retention</Text>
              <Text style={styles.policyText}>
                Trip data (destinations, vibes, selected places) exists only in your device's memory for the duration of your session. Closing the app clears all trip data. We do not maintain a database of your trips.
              </Text>

              <Text style={styles.policyHeading}>Children's Privacy</Text>
              <Text style={styles.policyText}>
                Fynd is not directed at children under 13. We do not knowingly collect personal information from children. If you believe a child has provided personal data, contact us and we will delete it promptly.
              </Text>

              <Text style={styles.policyHeading}>Your Rights</Text>
              <Text style={styles.policyText}>
                Because Fynd collects no personal identifiers, there is no personal profile to access, export, or delete. If you submitted feedback and wish it removed, contact us at the address below.
              </Text>

              <Text style={styles.policyHeading}>Contact</Text>
              <Text style={styles.policyText}>
                Questions about this policy? Reach us via the Feedback tab above or at{' '}
                <Text style={styles.policyLink}>support@fynd.app</Text>
              </Text>
            </View>
          )}
        </View>

      </FyndScrollContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { paddingHorizontal: 16, paddingBottom: 80 },
  successBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', borderRadius: 14, padding: 14, marginTop: 16, marginBottom: 4, gap: 8, borderWidth: 1, borderColor: '#BBF7D0' },
  successText: { fontSize: 14, color: '#16A34A', fontFamily: 'Inter_500Medium' },
  section: { paddingVertical: 20 },
  sectionTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#111827', marginBottom: 3 },
  sectionSubtitle: { fontSize: 13, color: '#6B7280', marginBottom: 16 },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginHorizontal: 4 },
  quickRow: { gap: 8 },
  quickBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, padding: 14, backgroundColor: '#fff', marginBottom: 4, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  quickBtnSelected: { borderColor: '#22C55E', backgroundColor: '#F0FDF4' },
  quickEmoji: { fontSize: 20, marginRight: 12 },
  quickLabel: { fontSize: 15, color: '#374151' },
  quickLabelSelected: { color: '#22C55E', fontFamily: 'Inter_500Medium' },
  inputWrap: { marginTop: 12 },
  textArea: { backgroundColor: '#fff', borderRadius: 14, padding: 14, fontSize: 15, color: '#111827', minHeight: 96, textAlignVertical: 'top', borderWidth: 1, borderColor: '#E5E7EB' },
  sendBtn: { backgroundColor: '#22C55E', borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center', marginTop: 10, shadowColor: '#22C55E', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  sendBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  starsRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 4 },

  // Privacy Policy
  policyWrapper: {
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    overflow: 'hidden',
  },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#F9FAFB',
  },
  policyHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  policyIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  policyTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  policyBody: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  policyUpdated: { fontSize: 11, color: '#8E8E93', marginTop: 12, marginBottom: 16 },
  policyHeading: { fontSize: 13, fontWeight: '700', color: '#111827', marginTop: 14, marginBottom: 4 },
  policyText: { fontSize: 13, color: '#374151', lineHeight: 20 },
  policyBold: { fontWeight: '600', color: '#111827' },
  policyLink: { color: '#22C55E', fontWeight: '500' },
});
