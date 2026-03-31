import React, { useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../../hooks/useNotifications';

interface Props {
  onPress: () => void;
  color?: string;
  size?: number;
}

export default function NotificationBell({ onPress, color = '#374151', size = 22 }: Props) {
  const { unreadCount } = useNotifications();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const prevCount = useRef(0);

  useEffect(() => {
    if (unreadCount > 0 && prevCount.current === 0) {
      // Badge pops in with spring when count goes 0 → >0
      scaleAnim.setValue(0);
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 200,
        friction: 7,
        useNativeDriver: true,
      }).start();
    } else if (unreadCount > 0) {
      scaleAnim.setValue(1);
    }
    prevCount.current = unreadCount;
  }, [unreadCount]);

  const badgeLabel = unreadCount > 9 ? '9+' : String(unreadCount);

  return (
    <TouchableOpacity
      style={styles.btn}
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityLabel={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
      accessibilityRole="button"
    >
      <Ionicons name="notifications-outline" size={size} color={color} />
      {unreadCount > 0 && (
        <Animated.View
          style={[styles.badge, { transform: [{ scale: scaleAnim }] }]}
        >
          <Text style={styles.badgeText}>{badgeLabel}</Text>
        </Animated.View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 7,
    right: 7,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  badgeText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: '800',
    lineHeight: 12,
  },
});
