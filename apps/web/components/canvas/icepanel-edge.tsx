import React, { useMemo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  Position,
  useInternalNode,
  useEdges,
  type EdgeProps,
} from '@xyflow/react';

interface NodeBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Calculates the optimal connection sides (Top, Right, Bottom, Left)
 * between two bounding boxes based on relative position, distance, and facing angles.
 */
function getOptimalConnectionSides(
  source: NodeBox,
  target: NodeBox,
): { sourcePosition: Position; targetPosition: Position } {
  const sides: Position[] = [Position.Top, Position.Right, Position.Bottom, Position.Left];
  let bestPair = { sourcePosition: Position.Bottom, targetPosition: Position.Top };
  let minScore = Infinity;

  const srcCenter = { x: source.x + source.width / 2, y: source.y + source.height / 2 };
  const tgtCenter = { x: target.x + target.width / 2, y: target.y + target.height / 2 };

  for (const sPos of sides) {
    let sX = srcCenter.x;
    let sY = srcCenter.y;
    if (sPos === Position.Left) sX = source.x;
    else if (sPos === Position.Right) sX = source.x + source.width;
    else if (sPos === Position.Top) sY = source.y;
    else if (sPos === Position.Bottom) sY = source.y + source.height;

    for (const tPos of sides) {
      let tX = tgtCenter.x;
      let tY = tgtCenter.y;
      if (tPos === Position.Left) tX = target.x;
      else if (tPos === Position.Right) tX = target.x + target.width;
      else if (tPos === Position.Top) tY = target.y;
      else if (tPos === Position.Bottom) tY = target.y + target.height;

      const dx = tX - sX;
      const dy = tY - sY;

      let penalty = 0;

      // Penalize source side pointing away from target
      if (sPos === Position.Right && dx < 0) penalty += 1500 + Math.abs(dx) * 2;
      if (sPos === Position.Left && dx > 0) penalty += 1500 + Math.abs(dx) * 2;
      if (sPos === Position.Bottom && dy < 0) penalty += 1500 + Math.abs(dy) * 2;
      if (sPos === Position.Top && dy > 0) penalty += 1500 + Math.abs(dy) * 2;

      // Penalize target side facing away from incoming direction
      if (tPos === Position.Left && dx < 0) penalty += 1500 + Math.abs(dx) * 2;
      if (tPos === Position.Right && dx > 0) penalty += 1500 + Math.abs(dx) * 2;
      if (tPos === Position.Top && dy < 0) penalty += 1500 + Math.abs(dy) * 2;
      if (tPos === Position.Bottom && dy > 0) penalty += 1500 + Math.abs(dy) * 2;

      // Prefer direct facing pairs (Right <-> Left, Bottom <-> Top)
      const isOpposite =
        (sPos === Position.Right && tPos === Position.Left) ||
        (sPos === Position.Left && tPos === Position.Right) ||
        (sPos === Position.Bottom && tPos === Position.Top) ||
        (sPos === Position.Top && tPos === Position.Bottom);

      // Prefer clean L-shapes
      const isCorner =
        (sPos === Position.Right && (tPos === Position.Top || tPos === Position.Bottom)) ||
        (sPos === Position.Left && (tPos === Position.Top || tPos === Position.Bottom)) ||
        (sPos === Position.Bottom && (tPos === Position.Left || tPos === Position.Right)) ||
        (sPos === Position.Top && (tPos === Position.Left || tPos === Position.Right));

      if (isOpposite) penalty -= 150;
      else if (isCorner) penalty -= 50;

      const dist = Math.abs(dx) + Math.abs(dy);
      const score = dist + penalty;

      if (score < minScore) {
        minScore = score;
        bestPair = { sourcePosition: sPos, targetPosition: tPos };
      }
    }
  }

  return bestPair;
}

/**
 * IcePanelEdge renders a connection edge matching IcePanel's visual design.
 * Features:
 * - Dynamic optimal routing between facing sides of source and target nodes
 * - Automatic lane and anchor staggering to eliminate overlapping connectors
 * - Crisp directional arrowheads with dynamic selection highlighting
 * - Centered pill badges displaying protocol badges and descriptions
 * - Broad clickable hit target for effortless edge selection
 */
export function IcePanelEdge({
  id,
  source,
  target,
  sourceX: defaultSourceX,
  sourceY: defaultSourceY,
  targetX: defaultTargetX,
  targetY: defaultTargetY,
  sourcePosition: defaultSourcePosition,
  targetPosition: defaultTargetPosition,
  sourceHandleId,
  targetHandleId,
  style = {},
  markerEnd,
  label,
  data,
  selected,
}: EdgeProps): JSX.Element {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  const allEdges = useEdges();

  const edgeData = (data ?? {}) as Record<string, unknown>;
  const isFlowView = Boolean(edgeData.flowView);
  const isInFlow = Boolean(edgeData.isInFlow);
  const flowStepNumber = edgeData.flowStepNumber as number | undefined;
  const flowStepNote = edgeData.flowStepNote as string | undefined;
  const isActiveStep = Boolean(edgeData.isActiveStep);

  const rawProtocol = (edgeData.protocol as string) || (edgeData.kind as string);
  const rawDescription = (edgeData.description as string) || (edgeData.label as string);
  const isAsync =
    edgeData.kind === 'async' ||
    rawProtocol?.toLowerCase() === 'async' ||
    Boolean(style?.strokeDasharray);

  // Parse label if formatted as "Protocol: Description"
  let protocol: string | undefined = rawProtocol || undefined;
  let description: string | undefined = rawDescription || undefined;
  if (!protocol && typeof label === 'string' && label.includes(':')) {
    const parts = label.split(':');
    protocol = parts[0]?.trim() || undefined;
    description = parts.slice(1).join(':').trim() || undefined;
  } else if (!description && typeof label === 'string') {
    description = label;
  }


  // Calculate dynamic routing & anchor positions
  const routeGeometry = useMemo(() => {
    // Fallback if node positions are not yet available
    if (!sourceNode || !targetNode) {
      return {
        sourceX: defaultSourceX,
        sourceY: defaultSourceY,
        sourcePosition: defaultSourcePosition,
        targetX: defaultTargetX,
        targetY: defaultTargetY,
        targetPosition: defaultTargetPosition,
        offset: 24,
      };
    }

    const sPos = sourceNode.internals?.positionAbsolute ?? sourceNode.position ?? { x: defaultSourceX, y: defaultSourceY };
    const sW = sourceNode.measured?.width ?? sourceNode.width ?? 240;
    const sH = sourceNode.measured?.height ?? sourceNode.height ?? 100;
    const sourceBox: NodeBox = { x: sPos.x, y: sPos.y, width: sW, height: sH };

    const tPos = targetNode.internals?.positionAbsolute ?? targetNode.position ?? { x: defaultTargetX, y: defaultTargetY };
    const tW = targetNode.measured?.width ?? targetNode.width ?? 240;
    const tH = targetNode.measured?.height ?? targetNode.height ?? 100;
    const targetBox: NodeBox = { x: tPos.x, y: tPos.y, width: tW, height: tH };

    // Determine optimal connection sides
    let computedSourcePos: Position;
    let computedTargetPos: Position;

    const isManual = edgeData.routing === 'manual';
    if (isManual && sourceHandleId && targetHandleId) {
      const parseSide = (hId: string, fallback: Position): Position => {
        if (hId.startsWith('top')) return Position.Top;
        if (hId.startsWith('bottom')) return Position.Bottom;
        if (hId.startsWith('left')) return Position.Left;
        if (hId.startsWith('right')) return Position.Right;
        return fallback;
      };
      computedSourcePos = parseSide(sourceHandleId, defaultSourcePosition);
      computedTargetPos = parseSide(targetHandleId, defaultTargetPosition);
    } else {
      const optimal = getOptimalConnectionSides(sourceBox, targetBox);
      computedSourcePos = optimal.sourcePosition;
      computedTargetPos = optimal.targetPosition;
    }

    // Base anchor coordinates at the center of the chosen side
    let sx = sourceBox.x + sourceBox.width / 2;
    let sy = sourceBox.y + sourceBox.height / 2;
    if (computedSourcePos === Position.Left) sx = sourceBox.x;
    else if (computedSourcePos === Position.Right) sx = sourceBox.x + sourceBox.width;
    else if (computedSourcePos === Position.Top) sy = sourceBox.y;
    else if (computedSourcePos === Position.Bottom) sy = sourceBox.y + sourceBox.height;

    let tx = targetBox.x + targetBox.width / 2;
    let ty = targetBox.y + targetBox.height / 2;
    if (computedTargetPos === Position.Left) tx = targetBox.x;
    else if (computedTargetPos === Position.Right) tx = targetBox.x + targetBox.width;
    else if (computedTargetPos === Position.Top) ty = targetBox.y;
    else if (computedTargetPos === Position.Bottom) ty = targetBox.y + targetBox.height;

    // Multi-edge deconfliction: find all edges sharing this source node & side
    const sourceGroup = allEdges
      .filter((e) => e.source === source)
      .sort((a, b) => a.id.localeCompare(b.id));
    const srcIndex = Math.max(0, sourceGroup.findIndex((e) => e.id === id));
    const srcCount = sourceGroup.length;

    // Multi-edge deconfliction: find all edges sharing this target node & side
    const targetGroup = allEdges
      .filter((e) => e.target === target)
      .sort((a, b) => a.id.localeCompare(b.id));
    const tgtIndex = Math.max(0, targetGroup.findIndex((e) => e.id === id));
    const tgtCount = targetGroup.length;

    // Apply anchor spacing across node perimeter so edges don't exit from the exact same pixel
    if (srcCount > 1) {
      const spreadStep = 18;
      const offset = (srcIndex - (srcCount - 1) / 2) * spreadStep;
      if (computedSourcePos === Position.Top || computedSourcePos === Position.Bottom) {
        const maxOffset = sourceBox.width / 2 - 20;
        sx += Math.max(-maxOffset, Math.min(maxOffset, offset));
      } else {
        const maxOffset = sourceBox.height / 2 - 16;
        sy += Math.max(-maxOffset, Math.min(maxOffset, offset));
      }
    }

    if (tgtCount > 1) {
      const spreadStep = 18;
      const offset = (tgtIndex - (tgtCount - 1) / 2) * spreadStep;
      if (computedTargetPos === Position.Top || computedTargetPos === Position.Bottom) {
        const maxOffset = targetBox.width / 2 - 20;
        tx += Math.max(-maxOffset, Math.min(maxOffset, offset));
      } else {
        const maxOffset = targetBox.height / 2 - 16;
        ty += Math.max(-maxOffset, Math.min(maxOffset, offset));
      }
    }

    // Stagger orthogonal step offsets so parallel lines never overlap
    const pathOffset = 24 + srcIndex * 16;

    return {
      sourceX: sx,
      sourceY: sy,
      sourcePosition: computedSourcePos,
      targetX: tx,
      targetY: ty,
      targetPosition: computedTargetPos,
      offset: pathOffset,
    };
  }, [
    source,
    target,
    sourceNode,
    targetNode,
    allEdges,
    id,
    defaultSourceX,
    defaultSourceY,
    defaultTargetX,
    defaultTargetY,
    defaultSourcePosition,
    defaultTargetPosition,
    sourceHandleId,
    targetHandleId,
    edgeData.routing,
  ]);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX: routeGeometry.sourceX,
    sourceY: routeGeometry.sourceY,
    sourcePosition: routeGeometry.sourcePosition,
    targetX: routeGeometry.targetX,
    targetY: routeGeometry.targetY,
    targetPosition: routeGeometry.targetPosition,
    borderRadius: 16,
    offset: routeGeometry.offset,
  });

  let strokeColor = selected ? '#38bdf8' : (style.stroke as string) || '#64748b';
  let strokeWidth = selected ? 2.5 : (style.strokeWidth as number) || 1.75;
  let edgeOpacity = 1;

  if (isFlowView) {
    if (isInFlow) {
      strokeColor = isActiveStep ? '#06b6d4' : '#0284c7';
      strokeWidth = isActiveStep ? 3.5 : 2.5;
    } else {
      strokeColor = '#475569';
      strokeWidth = 1.25;
      edgeOpacity = 0.25;
    }
  }

  const markerId = `icepanel-arrow-${id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

  return (
    <>
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 10 10"
          refX="7.5"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <polygon points="0 1.5, 8 5, 0 8.5" fill={strokeColor} />
        </marker>
      </defs>

      {/* Invisible wider hit area for easy selection */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={24}
        className="react-flow__edge-interaction cursor-pointer"
        style={{ pointerEvents: 'stroke' }}
      />

      {/* Visible Base Edge */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          stroke: strokeColor,
          strokeWidth,
          opacity: edgeOpacity,
          strokeDasharray: isAsync ? '6 4' : undefined,
          filter:
            selected || (isFlowView && isInFlow)
              ? `drop-shadow(0 0 6px ${isActiveStep ? 'rgba(6, 182, 212, 0.7)' : 'rgba(2, 132, 199, 0.6)'})`
              : undefined,
          transition: 'stroke 0.15s ease, stroke-width 0.15s ease, opacity 0.15s ease',
        }}
        markerEnd={markerEnd ?? `url(#${markerId})`}
      />

      {/* Pill Badge */}
      {(isFlowView ? isInFlow : protocol || description) && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            data-testid={isFlowView ? 'flow-edge-badge' : 'edge-pill-badge'}
            className={`nopan nodrag flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-sans border backdrop-blur-md shadow-lg select-none cursor-pointer transition-all ${
              isFlowView && isInFlow
                ? isActiveStep
                  ? 'bg-cyan-950/95 border-cyan-400 text-cyan-200 ring-2 ring-cyan-500/50 shadow-cyan-500/30 scale-110 animate-pulse'
                  : 'bg-sky-950/95 border-sky-400 text-sky-200 ring-2 ring-sky-500/40 shadow-sky-500/20 scale-105'
                : selected
                ? 'bg-slate-900 border-sky-400 text-sky-200 ring-2 ring-sky-500/40 shadow-sky-500/20 scale-105'
                : 'bg-slate-900/95 border-slate-700/80 text-slate-300 hover:border-slate-500 hover:text-white hover:scale-102'
            }`}
          >
            {isFlowView && isInFlow && flowStepNumber && (
              <span
                data-testid="badge-flow-step-number"
                className="px-1.5 py-0.2 rounded bg-sky-500/30 text-sky-200 border border-sky-400/50 font-mono text-[10px] font-bold uppercase tracking-wider"
              >
                #{flowStepNumber}
              </span>
            )}
            {protocol && (
              <span className="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-mono text-[9px] font-semibold uppercase tracking-wider">
                {protocol}
              </span>
            )}
            {(flowStepNote || description) && (
              <span className="truncate max-w-[160px] text-slate-200 font-medium">
                {flowStepNote || description}
              </span>
            )}
          </div>
        </EdgeLabelRenderer>
      )}

    </>
  );
}
