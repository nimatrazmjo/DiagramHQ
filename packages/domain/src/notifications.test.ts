import { describe, it, expect } from 'vitest';
import {
  createNotification,
  dispatchNotification,
  markNotificationRead,
  markAllNotificationsRead,
  filterNotifications,
  countUnreadNotifications,
  StubNotificationTransport,
} from './notifications';

describe('Notifications Domain Engine (F116)', () => {
  const WORKSPACE_ID = 'ws-test-notifications';
  const ALICE_ID = 'usr-alice';
  const BOB_ID = 'usr-bob';
  const NOW = 1_700_600_000_000;

  it('1. Acceptance Test: an event produces a notification with all channels configured', () => {
    const notification = createNotification({
      eventType: 'comment',
      workspaceId: WORKSPACE_ID,
      recipientUserId: ALICE_ID,
      recipientEmail: 'alice@diagramhq.com',
      slackWebhookUrl: 'https://hooks.slack.com/services/T00/B00/X00',
      teamsWebhookUrl: 'https://diagramhq.webhook.office.com/webhookb2/00',
      actorUserId: BOB_ID,
      actorName: 'Bob Architect',
      title: 'New comment on API Gateway',
      message: 'Can we add TLS 1.3 termination at the ingress?',
      targetType: 'object',
      targetId: 'obj-api-gw',
      channels: ['in_app', 'email', 'slack', 'teams'],
      priority: 'high',
      now: NOW,
    });

    expect(notification.id).toMatch(/^ntf_/);
    expect(notification.eventType).toBe('comment');
    expect(notification.recipientUserId).toBe(ALICE_ID);
    expect(notification.recipientEmail).toBe('alice@diagramhq.com');
    expect(notification.channels).toEqual(['in_app', 'email', 'slack', 'teams']);
    expect(notification.priority).toBe('high');
    expect(notification.read).toBe(false);
    expect(notification.createdAt).toBe(NOW);
  });

  it('2. Acceptance Test: channel dispatch tested with stub transports', async () => {
    const inAppTransport = new StubNotificationTransport('in_app');
    const emailTransport = new StubNotificationTransport('email');
    const slackTransport = new StubNotificationTransport('slack');
    const teamsTransport = new StubNotificationTransport('teams');

    const notification = createNotification({
      eventType: 'review',
      workspaceId: WORKSPACE_ID,
      recipientUserId: ALICE_ID,
      recipientEmail: 'alice@diagramhq.com',
      title: 'Review Requested: Production Core v1.4',
      message: 'Branch "feat/auth-v2" is ready for your architectural review.',
      channels: ['in_app', 'email', 'slack', 'teams'],
    });

    const result = await dispatchNotification(notification, [
      inAppTransport,
      emailTransport,
      slackTransport,
      teamsTransport,
    ]);

    expect(result.notificationId).toBe(notification.id);
    expect(result.allSuccessful).toBe(true);
    expect(result.deliveries.length).toBe(4);

    expect(inAppTransport.deliveredNotifications.length).toBe(1);
    expect(emailTransport.deliveredNotifications.length).toBe(1);
    expect(slackTransport.deliveredNotifications.length).toBe(1);
    expect(teamsTransport.deliveredNotifications.length).toBe(1);
  });

  it('3. reports delivery error when a channel transport fails or is missing', async () => {
    const emailTransport = new StubNotificationTransport('email');
    emailTransport.setShouldFail(true); // Simulate SMTP connection error

    const notification = createNotification({
      eventType: 'change',
      workspaceId: WORKSPACE_ID,
      recipientUserId: ALICE_ID,
      title: 'Model updated',
      message: 'New connection added',
      channels: ['email', 'slack'], // Notice slack has no transport provided below
    });

    const result = await dispatchNotification(notification, [emailTransport]);

    expect(result.allSuccessful).toBe(false);
    expect(result.deliveries.length).toBe(2);

    const emailDelivery = result.deliveries.find((d) => d.channel === 'email');
    expect(emailDelivery?.success).toBe(false);
    expect(emailDelivery?.error).toContain('Stub delivery error');

    const slackDelivery = result.deliveries.find((d) => d.channel === 'slack');
    expect(slackDelivery?.success).toBe(false);
    expect(slackDelivery?.error).toContain("No transport registered for channel 'slack'");
  });

  it('4. marks individual and all notifications as read', () => {
    const n1 = createNotification({
      eventType: 'mention',
      workspaceId: WORKSPACE_ID,
      recipientUserId: ALICE_ID,
      title: 'Mention 1',
      message: 'Hello @alice',
      now: NOW,
    });
    const n2 = createNotification({
      eventType: 'change',
      workspaceId: WORKSPACE_ID,
      recipientUserId: ALICE_ID,
      title: 'Change 2',
      message: 'Updated object',
      now: NOW,
    });

    expect(n1.read).toBe(false);
    const readN1 = markNotificationRead(n1, NOW + 1000);
    expect(readN1.read).toBe(true);
    expect(readN1.readAt).toBe(NOW + 1000);

    const markedAll = markAllNotificationsRead([n1, n2], NOW + 2000);
    expect(markedAll.every((n) => n.read)).toBe(true);
  });

  it('5. filters notifications and calculates unread count', () => {
    const nAlice1 = createNotification({
      eventType: 'comment',
      workspaceId: WORKSPACE_ID,
      recipientUserId: ALICE_ID,
      title: 'Comment',
      message: 'Test',
    });
    const nAlice2 = markNotificationRead(
      createNotification({
        eventType: 'mention',
        workspaceId: WORKSPACE_ID,
        recipientUserId: ALICE_ID,
        title: 'Mention',
        message: 'Test',
      })
    );
    const nBob = createNotification({
      eventType: 'review',
      workspaceId: WORKSPACE_ID,
      recipientUserId: BOB_ID,
      title: 'Review',
      message: 'Test',
    });

    const list = [nAlice1, nAlice2, nBob];

    expect(countUnreadNotifications(list, ALICE_ID)).toBe(1);
    expect(countUnreadNotifications(list, BOB_ID)).toBe(1);

    const aliceUnread = filterNotifications(list, {
      recipientUserId: ALICE_ID,
      unreadOnly: true,
    });
    expect(aliceUnread.length).toBe(1);
    expect(aliceUnread[0]?.id).toBe(nAlice1.id);

    const reviews = filterNotifications(list, { eventType: 'review' });
    expect(reviews.length).toBe(1);
    expect(reviews[0]?.recipientUserId).toBe(BOB_ID);
  });
});
