import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { F } from '../theme/fonts';
import { COLORS } from '../theme/tokens';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/useAuthStore';

type Notif = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  place_id?: string;
  place_name?: string;
  read: boolean;
  created_at: string;
};

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
  icon:  { width: 42, height: 42, borderRadius: 21, backgroundColor: '#E5E7EB' },
  lines: { flex: 1 },
  line:  { height: 12, borderRadius: 6, backgroundColor: '#E5E7EB' },
});

// ── Main screen ───────────────────────────────────────────────────────────────
export default function NotificationsScreen({ navigation }: Props) {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }

    const fetchNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);
        if (!error && data) setNotifications(data as Notif[]);
      } catch {
        // Silently fail — show empty state
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [user?.id]);

  const markAsRead = async (notifId: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', notifId);
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handlePress = (n: Notif) => {
    markAsRead(n.id).catch(() => {});
    if (n.place_id) {
      navigation.navigate('PlaceDetail', {
        placeId: n.place_id,
        name: n.place_name || '',
      });
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // Group into today / earlier
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const todayNotifs   = notifications.filter(n => new Date(n.created_at) >= dayStart);
  const earlierNotifs = notifications.filter(n => new Date(n.created_at) < dayStart);

  type ListItem =
    | { type: 'header'; label: string; key: string }
    | { type: 'item';   notif: Notif;  key: string };

  const listData: ListItem[] = [];
  if (todayNotifs.length > 0) {
    listData.push({ type: 'header', label: 'Today', key: 'h-today' });
    todayNotifs.forEach(n => listData.push({ type: 'item', notif: n, key: n.id }));
  }
  if (earlierNotifs.length > 0) {
    listData.push({ type: 'header', label: 'Earlier', key: 'h-earlier' });
    earlierNotifs.forEach(n => listData.push({ type: 'item', notif: n, key: n.id }));
  }

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === 'header') {
      return (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>{item.label}</Text>
        </View>
      );
    }
    const { notif } = item;
    return (
      <TouchableOpacity
        style={[styles.notifRow, !notif.read && styles.notifRowUnread]}
        onPress={() => handlePress(notif)}
        activeOpacity={0.7}
      >
        <View style={[styles.notifIcon, !notif.read && styles.notifIconUnread]}>
          <Ionicons
            name={notif.type === 'place' ? 'location-outline' : 'notifications-outline'}
            size={20}
            color={notif.read ? '#9CA3AF' : COLORS.accent.primary}
          />
        </View>
        <View style={styles.notifBody}>
          <Text style={[styles.notifTitle, !notif.read && styles.notifTitleUnread]} numberOfLines={1}>
            {notif.title}
          </Text>
          {!!notif.body && (
            <Text style={styles.notifSub} numberOfLines={2}>{notif.body}</Text>
          )}
        </View>
        {!notif.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
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
          {[0, 1, 2, 3].map(i => <SkeletonRow key={i} />)}
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="notifications-off-outline" size={48} color="#D1D5DB" />
          </View>
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptyBody}>
            Your daily picks and place updates will show up here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={item => item.key}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
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
  listContent:  { paddingBottom: 32 },
  markAll:      { minWidth: 80, alignItems: 'flex-end' },
  markAllText:  { fontSize: 13, fontFamily: F.medium, color: COLORS.accent.primary },

  sectionHeader: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 6 },
  sectionLabel:  { fontSize: 12, fontFamily: F.semibold, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 },

  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F2F2F7',
    backgroundColor: '#fff',
  },
  notifRowUnread: { backgroundColor: '#FFF9F8' },
  notifIcon: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  notifIconUnread: { backgroundColor: COLORS.accent.primaryLight },
  notifBody:       { flex: 1, gap: 3 },
  notifTitle:      { fontSize: 14, fontFamily: F.medium, color: '#6B7280' },
  notifTitleUnread: { fontFamily: F.semibold, color: '#111827' },
  notifSub:        { fontSize: 13, fontFamily: F.regular, color: '#9CA3AF', lineHeight: 18 },
  unreadDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accent.primary },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18, fontFamily: F.semibold, color: '#111827',
    marginBottom: 8, textAlign: 'center',
  },
  emptyBody: {
    fontSize: 14, fontFamily: F.regular, color: '#6B7280',
    textAlign: 'center', lineHeight: 22,
  },
});
