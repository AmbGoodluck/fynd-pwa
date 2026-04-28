import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { F } from '../theme/fonts';
import { COLORS } from '../theme/tokens';
import { isGoogleMapsUrl } from '../services/bookingDetectionService';

// WebView is only available on native — import conditionally to avoid web crashes
let WebView: any = null;
if (Platform.OS !== 'web') {
  try {
    WebView = require('react-native-webview').WebView;
  } catch {
    // not installed — fallback to external browser
  }
}

/**
 * Returns true if `url` is a well-formed http/https URL that is NOT a Google Maps link.
 * Sections 2 + 6: blocks maps.google.com, google.com/maps, goo.gl/maps.
 */
export function isValidBookingUrl(url: string | undefined | null): boolean {
  if (!url || typeof url !== 'string' || url.trim().length === 0) return false;
  // Block Google Maps URLs — they are not booking pages
  if (isGoogleMapsUrl(url)) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

type Props = {
  visible: boolean;
  url: string;
  title?: string;
  /** Optional place ID — used to wire up booking feedback (Section 9) */
  placeId?: string;
  onClose: () => void;
  /** Called when the user answers the "Was this correct?" feedback prompt */
  onFeedback?: (placeId: string, positive: boolean) => void;
};

export default function BookingWebViewModal({
  visible, url, title, placeId, onClose, onFeedback,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  // Section 9: show feedback bar after successful load
  const [showFeedback, setShowFeedback] = useState(false);
  const { top: topInset } = useSafeAreaInsets();

  // On web or when WebView is unavailable, open externally but keep Modal open for feedback
  React.useEffect(() => {
    if (visible && (Platform.OS === 'web' || !WebView)) {
      try {
        if (typeof window !== 'undefined' && window.open) {
          window.open(url, '_blank');
        } else {
          Linking.openURL(url).catch(() => {});
        }
      } catch {
        Linking.openURL(url).catch(() => {});
      }
      if (placeId && onFeedback) {
        setShowFeedback(true);
      }
    }
  }, [visible, url, placeId, onFeedback]);

  const handleOpenExternal = () => {
    Linking.openURL(url).catch(() => {});
    onClose();
  };

  const handleError = () => {
    setHasError(true);
    setLoading(false);
    setShowFeedback(false);
  };

  const handleLoad = () => {
    setLoading(false);
    setHasError(false);
    // Section 9: surface feedback bar once page has loaded
    if (placeId && onFeedback) setShowFeedback(true);
  };

  const handleHttpError = (e: any) => {
    // Section 11: booking page HTTP error → hide Book Now (show error state)
    if (e?.nativeEvent?.statusCode >= 400) {
      handleError();
    }
  };

  const resetState = () => {
    setLoading(true);
    setHasError(false);
    setShowFeedback(false);
  };

  const handleFeedback = (positive: boolean) => {
    if (placeId && onFeedback) onFeedback(placeId, positive);
    setShowFeedback(false);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onShow={resetState}
    >
      <View style={[styles.container, { paddingTop: topInset }]}>
        {/* ── Header ─────────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={24} color="#111827" />
          </TouchableOpacity>

          <Text style={styles.headerTitle} numberOfLines={1}>
            {title || 'Book Now'}
          </Text>

          <TouchableOpacity
            onPress={handleOpenExternal}
            style={styles.externalBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="open-outline" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* ── Error state ────────────────────────────────────── */}
        {hasError ? (
          <View style={styles.errorState}>
            <Ionicons name="alert-circle-outline" size={60} color="#E5E5EA" />
            <Text style={styles.errorTitle}>Booking Unavailable</Text>
            <Text style={styles.errorBody}>
              Booking page unavailable for this location.
            </Text>
            <TouchableOpacity
              style={styles.fallbackBtn}
              onPress={handleOpenExternal}
            >
              <Ionicons
                name="open-outline"
                size={16}
                color="#fff"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.fallbackBtnText}>Open in Browser</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        ) : Platform.OS === 'web' || !WebView ? (
          /* ── Web / External State ────────────────────────── */
          <View style={styles.errorState}>
            <Ionicons name="open-outline" size={60} color={COLORS.accent.primary} />
            <Text style={styles.errorTitle}>Booking Opened</Text>
            <Text style={styles.errorBody}>
              The booking page has been opened in a new tab or external browser.
            </Text>
            {showFeedback && placeId && onFeedback ? (
              <View style={{ marginTop: 20, alignItems: 'center' }}>
                <Text style={[styles.feedbackQuestion, { marginRight: 0, marginBottom: 16, textAlign: 'center' }]}>
                  Was this the correct booking page?
                </Text>
                <View style={styles.feedbackBtns}>
                  <TouchableOpacity
                    style={[styles.feedbackBtn, styles.feedbackBtnYes, { paddingHorizontal: 20, paddingVertical: 10 }]}
                    onPress={() => handleFeedback(true)}
                  >
                    <Ionicons name="thumbs-up-outline" size={16} color={COLORS.accent.primary} />
                    <Text style={[styles.feedbackBtnTextYes, { fontSize: 15 }]}>Yes, it was correct</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.feedbackBtn, styles.feedbackBtnNo, { paddingHorizontal: 20, paddingVertical: 10 }]}
                    onPress={() => handleFeedback(false)}
                  >
                    <Ionicons name="thumbs-down-outline" size={16} color="#EF4444" />
                    <Text style={[styles.feedbackBtnTextNo, { fontSize: 15 }]}>No, wrong page</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
               <TouchableOpacity style={styles.fallbackBtn} onPress={onClose}>
                 <Text style={styles.fallbackBtnText}>Close</Text>
               </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.cancelBtn, { marginTop: 16 }]} onPress={handleOpenExternal}>
              <Text style={styles.cancelBtnText}>Open link again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* ── WebView ─────────────────────────────────────── */
          <View style={styles.webviewWrap}>
            {WebView && (
              <WebView
                source={{ uri: url }}
                onLoadStart={() => setLoading(true)}
                onLoad={handleLoad}
                onLoadEnd={() => setLoading(false)}
                onError={handleError}
                onHttpError={handleHttpError}
                style={styles.webview}
                javaScriptEnabled
                domStorageEnabled
                allowsBackForwardNavigationGestures
                allowsInlineMediaPlayback
              />
            )}

            {loading && (
              <View style={styles.loadingOverlay} pointerEvents="none">
                <ActivityIndicator size="large" color={COLORS.accent.primary} />
                <Text style={styles.loadingText}>Loading booking page…</Text>
              </View>
            )}

            {/* ── Section 9: Feedback bar ───────────────────── */}
            {showFeedback && (
              <View style={styles.feedbackBar}>
                <Text style={styles.feedbackQuestion}>
                  Was this the correct booking page?
                </Text>
                <View style={styles.feedbackBtns}>
                  <TouchableOpacity
                    style={[styles.feedbackBtn, styles.feedbackBtnYes]}
                    onPress={() => handleFeedback(true)}
                  >
                    <Ionicons name="thumbs-up-outline" size={14} color={COLORS.accent.primary} />
                    <Text style={styles.feedbackBtnTextYes}>Yes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.feedbackBtn, styles.feedbackBtnNo]}
                    onPress={() => handleFeedback(false)}
                  >
                    <Ionicons name="thumbs-down-outline" size={14} color="#EF4444" />
                    <Text style={styles.feedbackBtnTextNo}>No</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    backgroundColor: '#fff',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontFamily: F.semibold,
    color: '#111827',
    marginHorizontal: 8,
  },
  externalBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  webviewWrap: { flex: 1, position: 'relative' },
  webview: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: { fontSize: 14, color: '#6B7280', fontFamily: F.medium },

  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  errorTitle: {
    fontSize: 20,
    fontFamily: F.bold,
    color: '#111827',
    textAlign: 'center',
  },
  errorBody: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  fallbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent.primary,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  fallbackBtnText: { color: '#fff', fontSize: 15, fontFamily: F.semibold },
  cancelBtn: { paddingVertical: 10 },
  cancelBtnText: { color: '#9CA3AF', fontSize: 14 },

  // Section 9: feedback bar
  feedbackBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 4,
  },
  feedbackQuestion: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    fontFamily: F.medium,
    marginRight: 12,
  },
  feedbackBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  feedbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  feedbackBtnYes: {
    borderColor: '#BBF7D0',
    backgroundColor: COLORS.accent.primaryLight,
  },
  feedbackBtnNo: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  feedbackBtnTextYes: { fontSize: 13, color: COLORS.accent.primary, fontFamily: F.semibold },
  feedbackBtnTextNo:  { fontSize: 13, color: '#EF4444', fontFamily: F.semibold },
});
