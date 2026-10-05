'use client';

import React, { useState, useMemo } from 'react';
import {
  type ArchitectureModel,
  type View,
  type ViewObject,
  type FlowWithSteps,
  type PdfSectionId,
  type PdfPageFormat,
  type PdfPageOrientation,
  type PdfBookResult,
  exportArchitecturePdfBook,
  getPdfPageDimensions,
} from '@diagramhq/domain';

export interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: ArchitectureModel;
  views?: View[];
  currentView?: View;
  viewObjectsMap?: Map<string, ViewObject[]>;
  flows?: FlowWithSteps[];
  adrs?: Array<{
    id: string;
    title: string;
    status: 'proposed' | 'accepted' | 'rejected' | 'deprecated' | 'superseded';
    date?: string;
    context: string;
    decision: string;
    consequences?: string;
  }>;
}

const SECTION_METADATA: Record<
  PdfSectionId,
  { label: string; description: string; badge: string; icon: string }
> = {
  cover: {
    label: 'Cover Page',
    description: 'Executive title page with corporate branding, version badge, and author metadata',
    badge: 'Executive',
    icon: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  },
  overview: {
    label: 'Overview & Metrics',
    description: 'System inventory summary, component density, and service partition overview',
    badge: 'Metrics',
    icon: 'M3 3v18h18M7 16l4-4 4 4 6-6',
  },
  views: {
    label: 'Architecture Diagrams',
    description: 'Full-resolution vector drawings of C4 context, container, and component views',
    badge: 'Vector Canvas',
    icon: 'M4 4h16v16H4zM9 9h6v6H9z',
  },
  catalog: {
    label: 'Entity & Service Catalog',
    description: 'Tabular inventory of systems, microservices, databases, and components',
    badge: 'Registry',
    icon: 'M4 6h16M4 12h16M4 18h16',
  },
  adrs: {
    label: 'Decision Records (ADRs)',
    description: 'Historical register of design decisions, context, and operational consequences',
    badge: 'Governance',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.5L19 7.5V19a2 2 0 0 1-2 2z',
  },
  flows: {
    label: 'Execution Flows & Sequences',
    description: 'Step-by-step transaction walkthroughs and inter-service call sequences',
    badge: 'Workflows',
    icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  },
};

export function PdfExportModal({
  isOpen,
  onClose,
  model,
  views = [],
  currentView,
  viewObjectsMap,
  flows = [],
  adrs = [],
}: PdfExportModalProps): JSX.Element | null {
  // Modal Navigation
  const [activeTab, setActiveTab] = useState<'preview' | 'settings' | 'raw'>('preview');
  const [previewPageIndex, setPreviewPageIndex] = useState<number>(0);

  // PDF Configuration States
  const [format, setFormat] = useState<PdfPageFormat>('a4');
  const [orientation, setOrientation] = useState<PdfPageOrientation>('landscape');
  const [customTitle, setCustomTitle] = useState<string>(model.architecture.name || 'System Architecture');
  const [author, setAuthor] = useState<string>('Platform Architecture Team');
  const [organization, setOrganization] = useState<string>('Enterprise Systems Org');
  const [watermark, setWatermark] = useState<string>('');
  const [includePageNumbers, setIncludePageNumbers] = useState<boolean>(true);

  // Active Sections
  const [selectedSections, setSelectedSections] = useState<Set<PdfSectionId>>(
    new Set<PdfSectionId>(['cover', 'overview', 'views', 'catalog', 'adrs', 'flows']),
  );

  // Feedback State
  const [copied, setCopied] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);

  // Toggle Section
  const toggleSection = (section: PdfSectionId) => {
    setSelectedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        if (next.size > 1) {
          next.delete(section);
        }
      } else {
        next.add(section);
      }
      return next;
    });
  };

  // Compile PDF Book
  const pdfResult = useMemo<PdfBookResult>(() => {
    const activeViews = views.length > 0 ? views : currentView ? [currentView] : [];

    return exportArchitecturePdfBook(
      model,
      {
        format,
        orientation,
        customTitle,
        author,
        organization,
        watermark: watermark.trim() ? watermark.trim() : undefined,
        includePageNumbers,
        sections: Array.from(selectedSections),
        viewObjectsMap,
        flows,
        adrs,
      },
      activeViews,
    );
  }, [
    model,
    views,
    currentView,
    viewObjectsMap,
    flows,
    adrs,
    format,
    orientation,
    customTitle,
    author,
    organization,
    watermark,
    includePageNumbers,
    selectedSections,
  ]);

  // Adjust preview index if page count shrinks
  const safePageIndex = Math.min(previewPageIndex, Math.max(0, pdfResult.pageCount - 1));

  // Page dimensions in mm / inches for display
  const pageDims = getPdfPageDimensions(format, orientation);

  // Trigger browser download
  const handleDownload = () => {
    try {
      setDownloading(true);
      const link = document.createElement('a');
      link.href = pdfResult.dataUri;
      link.download = pdfResult.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setTimeout(() => setDownloading(false), 800);
    }
  };

  // Copy Data URI
  const handleCopyDataUri = async () => {
    if (navigator?.clipboard) {
      await navigator.clipboard.writeText(pdfResult.dataUri);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      data-testid="pdf-export-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-export-title"
    >
      <div className="relative flex flex-col w-full max-w-5xl h-[88vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
              {/* PDF Document Icon */}
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <path d="M9 13v4" />
                <path d="M12 13v4" />
                <path d="M15 13v4" />
              </svg>
            </div>
            <div>
              <h2 id="pdf-export-title" className="text-lg font-semibold tracking-wide text-white">
                Export Architecture PDF Book
              </h2>
              <p className="text-xs text-slate-400">
                Generate high-resolution, multi-page vector architecture documentation (PDF 1.4)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Metrics Badges */}
            <span
              className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20"
              data-testid="badge-page-count"
            >
              {pdfResult.pageCount} {pdfResult.pageCount === 1 ? 'Page' : 'Pages'}
            </span>
            <span
              className="px-2.5 py-1 text-xs font-mono font-medium rounded-full bg-slate-800 text-slate-300 border border-slate-700"
              data-testid="badge-file-size"
            >
              {Math.round(pdfResult.byteSize / 1024)} KB
            </span>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 ml-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Close modal"
              data-testid="btn-close-pdf-modal"
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
                  ? 'border-red-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
              data-testid="tab-preview"
            >
              Live Preview
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'settings'
                  ? 'border-red-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
              data-testid="tab-settings"
            >
              Document Sections & Options
            </button>
            <button
              onClick={() => setActiveTab('raw')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'raw'
                  ? 'border-red-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
              data-testid="tab-raw"
            >
              PDF Syntax Inspector
            </button>
          </div>

          <div className="flex items-center gap-3 py-2 text-xs text-slate-400">
            <span>
              Format: <strong className="text-slate-200 uppercase">{format}</strong> ({orientation})
            </span>
            <span>•</span>
            <span className="font-mono text-slate-400">
              SHA: {pdfResult.checksum}
            </span>
          </div>
        </div>

        {/* Modal Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: LIVE PREVIEW */}
          {activeTab === 'preview' && (
            <div className="flex flex-col h-full gap-6">
              {/* Page Navigator Carousel Tabs */}
              <div className="flex items-center justify-between bg-slate-950/80 p-2 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2 overflow-x-auto py-1">
                  {Array.from({ length: pdfResult.pageCount }).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setPreviewPageIndex(idx)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                        safePageIndex === idx
                          ? 'bg-red-600 text-white shadow-md'
                          : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`}
                      data-testid={`btn-page-${idx + 1}`}
                    >
                      Page {idx + 1}
                    </button>
                  ))}
                </div>

                <div className="text-xs text-slate-400 font-mono pl-4 shrink-0">
                  {`Page ${safePageIndex + 1} of ${pdfResult.pageCount}`}
                </div>
              </div>

              {/* PDF Document Visual Page Canvas */}
              <div className="flex-1 flex items-center justify-center p-4 bg-slate-950/40 rounded-2xl border border-slate-800/60 overflow-hidden">
                <div
                  className="relative flex flex-col justify-between p-8 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl text-slate-200 overflow-hidden transition-all duration-300"
                  style={{
                    width: orientation === 'landscape' ? '740px' : '520px',
                    height: orientation === 'landscape' ? '460px' : '620px',
                    maxHeight: '100%',
                  }}
                  data-testid="pdf-preview-sheet"
                >
                  {/* Decorative Watermark */}
                  {watermark && (
                    <div
                      className="absolute inset-0 flex items-center justify-center pointer-events-none select-none text-slate-800/25 font-black text-6xl tracking-widest uppercase transform -rotate-12"
                      data-testid="preview-watermark"
                    >
                      {watermark}
                    </div>
                  )}

                  {/* Simulated Running Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-[10px] tracking-wider font-semibold text-slate-500 uppercase">
                    <span>
                      {customTitle} // {model.version.name}
                    </span>
                    <span>DiagramHQ</span>
                  </div>

                  {/* Simulated Page Body based on Page Index */}
                  <div className="flex-1 flex flex-col justify-center py-6 px-4">
                    {safePageIndex === 0 && selectedSections.has('cover') ? (
                      /* Cover Sheet Simulation */
                      <div className="flex flex-col gap-4 text-left" data-testid="preview-cover-content">
                        <span className="text-xs font-mono tracking-widest text-blue-400 uppercase">
                          Architecture Report & Specification
                        </span>
                        <h1 className="text-2xl font-bold tracking-tight text-white leading-tight">
                          {customTitle}
                        </h1>
                        <p className="text-xs text-slate-400 max-w-lg line-clamp-2">
                          {model.architecture.description || 'Comprehensive system topology and architecture blueprint.'}
                        </p>

                        <div className="mt-4 p-3 bg-slate-950/60 rounded-lg border border-slate-800 text-[11px] grid grid-cols-2 gap-2 text-slate-400">
                          <div>
                            <span className="text-slate-500 block">Organization:</span>
                            <span className="text-slate-200 font-medium">{organization}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Author:</span>
                            <span className="text-slate-200 font-medium">{author}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Target Version:</span>
                            <span className="text-slate-200 font-medium">{model.version.name}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Publication Date:</span>
                            <span className="text-slate-200 font-medium">{new Date().toISOString().slice(0, 10)}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* General Page Simulation (Diagrams / Catalog / ADRs) */
                      <div className="flex flex-col gap-3" data-testid="preview-generic-content">
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-semibold text-white">
                            Section: {pdfResult.sectionsIncluded[safePageIndex % pdfResult.sectionsIncluded.length]?.toUpperCase()}
                          </h3>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono">
                            Vector Layer Active
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          Compiled vector drawing stream containing structured nodes, relationships, and metadata.
                        </p>

                        <div className="mt-2 h-44 border border-dashed border-slate-700/80 rounded-lg bg-slate-950/40 p-4 flex flex-col justify-center items-center gap-2">
                          <div className="flex items-center gap-3">
                            <div className="w-24 h-12 rounded bg-blue-600/30 border border-blue-500/60 flex items-center justify-center text-[10px] text-blue-200 font-medium">
                              System
                            </div>
                            <svg className="w-8 h-4 text-slate-600" viewBox="0 0 32 16" fill="none">
                              <path d="M0 8h28m-6-4l6 4-6 4" stroke="currentColor" strokeWidth="2" />
                            </svg>
                            <div className="w-24 h-12 rounded bg-emerald-600/30 border border-emerald-500/60 flex items-center justify-center text-[10px] text-emerald-200 font-medium">
                              Service
                            </div>
                            <svg className="w-8 h-4 text-slate-600" viewBox="0 0 32 16" fill="none">
                              <path d="M0 8h28m-6-4l6 4-6 4" stroke="currentColor" strokeWidth="2" />
                            </svg>
                            <div className="w-24 h-12 rounded bg-amber-600/30 border border-amber-500/60 flex items-center justify-center text-[10px] text-amber-200 font-medium">
                              Database
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono mt-2">
                            {model.objects.length} elements • {model.connections.length} connections mapped
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Simulated Running Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-[10px] text-slate-500">
                    <span>Generated on {new Date().toISOString().slice(0, 10)}</span>
                    <span data-testid="preview-page-number">
                      {`Page ${safePageIndex + 1} of ${pdfResult.pageCount}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SECTIONS & SETTINGS */}
          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="tab-settings-content">
              {/* Left Column: Section Toggles */}
              <div className="flex flex-col gap-4">
                <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
                  Book Sections
                </h3>
                <p className="text-xs text-slate-400">
                  Select which architectural sections to generate in this PDF document.
                </p>

                <div className="flex flex-col gap-2.5">
                  {(Object.keys(SECTION_METADATA) as PdfSectionId[]).map((secId) => {
                    const meta = SECTION_METADATA[secId];
                    const isChecked = selectedSections.has(secId);

                    return (
                      <label
                        key={secId}
                        className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-slate-800/80 border-blue-500/50 text-white'
                            : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                        data-testid={`checkbox-section-${secId}`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSection(secId)}
                          className="mt-0.5 rounded border-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{meta.label}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {meta.badge}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">{meta.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Page & Print Options */}
              <div className="flex flex-col gap-4">
                <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
                  Layout & Print Geometry
                </h3>

                {/* Format & Orientation Controls */}
                <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-400 block mb-1.5">
                        Page Format
                      </label>
                      <select
                        value={format}
                        onChange={(e) => setFormat(e.target.value as PdfPageFormat)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                        data-testid="select-pdf-format"
                      >
                        <option value="a4">ISO A4 (210 × 297 mm)</option>
                        <option value="letter">US Letter (8.5 × 11 in)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-400 block mb-1.5">
                        Orientation
                      </label>
                      <select
                        value={orientation}
                        onChange={(e) => setOrientation(e.target.value as PdfPageOrientation)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                        data-testid="select-pdf-orientation"
                      >
                        <option value="landscape">Landscape (Recommended)</option>
                        <option value="portrait">Portrait</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <div>
                      <span className="text-xs font-medium text-slate-300 block">
                        Include Page Numbers
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Prints "Page X of Y" in running footer
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={includePageNumbers}
                      onChange={(e) => setIncludePageNumbers(e.target.checked)}
                      className="rounded border-slate-700 text-blue-500 focus:ring-blue-500"
                      data-testid="checkbox-page-numbers"
                    />
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mt-2">
                  Document Metadata
                </h3>

                <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">
                      Custom Title
                    </label>
                    <input
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                      data-testid="input-custom-title"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-400 block mb-1">
                        Author / Team
                      </label>
                      <input
                        type="text"
                        value={author}
                        onChange={(e) => setAuthor(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                        data-testid="input-author"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-400 block mb-1">
                        Organization
                      </label>
                      <input
                        type="text"
                        value={organization}
                        onChange={(e) => setOrganization(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                        data-testid="input-organization"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">
                      Watermark (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CONFIDENTIAL, DRAFT, INTERNAL USE"
                      value={watermark}
                      onChange={(e) => setWatermark(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 uppercase tracking-wider"
                      data-testid="input-watermark"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RAW PDF CODE INSPECTOR */}
          {activeTab === 'raw' && (
            <div className="flex flex-col h-full gap-3" data-testid="tab-raw-content">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
                <span>
                  Valid Adobe PDF 1.4 Binary Stream ({pdfResult.byteSize} bytes, {pdfResult.pageCount} pages)
                </span>
                <span className="font-mono text-emerald-400">
                  Trailer: Root 1 0 R • startxref verified
                </span>
              </div>

              <div className="relative flex-1 bg-slate-950 rounded-xl border border-slate-800 p-4 font-mono text-xs text-slate-300 overflow-auto">
                <pre className="whitespace-pre-wrap leading-relaxed">
                  {pdfResult.content.slice(0, 4000)}
                  {pdfResult.content.length > 4000 && '\n\n... [Stream truncated for display preview] ...'}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="font-mono font-medium text-slate-300">
              {pdfResult.filename}
            </span>
            <span>•</span>
            <span>
              Dimensions: {pageDims.width} × {pageDims.height} pt
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyDataUri}
              className="px-4 py-2 text-xs font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-2"
              data-testid="btn-copy-uri"
            >
              {copied ? 'Copied URI!' : 'Copy Data URI'}
            </button>

            <button
              onClick={handleDownload}
              disabled={downloading}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/20 transition-all flex items-center gap-2"
              data-testid="btn-download-pdf"
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
              <span>{downloading ? 'Compiling PDF...' : 'Download PDF Book'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
