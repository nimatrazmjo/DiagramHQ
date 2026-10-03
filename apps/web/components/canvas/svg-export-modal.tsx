'use client';

import React, { useState, useMemo } from 'react';
import {
  type ArchitectureModel,
  type View,
  type ViewObject,
  type SvgTheme,
  type SvgEdgeRouting,
  type SvgExportResult,
  renderViewToFidelitySvg,
} from '@diagramhq/domain';

export interface SvgExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: ArchitectureModel;
  currentView: View;
  viewObjects?: ViewObject[];
}

export function SvgExportModal({
  isOpen,
  onClose,
  model,
  currentView,
  viewObjects = [],
}: SvgExportModalProps): JSX.Element | null {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'preview' | 'settings' | 'code'>('preview');

  // SVG Configuration States
  const [theme, setTheme] = useState<SvgTheme>('dark');
  const [edgeRouting, setEdgeRouting] = useState<SvgEdgeRouting>('curved');
  const [includeGrid, setIncludeGrid] = useState<boolean>(true);
  const [includeBadges, setIncludeBadges] = useState<boolean>(true);
  const [includeMetadata, setIncludeMetadata] = useState<boolean>(true);
  const [includeLegend, setIncludeLegend] = useState<boolean>(true);
  const [includeTooltips, setIncludeTooltips] = useState<boolean>(true);
  const [scale, setScale] = useState<number>(1);
  const [customTitle, setCustomTitle] = useState<string>(currentView.name || 'Architecture Diagram');

  // Zoom & Pan state for preview
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Clipboard & Download Feedback
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedUri, setCopiedUri] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);

  // Compute live high-fidelity SVG result
  const svgResult = useMemo<SvgExportResult>(() => {
    return renderViewToFidelitySvg(currentView, model, {
      theme,
      edgeRouting,
      includeGrid,
      includeBadges,
      includeMetadata,
      includeLegend,
      includeTooltips,
      scale,
      customTitle,
      viewObjects,
    });
  }, [
    currentView,
    model,
    theme,
    edgeRouting,
    includeGrid,
    includeBadges,
    includeMetadata,
    includeLegend,
    includeTooltips,
    scale,
    customTitle,
    viewObjects,
  ]);

  // Handle Download Action
  const handleDownload = () => {
    try {
      setDownloading(true);
      const blob = new Blob([svgResult.content], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = svgResult.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setTimeout(() => setDownloading(false), 600);
    }
  };

  // Copy SVG XML code
  const handleCopyCode = async () => {
    if (navigator?.clipboard) {
      await navigator.clipboard.writeText(svgResult.content);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // Copy Base64 Data URI
  const handleCopyUri = async () => {
    if (navigator?.clipboard) {
      await navigator.clipboard.writeText(svgResult.dataUri);
      setCopiedUri(true);
      setTimeout(() => setCopiedUri(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      data-testid="svg-export-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="svg-export-title"
    >
      <div className="relative flex flex-col w-full max-w-5xl h-[88vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              {/* Scalable Vector SVG Icon */}
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
            </div>
            <div>
              <h2 id="svg-export-title" className="text-lg font-semibold tracking-wide text-white">
                Export High-Fidelity SVG
              </h2>
              <p className="text-xs text-slate-400">
                Pixel-perfect vector graphic export matching the interactive canvas styling
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Metrics Badges */}
            <span
              className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20"
              data-testid="badge-nodes-count"
            >
              {svgResult.nodeCount} Elements
            </span>
            <span
              className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              data-testid="badge-edges-count"
            >
              {svgResult.edgeCount} Connections
            </span>
            <span
              className="px-2.5 py-1 text-xs font-mono font-medium rounded-full bg-slate-800 text-slate-300 border border-slate-700"
              data-testid="badge-file-size"
            >
              {Math.round(svgResult.content.length / 1024)} KB
            </span>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 ml-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Close modal"
              data-testid="btn-close-svg-modal"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Tabs Bar */}
        <div className="flex items-center justify-between px-6 bg-slate-950/40 border-b border-slate-800">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'preview'
                  ? 'border-amber-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
              data-testid="tab-svg-preview"
            >
              Interactive Preview
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'settings'
                  ? 'border-amber-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
              data-testid="tab-svg-settings"
            >
              Fidelity &amp; Styling Options
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'code'
                  ? 'border-amber-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
              data-testid="tab-svg-code"
            >
              SVG XML Markup
            </button>
          </div>

          <div className="flex items-center gap-3 py-2 text-xs text-slate-400">
            <span>
              Theme: <strong className="text-slate-200 uppercase">{theme}</strong>
            </span>
            <span>•</span>
            <span>
              Routing: <strong className="text-slate-200 capitalize">{edgeRouting}</strong>
            </span>
            <span>•</span>
            <span className="font-mono text-slate-400">
              SHA: {svgResult.checksum}
            </span>
          </div>
        </div>

        {/* Modal Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: INTERACTIVE SVG PREVIEW */}
          {activeTab === 'preview' && (
            <div className="flex flex-col h-full gap-4">
              {/* Preview Viewport Toolbar */}
              <div className="flex items-center justify-between bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium px-2">Zoom:</span>
                  <button
                    onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.2))}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                    title="Zoom Out"
                    data-testid="btn-zoom-out"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="8" y1="11" x2="14" y2="11" />
                    </svg>
                  </button>
                  <span className="text-xs font-mono font-medium text-slate-200 w-12 text-center">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                    title="Zoom In"
                    data-testid="btn-zoom-in"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="11" y1="8" x2="11" y2="14" />
                      <line x1="8" y1="11" x2="14" y2="11" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setZoomLevel(1)}
                    className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    data-testid="btn-zoom-reset"
                  >
                    Reset
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>
                    ViewBox: <strong className="font-mono text-slate-300">{svgResult.dimensions.viewBox}</strong>
                  </span>
                </div>
              </div>

              {/* Live Rendered SVG Canvas Container */}
              <div
                className="flex-1 flex items-center justify-center p-6 bg-slate-950/50 rounded-2xl border border-slate-800/80 overflow-auto"
                data-testid="svg-preview-container"
              >
                <div
                  className="transition-transform duration-150 origin-center max-w-full max-h-full flex items-center justify-center"
                  style={{ transform: `scale(${zoomLevel})` }}
                  dangerouslySetInnerHTML={{ __html: svgResult.content }}
                  data-testid="svg-preview-element"
                />
              </div>
            </div>
          )}

          {/* TAB 2: FIDELITY & STYLING SETTINGS */}
          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="tab-settings-content">
              {/* Left Column: Visual Theme & Edge Routing */}
              <div className="flex flex-col gap-5">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-2">
                    Theme Palette
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => setTheme('dark')}
                      className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                        theme === 'dark'
                          ? 'bg-slate-800 border-amber-500 text-white shadow-lg'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                      data-testid="btn-theme-dark"
                    >
                      <div className="w-full h-8 rounded bg-slate-900 border border-slate-700 flex items-center justify-center mb-1">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                      </div>
                      <span className="text-xs font-semibold">Dark Canvas</span>
                      <span className="text-[10px] text-slate-400">DiagramHQ Dark #090D16</span>
                    </button>

                    <button
                      onClick={() => setTheme('light')}
                      className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                        theme === 'light'
                          ? 'bg-slate-800 border-amber-500 text-white shadow-lg'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                      data-testid="btn-theme-light"
                    >
                      <div className="w-full h-8 rounded bg-slate-100 border border-slate-300 flex items-center justify-center mb-1">
                        <div className="w-3 h-3 rounded-full bg-blue-600" />
                      </div>
                      <span className="text-xs font-semibold">Light Paper</span>
                      <span className="text-[10px] text-slate-400">High Contrast #F8FAFC</span>
                    </button>

                    <button
                      onClick={() => setTheme('transparent')}
                      className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                        theme === 'transparent'
                          ? 'bg-slate-800 border-amber-500 text-white shadow-lg'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                      data-testid="btn-theme-transparent"
                    >
                      <div className="w-full h-8 rounded bg-stripes-slate border border-slate-700 flex items-center justify-center mb-1">
                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      </div>
                      <span className="text-xs font-semibold">Transparent</span>
                      <span className="text-[10px] text-slate-400">Clean Vector Embed</span>
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-2">
                    Relationship Edge Routing
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => setEdgeRouting('curved')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        edgeRouting === 'curved'
                          ? 'bg-slate-800 border-amber-500 text-white shadow-lg'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                      data-testid="btn-route-curved"
                    >
                      <span className="text-xs font-semibold block">Curved (Bezier)</span>
                      <span className="text-[10px] text-slate-400">IcePanel smooth arc curves</span>
                    </button>

                    <button
                      onClick={() => setEdgeRouting('orthogonal')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        edgeRouting === 'orthogonal'
                          ? 'bg-slate-800 border-amber-500 text-white shadow-lg'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                      data-testid="btn-route-orthogonal"
                    >
                      <span className="text-xs font-semibold block">Orthogonal</span>
                      <span className="text-[10px] text-slate-400">Right-angle stepped paths</span>
                    </button>

                    <button
                      onClick={() => setEdgeRouting('straight')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        edgeRouting === 'straight'
                          ? 'bg-slate-800 border-amber-500 text-white shadow-lg'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                      data-testid="btn-route-straight"
                    >
                      <span className="text-xs font-semibold block">Straight</span>
                      <span className="text-[10px] text-slate-400">Direct point-to-point lines</span>
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-2">
                    Resolution Scale
                  </h3>
                  <div className="flex items-center gap-3">
                    {[1, 2, 3].map((s) => (
                      <button
                        key={s}
                        onClick={() => setScale(s)}
                        className={`px-4 py-2 rounded-xl text-xs font-medium border transition-colors ${
                          scale === s
                            ? 'bg-amber-600 text-white border-amber-500'
                            : 'bg-slate-950/60 text-slate-300 border-slate-800 hover:bg-slate-800'
                        }`}
                        data-testid={`btn-scale-${s}x`}
                      >
                        {s}x Scale
                      </button>
                    ))}
                    <span className="text-xs text-slate-400 pl-2">
                      Output dimensions: {svgResult.dimensions.width} × {svgResult.dimensions.height} px
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Display Elements & Metadata */}
              <div className="flex flex-col gap-5">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-2">
                    Canvas Elements &amp; Toggles
                  </h3>
                  <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex flex-col gap-3">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div>
                        <span className="text-xs font-medium text-slate-200 block">Dot Grid Pattern</span>
                        <span className="text-[11px] text-slate-500">Render background alignment dots</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={includeGrid}
                        onChange={(e) => setIncludeGrid(e.target.checked)}
                        className="rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                        data-testid="checkbox-include-grid"
                      />
                    </label>

                    <label className="flex items-center justify-between pt-2 border-t border-slate-800/80 cursor-pointer">
                      <div>
                        <span className="text-xs font-medium text-slate-200 block">Technology &amp; Owner Badges</span>
                        <span className="text-[11px] text-slate-500">Display tech pills on component boxes</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={includeBadges}
                        onChange={(e) => setIncludeBadges(e.target.checked)}
                        className="rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                        data-testid="checkbox-include-badges"
                      />
                    </label>

                    <label className="flex items-center justify-between pt-2 border-t border-slate-800/80 cursor-pointer">
                      <div>
                        <span className="text-xs font-medium text-slate-200 block">Header &amp; Scope Banner</span>
                        <span className="text-[11px] text-slate-500">Include diagram title, version, and date</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={includeMetadata}
                        onChange={(e) => setIncludeMetadata(e.target.checked)}
                        className="rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                        data-testid="checkbox-include-metadata"
                      />
                    </label>

                    <label className="flex items-center justify-between pt-2 border-t border-slate-800/80 cursor-pointer">
                      <div>
                        <span className="text-xs font-medium text-slate-200 block">Component Kind Legend</span>
                        <span className="text-[11px] text-slate-500">Display C4 element color palette guide</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={includeLegend}
                        onChange={(e) => setIncludeLegend(e.target.checked)}
                        className="rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                        data-testid="checkbox-include-legend"
                      />
                    </label>

                    <label className="flex items-center justify-between pt-2 border-t border-slate-800/80 cursor-pointer">
                      <div>
                        <span className="text-xs font-medium text-slate-200 block">Interactive Tooltips</span>
                        <span className="text-[11px] text-slate-500">Embed SVG &lt;title&gt; hover inspection</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={includeTooltips}
                        onChange={(e) => setIncludeTooltips(e.target.checked)}
                        className="rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                        data-testid="checkbox-include-tooltips"
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-2">
                    Diagram Title Override
                  </h3>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    placeholder="Enter custom title..."
                    data-testid="input-svg-custom-title"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SVG XML CODE INSPECTOR */}
          {activeTab === 'code' && (
            <div className="flex flex-col h-full gap-3" data-testid="tab-code-content">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
                <span>
                  Valid W3C Scalable Vector Graphics ({svgResult.content.length} characters)
                </span>
                <span className="font-mono text-emerald-400">
                  Fidelity: diagramhq-vector verified
                </span>
              </div>

              <div className="relative flex-1 bg-slate-950 rounded-xl border border-slate-800 p-4 font-mono text-xs text-slate-300 overflow-auto">
                <pre className="whitespace-pre-wrap leading-relaxed" data-testid="svg-xml-pre">
                  {svgResult.content}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="font-mono font-medium text-slate-300">
              {svgResult.filename}
            </span>
            <span>•</span>
            <span>
              {svgResult.dimensions.width} × {svgResult.dimensions.height} px
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyUri}
              className="px-4 py-2 text-xs font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              data-testid="btn-copy-svg-uri"
            >
              {copiedUri ? 'Copied URI!' : 'Copy Data URI'}
            </button>

            <button
              onClick={handleCopyCode}
              className="px-4 py-2 text-xs font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              data-testid="btn-copy-svg-code"
            >
              {copiedCode ? 'Copied SVG Markup!' : 'Copy SVG Markup'}
            </button>

            <button
              onClick={handleDownload}
              disabled={downloading}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2"
              data-testid="btn-download-svg"
            >
              {/* Download Icon */}
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>{downloading ? 'Downloading...' : 'Download SVG File'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
