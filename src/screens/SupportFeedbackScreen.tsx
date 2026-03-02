import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

type Props = { navigation: any };

const FAQS = [
  { q: 'How does Fynd choose places?', a: 'Fynd combines your selected vibes, destination, and exploration time to search Google Places, then uses AI to personalise and rank results just for you.' },
  { q: 'How do I edit my itinerary?', a: 'Open any itinerary and tap "Remove Place" on any stop. You can also ignore the whole itinerary and generate a new one from Suggested Places.' },
  { q: 'What is the Service Hub?', a: 'Service Hub helps you find essential nearby services while travelling  medical facilities, currency exchange, public bathrooms, transport, and more.' },
  { q: 'How do subscriptions work?', a: 'Fynd Plus gives you unlimited places, itineraries, and Service Hub access for $9.99/month after a free 7-day trial. Cancel anytime from your Profile.' },
];

const SCREENS = ['Home', 'Create Trip', 'Suggested Places', 'Itinerary', 'Map', 'Service Hub', 'Saved', 'Profile', 'Other'];
const CATEGORIES = ['New feature idea', 'UI/UX improvement', 'Travel recommendations', 'Service Hub improvement'];
const QUICK_OPTIONS = [
  { id: 'love', emoji: '', label: 'I love Fynd' },
  { id: 'better', emoji: '', label: 'Something could be better' },
  { id: 'issue', emoji: '', label: 'I found an issue' },
];

export default function SupportFeedbackScreen({ navigation }: Props) {
  const [quickSelected, setQuickSelected] = useState<string | null>(null);
  const [quickComment, setQuickComment] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [suggestionCategory, setSuggestionCategory] = useState('New feature idea');
  const [problemDesc, setProblemDesc] = useState('');
  const [problemScreen, setProblemScreen] = useState('');
  const [rating, setRating] = useState(0);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [showScreenPicker, setShowScreenPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const handleSubmit = (type: string) => {
    setSubmitted(type);
    setTimeout(() => setSubmitted(null), 2500);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="#111827" style={{ opacity: 0.6 }} />
          <Text style={styles.backLabel}>Support & Feedback</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {submitted && (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
            <Text style={styles.successText}>Thank you! Your feedback was sent.</Text>
          </View>
        )}

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
                <Text style={[styles.quickLabel, quickSelected === opt.id && styles.quickLabelSelected]}>{opt.label}</Text>
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
              <TouchableOpacity style={styles.sendBtn} onPress={() => { handleSubmit('quick'); setQuickSelected(null); setQuickComment(''); }}>
                <Text style={styles.sendBtnText}>Send Feedback</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Suggest an Improvement</Text>
          <TouchableOpacity style={styles.picker} onPress={() => setShowCategoryPicker(!showCategoryPicker)}>
            <Text style={styles.pickerText}>{suggestionCategory}</Text>
            <Ionicons name={showCategoryPicker ? 'chevron-up' : 'chevron-down'} size={18} color="#57636C" />
          </TouchableOpacity>
          {showCategoryPicker && (
            <View style={styles.pickerDropdown}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity key={cat} style={styles.pickerOption} onPress={() => { setSuggestionCategory(cat); setShowCategoryPicker(false); }}>
                  <Text style={[styles.pickerOptionText, suggestionCategory === cat && styles.pickerOptionActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.textArea}
              placeholder="What would make Fynd better for you?"
              placeholderTextColor="#8E8E93"
              multiline
              numberOfLines={3}
              value={suggestion}
              onChangeText={setSuggestion}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={() => { handleSubmit('suggestion'); setSuggestion(''); }}>
              <Text style={styles.sendBtnText}>Send Suggestion</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Report a Problem</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.textArea}
              placeholder="What happened?"
              placeholderTextColor="#8E8E93"
              multiline
              numberOfLines={3}
              value={problemDesc}
              onChangeText={setProblemDesc}
            />
          </View>
          <TouchableOpacity style={styles.picker} onPress={() => setShowScreenPicker(!showScreenPicker)}>
            <Text style={[styles.pickerText, !problemScreen && { color: '#8E8E93' }]}>{problemScreen || 'What screen were you on? (optional)'}</Text>
            <Ionicons name={showScreenPicker ? 'chevron-up' : 'chevron-down'} size={18} color="#57636C" />
          </TouchableOpacity>
          {showScreenPicker && (
            <View style={styles.pickerDropdown}>
              {SCREENS.map(s => (
                <TouchableOpacity key={s} style={styles.pickerOption} onPress={() => { setProblemScreen(s); setShowScreenPicker(false); }}>
                  <Text style={[styles.pickerOptionText, problemScreen === s && styles.pickerOptionActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <TouchableOpacity style={[styles.sendBtn, { marginTop: 10 }]} onPress={() => { handleSubmit('report'); setProblemDesc(''); setProblemScreen(''); }}>
            <Text style={styles.sendBtnText}>Send Report</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rate Fynd</Text>
          <Text style={styles.sectionSubtitle}>Enjoying Fynd? Rate your experience.</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(star => (
              <TouchableOpacity key={star} onPress={() => setRating(star)}>
                <Ionicons name={star <= rating ? 'star' : 'star-outline'} size={36} color={star <= rating ? '#F59E0B' : '#D1D5DB'} style={{ marginHorizontal: 6 }} />
              </TouchableOpacity>
            ))}
          </View>
          {rating > 0 && (
            <TouchableOpacity style={[styles.sendBtn, { marginTop: 12 }]} onPress={() => { handleSubmit('rating'); setRating(0); }}>
              <Text style={styles.sendBtnText}>Submit Rating</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Support</Text>
          <View style={styles.contactBox}>
            <Ionicons name="mail-outline" size={20} color="#22C55E" style={{ marginRight: 10 }} />
            <View>
              <Text style={styles.contactLabel}>Need help?</Text>
              <TouchableOpacity onPress={() => Linking.openURL('mailto:support@fynd.app')}>
                <Text style={styles.contactEmail}>support@fynd.app</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>FAQs</Text>
          {FAQS.map((faq, i) => (
            <TouchableOpacity key={i} style={styles.faqItem} onPress={() => setExpandedFaq(expandedFaq === i ? null : i)}>
              <View style={styles.faqRow}>
                <Text style={styles.faqQ}>{faq.q}</Text>
                <Ionicons name={expandedFaq === i ? 'chevron-up' : 'chevron-down'} size={18} color="#57636C" style={{ opacity: 0.5 }} />
              </View>
              {expandedFaq === i && <Text style={styles.faqA}>{faq.a}</Text>}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.lastUpdated}>Last Updated: March 2026</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  topBar: { paddingHorizontal: 14, paddingTop: 0, paddingBottom: 8 },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  backLabel: { fontSize: 17, fontWeight: '600', color: '#111827', marginLeft: 4 },
  scroll: { paddingHorizontal: 20, paddingBottom: 60 },
  successBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12, marginBottom: 16, gap: 8 },
  successText: { fontSize: 14, color: '#22C55E', fontWeight: '500' },
  section: { paddingVertical: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 4 },
  sectionSubtitle: { fontSize: 14, color: '#57636C', marginBottom: 14 },
  divider: { height: 1, backgroundColor: '#F2F2F7' },
  quickRow: { gap: 8 },
  quickBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 12, padding: 12, backgroundColor: '#fff', marginBottom: 4 },
  quickBtnSelected: { borderColor: '#22C55E', backgroundColor: '#F0FDF4' },
  quickEmoji: { fontSize: 20, marginRight: 10 },
  quickLabel: { fontSize: 15, color: '#111827' },
  quickLabelSelected: { color: '#22C55E', fontWeight: '500' },
  inputWrap: { marginTop: 10 },
  textArea: { backgroundColor: '#F2F2F7', borderRadius: 12, padding: 14, fontSize: 15, color: '#111827', minHeight: 90, textAlignVertical: 'top', borderWidth: 1, borderColor: '#E5E5EA' },
  sendBtn: { backgroundColor: '#22C55E', borderRadius: 12, height: 44, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  sendBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  picker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 12, padding: 14, backgroundColor: '#F2F2F7', marginTop: 10 },
  pickerText: { fontSize: 15, color: '#111827' },
  pickerDropdown: { borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 12, backgroundColor: '#fff', marginTop: 4, overflow: 'hidden' },
  pickerOption: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
  pickerOptionText: { fontSize: 15, color: '#111827' },
  pickerOptionActive: { color: '#22C55E', fontWeight: '600' },
  starsRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 10 },
  contactBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F2F7', borderRadius: 14, padding: 16 },
  contactLabel: { fontSize: 13, color: '#57636C', marginBottom: 2 },
  contactEmail: { fontSize: 15, color: '#22C55E', fontWeight: '500' },
  faqItem: { borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 12, padding: 14, marginBottom: 8, backgroundColor: '#fff' },
  faqRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQ: { fontSize: 15, fontWeight: '500', color: '#111827', flex: 1, marginRight: 8 },
  faqA: { fontSize: 14, color: '#57636C', marginTop: 10, lineHeight: 22 },
  lastUpdated: { fontSize: 12, color: '#8E8E93', textAlign: 'center', marginTop: 16 },
});



