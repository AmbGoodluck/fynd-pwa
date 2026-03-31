/**
 * useNotifications — real-time Firestore listener for the current user's notifications.
 *
 * Requires a composite Firestore index (already in firestore.indexes.json):
 *   notifications: userId ASC + expiresAt ASC + createdAt DESC
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuthStore } from '../store/useAuthStore';
import type { FyndNotification } from '../types/notifications';
import { FIRESTORE_COLLECTION, NOTIFICATION_PAGE_SIZE } from '../lib/notifications/constants';
import { cleanupExpiredNotifications } from '../lib/notifications/cleanupNotifications';

export interface GroupedNotifications {
  today: FyndNotification[];
  earlier: FyndNotification[];
}

export interface UseNotificationsReturn {
  notifications: FyndNotification[];
  grouped: GroupedNotifications;
  unreadCount: number;
  loading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

function groupNotifications(notifications: FyndNotification[]): GroupedNotifications {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  return {
    today: notifications.filter((n) => n.createdAt >= startOfToday),
    earlier: notifications.filter((n) => n.createdAt < startOfToday),
  };
}

export function useNotifications(): UseNotificationsReturn {
  const { user } = useAuthStore();
  const userId = user?.id ?? null;

  const [notifications, setNotifications] = useState<FyndNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const cleanupRan = useRef(false);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    // Prune expired notifications once per session
    if (!cleanupRan.current) {
      cleanupRan.current = true;
      cleanupExpiredNotifications(userId).catch(() => {});
    }

    const q = query(
      collection(db, FIRESTORE_COLLECTION),
      where('userId', '==', userId),
      where('expiresAt', '>', Date.now()),
      orderBy('expiresAt', 'asc'),
      orderBy('createdAt', 'desc'),
      limit(NOTIFICATION_PAGE_SIZE)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notifs: FyndNotification[] = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() } as FyndNotification))
          .sort((a, b) => b.createdAt - a.createdAt);
        setNotifications(notifs);
        setUnreadCount(notifs.filter((n) => !n.read).length);
        setLoading(false);
      },
      (error) => {
        console.error('[Notifications] listener error:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await updateDoc(doc(db, FIRESTORE_COLLECTION, notificationId), { read: true });
    } catch (e) {
      console.error('[Notifications] markAsRead failed:', e);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    try {
      const batch = writeBatch(db);
      unread.forEach((n) => {
        batch.update(doc(db, FIRESTORE_COLLECTION, n.id), { read: true });
      });
      await batch.commit();
    } catch (e) {
      console.error('[Notifications] markAllAsRead failed:', e);
    }
  }, [userId, notifications]);

  return {
    notifications,
    grouped: groupNotifications(notifications),
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
  };
}
