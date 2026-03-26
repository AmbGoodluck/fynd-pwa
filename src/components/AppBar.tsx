import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import { F } from '../theme/fonts';

interface AppBarProps {
  variant: 'root' | 'sub';
  /** Required for sub variant — shown next to back arrow */
  title?: string;
  /** Required for sub variant — called when back arrow tapped */
  onBack?: () => void;
  /** Optional right-side content (e.g. Share button on Itinerary). Placed before the logo on sub screens. */
  rightAction?: React.ReactNode;
  /** Root variant: called when profile avatar tapped */
  onProfilePress?: () => void;
}

export default function AppBar({
  variant,
  title,
  onBack,
  rightAction,
  onProfilePress,
}: AppBarProps) {
  const { user } = useAuthStore();
  const initial =
    user?.fullName?.[0]?.toUpperCase() ??
    user?.email?.[0]?.toUpperCase() ??
    '?';

  if (variant === 'root') {
    return (
      <View style={styles.container}>
        <Image
          source={require('../../assets/logo-icon.png')}
          style={styles.rootLogo}
          resizeMode="contain"
        />
        <View style={styles.spacer} />
        <TouchableOpacity
          style={styles.iconBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.avatarCircle}
          onPress={onProfilePress}
          activeOpacity={0.8}
        >
          {user?.photoURL ? (
            <Image
              source={{ uri: user.photoURL }}
              style={styles.avatarImg}
            />
          ) : (
            <Text style={styles.avatarText}>{initial}</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={onBack}
        style={styles.backBtn}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={24} color="#1A1A1A" />
      </TouchableOpacity>
      {title ? (
        <Text style={styles.subTitle} numberOfLines={1}>
          {title}
        </Text>
      ) : null}
      <View style={styles.spacer} />
      {rightAction}
      <Image
        source={require('../../assets/logo-icon.png')}
        style={styles.subLogo}
        resizeMode="contain"
      />
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
  rootLogo: {
    width: 36.8,
    height: 36.8,
  },
  spacer: { flex: 1 },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    overflow: 'hidden',
  },
  avatarImg: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: F.semibold,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -10,
  },
  subTitle: {
    fontSize: 20,
    fontFamily: F.semibold,
    color: '#1A1A1A',
    marginLeft: 4,
  },
  subLogo: {
    width: 32.2,
    height: 32.2,
    marginLeft: 8,
  },
});
