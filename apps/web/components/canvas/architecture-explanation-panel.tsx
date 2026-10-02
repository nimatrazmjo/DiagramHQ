'use client';

import React from 'react';
import type {
  ArchitectureExplanation,
  AudienceAltitude,
} from '@diagramhq/domain';

export interface AltitudeSelectorProps {
  currentAltitude: AudienceAltitude;
  onChangeAltitude: (altitude: AudienceAltitude) => void;
}

export function AltitudeSelector({
  currentAltitude,
  onChangeAltitude,
}: AltitudeSelectorProps) {
  const altitudes: Array<{
    id: AudienceAltitude;
    label: string;
    description: string;
    icon: string;
  }> = [
    {
      id: 'engineer',
      label: 'Engineer / Tech Lead',
      description: 'Protocols, RPC contracts, ports, and error boundaries',
      icon: 'terminal',
    },
    {
      id: 'architect',
      label: 'Solutions / Enterprise Architect',
      description: 'Bounded contexts, coupling topology, and trade-offs',
      icon: 'hub',
    },
    {
      id: 'executive',
      label: 'Executive / CTO',
      description: 'Business capability, risk posture, and team alignment',
      icon: 'business_center',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
      {altitudes.map((alt) => {
        const isActive = currentAltitude === alt.id;
        return (
          <button
            key={alt.id}
            type="button"
            onClick={() => onChangeAltitude(alt.id)}
            className={`flex flex-col items-start p-2.5 rounded-lg text-left transition-colors ${
              isActive
                ? 'bg-cyan-950/80 border border-cyan-700/80 text-white'
                : 'hover:bg-slate-900 border border-transparent text-slate-400'
            }`}
          >
            <div className="flex items-center gap-1.5 font-semibold text-xs">
              <span className={`material-symbols-outlined text-sm ${isActive ? 'text-cyan-400' : 'text-slate-400'}`}>
                {alt.icon}
              </span>
              <span>{alt.label}</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 line-clamp-1">
              {alt.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export interface ArchitectureExplanationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  explanation?: ArchitectureExplanation | null;
  currentAltitude: AudienceAltitude;
  onChangeAltitude: (altitude: AudienceAltitude) => void;
  onSelectEntity?: (entityId: string) => void;
}

export function ArchitectureExplanationPanel({
  isOpen,
  onClose,
  explanation,
  currentAltitude,
  onChangeAltitude,
  onSelectEntity,
}: ArchitectureExplanationPanelProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col text-slate-100"
      role="region"
      aria-label="Architecture Explanation Panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-cyan-400 text-2xl">
            psychology
          </span>
          <div>
            <h2 className="text-base font-bold text-white">
              Architecture Explanation
            </h2>
            <p className="text-xs text-slate-400">
              Audience-calibrated architectural narrative
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          aria-label="Close Explanation Panel"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>

      {/* Altitude Selector Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/60">
        <AltitudeSelector
          currentAltitude={currentAltitude}
          onChangeAltitude={onChangeAltitude}
        />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {explanation ? (
          <>
            {/* Title & Summary */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 text-cyan-300 border border-slate-700">
                  {explanation.targetKind}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {explanation.targetId}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white">
                {explanation.title}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                {explanation.summary}
              </p>
            </div>

            {/* Sections */}
            <div className="space-y-4">
              {explanation.sections.map((section, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-slate-800 bg-slate-950 space-y-2.5"
                >
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider text-cyan-400">
                    {section.title}
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {section.content}
                  </p>
                  {section.keyPoints.length > 0 && (
                    <ul className="space-y-1 pt-1.5 border-t border-slate-850">
                      {section.keyPoints.map((kp, kIdx) => (
                        <li key={kIdx} className="flex items-center gap-2 text-[11px] text-slate-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                          <span>{kp}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            {/* Grounded Citations Bar */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">
                  Grounded Entity Citations
                </span>
                <span className="text-[10px] font-mono text-cyan-400">
                  {`${explanation.citedObjects.length} objects · ${explanation.citedConnections.length} connections`}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {explanation.citedObjects.map((obj) => (
                  <button
                    key={obj.id}
                    type="button"
                    onClick={() => onSelectEntity?.(obj.id)}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-[11px] text-slate-200 flex items-center gap-1.5 transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>{obj.name}</span>
                    <span className="text-[9px] font-mono text-slate-500">[{obj.id}]</span>
                  </button>
                ))}
                {explanation.citedConnections.map((conn) => (
                  <button
                    key={conn.id}
                    type="button"
                    onClick={() => onSelectEntity?.(conn.id)}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500 text-[11px] text-slate-200 flex items-center gap-1.5 transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span>{conn.name}</span>
                    <span className="text-[9px] font-mono text-slate-500">[{conn.id}]</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
            <span className="material-symbols-outlined text-4xl mb-2 text-slate-600">
              menu_book
            </span>
            <p className="text-sm font-medium">Select an item to explain</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Click any component, flow, or decision record to view an audience-calibrated explanation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
