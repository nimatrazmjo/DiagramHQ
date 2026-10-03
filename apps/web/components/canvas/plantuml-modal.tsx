'use client';

import React, { useState, useMemo } from 'react';
import {
  type ArchitectureModel,
  type View,
  type ViewObject,
  type FlowWithSteps,
  type FlowId,
  type PlantUmlDirection,
  type PlantUmlExportResult,
  type PlantUmlImportResult,
  exportViewToPlantUmlResult,
  exportFlowToPlantUmlSequence,
  importPlantUml,
} from '@diagramhq/domain';

export interface PlantUmlModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: ArchitectureModel;
  currentView: View;
  viewObjects?: ViewObject[];
  flows?: FlowWithSteps[];
  initialTab?: 'export' | 'import';
  onImport?: (result: PlantUmlImportResult) => void;
}

const SAMPLE_C4 = `@startuml
title Global Payments Architecture
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml
LAYOUT_TOP_DOWN()

Person(customer, "Banking Customer", "Retail customer accessing accounts")

System_Boundary(b_banking, "Core Banking Platform") {
    Container(web, "Web Portal", "React / Next.js", "Online banking customer portal")
    Container(api, "API Gateway", "Go / gRPC", "Dispatches banking services")
    ContainerDb(db, "Accounts DB", "PostgreSQL", "Stores customer ledgers")
}

Rel(customer, web, "Logs in & transfers funds", "HTTPS")
Rel(web, api, "Dispatches GraphQL requests", "HTTPS / JSON")
Rel(api, db, "Queries balances & records transactions", "SQL/TCP")

SHOW_LEGEND()
@enduml`;

const SAMPLE_SEQUENCE = `@startuml
title Instant Payment Authorization Flow
autonumber
skinparam BoxPadding 10

actor "Customer" as cust
participant "Mobile App" as app
participant "Payment Engine" as engine
database "Ledger Journal" as db

cust -> app : Submit Payment
app -> engine : POST /api/v1/payments
note over engine : Validates cryptographic signature
engine -> db : Atomic balance reserve
db --> engine : Balance reserved (TX #8812)
engine --> app : 200 OK (Payment Authorized)
app --> cust : Display confirmation receipt
@enduml`;

export function PlantUmlModal({
  isOpen,
  onClose,
  model,
  currentView,
  viewObjects: _viewObjects = [],
  flows = [],
  initialTab = 'export',
  onImport,
}: PlantUmlModalProps): JSX.Element | null {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>(initialTab);

  // Export States
  const [exportType, setExportType] = useState<'c4' | 'native' | 'sequence'>('c4');
  const [direction, setDirection] = useState<PlantUmlDirection>('top to bottom');
  const [includeLegend, setIncludeLegend] = useState<boolean>(true);
  const [includeNotes, setIncludeNotes] = useState<boolean>(true);
  const [selectedFlowId, setSelectedFlowId] = useState<string>(flows[0]?.id ?? '');
  const [copied, setCopied] = useState<boolean>(false);

  // Import States
  const [importScript, setImportScript] = useState<string>(SAMPLE_C4);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);

  // Active Flow for Sequence export
  const activeFlow = useMemo(() => {
    if (flows.length === 0) return null;
    return flows.find((f) => f.id === selectedFlowId) ?? flows[0] ?? null;
  }, [flows, selectedFlowId]);

  // Compute live Export script
  const exportResult = useMemo<PlantUmlExportResult>(() => {
    if (exportType === 'sequence') {
      if (activeFlow) {
        return exportFlowToPlantUmlSequence(activeFlow, model, { includeNotes, autonumber: true });
      }
      // If no flows provided, build synthetic fallback flow
      const fallbackFlowId = 'flow_fallback' as unknown as FlowId;
      const fallbackFlow: FlowWithSteps = {
        id: fallbackFlowId,
        architectureId: model.architecture.id,
        name: `${currentView.name} Flow`,
        description: 'Synthetic flow generated from view connections',
        type: 'sequence',
        createdAt: new Date(),
        updatedAt: new Date(),
        steps: model.connections.slice(0, 10).map((conn, idx) => ({
          id: `step_${idx + 1}`,
          flowId: fallbackFlowId,
          connectionId: conn.id,
          stepIndex: idx,
          note: conn.label ?? undefined,
        })),
      };
      return exportFlowToPlantUmlSequence(fallbackFlow, model, { includeNotes, autonumber: true });
    }

    return exportViewToPlantUmlResult(currentView, model, {
      c4Mode: exportType === 'c4',
      direction,
      includeLegend,
      includeNotes,
    });
  }, [exportType, currentView, model, direction, includeLegend, includeNotes, activeFlow]);

  // Compute live Import parse
  const importParseResult = useMemo<PlantUmlImportResult>(() => {
    const trimmed = importScript.trim();
    if (!trimmed) {
      return {
        success: false,
        diagramType: 'c4',
        objects: [],
        connections: [],
        warnings: [],
        errors: ['Please enter PlantUML script to parse.'],
      };
    }

    return importPlantUml(trimmed, model.architecture.id, model.version.id);
  }, [importScript, model.architecture.id, model.version.id]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(exportResult.script);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Fallback
      }
    }
  };

  const handleDownload = () => {
    if (typeof window !== 'undefined') {
      const blob = new Blob([exportResult.script], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const cleanName = currentView.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
      link.download = `${cleanName}-${exportType}.puml`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleApplyImport = () => {
    if (!importParseResult.success) return;

    onImport?.(importParseResult);
    if (importParseResult.diagramType === 'sequence') {
      setImportSuccessMessage(
        `Successfully imported sequence diagram with ${importParseResult.objects.length} participant(s) and ${importParseResult.flow?.steps.length ?? 0} step(s)!`,
      );
    } else {
      setImportSuccessMessage(
        `Successfully imported architecture diagram with ${importParseResult.objects.length} object(s) and ${importParseResult.connections.length} connection(s)!`,
      );
    }

    setTimeout(() => {
      setImportSuccessMessage(null);
    }, 3000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="PlantUML Integration"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
                PlantUML Integration
                <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 font-mono">
                  C4 + Sequence
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Bidirectional PlantUML architecture diagram and execution flow exporter & importer.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-neutral-800 bg-neutral-950/40">
          <button
            type="button"
            data-testid="tab-export"
            onClick={() => setActiveTab('export')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'export'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export PlantUML
          </button>
          <button
            type="button"
            data-testid="tab-import"
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'import'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import PlantUML
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'export' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Export Controls Left Column */}
              <div className="lg:col-span-4 space-y-5">
                {/* Syntax Mode */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                    Diagram Flavor
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      data-testid="export-c4-btn"
                      onClick={() => setExportType('c4')}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-medium transition-all ${
                        exportType === 'c4'
                          ? 'border-orange-500/50 bg-orange-500/10 text-orange-300'
                          : 'border-neutral-800 bg-neutral-800/40 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <span className="font-bold">C4 Macro</span>
                      <span className="text-[10px] text-neutral-500">Official Stdlib</span>
                    </button>
                    <button
                      type="button"
                      data-testid="export-native-btn"
                      onClick={() => setExportType('native')}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-medium transition-all ${
                        exportType === 'native'
                          ? 'border-orange-500/50 bg-orange-500/10 text-orange-300'
                          : 'border-neutral-800 bg-neutral-800/40 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <span className="font-bold">Component</span>
                      <span className="text-[10px] text-neutral-500">Pure PlantUML</span>
                    </button>
                    <button
                      type="button"
                      data-testid="export-seq-btn"
                      onClick={() => setExportType('sequence')}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-medium transition-all ${
                        exportType === 'sequence'
                          ? 'border-orange-500/50 bg-orange-500/10 text-orange-300'
                          : 'border-neutral-800 bg-neutral-800/40 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <span className="font-bold">Sequence</span>
                      <span className="text-[10px] text-neutral-500">Execution Flow</span>
                    </button>
                  </div>
                </div>

                {/* Direction Controls */}
                {exportType !== 'sequence' && (
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                      Layout Direction
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setDirection('top to bottom')}
                        className={`py-1.5 text-xs rounded border transition-all ${
                          direction === 'top to bottom'
                            ? 'border-orange-500/50 bg-orange-500/20 text-orange-300 font-bold'
                            : 'border-neutral-800 bg-neutral-800/40 text-neutral-400 hover:border-neutral-700'
                        }`}
                      >
                        Top to Bottom
                      </button>
                      <button
                        type="button"
                        onClick={() => setDirection('left to right')}
                        className={`py-1.5 text-xs rounded border transition-all ${
                          direction === 'left to right'
                            ? 'border-orange-500/50 bg-orange-500/20 text-orange-300 font-bold'
                            : 'border-neutral-800 bg-neutral-800/40 text-neutral-400 hover:border-neutral-700'
                        }`}
                      >
                        Left to Right
                      </button>
                    </div>
                  </div>
                )}

                {/* Sequence Flow Selector */}
                {exportType === 'sequence' && flows.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                      Select Execution Flow
                    </label>
                    <select
                      value={selectedFlowId}
                      onChange={(e) => setSelectedFlowId(e.target.value)}
                      className="w-full bg-neutral-800/60 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-orange-500"
                    >
                      {flows.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} ({f.steps.length} steps)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Options Checkboxes */}
                <div className="space-y-3 pt-2 border-t border-neutral-800">
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                    Export Options
                  </label>
                  {exportType === 'c4' && (
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300">
                      <input
                        type="checkbox"
                        checked={includeLegend}
                        onChange={(e) => setIncludeLegend(e.target.checked)}
                        className="rounded border-neutral-700 bg-neutral-800 text-orange-500 focus:ring-0"
                      />
                      Include C4 Legend (SHOW_LEGEND)
                    </label>
                  )}
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300">
                    <input
                      type="checkbox"
                      checked={includeNotes}
                      onChange={(e) => setIncludeNotes(e.target.checked)}
                      className="rounded border-neutral-700 bg-neutral-800 text-orange-500 focus:ring-0"
                    />
                    Include Descriptions & Step Notes
                  </label>
                </div>

                {/* Metrics Stats */}
                <div className="p-3 rounded-lg bg-neutral-800/40 border border-neutral-800 space-y-1.5 text-xs">
                  <div className="flex justify-between text-neutral-400">
                    <span>Target View:</span>
                    <span className="text-neutral-200 font-medium truncate max-w-[140px]">
                      {currentView.name}
                    </span>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>Nodes / Participants:</span>
                    <span className="text-neutral-200 font-mono font-medium">
                      {exportResult.nodeCount}
                    </span>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>Relationships / Steps:</span>
                    <span className="text-neutral-200 font-mono font-medium">
                      {exportResult.edgeCount}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    type="button"
                    data-testid="copy-plantuml-btn"
                    onClick={handleCopy}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700 transition-all"
                  >
                    {copied ? (
                      <>
                        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-emerald-400">Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                        <span>Copy Script</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    data-testid="download-plantuml-btn"
                    onClick={handleDownload}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold shadow-lg shadow-orange-900/30 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download .puml File
                  </button>
                </div>
              </div>

              {/* Live Preview Monospace Textarea Right Column */}
              <div className="lg:col-span-8 flex flex-col h-full min-h-[380px]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    Generated PlantUML Script
                  </span>
                  <span className="text-xs font-mono text-neutral-500">
                    {exportResult.script.split('\n').length} lines
                  </span>
                </div>
                <div className="relative flex-1 rounded-xl border border-neutral-800 bg-neutral-950 p-4 font-mono text-xs text-neutral-300 overflow-auto">
                  <pre
                    data-testid="plantuml-export-output"
                    className="whitespace-pre overflow-x-auto leading-relaxed select-all"
                  >
                    {exportResult.script}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            /* Import Tab */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Import Script Input Left Column */}
              <div className="lg:col-span-7 flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                    PlantUML Script Input
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setImportScript(SAMPLE_C4)}
                      className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
                    >
                      Load Sample C4
                    </button>
                    <span className="text-neutral-600">|</span>
                    <button
                      type="button"
                      onClick={() => setImportScript(SAMPLE_SEQUENCE)}
                      className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
                    >
                      Load Sample Sequence
                    </button>
                  </div>
                </div>

                <textarea
                  data-testid="plantuml-import-textarea"
                  value={importScript}
                  onChange={(e) => setImportScript(e.target.value)}
                  placeholder="Paste PlantUML script (@startuml ... @enduml) here..."
                  rows={14}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-4 font-mono text-xs text-neutral-200 focus:outline-none focus:border-orange-500 transition-colors resize-none leading-relaxed"
                />

                {importSuccessMessage && (
                  <div
                    data-testid="import-success-banner"
                    className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 shrink-0 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{importSuccessMessage}</span>
                  </div>
                )}
              </div>

              {/* Import Parser Feedback Right Column */}
              <div className="lg:col-span-5 flex flex-col space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                    Parser Analysis
                  </label>
                  <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">Diagram Type:</span>
                      <span
                        data-testid="parsed-diagram-type"
                        className={`px-2 py-0.5 rounded text-xs font-mono uppercase font-semibold ${
                          importParseResult.diagramType === 'c4'
                            ? 'bg-orange-500/20 text-orange-300'
                            : importParseResult.diagramType === 'sequence'
                            ? 'bg-purple-500/20 text-purple-300'
                            : 'bg-blue-500/20 text-blue-300'
                        }`}
                      >
                        {importParseResult.diagramType}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">Parsed Objects:</span>
                      <span
                        data-testid="parsed-objects-count"
                        className="font-mono text-neutral-200 font-semibold"
                      >
                        {importParseResult.objects.length}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">Parsed Connections:</span>
                      <span
                        data-testid="parsed-connections-count"
                        className="font-mono text-neutral-200 font-semibold"
                      >
                        {importParseResult.connections.length}
                      </span>
                    </div>

                    {importParseResult.flow && (
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-400">Sequence Steps:</span>
                        <span
                          data-testid="parsed-steps-count"
                          className="font-mono text-neutral-200 font-semibold"
                        >
                          {importParseResult.flow.steps.length}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">Status:</span>
                      <span className="flex items-center gap-1.5">
                        {importParseResult.success ? (
                          <>
                            <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-emerald-400 font-medium">Valid Syntax</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span className="text-amber-400 font-medium">Incomplete</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Parsed Entities Preview */}
                {importParseResult.objects.length > 0 && (
                  <div className="flex-1 space-y-2">
                    <span className="text-xs font-medium text-neutral-400">
                      Discovered Entities ({importParseResult.objects.length}):
                    </span>
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                      {importParseResult.objects.map((obj) => (
                        <div
                          key={obj.id}
                          className="flex items-center justify-between px-2.5 py-1.5 rounded bg-neutral-900 border border-neutral-800 text-xs"
                        >
                          <span className="text-neutral-200 font-medium truncate max-w-[150px]">
                            {obj.name}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">
                            {obj.kind}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Errors or Warnings */}
                {importParseResult.errors.length > 0 && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs space-y-1">
                    {importParseResult.errors.map((err, i) => (
                      <p key={i} className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{err}</span>
                      </p>
                    ))}
                  </div>
                )}

                {importParseResult.warnings.length > 0 && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs space-y-1">
                    {importParseResult.warnings.map((warn, i) => (
                      <p key={i} className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>{warn}</span>
                      </p>
                    ))}
                  </div>
                )}

                {/* Apply Import Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    data-testid="apply-import-btn"
                    disabled={!importParseResult.success}
                    onClick={handleApplyImport}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-lg shadow-orange-900/30 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Apply Import into Model
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
