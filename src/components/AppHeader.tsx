import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { F } from '../theme/fonts';

type Props = {
  title: string;
  onBack?: () => void;
};

/**
 * Sub-screen header for stack screens (e.g. CreateTripScreen).
 * Layout: [back arrow?] [title]  [Fynd logo]
 */
export default function AppHeader({ title, onBack }: Props) {
  return (
    <View style={styles.container}>
      {/* Left: back arrow (44px tap area) or spacer */}
      <View style={styles.left}>
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Center: title */}
      <View style={styles.titleRow}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      </View>

      {/* Right: Fynd logo */}
      <View style={styles.right}>
        <Image
          source={require('../../assets/logo-icon.png')}
          style={styles.logoIcon}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3F4F6',
  },
  left: {
    width: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  right: {
    width: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -10,
  },
  logoIcon: {
    width: 28,
    height: 28,
  },
  titleRow: {
    flex: 1,
    alignItems: 'flex-start',
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 20,
    fontFamily: F.semibold,
    color: '#1A1A1A',
  },
});
