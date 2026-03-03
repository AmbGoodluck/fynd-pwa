import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { F } from '../theme/fonts';

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

  const handleSubmitFeedback = () => {
    setSubmitted('feedback');
    setQuickSelected(null);
    setQuickComment('');
    setTimeout(() => setSubmitted(null), 2500);
  };

  const handleSubmitRating = () => {
    setSubmitted('rating');
    setRating(0);
    setTimeout(() => setSubmitted(null), 2500);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Feedback</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

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

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  topBar: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
  topBarTitle: { fontSize: 22, fontWeight: '700', color: '#111827' },
  scroll: { paddingHorizontal: 20, paddingBottom: 60 },
  successBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12, marginTop: 16, marginBottom: 4, gap: 8 },
  successText: { fontSize: 14, color: '#22C55E', fontWeight: '500' },
  section: { paddingVertical: 24 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 4 },
  sectionSubtitle: { fontSize: 14, color: '#57636C', marginBottom: 16 },
  divider: { height: 1, backgroundColor: '#F2F2F7' },
  quickRow: { gap: 8 },
  quickBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 12, padding: 14, backgroundColor: '#fff', marginBottom: 4 },
  quickBtnSelected: { borderColor: '#22C55E', backgroundColor: '#F0FDF4' },
  quickEmoji: { fontSize: 20, marginRight: 12 },
  quickLabel: { fontSize: 15, color: '#111827' },
  quickLabelSelected: { color: '#22C55E', fontWeight: '500' },
  inputWrap: { marginTop: 12 },
  textArea: { backgroundColor: '#F2F2F7', borderRadius: 12, padding: 14, fontSize: 15, color: '#111827', minHeight: 90, textAlignVertical: 'top', borderWidth: 1, borderColor: '#E5E5EA' },
  sendBtn: { backgroundColor: '#22C55E', borderRadius: 12, height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  sendBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  starsRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 4 },
});
