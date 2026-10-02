'use client';

import React, { useState } from 'react';
import type {
  ShareLinkCameraState,
} from '@diagramhq/domain';

export interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  viewId: string;
  currentCamera?: ShareLinkCameraState;
  selectedObjectId?: string | null;
  onGenerateLink?: (options: {
    preserveCamera: boolean;
    preserveSelection: boolean;
    expiresInMs: number | null;
  }) => string;
}

export function ShareLinkModal({
  isOpen,
  onClose,
  currentCamera,
  selectedObjectId,
  onGenerateLink,
}: ShareLinkModalProps): JSX.Element | null {
  const [preserveCamera, setPreserveCamera] = useState(true);
  const [preserveSelection, setPreserveSelection] = useState(Boolean(selectedObjectId));
  const [expiryOption, setExpiryOption] = useState<string>('never');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const getExpiryMs = (option: string): number | null => {
    switch (option) {
      case '1d':
        return 24 * 3600 * 1000;
      case '7d':
        return 7 * 24 * 3600 * 1000;
      case '30d':
        return 30 * 24 * 3600 * 1000;
      default:
        return null;
    }
  };

  const shareUrl =
    onGenerateLink?.({
      preserveCamera,
      preserveSelection,
      expiresInMs: getExpiryMs(expiryOption),
    }) || 'https://diagramhq.com/share?token=preview-token';

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      data-testid="share-link-modal-backdrop"
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div
        data-testid="share-link-modal"
        aria-label="Share Read-Only Link"
        className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-fixed text-2xl">
              share
            </span>
            <h3 className="text-base font-bold text-white">Share Diagram View</h3>
          </div>
          <button
            type="button"
            data-testid="share-modal-close"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          Anyone with this link can view this diagram in read-only mode without logging in.
        </p>

        {/* Link Input & Copy */}
        <div className="flex items-center gap-2 mb-4 bg-slate-950 border border-slate-800 rounded-xl p-1.5 pl-3">
          <input
            type="text"
            readOnly
            data-testid="share-link-input"
            value={shareUrl}
            className="flex-1 bg-transparent text-xs text-slate-300 font-mono focus:outline-none truncate"
          />
          <button
            type="button"
            data-testid="share-copy-button"
            onClick={handleCopy}
            className="px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1 shrink-0"
          >
            <span className="material-symbols-outlined text-[14px]">
              {copied ? 'check' : 'content_copy'}
            </span>
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        {/* Options */}
        <div className="space-y-3 pt-3 border-t border-slate-800/80 mb-6">
          <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              data-testid="share-opt-camera"
              checked={preserveCamera}
              onChange={(e) => setPreserveCamera(e.target.checked)}
              className="rounded bg-slate-950 border-slate-700 text-primary focus:ring-0"
            />
            <span>
              Preserve current camera position (
              {currentCamera
                ? `pan: ${Math.round(currentCamera.panX)}, ${Math.round(currentCamera.panY)}, zoom: ${currentCamera.zoom}x`
                : 'viewport center'}
              )
            </span>
          </label>

          <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              data-testid="share-opt-selection"
              checked={preserveSelection}
              disabled={!selectedObjectId}
              onChange={(e) => setPreserveSelection(e.target.checked)}
              className="rounded bg-slate-950 border-slate-700 text-primary focus:ring-0 disabled:opacity-40"
            />
            <span>
              Preserve selected object (
              {selectedObjectId ? selectedObjectId : 'none selected'}
              )
            </span>
          </label>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-slate-400">Link expiration:</span>
            <select
              data-testid="share-opt-expiry"
              value={expiryOption}
              onChange={(e) => setExpiryOption(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none"
            >
              <option value="never">Never</option>
              <option value="1d">24 Hours</option>
              <option value="7d">7 Days</option>
              <option value="30d">30 Days</option>
            </select>
          </div>
        </div>

        {/* Footer info badge */}
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-950/70 rounded-xl border border-slate-800 text-[11px] text-slate-400">
          <span className="material-symbols-outlined text-[15px] text-emerald-400">
            verified_user
          </span>
          <span>Read-only access · No account or login required</span>
        </div>
      </div>
    </div>
  );
}

export interface ReadOnlyBannerProps {
  viewName?: string;
  selectedObjectName?: string | null;
  onResetView?: () => void;
  className?: string;
}

export function ReadOnlyBanner({
  viewName,
  selectedObjectName,
  onResetView,
  className = '',
}: ReadOnlyBannerProps): JSX.Element {
  return (
    <div
      data-testid="readonly-banner"
      aria-label="Read-Only Mode"
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2 bg-slate-900/90 border border-slate-700/80 backdrop-blur-md rounded-full shadow-xl text-xs text-slate-200 ${className}`}
    >
      <div className="flex items-center gap-1.5">
        <span className="material-symbols-outlined text-amber-400 text-base">
          visibility
        </span>
        <span className="font-semibold text-white">Read-Only View</span>
      </div>

      <div className="h-3 w-px bg-slate-700" />

      <div className="flex items-center gap-1 text-[11px] text-slate-400">
        <span>Viewing:</span>
        <span data-testid="readonly-view-name" className="text-slate-200 font-medium">
          {viewName || 'Architecture View'}
        </span>
      </div>

      {selectedObjectName && (
        <div className="flex items-center gap-1 text-[11px] text-slate-400">
          <span>· Focused:</span>
          <span data-testid="readonly-object-name" className="text-primary-fixed font-medium">
            {selectedObjectName}
          </span>
        </div>
      )}

      {onResetView && (
        <button
          type="button"
          data-testid="readonly-reset-btn"
          onClick={onResetView}
          className="ml-1 px-2.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-full text-[10px] font-medium transition-colors"
        >
          Reset Camera
        </button>
      )}
    </div>
  );
}
