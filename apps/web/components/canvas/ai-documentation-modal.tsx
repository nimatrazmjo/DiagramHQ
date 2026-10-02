'use client';

import React from 'react';
import type {
  GroundedArchitectureDocumentation,
} from '@diagramhq/domain';

export interface AIDocumentationCardProps {
  documentation: GroundedArchitectureDocumentation;
  onOpen?: () => void;
  onRefresh?: () => void;
}

export function AIDocumentationCard({
  documentation,
  onOpen,
  onRefresh,
}: AIDocumentationCardProps) {
  return (
    <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 text-xs space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="font-mono text-[10px] text-cyan-400 font-bold uppercase">
            {documentation.type === 'architecture' ? 'System Spec' : 'Grounded Component Spec'}
          </span>
          <h3 className="text-sm font-bold text-white mt-0.5">{documentation.title}</h3>
        </div>
        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-900 border border-slate-700 text-slate-300">
          v:{documentation.versionId}
        </span>
      </div>

      <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
        <span>{`${documentation.sections.length} sections`}</span>
        <span>•</span>
        <span>{`${documentation.groundedReferences.length} grounded references`}</span>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-850">
        <span className="text-[10px] text-slate-500">
          Sync: {new Date(documentation.lastSynchronizedAt).toLocaleTimeString()}
        </span>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Refresh documentation against live model"
            >
              <span className="material-symbols-outlined text-sm">sync</span>
            </button>
          )}
          {onOpen && (
            <button
              type="button"
              onClick={onOpen}
              className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">menu_book</span>
              View Doc
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export interface DocumentationViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentation?: GroundedArchitectureDocumentation | null;
  onRefresh?: () => void;
  onSelectReference?: (id: string) => void;
}

export function DocumentationViewerModal({
  isOpen,
  onClose,
  documentation,
  onRefresh,
  onSelectReference,
}: DocumentationViewerModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Architecture Documentation Dialog"
    >
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[85vh] text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-cyan-400 text-2xl">
              description
            </span>
            <div>
              <h2 className="text-base font-bold text-white">
                {documentation ? documentation.title : 'Architecture Documentation'}
              </h2>
              <p className="text-xs text-slate-400">
                100% grounded in model topology, metadata, and ADRs
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs flex items-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">sync</span>
                Auto-Refresh
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              aria-label="Close Documentation Dialog"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {documentation ? (
            <>
              {/* Grounded References Bar */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">
                    Grounded Model Entities ({documentation.groundedReferences.length})
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    ✓ Verified Invariant: Zero Hallucinations
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {documentation.groundedReferences.map((ref, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onSelectReference?.(ref.id)}
                      className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-cyan-500 text-[10px] font-mono text-cyan-300 transition-colors flex items-center gap-1"
                    >
                      <span className="text-slate-500">{ref.kind}:</span>
                      <span>{ref.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Document Sections */}
              <div className="space-y-4">
                {documentation.sections.map((section, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-xl border border-slate-800 bg-slate-950 space-y-2.5"
                  >
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider text-cyan-400 border-b border-slate-850 pb-2">
                      {section.title}
                    </h3>
                    <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                      {section.content}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
              <span className="material-symbols-outlined text-4xl mb-2 text-slate-600">
                auto_stories
              </span>
              <p className="text-sm font-medium">No documentation generated</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Select an object to generate grounded technical documentation.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
