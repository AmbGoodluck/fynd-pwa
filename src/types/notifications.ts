export type NotificationType =
  | 'trip_shared'
  | 'trip_member_joined'
  | 'moment_added'
  | 'place_added'
  | 'nearby_suggestion';

export type NotificationPriority = 'high' | 'medium' | 'low';

export interface FyndNotification {
  id: string;
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body?: string;
  read: boolean;
  createdAt: number;
  expiresAt: number;
  batchKey?: string;
  batchCount?: number;
  data: NotificationData;
}

export interface NotificationData {
  tripId?: string;
  momentId?: string;
  placeId?: string;
  screen: string;
  params?: Record<string, string>;
}

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  data: NotificationData;
  batchKey?: string;
}
