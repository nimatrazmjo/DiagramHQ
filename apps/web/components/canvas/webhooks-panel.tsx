'use client';

import React, { useState } from 'react';
import {
  type WebhookRegistry,
  type WebhookEventType,
  type CreateWebhookSubscriptionInput,
  ALL_WEBHOOK_EVENT_TYPES,
} from '@diagramhq/domain';

export interface WebhookManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  registry: WebhookRegistry;
  onAddSubscription?: (sub: CreateWebhookSubscriptionInput) => void;
  onDeleteSubscription?: (id: string) => void;
  onToggleSubscription?: (id: string, active: boolean) => void;
  onTriggerTestDelivery?: (subId: string, event: WebhookEventType) => void;
}

type TabMode = 'subscriptions' | 'new' | 'logs';

export function WebhookManagerModal({
  isOpen,
  onClose,
  registry,
  onAddSubscription,
  onDeleteSubscription,
  onToggleSubscription,
  onTriggerTestDelivery,
}: WebhookManagerModalProps): React.JSX.Element | null {
  const [activeTab, setActiveTab] = useState<TabMode>('subscriptions');
  const [targetUrl, setTargetUrl] = useState('');
  const [description, setDescription] = useState('');
  const [secretToken, setSecretToken] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<WebhookEventType[]>([
    'object.created',
    'connection.created',
    'change.merged',
  ]);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  const activeCount = registry.subscriptions.filter((s) => s.isActive).length;

  const toggleEventSelection = (evt: WebhookEventType) => {
    setSelectedEvents((prev) =>
      prev.includes(evt) ? prev.filter((e) => e !== evt) : [...prev, evt]
    );
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUrl.trim() || !targetUrl.startsWith('http')) {
      setNotification({ type: 'error', message: 'Please provide a valid HTTP/HTTPS endpoint URL.' });
      return;
    }
    if (selectedEvents.length === 0) {
      setNotification({ type: 'error', message: 'Select at least one subscribed event.' });
      return;
    }

    if (onAddSubscription) {
      onAddSubscription({
        workspaceId: registry.workspaceId,
        targetUrl: targetUrl.trim(),
        description: description.trim() || undefined,
        secretToken: secretToken.trim() || undefined,
        events: selectedEvents,
      });
    }

    setTargetUrl('');
    setDescription('');
    setSecretToken('');
    setSelectedEvents(['object.created', 'connection.created', 'change.merged']);
    setActiveTab('subscriptions');
    setNotification({ type: 'success', message: 'Webhook endpoint registered successfully.' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex h-[85vh] w-full max-w-4xl flex-col rounded-xl border border-border bg-background shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/20">
          <div className="flex items-center space-x-3">
            <span className="material-symbols-outlined text-primary text-2xl">webhook</span>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-foreground">Outbound Webhooks</h2>
                <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  F126
                </span>
                <span className="rounded bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
                  HMAC SHA-256
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Real-time lifecycle event notifications and cryptographic webhook dispatch
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Metrics Banner */}
        <div className="grid grid-cols-4 border-b border-border bg-card text-center divide-x divide-border">
          <div className="p-3">
            <div className="text-lg font-bold text-foreground">{registry.subscriptions.length}</div>
            <div className="text-[11px] text-muted-foreground">Total Endpoints</div>
          </div>
          <div className="p-3">
            <div className="text-lg font-bold text-green-500">{activeCount}</div>
            <div className="text-[11px] text-muted-foreground">Active Endpoints</div>
          </div>
          <div className="p-3">
            <div className="text-lg font-bold text-foreground">{registry.deliveryLogs.length}</div>
            <div className="text-[11px] text-muted-foreground">Deliveries Logged</div>
          </div>
          <div className="p-3">
            <div className="text-lg font-bold text-foreground">{ALL_WEBHOOK_EVENT_TYPES.length}</div>
            <div className="text-[11px] text-muted-foreground">Supported Events</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-border bg-muted/40 px-6">
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`flex items-center space-x-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'subscriptions'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="material-symbols-outlined text-base">list</span>
            <span>Subscriptions ({registry.subscriptions.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('new')}
            className={`flex items-center space-x-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'new'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="material-symbols-outlined text-base">add_circle</span>
            <span>Add Endpoint</span>
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center space-x-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'logs'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="material-symbols-outlined text-base">history</span>
            <span>Delivery Logs ({registry.deliveryLogs.length})</span>
          </button>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div
            className={`flex items-center justify-between px-6 py-2 text-xs font-medium ${
              notification.type === 'success'
                ? 'bg-green-500/10 text-green-500'
                : 'bg-destructive/10 text-destructive'
            }`}
          >
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)} className="hover:opacity-75">
              ✕
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'subscriptions' && (
            <div className="space-y-4">
              {registry.subscriptions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-12 text-center">
                  <span className="material-symbols-outlined text-4xl text-muted-foreground">
                    sensors_off
                  </span>
                  <h3 className="mt-2 text-sm font-semibold text-foreground">
                    No Webhook Endpoints Configured
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Register an HTTP endpoint to start receiving real-time architectural event dispatches.
                  </p>
                  <button
                    onClick={() => setActiveTab('new')}
                    className="mt-4 rounded-md bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Add First Endpoint
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {registry.subscriptions.map((sub) => (
                    <div
                      key={sub.id}
                      className="rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`h-2 w-2 rounded-full ${
                                sub.isActive ? 'bg-green-500' : 'bg-muted-foreground'
                              }`}
                            />
                            <code className="text-xs font-mono font-semibold text-foreground">
                              {sub.targetUrl}
                            </code>
                            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                              {sub.isActive ? 'Active' : 'Disabled'}
                            </span>
                          </div>
                          {sub.description && (
                            <p className="text-xs text-muted-foreground">{sub.description}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() =>
                              onTriggerTestDelivery &&
                              onTriggerTestDelivery(sub.id, sub.events[0] || 'object.created')
                            }
                            title="Send test event payload"
                            className="flex items-center space-x-1 rounded border border-border px-2 py-1 text-xs text-foreground hover:bg-accent"
                          >
                            <span className="material-symbols-outlined text-xs">send</span>
                            <span>Test</span>
                          </button>
                          {onToggleSubscription && (
                            <button
                              onClick={() => onToggleSubscription(sub.id, !sub.isActive)}
                              className="rounded border border-border px-2 py-1 text-xs hover:bg-accent"
                            >
                              {sub.isActive ? 'Disable' : 'Enable'}
                            </button>
                          )}
                          {onDeleteSubscription && (
                            <button
                              onClick={() => onDeleteSubscription(sub.id)}
                              className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                              <span className="material-symbols-outlined text-base">delete</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5 pt-2 border-t border-border/50">
                        {sub.events.map((evt) => (
                          <span
                            key={evt}
                            className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-mono text-primary"
                          >
                            {evt}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'new' && (
            <form onSubmit={handleCreate} className="max-w-2xl space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Endpoint Target URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://api.yourdomain.com/webhooks/diagramhq"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  className="w-full rounded-md border border-border bg-card p-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="Sync architecture changes with Slack or CI/CD pipelines"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-md border border-border bg-card p-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Secret Token (Optional - auto-generated if left blank)
                </label>
                <input
                  type="password"
                  placeholder="whsec_..."
                  value={secretToken}
                  onChange={(e) => setSecretToken(e.target.value)}
                  className="w-full rounded-md border border-border bg-card p-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="text-[11px] text-muted-foreground">
                  Used to generate SHA-256 signatures in the <code>X-Hub-Signature-256</code> HTTP header.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-xs font-semibold text-foreground">Subscribed Events</label>
                <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-card p-3">
                  {ALL_WEBHOOK_EVENT_TYPES.map((evt) => (
                    <label
                      key={evt}
                      className="flex items-center space-x-2 text-xs text-foreground cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEvents.includes(evt)}
                        onChange={() => toggleEventSelection(evt)}
                        className="rounded border-border text-primary focus:ring-primary"
                      />
                      <span className="font-mono text-[11px]">{evt}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex items-center space-x-3">
                <button
                  type="submit"
                  className="rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Register Webhook
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('subscriptions')}
                  className="rounded-md border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-accent"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-3">
              {registry.deliveryLogs.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-12 text-center text-xs text-muted-foreground">
                  No delivery logs recorded yet. Outbound dispatches will appear here.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-border bg-muted/40 text-[11px] text-muted-foreground">
                      <tr>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5">Event</th>
                        <th className="p-2.5">Target URL</th>
                        <th className="p-2.5">Latency</th>
                        <th className="p-2.5">Signature</th>
                        <th className="p-2.5">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {registry.deliveryLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-muted/20">
                          <td className="p-2.5">
                            <span
                              className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                                log.status === 'success'
                                  ? 'bg-green-500/10 text-green-500'
                                  : 'bg-destructive/10 text-destructive'
                              }`}
                            >
                              {log.httpStatusCode || log.status}
                            </span>
                          </td>
                          <td className="p-2.5 font-mono text-foreground">{log.event}</td>
                          <td className="p-2.5 font-mono text-muted-foreground truncate max-w-[200px]">
                            {log.targetUrl}
                          </td>
                          <td className="p-2.5 text-muted-foreground">{log.latencyMs}ms</td>
                          <td className="p-2.5 font-mono text-muted-foreground text-[10px]">
                            {log.signature.substring(0, 16)}...
                          </td>
                          <td className="p-2.5 text-muted-foreground">
                            {new Date(log.deliveredAt).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
