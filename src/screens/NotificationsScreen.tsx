import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { F } from '../theme/fonts';
import AppHeader from '../components/AppHeader';
import { useNotifications } from '../hooks/useNotifications';
import NotificationItem from '../components/notifications/NotificationItem';
import NotificationSectionHeader from '../components/notifications/NotificationSectionHeader';
import type { FyndNotification } from '../types/notifications';

type Props = { navigation: any };

// ── Skeleton row ──────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <View style={sk.row}>
      <View style={sk.icon} />
      <View style={sk.lines}>
        <View style={[sk.line, { width: '80%' }]} />
        <View style={[sk.line, { width: '45%', marginTop: 6 }]} />
      </View>
    </View>
  );
}

const sk = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F2F2F7',
  },
  icon: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#E5E7EB' },
  lines: { flex: 1 },
  line: { height: 12, borderRadius: 6, backgroundColor: '#E5E7EB' },
});

// ── Main screen ───────────────────────────────────────────────────────────────
export default function NotificationsScreen({ navigation }: Props) {
  const { notifications, grouped, unreadCount, loading, markAsRead, markAllAsRead } =
    useNotifications();

  const handlePress = (notification: FyndNotification) => {
    markAsRead(notification.id).catch(() => {});
    const { screen, params } = notification.data;
    if (screen) {
      navigation.navigate(screen, params ?? {});
    }
  };

  // Build a flat list with section headers interleaved
  type ListItem =
    | { type: 'header'; label: string; key: string }
    | { type: 'item'; notification: FyndNotification; key: string };

  const listData: ListItem[] = [];
  if (grouped.today.length > 0) {
    listData.push({ type: 'header', label: 'Today', key: 'h-today' });
    grouped.today.forEach((n) =>
      listData.push({ type: 'item', notification: n, key: n.id })
    );
  }
  if (grouped.earlier.length > 0) {
    listData.push({ type: 'header', label: 'Earlier', key: 'h-earlier' });
    grouped.earlier.forEach((n) =>
      listData.push({ type: 'item', notification: n, key: n.id })
    );
  }

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === 'header') {
      return <NotificationSectionHeader label={item.label} />;
    }
    return <NotificationItem notification={item.notification} onPress={handlePress} />;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Custom header — AppHeader only has title + back, so we extend it here */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllAsRead} style={styles.markAll}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.markAll} />
        )}
      </View>

      {loading ? (
        <View style={styles.skeletonWrap}>
          {[0, 1, 2, 3].map((i) => <SkeletonRow key={i} />)}
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="notifications-off-outline" size={48} color="#D1D5DB" />
          </View>
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptyBody}>
            When there's activity on your shared trips, you'll see it here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3F4F6',
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -10,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontFamily: F.semibold,
    color: '#1A1A1A',
    paddingHorizontal: 4,
  },
  skeletonWrap: { paddingTop: 8 },
  listContent: { paddingBottom: 32 },

  markAll: { minWidth: 80, alignItems: 'flex-end' },
  markAllText: {
    fontSize: 13,
    fontFamily: F.medium,
    color: '#22C55E',
  },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: F.semibold,
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 14,
    fontFamily: F.regular,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
});
