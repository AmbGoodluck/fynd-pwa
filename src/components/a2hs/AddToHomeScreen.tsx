/**
 * AddToHomeScreen — Smart A2HS prompt.
 * Web-only. Renders null on native platforms or when conditions aren't met.
 *
 * Mount this once at the root level (AppNavigator) — it manages its own
 * visibility internally via the useAddToHomeScreen hook.
 */
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  TouchableWithoutFeedback,
  Platform,
  Image,
  useWindowDimensions,
} from 'react-native';
import { F } from '../../theme/fonts';
import { useAddToHomeScreen } from '../../hooks/useAddToHomeScreen';
import A2HSInstructions from './A2HSInstructions';

// Bottom tab bar height to sit above it
const TAB_BAR_H = 60;

export default function AddToHomeScreen() {
  const { width } = useWindowDimensions();
  const {
    shouldShow,
    platform,
    isStandalone,
    dismiss,
    triggerInstall,
    showInstructions,
    setShowInstructions,
  } = useAddToHomeScreen();

  const isDesktop = width >= 768;

  // Animations
  const slideAnim  = useRef(new Animated.Value(300)).current;
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const toastAnim  = useRef(new Animated.Value(100)).current;
  const toastFade  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (shouldShow) {
      if (isDesktop) {
        Animated.parallel([
          Animated.timing(toastAnim, { toValue: 0, duration: 380, useNativeDriver: true }),
          Animated.timing(toastFade, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]).start();
      } else {
        Animated.parallel([
          Animated.spring(slideAnim, {
            toValue: 0,
            tension: 100,
            friction: 14,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]).start();
      }
    }
  }, [shouldShow, isDesktop]);

  if (Platform.OS !== 'web') return null;
  if (!shouldShow || isStandalone) {
    if (showInstructions && (platform === 'safari-ios' || platform === 'safari-macos')) {
      return (
        <A2HSInstructions
          platform={platform as 'safari-ios' | 'safari-macos'}
          onClose={() => setShowInstructions(false)}
        />
      );
    }
    return null;
  }

  const handleInstall = () => triggerInstall();

  const handleDismiss = () => {
    if (isDesktop) {
      Animated.parallel([
        Animated.timing(toastAnim, { toValue: 100, duration: 250, useNativeDriver: true }),
        Animated.timing(toastFade, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => dismiss());
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 300, duration: 280, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start(() => dismiss());
    }
  };

  if (showInstructions && (platform === 'safari-ios' || platform === 'safari-macos')) {
    return (
      <A2HSInstructions
        platform={platform as 'safari-ios' | 'safari-macos'}
        onClose={() => { setShowInstructions(false); dismiss(); }}
      />
    );
  }

  // ── Desktop toast ─────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <Animated.View
        style={[
          styles.toast,
          {
            opacity: toastFade,
            transform: [{ translateY: toastAnim }],
          },
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.toastInner}>
          <View style={styles.toastLeft}>
            <View style={styles.toastIconWrap}>
              <Image
                source={require('../../../assets/logo-icon.png')}
                style={styles.toastIcon}
                resizeMode="contain"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.toastTitle}>Get the full Fynd experience</Text>
              <Text style={styles.toastBody}>
                Add to your desktop for instant access and faster loading.
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.toastBtn} onPress={handleInstall}>
            <Text style={styles.toastBtnText}>Add to Dock</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toastClose}
            onPress={handleDismiss}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.closeX}>✕</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }

  // ── Mobile bottom sheet ───────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={handleDismiss}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
      </TouchableWithoutFeedback>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Drag handle */}
        <View style={styles.handle} />

        {/* Close button */}
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={handleDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.closeX}>✕</Text>
        </TouchableOpacity>

        {/* App icon */}
        <View style={styles.iconWrap}>
          <Image
            source={require('../../../assets/logo-icon.png')}
            style={styles.appIcon}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.headline}>Get the full Fynd experience</Text>
        <Text style={styles.body}>
          Add Fynd to your home screen for instant access, faster loading, and
          notifications when places are trending near you.
        </Text>

        <TouchableOpacity style={styles.primaryBtn} onPress={handleInstall}>
          <Text style={styles.primaryBtnText}>Add to Home Screen</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.notNowBtn} onPress={handleDismiss}>
          <Text style={styles.notNowText}>Not now</Text>
        </TouchableOpacity>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  // ── Mobile ──────────────────────────────────────────────────────────────────
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 900,
  } as any,
  sheet: {
    position: 'absolute' as any,
    left: 0,
    right: 0,
    bottom: TAB_BAR_H,
    zIndex: 901,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 16,
    maxWidth: 480,
    alignSelf: 'center' as any,
    width: '100%' as any,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E5EA',
    marginBottom: 16,
  },
  closeBtn: {
    position: 'absolute' as any,
    top: 16,
    right: 20,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeX: {
    fontSize: 16,
    color: '#9CA3AF',
    fontFamily: F.regular,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  appIcon: {
    width: 44,
    height: 44,
  },
  headline: {
    fontSize: 20,
    fontFamily: F.bold,
    color: '#111827',
    textAlign: 'center',
    marginBottom: 10,
  },
  body: {
    fontSize: 14,
    fontFamily: F.regular,
    color: '#57636C',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
    marginBottom: 24,
  },
  primaryBtn: {
    width: '100%' as any,
    backgroundColor: '#10B981',
    borderRadius: 16,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#10B981',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  primaryBtnText: {
    fontSize: 16,
    fontFamily: F.bold,
    color: '#fff',
  },
  notNowBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  notNowText: {
    fontSize: 14,
    fontFamily: F.medium,
    color: '#9CA3AF',
  },

  // ── Desktop toast ──────────────────────────────────────────────────────────
  toast: {
    position: 'fixed' as any,
    bottom: 24,
    right: 24,
    zIndex: 950,
    width: 380,
  },
  toastInner: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
    borderWidth: 1,
    borderColor: '#F2F2F7',
    gap: 12,
  },
  toastLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  toastIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    flexShrink: 0,
  },
  toastIcon: { width: 30, height: 30 },
  toastTitle: {
    fontSize: 15,
    fontFamily: F.semibold,
    color: '#111827',
    marginBottom: 3,
  },
  toastBody: {
    fontSize: 13,
    fontFamily: F.regular,
    color: '#6B7280',
    lineHeight: 18,
  },
  toastBtn: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastBtnText: {
    fontSize: 14,
    fontFamily: F.bold,
    color: '#fff',
  },
  toastClose: {
    position: 'absolute' as any,
    top: 12,
    right: 12,
  },
});
