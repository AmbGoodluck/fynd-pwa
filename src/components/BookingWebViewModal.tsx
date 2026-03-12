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

// WebView is only available on native — import conditionally to avoid web crashes
let WebView: any = null;
if (Platform.OS !== 'web') {
  try {
    WebView = require('react-native-webview').WebView;
  } catch {
    // not installed — fallback to external browser
  }
}

/** Returns true if `url` is a well-formed http/https URL */
export function isValidBookingUrl(url: string | undefined | null): boolean {
  if (!url || typeof url !== 'string' || url.trim().length === 0) return false;
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
  onClose: () => void;
};

export default function BookingWebViewModal({ visible, url, title, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const { top: topInset } = useSafeAreaInsets();

  // On web or when WebView is unavailable, open externally and close immediately
  if (Platform.OS === 'web' || !WebView) {
    if (visible) {
      try {
        (window as any).open(url, '_blank');
      } catch {
        Linking.openURL(url).catch(() => {});
      }
      // Defer close to next tick so the caller's state update completes
      setTimeout(onClose, 0);
    }
    return null;
  }

  const handleOpenExternal = () => {
    Linking.openURL(url).catch(() => {});
    onClose();
  };

  const handleError = () => {
    setHasError(true);
    setLoading(false);
  };

  const handleLoad = () => {
    setLoading(false);
    setHasError(false);
  };

  const handleHttpError = (e: any) => {
    if (e?.nativeEvent?.statusCode >= 400) {
      handleError();
    }
  };

  const resetState = () => {
    setLoading(true);
    setHasError(false);
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
        ) : (
          /* ── WebView ─────────────────────────────────────── */
          <View style={styles.webviewWrap}>
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

            {loading && (
              <View style={styles.loadingOverlay} pointerEvents="none">
                <ActivityIndicator size="large" color="#22C55E" />
                <Text style={styles.loadingText}>Loading booking page…</Text>
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
    backgroundColor: '#22C55E',
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  fallbackBtnText: { color: '#fff', fontSize: 15, fontFamily: F.semibold },
  cancelBtn: { paddingVertical: 10 },
  cancelBtnText: { color: '#9CA3AF', fontSize: 14 },
});
