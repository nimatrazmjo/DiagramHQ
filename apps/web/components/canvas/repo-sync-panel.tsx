'use client';

import React, { useState } from 'react';
import type {
  RepoSyncConfig,
  RepoSyncResult,
  SyncDriftItem,
  SyncScheduleConfig,
} from '@diagramhq/domain';

export interface RepoSyncDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  config: RepoSyncConfig;
  syncResult?: RepoSyncResult | null;
  isSyncing?: boolean;
  onTriggerSync: (trigger: 'manual' | 'schedule') => void;
  onApplyModelRefresh?: (result: RepoSyncResult) => void;
  onCreateChangeRequest?: (result: RepoSyncResult) => void;
  onOpenScheduleModal?: () => void;
}

export const RepoSyncDrawer: React.FC<RepoSyncDrawerProps> = ({
  isOpen,
  onClose,
  config,
  syncResult,
  isSyncing = false,
  onTriggerSync,
  onApplyModelRefresh,
  onCreateChangeRequest,
  onOpenScheduleModal,
}) => {
  const [selectedDriftItem, setSelectedDriftItem] = useState<SyncDriftItem | null>(null);

  if (!isOpen) return null;

  const driftReport = syncResult?.driftReport;
  const changeSummary = syncResult?.changeSummary;
  const providerIcon = config.provider === 'github' ? '🐙' : '🦊';

  return (
    <div
      role="dialog"
      aria-label="Repository Synchronization Drawer"
      className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-white shadow-2xl border-l border-slate-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden="true">{providerIcon}</span>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Repository Synchronization</h2>
            <p className="text-xs text-slate-500">
              {`${config.owner}/${config.repo} (${config.branch})`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close sync drawer"
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition"
        >
          ✕
        </button>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Status card */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Sync Status</span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                isSyncing
                  ? 'bg-blue-100 text-blue-800 animate-pulse'
                  : syncResult?.status === 'drift_detected'
                  ? 'bg-amber-100 text-amber-900'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isSyncing
                    ? 'bg-blue-600'
                    : syncResult?.status === 'drift_detected'
                    ? 'bg-amber-600'
                    : 'bg-emerald-600'
                }`}
              />
              {isSyncing
                ? 'Syncing Repository...'
                : syncResult?.status === 'drift_detected'
                ? 'Architectural Drift Detected'
                : 'Up to Date (Clean)'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 text-xs text-slate-600 border-t border-slate-100">
            <div>
              <span className="text-slate-400 block">Schedule</span>
              <span className="font-medium text-slate-800">
                {config.schedule?.enabled
                  ? `Every ${config.schedule.intervalMinutes} min`
                  : 'Disabled'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Webhook Ingress</span>
              <span className="font-medium text-emerald-700">Active (push, PR)</span>
            </div>
            <div>
              <span className="text-slate-400 block">Last Run</span>
              <span className="font-medium text-slate-800">
                {syncResult?.syncedAt ? new Date(syncResult.syncedAt).toLocaleTimeString() : 'Never'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Commit Ref</span>
              <span className="font-mono text-slate-800">
                {syncResult?.commitSha?.slice(0, 7) || 'HEAD'}
              </span>
            </div>
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={() => onTriggerSync('manual')}
              disabled={isSyncing}
              className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm"
            >
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
            {onOpenScheduleModal && (
              <button
                type="button"
                onClick={onOpenScheduleModal}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Configure Schedule
              </button>
            )}
          </div>
        </div>

        {/* Drift Report Alert */}
        {driftReport && driftReport.hasDrift && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <h3 className="text-sm font-semibold text-amber-900">
                  {`Architectural Drift Detected (${driftReport.totalDriftCount} findings)`}
                </h3>
                <p className="text-xs text-amber-700 mt-0.5">
                  Code changes in the remote repository have diverged from the documented C4 architecture model.
                </p>
              </div>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto">
              {driftReport.items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedDriftItem(item)}
                  className={`rounded-lg border p-3 text-xs cursor-pointer transition ${
                    selectedDriftItem?.id === item.id
                      ? 'border-indigo-500 bg-white shadow-sm'
                      : 'border-amber-200 bg-white/70 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between font-medium">
                    <span className="text-slate-900 font-semibold">{item.entityName}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                        item.severity === 'high'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.severity}
                    </span>
                  </div>
                  <p className="text-slate-600 mt-1">{item.message}</p>
                  {item.evidence.length > 0 && item.evidence[0]?.location && (
                    <div className="mt-2 font-mono text-[11px] text-slate-500 bg-slate-50 p-1.5 rounded border border-slate-100">
                      {`${item.evidence[0].location.filePath}:${item.evidence[0].location.lineStart}`}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2 flex gap-2">
              {onApplyModelRefresh && syncResult && (
                <button
                  type="button"
                  onClick={() => onApplyModelRefresh(syncResult)}
                  className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 transition shadow-sm"
                >
                  Apply Model Refresh
                </button>
              )}
              {onCreateChangeRequest && syncResult && (
                <button
                  type="button"
                  onClick={() => onCreateChangeRequest(syncResult)}
                  className="flex-1 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-medium text-amber-900 hover:bg-amber-100 transition shadow-sm"
                >
                  Create Change Request (PR)
                </button>
              )}
            </div>
          </div>
        )}

        {/* Changes Summary */}
        {changeSummary && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Discovered Code Entities
            </h4>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-white p-2.5 border border-slate-200">
                <span className="block text-lg font-bold text-emerald-600">
                  {changeSummary.addedObjects.length}
                </span>
                <span className="text-slate-500 text-[11px]">New Services/DBs</span>
              </div>
              <div className="rounded-lg bg-white p-2.5 border border-slate-200">
                <span className="block text-lg font-bold text-indigo-600">
                  {changeSummary.addedConnections.length}
                </span>
                <span className="text-slate-500 text-[11px]">Connections</span>
              </div>
              <div className="rounded-lg bg-white p-2.5 border border-slate-200">
                <span className="block text-lg font-bold text-rose-600">
                  {changeSummary.removedObjectIds.length}
                </span>
                <span className="text-slate-500 text-[11px]">Missing / Obsolete</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export interface SyncScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSchedule?: SyncScheduleConfig;
  onSaveSchedule: (newSchedule: SyncScheduleConfig) => void;
  webhookUrl?: string;
}

export const SyncScheduleModal: React.FC<SyncScheduleModalProps> = ({
  isOpen,
  onClose,
  currentSchedule,
  onSaveSchedule,
  webhookUrl = 'https://api.diagramhq.com/webhooks/github/sync',
}) => {
  const [interval, setInterval] = useState<number>(currentSchedule?.intervalMinutes ?? 60);
  const [enabled, setEnabled] = useState<boolean>(currentSchedule?.enabled ?? true);
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSchedule({
      intervalMinutes: interval,
      enabled,
      cron: interval === 60 ? '0 * * * *' : `*/${interval} * * * *`,
    });
    onClose();
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-label="Configure Repository Synchronization"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-semibold text-slate-900">Sync & Freshness Schedule</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close schedule settings"
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        {/* Schedule interval */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="schedule-enabled-toggle" className="text-sm font-medium text-slate-700">
              Automated Periodic Scan
            </label>
            <input
              id="schedule-enabled-toggle"
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="sync-interval-select" className="text-xs font-medium text-slate-600">
              Scan Interval
            </label>
            <select
              id="sync-interval-select"
              value={interval}
              onChange={(e) => setInterval(Number(e.target.value))}
              disabled={!enabled}
              className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-800 disabled:opacity-50"
            >
              <option value={15}>Every 15 minutes</option>
              <option value={30}>Every 30 minutes</option>
              <option value={60}>Every 1 hour (Default)</option>
              <option value={360}>Every 6 hours</option>
              <option value={1440}>Every 24 hours</option>
            </select>
          </div>
        </div>

        {/* Webhook endpoint */}
        <div className="space-y-1.5 pt-2 border-t border-slate-100">
          <label className="text-xs font-medium text-slate-600">Webhook Payload URL</label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={webhookUrl}
              className="flex-1 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-mono text-slate-700"
            />
            <button
              type="button"
              onClick={handleCopyWebhook}
              className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 transition"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            DiagramHQ automatically refreshes models upon receiving push or PR merge events.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700 transition shadow-sm"
          >
            Save Schedule
          </button>
        </div>
      </div>
    </div>
  );
};
