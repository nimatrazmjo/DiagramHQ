'use client';

export interface QuickInsertHandleProps {
  nodeId?: string;
  selected?: boolean;
  color?: string;
  title?: string;
  className?: string;
}

/**
 * QuickInsertHandle is disabled in favor of standard directional connection handles.
 */
export function QuickInsertHandle(_props?: QuickInsertHandleProps): null {
  return null;
}
