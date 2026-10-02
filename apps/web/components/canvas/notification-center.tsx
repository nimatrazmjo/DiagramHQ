'use client';

import React from 'react';
import type { AppNotification, NotificationChannel, NotificationEventType } from '@diagramhq/domain';

export interface NotificationBadgeProps {
  unreadCount: number;
  onClick?: () => void;
  className?: string;
}

export function NotificationBadge({
  unreadCount,
  onClick,
  className = '',
}: NotificationBadgeProps): JSX.Element {
  return (
    <button
      type="button"
      data-testid="notification-bell-btn"
      onClick={onClick}
      aria-label={`Notifications (${unreadCount} unread)`}
      className={`relative p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors ${className}`}
    >
      <span className="material-symbols-outlined text-xl">notifications</span>
      {unreadCount > 0 && (
        <span
          data-testid="notification-unread-count"
          className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}

const EVENT_ICONS: Record<NotificationEventType, string> = {
  comment: 'chat_bubble',
  mention: 'alternate_email',
  change: 'sync',
  review: 'rate_review',
};

const CHANNEL_ICONS: Record<NotificationChannel, string> = {
  in_app: 'dashboard',
  email: 'mail',
  slack: 'forum',
  teams: 'groups',
};

export interface NotificationItemProps {
  notification: AppNotification;
  onMarkRead?: (id: string) => void;
}

export function NotificationItem({
  notification,
  onMarkRead,
}: NotificationItemProps): JSX.Element {
  const icon = EVENT_ICONS[notification.eventType] ?? 'notifications';

  return (
    <div
      data-testid="notification-item"
      data-notification-id={notification.id}
      data-unread={!notification.read}
      className={`p-3 border-b border-slate-800/80 transition-colors ${
        notification.read ? 'bg-transparent text-slate-400' : 'bg-slate-800/30 text-slate-200'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          data-testid="notification-event-icon"
          className={`p-1.5 rounded-lg shrink-0 ${
            notification.read ? 'bg-slate-800 text-slate-400' : 'bg-primary/20 text-primary-fixed'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">{icon}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-semibold text-white truncate">
              {notification.title}
            </h4>
            {!notification.read && onMarkRead && (
              <button
                type="button"
                data-testid="notification-mark-read-btn"
                onClick={() => onMarkRead(notification.id)}
                className="text-[10px] text-primary-fixed hover:underline shrink-0"
              >
                Mark read
              </button>
            )}
          </div>

          <p className="text-xs text-slate-300 mt-0.5 line-clamp-2 leading-relaxed">
            {notification.message}
          </p>

          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-slate-500 font-mono capitalize">
              {notification.eventType}
            </span>
            <span className="text-slate-600">·</span>
            <div className="flex items-center gap-1">
              {notification.channels.map((ch) => (
                <span
                  key={ch}
                  data-testid={`channel-chip-${ch}`}
                  title={`Delivered via ${ch}`}
                  className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-slate-400 flex items-center gap-0.5"
                >
                  <span className="material-symbols-outlined text-[10px]">
                    {CHANNEL_ICONS[ch]}
                  </span>
                  <span>{ch}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export interface NotificationCenterProps {
  isOpen: boolean;
  notifications: AppNotification[];
  onMarkRead?: (id: string) => void;
  onMarkAllRead?: () => void;
  onClose?: () => void;
  className?: string;
}

export function NotificationCenter({
  isOpen,
  notifications,
  onMarkRead,
  onMarkAllRead,
  onClose,
  className = '',
}: NotificationCenterProps): JSX.Element | null {
  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div
      data-testid="notification-center-drawer"
      aria-label="Notification Center"
      className={`fixed top-14 right-4 w-96 max-h-[520px] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary-fixed text-lg">
            notifications
          </span>
          <span className="text-xs font-bold text-white">Notifications</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-primary/20 text-primary-fixed rounded-full">
              {unreadCount} new
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && onMarkAllRead && (
            <button
              type="button"
              data-testid="mark-all-read-btn"
              onClick={onMarkAllRead}
              className="text-[11px] text-slate-400 hover:text-white transition-colors"
            >
              Mark all read
            </button>
          )}
          {onClose && (
            <button
              type="button"
              data-testid="notification-close-btn"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
        {notifications.length === 0 ? (
          <div
            data-testid="notification-empty-state"
            className="p-8 text-center text-xs text-slate-400"
          >
            <span className="material-symbols-outlined text-3xl text-slate-600 block mb-2">
              notifications_off
            </span>
            No notifications yet
          </div>
        ) : (
          notifications.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onMarkRead={onMarkRead}
            />
          ))
        )}
      </div>
    </div>
  );
}
