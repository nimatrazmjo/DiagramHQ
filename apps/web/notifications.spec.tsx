/**
 * @jest-environment jsdom
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  createNotification,
  dispatchNotification,
  markNotificationRead,
  markAllNotificationsRead,
  StubNotificationTransport,
} from '@diagramhq/domain';
import {
  NotificationBadge,
  NotificationCenter,
  NotificationItem,
} from './components/canvas';

describe('Notifications Integration & UI (F116)', () => {
  const WORKSPACE_ID = 'ws-notif-demo';
  const RECIPIENT_ID = 'usr-lead-architect';

  it('1. Acceptance Test: an event produces a notification; channel dispatch tested (stub transport)', async () => {
    // 1. Create stub transports for all 4 channels
    const inAppTransport = new StubNotificationTransport('in_app');
    const emailTransport = new StubNotificationTransport('email');
    const slackTransport = new StubNotificationTransport('slack');
    const teamsTransport = new StubNotificationTransport('teams');

    // 2. Architecture event: change event triggers multi-channel notification
    const notification = createNotification({
      eventType: 'change',
      workspaceId: WORKSPACE_ID,
      recipientUserId: RECIPIENT_ID,
      recipientEmail: 'architect@diagramhq.com',
      slackWebhookUrl: 'https://hooks.slack.com/services/test/webhook',
      teamsWebhookUrl: 'https://diagramhq.webhook.office.com/webhook',
      title: 'Breaking Schema Change Detected',
      message: 'Service "User Auth" modified its gRPC protobuf contract.',
      targetType: 'object',
      targetId: 'obj-auth-service',
      channels: ['in_app', 'email', 'slack', 'teams'],
      priority: 'urgent',
    });

    expect(notification.id).toMatch(/^ntf_/);
    expect(notification.read).toBe(false);

    // 3. Dispatch notification across all transports
    const dispatchResult = await dispatchNotification(notification, [
      inAppTransport,
      emailTransport,
      slackTransport,
      teamsTransport,
    ]);

    expect(dispatchResult.notificationId).toBe(notification.id);
    expect(dispatchResult.allSuccessful).toBe(true);
    expect(dispatchResult.deliveries.length).toBe(4);

    expect(inAppTransport.deliveredNotifications[0]?.id).toBe(notification.id);
    expect(emailTransport.deliveredNotifications[0]?.title).toBe('Breaking Schema Change Detected');
    expect(slackTransport.deliveredNotifications[0]?.priority).toBe('urgent');
    expect(teamsTransport.deliveredNotifications[0]?.targetType).toBe('object');
  });

  it('2. verifies read status transitions and batch read operations', () => {
    const notif1 = createNotification({
      eventType: 'comment',
      workspaceId: WORKSPACE_ID,
      recipientUserId: RECIPIENT_ID,
      title: 'New Comment',
      message: 'Please review port configuration.',
    });

    const notif2 = createNotification({
      eventType: 'mention',
      workspaceId: WORKSPACE_ID,
      recipientUserId: RECIPIENT_ID,
      title: 'Mentioned',
      message: 'Hey check this out.',
    });

    const singleRead = markNotificationRead(notif1, 1_700_700_000_000);
    expect(singleRead.read).toBe(true);
    expect(singleRead.readAt).toBe(1_700_700_000_000);

    const batchRead = markAllNotificationsRead([notif1, notif2], 1_700_700_005_000);
    expect(batchRead.every((n) => n.read)).toBe(true);
    expect(batchRead[1]?.readAt).toBe(1_700_700_005_000);
  });

  it('3. renders <NotificationBadge /> with unread count indicator', () => {
    const zeroHtml = renderToString(<NotificationBadge unreadCount={0} />);
    expect(zeroHtml).toContain('data-testid="notification-bell-btn"');
    expect(zeroHtml).not.toContain('data-testid="notification-unread-count"');

    const activeHtml = renderToString(<NotificationBadge unreadCount={5} />);
    expect(activeHtml).toContain('data-testid="notification-unread-count"');
    expect(activeHtml).toContain('5');
  });

  it('4. renders <NotificationItem /> with event icons and channel badges', () => {
    const notification = createNotification({
      eventType: 'review',
      workspaceId: WORKSPACE_ID,
      recipientUserId: RECIPIENT_ID,
      title: 'Architecture Review Required',
      message: 'Please review branch release-2.0',
      channels: ['in_app', 'slack'],
    });

    const html = renderToString(<NotificationItem notification={notification} />);
    expect(html).toContain('data-testid="notification-item"');
    expect(html).toContain('Architecture Review Required');
    expect(html).toContain('Please review branch release-2.0');
    expect(html).toContain('data-testid="channel-chip-in_app"');
    expect(html).toContain('data-testid="channel-chip-slack"');
  });

  it('5. renders <NotificationCenter /> drawer with items and empty state', () => {
    const notification = createNotification({
      eventType: 'mention',
      workspaceId: WORKSPACE_ID,
      recipientUserId: RECIPIENT_ID,
      title: 'You were mentioned in Payments',
      message: '@architect can we review this edge?',
      channels: ['in_app'],
    });

    const drawerHtml = renderToString(
      <NotificationCenter
        isOpen={true}
        notifications={[notification]}
        onClose={() => {}}
        onMarkAllRead={() => {}}
      />
    );

    expect(drawerHtml).toContain('data-testid="notification-center-drawer"');
    expect(drawerHtml).toContain('Notifications');
    expect(drawerHtml).toContain('You were mentioned in Payments');
    expect(drawerHtml).toContain('data-testid="mark-all-read-btn"');

    const emptyHtml = renderToString(
      <NotificationCenter
        isOpen={true}
        notifications={[]}
        onClose={() => {}}
      />
    );
    expect(emptyHtml).toContain('data-testid="notification-empty-state"');
    expect(emptyHtml).toContain('No notifications yet');
  });
});
