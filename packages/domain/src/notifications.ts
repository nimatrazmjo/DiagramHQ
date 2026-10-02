/**
 * DiagramHQ - Notifications Domain Engine (F116)
 *
 * Multi-channel notification pipeline (in-app, email, Slack, Microsoft Teams)
 * for model changes, comments, mentions, and version review requests.
 */

import { createId, type NotificationId } from './ids';

export type NotificationChannel = 'in_app' | 'email' | 'slack' | 'teams';

export type NotificationEventType = 'change' | 'comment' | 'mention' | 'review';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface AppNotification {
  readonly id: NotificationId;
  readonly eventType: NotificationEventType;
  readonly workspaceId: string;
  readonly recipientUserId: string;
  recipientEmail?: string | null;
  slackWebhookUrl?: string | null;
  teamsWebhookUrl?: string | null;
  actorUserId?: string | null;
  actorName?: string | null;
  title: string;
  message: string;
  targetType?: string | null;
  targetId?: string | null;
  channels: NotificationChannel[];
  priority: NotificationPriority;
  read: boolean;
  createdAt: number;
  readAt?: number | null;
}

export interface CreateNotificationInput {
  eventType: NotificationEventType;
  workspaceId: string;
  recipientUserId: string;
  recipientEmail?: string | null;
  slackWebhookUrl?: string | null;
  teamsWebhookUrl?: string | null;
  actorUserId?: string | null;
  actorName?: string | null;
  title: string;
  message: string;
  targetType?: string | null;
  targetId?: string | null;
  channels?: NotificationChannel[];
  priority?: NotificationPriority;
  now?: number;
}

export interface ChannelDeliveryResult {
  channel: NotificationChannel;
  success: boolean;
  error?: string | null;
  deliveredAt: number;
}

export interface NotificationDispatchResult {
  notificationId: NotificationId;
  deliveries: ChannelDeliveryResult[];
  allSuccessful: boolean;
}

export interface NotificationTransport {
  readonly channel: NotificationChannel;
  deliver(
    notification: AppNotification
  ): Promise<ChannelDeliveryResult> | ChannelDeliveryResult;
}

/**
 * In-memory stub transport for local testing and deterministic mock verification.
 */
export class StubNotificationTransport implements NotificationTransport {
  readonly channel: NotificationChannel;
  readonly deliveredNotifications: AppNotification[] = [];
  private shouldFail = false;

  constructor(channel: NotificationChannel) {
    this.channel = channel;
  }

  setShouldFail(fail: boolean): void {
    this.shouldFail = fail;
  }

  deliver(notification: AppNotification): ChannelDeliveryResult {
    if (this.shouldFail) {
      return {
        channel: this.channel,
        success: false,
        error: `Stub delivery error for channel ${this.channel}`,
        deliveredAt: Date.now(),
      };
    }

    this.deliveredNotifications.push(notification);
    return {
      channel: this.channel,
      success: true,
      deliveredAt: Date.now(),
    };
  }

  clear(): void {
    this.deliveredNotifications.length = 0;
  }
}

/**
 * Factory to create a validated AppNotification.
 */
export function createNotification(input: CreateNotificationInput): AppNotification {
  const timestamp = input.now ?? Date.now();
  const channels =
    input.channels && input.channels.length > 0
      ? Array.from(new Set(input.channels))
      : (['in_app'] as NotificationChannel[]);

  return {
    id: createId('ntf'),
    eventType: input.eventType,
    workspaceId: input.workspaceId,
    recipientUserId: input.recipientUserId,
    recipientEmail: input.recipientEmail ?? null,
    slackWebhookUrl: input.slackWebhookUrl ?? null,
    teamsWebhookUrl: input.teamsWebhookUrl ?? null,
    actorUserId: input.actorUserId ?? null,
    actorName: input.actorName ?? null,
    title: input.title.trim(),
    message: input.message.trim(),
    targetType: input.targetType ?? null,
    targetId: input.targetId ?? null,
    channels,
    priority: input.priority ?? 'normal',
    read: false,
    createdAt: timestamp,
    readAt: null,
  };
}

/**
 * Dispatches an AppNotification across configured transports for each requested channel.
 */
export async function dispatchNotification(
  notification: AppNotification,
  transports: NotificationTransport[]
): Promise<NotificationDispatchResult> {
  const transportMap = new Map<NotificationChannel, NotificationTransport>();
  for (const transport of transports) {
    transportMap.set(transport.channel, transport);
  }

  const deliveries: ChannelDeliveryResult[] = [];

  for (const channel of notification.channels) {
    const transport = transportMap.get(channel);
    if (!transport) {
      deliveries.push({
        channel,
        success: false,
        error: `No transport registered for channel '${channel}'`,
        deliveredAt: Date.now(),
      });
      continue;
    }

    try {
      const result = await transport.deliver(notification);
      deliveries.push(result);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      deliveries.push({
        channel,
        success: false,
        error: errorMessage,
        deliveredAt: Date.now(),
      });
    }
  }

  const allSuccessful = deliveries.every((d) => d.success);

  return {
    notificationId: notification.id,
    deliveries,
    allSuccessful,
  };
}

/**
 * Marks a notification as read.
 */
export function markNotificationRead(
  notification: AppNotification,
  now?: number
): AppNotification {
  if (notification.read) return notification;
  return {
    ...notification,
    read: true,
    readAt: now ?? Date.now(),
  };
}

/**
 * Marks all notifications in a list as read.
 */
export function markAllNotificationsRead(
  notifications: AppNotification[],
  now?: number
): AppNotification[] {
  const timestamp = now ?? Date.now();
  return notifications.map((n) =>
    n.read ? n : { ...n, read: true, readAt: timestamp }
  );
}

export interface FilterNotificationsOptions {
  recipientUserId?: string;
  unreadOnly?: boolean;
  eventType?: NotificationEventType;
}

/**
 * Filters a list of notifications by recipient, read state, and event type.
 */
export function filterNotifications(
  notifications: AppNotification[],
  options?: FilterNotificationsOptions
): AppNotification[] {
  return notifications.filter((n) => {
    if (options?.recipientUserId && n.recipientUserId !== options.recipientUserId) {
      return false;
    }
    if (options?.unreadOnly && n.read) {
      return false;
    }
    if (options?.eventType && n.eventType !== options.eventType) {
      return false;
    }
    return true;
  });
}

/**
 * Counts unread notifications for a user.
 */
export function countUnreadNotifications(
  notifications: AppNotification[],
  recipientUserId?: string
): number {
  return notifications.filter((n) => {
    if (recipientUserId && n.recipientUserId !== recipientUserId) {
      return false;
    }
    return !n.read;
  }).length;
}
