import React from 'react';
import { NodeResizer } from '@xyflow/react';

export interface DiagramNodeResizerProps {
  isVisible?: boolean;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  color?: string;
  keepAspectRatio?: boolean;
}

/**
 * DiagramNodeResizer provides intuitive, multi-handle visual resizing
 * on canvas objects when selected. Supports corner handles (diagonal resizing)
 * and edge lines (horizontal/vertical resizing), with customizable constraints.
 */
export function DiagramNodeResizer({
  isVisible = true,
  minWidth = 140,
  minHeight = 60,
  maxWidth,
  maxHeight,
  color = '#38bdf8',
  keepAspectRatio = false,
}: DiagramNodeResizerProps): JSX.Element | null {
  if (!isVisible) return null;

  return (
    <NodeResizer
      isVisible={isVisible}
      minWidth={minWidth}
      minHeight={minHeight}
      maxWidth={maxWidth}
      maxHeight={maxHeight}
      color={color}
      keepAspectRatio={keepAspectRatio}
      lineClassName="!border-sky-400 !border-solid"
      handleClassName="!w-2.5 !h-2.5 !bg-white !border-0 !rounded-none shadow-md hover:!scale-125 transition-transform"
    />
  );
}
