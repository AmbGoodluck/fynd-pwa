import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  Animated,
  ScrollView,
  Platform,
} from 'react-native';
import { F } from '../../theme/fonts';
import { COLORS } from '../../theme/tokens';
import type { A2HSPlatform } from '../../hooks/useAddToHomeScreen';

interface A2HSInstructionsProps {
  platform: Extract<A2HSPlatform, 'safari-ios' | 'safari-macos'>;
  onClose: () => void;
}

// ── Inline SVG icons (web only) ───────────────────────────────────────────────
function ShareIcon() {
  if (Platform.OS !== 'web') return null;
  return React.createElement('svg', {
    width: 28, height: 28, viewBox: '0 0 28 28',
    fill: 'none', stroke: COLORS.accent.primary, strokeWidth: 2,
    strokeLinecap: 'round', strokeLinejoin: 'round',
  },
    React.createElement('rect', { x: 4, y: 8, width: 20, height: 16, rx: 4 }),
    React.createElement('polyline', { points: '10,8 14,3 18,8' }),
    React.createElement('line', { x1: 14, y1: 3, x2: 14, y2: 18 }),
  );
}

function AddIcon() {
  if (Platform.OS !== 'web') return null;
  return React.createElement('svg', {
    width: 28, height: 28, viewBox: '0 0 28 28',
    fill: 'none', stroke: COLORS.accent.primary, strokeWidth: 2,
    strokeLinecap: 'round', strokeLinejoin: 'round',
  },
    React.createElement('rect', { x: 4, y: 4, width: 20, height: 20, rx: 4 }),
    React.createElement('line', { x1: 14, y1: 9, x2: 14, y2: 19 }),
    React.createElement('line', { x1: 9, y1: 14, x2: 19, y2: 14 }),
  );
}

function DockIcon() {
  if (Platform.OS !== 'web') return null;
  return React.createElement('svg', {
    width: 28, height: 28, viewBox: '0 0 28 28',
    fill: 'none', stroke: COLORS.accent.primary, strokeWidth: 2,
    strokeLinecap: 'round', strokeLinejoin: 'round',
  },
    React.createElement('rect', { x: 4, y: 6, width: 20, height: 14, rx: 3 }),
    React.createElement('rect', { x: 2, y: 20, width: 24, height: 4, rx: 2 }),
  );
}

function CheckIcon() {
  if (Platform.OS !== 'web') return null;
  return React.createElement('svg', {
    width: 28, height: 28, viewBox: '0 0 28 28',
    fill: 'none', stroke: COLORS.accent.primary, strokeWidth: 2.5,
    strokeLinecap: 'round', strokeLinejoin: 'round',
  },
    React.createElement('circle', { cx: 14, cy: 14, r: 10 }),
    React.createElement('polyline', { points: '9,14 12,17 19,11' }),
  );
}

// ── Step row ──────────────────────────────────────────────────────────────────

function StepRow({
  number,
  title,
  subtitle,
  icon,
}: {
  number: number;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <View style={styles.step}>
      <View style={styles.stepLeft}>
        <View style={styles.stepBadge}>
          <Text style={styles.stepNum}>{number}</Text>
        </View>
        <View style={styles.stepIconWrap}>{icon}</View>
      </View>
      <View style={styles.stepText}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepSub}>{subtitle}</Text>
      </View>
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function A2HSInstructions({ platform, onClose }: A2HSInstructionsProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 200, friction: 20, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 160, useNativeDriver: true }),
    ]).start(onClose);
  };

  const isIOS = platform === 'safari-ios';

  const steps = isIOS
    ? [
        { title: 'Tap the Share button', subtitle: "It's at the bottom of Safari (the square with an arrow)", icon: <ShareIcon /> },
        { title: "Tap 'Add to Home Screen'", subtitle: 'Scroll down in the share menu to find it', icon: <AddIcon /> },
        { title: "Tap 'Add' — you're all set!", subtitle: 'Fynd will appear on your home screen like an app', icon: <CheckIcon /> },
      ]
    : [
        { title: "Click the Share button in Safari's toolbar", subtitle: 'The square with an arrow at the top of the window', icon: <ShareIcon /> },
        { title: "Click 'Add to Dock'", subtitle: 'Find it near the bottom of the share menu', icon: <DockIcon /> },
        { title: "Click 'Add' — you're all set!", subtitle: 'Fynd will appear in your Dock for quick access', icon: <CheckIcon /> },
      ];

  return (
    <Modal visible transparent animationType="none" onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.card,
                { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
              ]}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Install Fynd</Text>
                <Text style={styles.cardSub}>
                  Follow these 3 simple steps:
                </Text>
              </View>

              <ScrollView
                style={styles.stepsScroll}
                contentContainerStyle={styles.stepsContent}
                showsVerticalScrollIndicator={false}
              >
                {steps.map((s, i) => (
                  <StepRow
                    key={i}
                    number={i + 1}
                    title={s.title}
                    subtitle={s.subtitle}
                    icon={s.icon}
                  />
                ))}
              </ScrollView>

              <TouchableOpacity style={styles.gotItBtn} onPress={handleClose}>
                <Text style={styles.gotItText}>Got it</Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 28,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 22,
    fontFamily: F.bold,
    color: '#111827',
    marginBottom: 6,
    textAlign: 'center',
  },
  cardSub: {
    fontSize: 14,
    fontFamily: F.regular,
    color: '#6B7280',
    textAlign: 'center',
  },
  stepsScroll: { maxHeight: 280 },
  stepsContent: { gap: 20 },

  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  stepLeft: {
    alignItems: 'center',
    gap: 8,
    width: 44,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: {
    fontSize: 12,
    fontFamily: F.bold,
    color: '#fff',
  },
  stepIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.accent.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    flex: 1,
    paddingTop: 2,
  },
  stepTitle: {
    fontSize: 15,
    fontFamily: F.semibold,
    color: '#111827',
    marginBottom: 3,
    lineHeight: 20,
  },
  stepSub: {
    fontSize: 13,
    fontFamily: F.regular,
    color: '#6B7280',
    lineHeight: 18,
  },

  gotItBtn: {
    marginTop: 28,
    width: '100%',
    backgroundColor: COLORS.accent.primary,
    borderRadius: 16,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accent.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  gotItText: {
    fontSize: 16,
    fontFamily: F.bold,
    color: '#fff',
  },
});
