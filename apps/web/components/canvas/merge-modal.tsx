'use client';

import React, { useState } from 'react';
import type {
  ArchitectureBranch,
  ArchitectureMergeConflict,
  ConflictResolutionStrategy,
  ManualResolutionChoice,
} from '@diagramhq/domain';

export interface ConflictResolutionBannerProps {
  conflicts: ArchitectureMergeConflict[];
  onApplyStrategy?: (strategy: ConflictResolutionStrategy) => void;
}

export function ConflictResolutionBanner({
  conflicts,
  onApplyStrategy,
}: ConflictResolutionBannerProps) {
  if (conflicts.length === 0) return null;

  return (
    <div
      className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/80 text-rose-200 text-xs space-y-2"
      role="alert"
      aria-label="Merge Conflict Alert"
    >
      <div className="flex items-center gap-2 font-semibold text-rose-300">
        <span className="material-symbols-outlined text-base text-rose-400">
          warning
        </span>
        <span>{`${conflicts.length} merge conflict(s) detected`}</span>
      </div>

      <p className="text-[11px] text-rose-200/80">
        Simultaneous modifications occurred on identical architectural entities. Select a resolution strategy to continue.
      </p>

      {onApplyStrategy && (
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => onApplyStrategy('theirs')}
            className="px-2.5 py-1 rounded bg-rose-900/60 hover:bg-rose-800 border border-rose-700 text-rose-100 text-[11px] font-medium transition-colors"
          >
            Accept Incoming (Theirs)
          </button>
          <button
            type="button"
            onClick={() => onApplyStrategy('ours')}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-[11px] font-medium transition-colors"
          >
            Keep Current (Ours)
          </button>
        </div>
      )}
    </div>
  );
}

export interface MergeBranchModalProps {
  sourceBranch: ArchitectureBranch;
  targetBranch: ArchitectureBranch;
  conflicts?: ArchitectureMergeConflict[];
  onClose?: () => void;
  onConfirmMerge: (options?: {
    strategy?: ConflictResolutionStrategy;
    manualResolutions?: ManualResolutionChoice[];
  }) => void;
}

export function MergeBranchModal({
  sourceBranch,
  targetBranch,
  conflicts = [],
  onClose,
  onConfirmMerge,
}: MergeBranchModalProps) {
  const [selectedResolutions, setSelectedResolutions] = useState<
    Record<string, 'source' | 'target'>
  >({});

  const hasConflicts = conflicts.length > 0;

  const handleSelectChoice = (entityId: string, choice: 'source' | 'target') => {
    setSelectedResolutions((prev) => ({ ...prev, [entityId]: choice }));
  };

  const handleMergeSubmit = () => {
    if (hasConflicts) {
      const manualResolutions: ManualResolutionChoice[] = conflicts.map((c) => ({
        entityId: String(c.entityId),
        chosenValue: selectedResolutions[String(c.entityId)] || 'target',
      }));
      onConfirmMerge({ manualResolutions });
    } else {
      onConfirmMerge();
    }
  };

  return (
    <div
      className="w-[460px] rounded-xl bg-slate-900/95 border border-slate-700/80 shadow-2xl p-5 text-xs text-slate-200 backdrop-blur-md"
      role="dialog"
      aria-label="Merge Branch Modal"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-cyan-400 text-base">
            call_merge
          </span>
          <h3 className="font-bold text-white text-sm">
            {`Merge ${sourceBranch.name} into ${targetBranch.name}`}
          </h3>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        )}
      </div>

      {/* Status banner */}
      <div className="mt-3">
        {hasConflicts ? (
          <ConflictResolutionBanner
            conflicts={conflicts}
            onApplyStrategy={(strategy) => onConfirmMerge({ strategy })}
          />
        ) : (
          <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/80 text-emerald-200 flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-emerald-400">
              check_circle
            </span>
            <span className="font-medium text-[11px]">
              Ready to merge cleanly. All modifications are non-conflicting.
            </span>
          </div>
        )}
      </div>

      {/* Conflicting entities list */}
      {hasConflicts && (
        <div className="mt-3 space-y-2 max-h-52 overflow-y-auto pr-1">
          <div className="text-[11px] font-semibold text-slate-400">
            Resolve Individual Conflicts:
          </div>
          {conflicts.map((conflict) => {
            const currentChoice =
              selectedResolutions[String(conflict.entityId)] || 'target';

            return (
              <div
                key={String(conflict.entityId)}
                className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">
                    {conflict.entityName}
                  </span>
                  <span className="font-mono text-[10px] text-amber-400">
                    {`Fields: ${conflict.conflictingFields.join(', ')}`}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectChoice(String(conflict.entityId), 'target')
                    }
                    className={`p-2 rounded border text-left transition-colors ${
                      currentChoice === 'target'
                        ? 'border-cyan-500 bg-cyan-950/40 text-cyan-200'
                        : 'border-slate-800 bg-slate-900 text-slate-400'
                    }`}
                  >
                    <div className="font-semibold text-[10px] text-slate-400 uppercase">
                      Current ({targetBranch.name})
                    </div>
                    <div className="mt-0.5 truncate">
                      {conflict.targetValue
                        ? ('name' in conflict.targetValue && conflict.targetValue.name) || 'Modified'
                        : 'Deleted'}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleSelectChoice(String(conflict.entityId), 'source')
                    }
                    className={`p-2 rounded border text-left transition-colors ${
                      currentChoice === 'source'
                        ? 'border-cyan-500 bg-cyan-950/40 text-cyan-200'
                        : 'border-slate-800 bg-slate-900 text-slate-400'
                    }`}
                  >
                    <div className="font-semibold text-[10px] text-slate-400 uppercase">
                      Incoming ({sourceBranch.name})
                    </div>
                    <div className="mt-0.5 truncate">
                      {conflict.sourceValue
                        ? ('name' in conflict.sourceValue && conflict.sourceValue.name) || 'Modified'
                        : 'Deleted'}
                    </div>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleMergeSubmit}
          className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium flex items-center gap-1.5 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">call_merge</span>
          <span>{hasConflicts ? 'Apply Resolutions & Merge' : 'Confirm Merge'}</span>
        </button>
      </div>
    </div>
  );
}
