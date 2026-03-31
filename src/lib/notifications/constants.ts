import type { NotificationType, NotificationPriority } from '../../types/notifications';

export const NOTIFICATION_CONFIG: Record<NotificationType, {
  priority: NotificationPriority;
  icon: string;
  color: string;
  batchable: boolean;
  batchWindowMs: number;
  rateLimitMs: number;
}> = {
  trip_shared: {
    priority: 'high',
    icon: 'share-social-outline',
    color: '#10B981',
    batchable: false,
    batchWindowMs: 0,
    rateLimitMs: 0,
  },
  trip_member_joined: {
    priority: 'high',
    icon: 'person-add-outline',
    color: '#3B82F6',
    batchable: false,
    batchWindowMs: 0,
    rateLimitMs: 0,
  },
  moment_added: {
    priority: 'medium',
    icon: 'camera-outline',
    color: '#8B5CF6',
    batchable: true,
    batchWindowMs: 5 * 60 * 1000,
    rateLimitMs: 0,
  },
  place_added: {
    priority: 'medium',
    icon: 'location-outline',
    color: '#F59E0B',
    batchable: true,
    batchWindowMs: 5 * 60 * 1000,
    rateLimitMs: 0,
  },
  nearby_suggestion: {
    priority: 'low',
    icon: 'compass-outline',
    color: '#6B7280',
    batchable: false,
    batchWindowMs: 0,
    rateLimitMs: 24 * 60 * 60 * 1000,
  },
};

export const NOTIFICATION_EXPIRY_MS = 14 * 24 * 60 * 60 * 1000;
export const NOTIFICATION_PAGE_SIZE = 30;
export const FIRESTORE_COLLECTION = 'notifications';
