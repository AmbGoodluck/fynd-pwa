import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { F } from '../theme/fonts';

type Props = {
  title: string;
  onBack?: () => void;
};

/**
 * Unified Fynd app header.
 * - Left:   back chevron (if onBack) OR empty spacer
 * - Center: green accent bar + title
 * - Right:  Fynd logo-icon (always, opposite the back arrow)
 */
export default function AppHeader({ title, onBack }: Props) {
  return (
    <View style={styles.container}>
      {/* Left slot — back arrow or spacer */}
      <View style={styles.left}>
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={26} color="#111827" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Center — title */}
      <View style={styles.titleRow}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      </View>

      {/* Right slot — Fynd logo, always */}
      <View style={styles.right}>
        <Image
          source={require('../../assets/logo-icon.png')}
          style={styles.logoIcon}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    minHeight: 56,
  },
  left: {
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  right: {
    width: 54,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  backBtn: { padding: 2 },
  logoIcon: {
    width: 54,
    height: 54,
    resizeMode: 'contain',
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontFamily: F.bold,
    color: '#111827',
    flex: 1,
  },
});
