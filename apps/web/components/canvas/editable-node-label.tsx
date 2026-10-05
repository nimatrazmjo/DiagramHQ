'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface EditableNodeLabelProps {
  nodeId?: string;
  label: string;
  isEditing?: boolean;
  onCommit?: (newLabel: string) => void;
  onCancel?: () => void;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
}

/**
 * EditableNodeLabel provides inline renaming of canvas nodes on double-click.
 * Pressing Enter or clicking outside (blur) commits the rename.
 * Pressing Escape cancels and restores the previous label.
 * While editing, text input events are isolated to prevent triggering canvas shortcuts.
 */
export function EditableNodeLabel({
  nodeId,
  label,
  isEditing: controlledIsEditing,
  onCommit,
  onCancel,
  className = 'text-sm font-semibold text-slate-100 truncate',
  inputClassName = 'w-full bg-slate-950/90 border border-sky-400 rounded px-1.5 py-0.5 text-sm font-semibold text-white focus:outline-none focus:ring-1 focus:ring-sky-400 shadow-inner',
  placeholder = 'Object name...',
}: EditableNodeLabelProps): JSX.Element {
  const [isLocalEditing, setIsLocalEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  const isEditing = controlledIsEditing ?? isLocalEditing;

  useEffect(() => {
    setDraftValue(label);
  }, [label]);

  useEffect(() => {
    if (isEditing) {
      setDraftValue(label);
      requestAnimationFrame(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      });
    }
  }, [isEditing, label]);

  const handleStartEditing = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLocalEditing(true);
  }, []);

  const handleCommit = useCallback(() => {
    const trimmed = draftValue.trim();
    setIsLocalEditing(false);
    if (trimmed && trimmed !== label) {
      onCommit?.(trimmed);
      if (nodeId && typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('canvas:node-rename', {
            detail: { nodeId, newLabel: trimmed, prevLabel: label },
          }),
        );
      }
    } else {
      setDraftValue(label);
      onCancel?.();
    }
  }, [draftValue, label, nodeId, onCommit, onCancel]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        handleCommit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsLocalEditing(false);
        setDraftValue(label);
        onCancel?.();
      }
    },
    [handleCommit, label, onCancel],
  );

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        data-testid="inline-node-rename-input"
        data-node-id={nodeId}
        value={draftValue}
        placeholder={placeholder}
        onChange={(e) => setDraftValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleCommit}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        className={`nodrag nopan ${inputClassName}`}
      />
    );
  }

  return (
    <div
      data-testid="node-label"
      data-node-id={nodeId}
      onDoubleClick={handleStartEditing}
      title="Double-click to rename"
      className={`cursor-text select-text ${className}`}
    >
      {label}
    </div>
  );
}
