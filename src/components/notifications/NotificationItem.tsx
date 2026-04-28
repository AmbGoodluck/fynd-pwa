import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { F } from '../../theme/fonts';
import { COLORS } from '../../theme/tokens';
import type { FyndNotification } from '../../types/notifications';
import { NOTIFICATION_CONFIG } from '../../lib/notifications/constants';
import { getRelativeTime } from '../../lib/notifications/relativeTime';

interface Props {
  notification: FyndNotification;
  onPress: (notification: FyndNotification) => void;
}

export default function NotificationItem({ notification, onPress }: Props) {
  const config = NOTIFICATION_CONFIG[notification.type];
  const isUnread = !notification.read;

  return (
    <TouchableOpacity
      style={[styles.row, isUnread && styles.rowUnread]}
      onPress={() => onPress(notification)}
      activeOpacity={0.75}
    >
      {/* Icon */}
      <View style={[styles.iconWrap, { backgroundColor: config.color + '18' }]}>
        <Ionicons
          name={config.icon as any}
          size={20}
          color={config.color}
        />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text
          style={[styles.title, isUnread && styles.titleUnread]}
          numberOfLines={2}
        >
          {notification.title}
        </Text>
        {!!notification.body && (
          <Text style={styles.body} numberOfLines={1}>
            {notification.body}
          </Text>
        )}
        <Text style={styles.time}>{getRelativeTime(notification.createdAt)}</Text>
      </View>

      {/* Unread dot */}
      {isUnread && <View style={styles.dot} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F2F2F7',
    gap: 12,
  },
  rowUnread: {
    backgroundColor: COLORS.accent.primaryLight,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontFamily: F.regular,
    color: '#6B7280',
    lineHeight: 20,
  },
  titleUnread: {
    fontFamily: F.semibold,
    color: '#111827',
  },
  body: {
    fontSize: 13,
    fontFamily: F.regular,
    color: '#9CA3AF',
    lineHeight: 18,
  },
  time: {
    fontSize: 12,
    fontFamily: F.regular,
    color: '#9CA3AF',
    marginTop: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accent.primary,
    flexShrink: 0,
  },
});
