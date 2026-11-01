'use client';

import { useMemo, useRef } from 'react';
import {
  calculateDynamicNodeDimensions,
  type DynamicNodeDimensionsInput,
  type DynamicNodeDimensions,
} from '@diagramhq/domain';

export {
  calculateDynamicNodeDimensions,
  type DynamicNodeDimensionsInput,
  type DynamicNodeDimensions,
};

export interface UseDynamicNodeDimensionsResult {
  cardRef: React.RefObject<HTMLDivElement>;
  minHeight: number;
  minWidth: number;
}

/**
 * Hook to provide dynamic minimum height and width for canvas nodes.
 *
 * Computes analytical minimum dimensions based on label, description, font sizes,
 * badges, header, footer, and architecture metadata cleanly and deterministically
 * without triggering re-render cascades.
 */
export function useDynamicNodeDimensions(
  input: DynamicNodeDimensionsInput,
  nodeType?: string,
  _nodeId?: string,
): UseDynamicNodeDimensionsResult {
  const cardRef = useRef<HTMLDivElement>(null);

  const calculated = useMemo(
    () => calculateDynamicNodeDimensions(input, nodeType),
    [
      input.label,
      input.description,
      input.systemType,
      input.domain,
      input.technology,
      input.runtime,
      input.status,
      input.port,
      input.kind,
      input.fontSize,
      input.labelFontSize,
      input.descriptionFontSize,
      input.paddingY,
      input.paddingX,
      input.hasHeader,
      input.hasFooter,
      input.badgesCount,
      input.extraLines,
      nodeType,
    ],
  );

  return {
    cardRef,
    minHeight: calculated.minHeight,
    minWidth: calculated.minWidth,
  };
}
