import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { EditableNodeLabel } from './editable-node-label';
import { DiagramNodeResizer } from './diagram-node-resizer';

/**
 * IcePanelNodeShell — the single source of truth for IcePanel-faithful object
 * rendering on the canvas. Every C4 object node (System, App, Component, Store,
 * Actor, Group / boundary) composes this shell so the look & interactions match
 * IcePanel exactly:
 *   - near-black uniform card, 1px subtle border, hover lightens
 *   - big technology logo on the left + centered title
 *   - muted "Type: Tech" subtitle, bottom-centered
 *   - zoom / drill magnifier glyph, top-left
 *   - status dot bottom-left (live = filled green, future = dashed purple ring)
 *   - cyan selection outline + 8 square resize handles
 *   - 8 connection handles (source+target per side) with the canonical ids the
 *     edge router and e2e tests depend on.
 */

export type IcePanelVariant = 'card' | 'cylinder' | 'boundary' | 'actor';
export type IcePanelStatus = 'live' | 'future' | string | undefined;

const SELECT = '#2BB5E8';

export interface IcePanelNodeShellProps {
  nodeId: string;
  testId: string;
  variant: IcePanelVariant;
  title: string;
  /** Muted bottom subtitle, e.g. "App: React", "Store: PostgREST", "System". */
  subtitle?: string;
  /** Resolved technology/logo image path. */
  iconPath?: string;
  /** Fallback glyph when no logo resolves. */
  fallbackGlyph?: React.ReactNode;
  selected?: boolean;
  isEditing?: boolean;
  onRename?: (next: string) => void;
  /** When set, renders the drill magnifier and wires its click. */
  onDrill?: () => void;
  drillTestId?: string;
  status?: IcePanelStatus;
  minWidth: number;
  minHeight: number;
  cardRef: React.Ref<HTMLDivElement>;
  style?: React.CSSProperties;
  /** Dimmed (e.g. flow view non-participant) / highlighted (flow participant). */
  dim?: boolean;
  highlight?: boolean;
  /** Perspective badge overlays (security/data/flow…) kept for feature parity. */
  overlays?: React.ReactNode;
  /** Uppercase header label (groups). Falsey → normal case title in header. */
  boundaryUppercase?: boolean;
  fontSize?: number;
  onDoubleClick?: (e: React.MouseEvent) => void;
  children?: React.ReactNode;
}

function ZoomGlyph(): JSX.Element {
  return (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function StatusDot({ status }: { status: IcePanelStatus }): JSX.Element | null {
  const s = (status ?? '').toLowerCase();
  if (s === 'future' || s === 'planned') {
    return <span title="Future" className="inline-block w-2.5 h-2.5 rounded-full border-[1.5px] border-dashed border-[#a855f7]" />;
  }
  if (s === 'live' || s === 'active') {
    return <span title="Live" className="inline-block w-2.5 h-2.5 rounded-full bg-[#22c55e]" />;
  }
  // Deprecated / removed etc. render a hollow gray dot.
  if (s) return <span title={status} className="inline-block w-2.5 h-2.5 rounded-full border-[1.5px] border-[#6b7280]" />;
  return null;
}

const HANDLE_BASE =
  '!w-2 !h-2 !bg-[#2BB5E8] !border !border-[#0b0d0f] !rounded-full !opacity-0 group-hover:!opacity-100 transition-opacity';

function Handles(): JSX.Element {
  return (
    <>
      <Handle type="source" position={Position.Top} id="top-source" className={`source ${HANDLE_BASE}`} />
      <Handle type="target" position={Position.Top} id="top-target" className={`target ${HANDLE_BASE}`} />
      <Handle type="source" position={Position.Right} id="right-source" className={`source ${HANDLE_BASE}`} />
      <Handle type="target" position={Position.Right} id="right-target" className={`target ${HANDLE_BASE}`} />
      <Handle type="source" position={Position.Bottom} id="bottom-source" className={`source ${HANDLE_BASE}`} />
      <Handle type="target" position={Position.Bottom} id="bottom-target" className={`target ${HANDLE_BASE}`} />
      <Handle type="source" position={Position.Left} id="left-source" className={`source ${HANDLE_BASE}`} />
      <Handle type="target" position={Position.Left} id="left-target" className={`target ${HANDLE_BASE}`} />
    </>
  );
}

function Logo({ iconPath, fallbackGlyph, size }: { iconPath?: string; fallbackGlyph?: React.ReactNode; size: number }): JSX.Element {
  if (iconPath) {
    return <img src={iconPath} alt="" width={size} height={size} className="object-contain flex-shrink-0" style={{ width: size, height: size }} />;
  }
  return <span className="flex-shrink-0 text-[#8b9196]" style={{ width: size, height: size }}>{fallbackGlyph}</span>;
}

export function IcePanelNodeShell(props: IcePanelNodeShellProps): JSX.Element {
  const {
    nodeId, testId, variant, title, subtitle, iconPath, fallbackGlyph,
    selected, isEditing, onRename, onDrill, drillTestId, status,
    minWidth, minHeight, cardRef, style, dim, highlight, overlays,
    boundaryUppercase, fontSize, onDoubleClick, children,
  } = props;

  const titleEl = (
    <EditableNodeLabel
      nodeId={nodeId}
      label={title}
      isEditing={Boolean(isEditing)}
      onCommit={(next) => onRename?.(next)}
      style={fontSize ? { fontSize: `${fontSize}px` } : undefined}
      className="font-semibold text-[#e7e9ea] tracking-[0.01em] text-center leading-tight break-words line-clamp-2 max-w-full text-[15px]"
    />
  );

  const borderStyle = selected
    ? { borderColor: SELECT, boxShadow: `0 0 0 1px ${SELECT}` }
    : highlight
      ? { borderColor: SELECT }
      : undefined;

  const drill = onDrill ? (
    <button
      type="button"
      data-testid={drillTestId}
      onClick={(e) => { e.stopPropagation(); onDrill(); }}
      title="Open child diagram"
      className="absolute top-1.5 left-1.5 z-10 p-0.5 rounded text-[#6b7280] hover:text-[#2BB5E8] hover:bg-[#2BB5E8]/10 transition-colors"
    >
      <ZoomGlyph />
    </button>
  ) : (
    <span className="absolute top-1.5 left-1.5 z-10 p-0.5 text-[#4b5157]"><ZoomGlyph /></span>
  );

  const statusDot = <span className="absolute bottom-1.5 left-2 z-10"><StatusDot status={status} /></span>;

  // ---- Boundary (System boundary / Group container) --------------------------
  if (variant === 'boundary') {
    return (
      <div
        ref={cardRef}
        data-testid={testId}
        onDoubleClick={onDoubleClick}
        style={{ minWidth, minHeight, ...borderStyle, ...style }}
        className={`group w-full h-full rounded-[10px] border relative select-none transition-colors ${
          selected ? '' : 'border-white/10 hover:border-white/20'
        }`}
      >
        <div className="absolute inset-0 rounded-[10px] bg-white/[0.015] pointer-events-none" />
        <DiagramNodeResizer isVisible={Boolean(selected)} minWidth={minWidth} minHeight={minHeight} color={SELECT} />
        <Handles />
        {drill}
        {/* Header top-left */}
        <div className="absolute top-2 left-8 right-3 flex items-center gap-2 z-10">
          <Logo iconPath={iconPath} fallbackGlyph={fallbackGlyph} size={16} />
          <div className={`truncate ${boundaryUppercase ? 'uppercase tracking-wider text-[12px]' : 'text-[13px]'} font-semibold text-[#e7e9ea]`}>
            {isEditing ? titleEl : title}
          </div>
        </div>
        {/* Subtitle bottom-center */}
        {subtitle && (
          <div className="absolute bottom-1.5 left-0 right-0 text-center text-[11px] text-[#8b9196] pointer-events-none">{subtitle}</div>
        )}
        {children}
        {overlays}
      </div>
    );
  }

  // ---- Cylinder (Store / Database) ------------------------------------------
  if (variant === 'cylinder') {
    const ry = 9; // ellipse radius as % of height for the cap
    return (
      <div
        ref={cardRef}
        data-testid={testId}
        onDoubleClick={onDoubleClick}
        style={{ minWidth, minHeight, ...style, opacity: dim ? 0.35 : 1 }}
        className="group w-full h-full relative select-none"
      >
        <DiagramNodeResizer isVisible={Boolean(selected)} minWidth={minWidth} minHeight={minHeight} color="#a855f7" />
        <Handles />
        {/* Cylinder body */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path
            d={`M0,${ry} L0,${100 - ry} A50,${ry} 0 0 0 100,${100 - ry} L100,${ry}`}
            fill="#15181c"
            stroke={selected ? SELECT : 'rgba(255,255,255,0.1)'}
            strokeWidth={selected ? 2 : 1}
            vectorEffect="non-scaling-stroke"
          />
          <ellipse cx="50" cy={ry} rx="50" ry={ry} fill="#1b1f24" stroke={selected ? SELECT : 'rgba(255,255,255,0.1)'} strokeWidth={selected ? 2 : 1} vectorEffect="non-scaling-stroke" />
        </svg>
        {drill}
        {statusDot}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3 pt-3 pointer-events-none">
          <div className={`flex items-center justify-center gap-2 max-w-full ${isEditing ? "pointer-events-auto" : "pointer-events-none"}`}>
            <Logo iconPath={iconPath} fallbackGlyph={fallbackGlyph} size={26} />
            {titleEl}
          </div>
        </div>
        {subtitle && (
          <div className="absolute bottom-2 left-0 right-0 text-center text-[11px] text-[#8b9196] pointer-events-none">{subtitle}</div>
        )}
        {overlays}
      </div>
    );
  }

  // ---- Actor (Person) --------------------------------------------------------
  if (variant === 'actor') {
    return (
      <div
        ref={cardRef}
        data-testid={testId}
        onDoubleClick={onDoubleClick}
        style={{ minWidth, minHeight, ...borderStyle, ...style, opacity: dim ? 0.35 : 1 }}
        className={`group w-full h-full rounded-lg border bg-[#15181c] relative select-none transition-colors flex flex-col items-center justify-center text-center px-3 py-3 ${
          selected ? '' : 'border-white/10 hover:border-white/20 hover:bg-[#1b1f24]'
        }`}
      >
        <DiagramNodeResizer isVisible={Boolean(selected)} minWidth={minWidth} minHeight={minHeight} color={SELECT} />
        <Handles />
        {drill}
        {statusDot}
        <div className="mb-1 text-[#c6cacd]">
          {iconPath ? <Logo iconPath={iconPath} fallbackGlyph={fallbackGlyph} size={30} /> : (
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="7" r="4" />
              <path d="M5.5 21a8.38 8.38 0 0 1 13 0" />
            </svg>
          )}
        </div>
        {titleEl}
        {subtitle && <div className="mt-0.5 text-[11px] text-[#8b9196]">{subtitle}</div>}
        {overlays}
      </div>
    );
  }

  // ---- Card (System / App / Component / Queue) -------------------------------
  return (
    <div
      ref={cardRef}
      data-testid={testId}
      onDoubleClick={onDoubleClick}
      style={{ minWidth, minHeight, ...borderStyle, ...style, opacity: dim ? 0.35 : 1 }}
      className={`group w-full h-full rounded-lg border bg-[#15181c] relative select-none transition-colors ${
        selected ? '' : 'border-white/10 hover:border-white/20 hover:bg-[#1b1f24]'
      }`}
    >
      <DiagramNodeResizer isVisible={Boolean(selected)} minWidth={minWidth} minHeight={minHeight} color={SELECT} />
      <Handles />
      {drill}
      {statusDot}
      <div className="absolute inset-0 flex items-center justify-center px-3 pb-4 pt-3 pointer-events-none">
        <div className={`flex items-center justify-center gap-2.5 max-w-full ${isEditing ? "pointer-events-auto" : "pointer-events-none"}`}>
          <Logo iconPath={iconPath} fallbackGlyph={fallbackGlyph} size={26} />
          {titleEl}
        </div>
      </div>
      {subtitle && (
        <div className="absolute bottom-1.5 left-0 right-0 text-center text-[11px] text-[#8b9196] pointer-events-none truncate px-3">{subtitle}</div>
      )}
      {overlays}
    </div>
  );
}
