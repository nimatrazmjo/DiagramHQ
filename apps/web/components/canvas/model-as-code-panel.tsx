'use client';

import React, { useState, useMemo } from 'react';
import {
  type ArchitectureModel,
  type ModelAsCodeDocument,
  type ValidationResult,
  type DhqCliResult,
  parseYamlToModelDocument,
  serializeModelToYaml,
  validateModelAsCodeDocument,
  diffModelAsCode,
  pushModelAsCode,
  pullModelAsCode,
  executeDhqCommand,
} from '@diagramhq/domain';

export interface ModelAsCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeModel?: ArchitectureModel;
  onModelUpdate?: (updatedModel: ArchitectureModel) => void;
}

type TabMode = 'yaml' | 'validate' | 'diff' | 'cli';

const DEFAULT_STARTER_YAML = `# DiagramHQ Model-as-Code (dhq)
version: "1.0"
architectureSlug: "payment-platform"
name: "Payment Platform Architecture"
description: "Core banking and payment processing engine"

objects:
  - slug: "customer-web-app"
    name: "Customer Web App"
    kind: "container"
    description: "Next.js frontend web application"
    technology: ["React", "TypeScript", "Tailwind"]
    tags: ["frontend", "web"]
  - slug: "edge-api-gateway"
    name: "Edge API Gateway"
    kind: "container"
    description: "Reverse proxy and rate limiting edge"
    technology: ["Fastify", "Envoy"]
    tags: ["gateway", "security"]
  - slug: "ledger-service"
    name: "Ledger Microservice"
    kind: "component"
    description: "Immutable transaction ledger"
    parentSlug: "edge-api-gateway"
    technology: ["Go", "gRPC"]
  - slug: "ledger-db"
    name: "Ledger Database"
    kind: "component"
    description: "Primary transactional relational store"
    technology: ["PostgreSQL 16"]

connections:
  - source: "customer-web-app"
    target: "edge-api-gateway"
    label: "HTTPS / REST"
    protocol: "HTTPS"
    port: 443
    description: "Client incoming HTTPS traffic"
  - source: "edge-api-gateway"
    target: "ledger-service"
    label: "gRPC / TLS"
    protocol: "gRPC"
    port: 50051
  - source: "ledger-service"
    target: "ledger-db"
    label: "TCP / SSL"
    protocol: "TCP"
    port: 5432
`;

export function ModelAsCodeModal({
  isOpen,
  onClose,
  activeModel,
  onModelUpdate,
}: ModelAsCodeModalProps): React.JSX.Element | null {
  const [activeTab, setActiveTab] = useState<TabMode>('yaml');
  const [yamlContent, setYamlContent] = useState<string>(() => {
    if (activeModel && activeModel.objects.length > 0) {
      try {
        const doc = pullModelAsCode(activeModel);
        return serializeModelToYaml(doc);
      } catch {
        return DEFAULT_STARTER_YAML;
      }
    }
    return DEFAULT_STARTER_YAML;
  });

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [cliInput, setCliInput] = useState<string>('dhq validate');
  const [cliHistory, setCliHistory] = useState<Array<{ cmd: string; result: DhqCliResult }>>([]);

  // Parsed working document
  const parsedDoc = useMemo<ModelAsCodeDocument>(() => {
    try {
      return parseYamlToModelDocument(yamlContent);
    } catch {
      return {
        version: '1.0',
        architectureSlug: 'invalid',
        name: 'Invalid Document',
        objects: [],
        connections: [],
      };
    }
  }, [yamlContent]);

  // Live validation
  const validation = useMemo<ValidationResult>(() => {
    return validateModelAsCodeDocument(parsedDoc);
  }, [parsedDoc]);

  // Live Diff vs active canvas model
  const diffResult = useMemo(() => {
    const remoteDoc = activeModel
      ? pullModelAsCode(activeModel)
      : {
          version: '1.0',
          architectureSlug: parsedDoc.architectureSlug,
          name: parsedDoc.name,
          objects: [],
          connections: [],
        };
    return diffModelAsCode(remoteDoc, parsedDoc);
  }, [activeModel, parsedDoc]);

  if (!isOpen) return null;

  const handlePullFromCanvas = () => {
    if (!activeModel) {
      setNotification({ type: 'error', message: 'No active canvas model found to pull from.' });
      return;
    }
    const doc = pullModelAsCode(activeModel);
    const serialized = serializeModelToYaml(doc);
    setYamlContent(serialized);
    setNotification({
      type: 'success',
      message: `Pulled ${doc.objects.length} objects and ${doc.connections.length} connections from canvas.`,
    });
  };

  const handlePushToCanvas = () => {
    if (!validation.isValid) {
      setNotification({
        type: 'error',
        message: `Cannot push invalid Model-as-Code: ${validation.errors[0]?.message}`,
      });
      return;
    }
    try {
      const updated = pushModelAsCode(parsedDoc, activeModel);
      if (onModelUpdate) {
        onModelUpdate(updated);
      }
      setNotification({
        type: 'success',
        message: `Pushed "${parsedDoc.name}" to canvas (${parsedDoc.objects.length} objects, ${parsedDoc.connections.length} connections).`,
      });
    } catch (err) {
      setNotification({
        type: 'error',
        message: `Push failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  };

  const handleCopyYaml = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(yamlContent);
      setNotification({ type: 'success', message: 'YAML copied to clipboard.' });
    }
  };

  const handleRunCli = (commandString: string) => {
    const tokens = commandString.trim().split(/\s+/);
    const virtualFiles: Record<string, string> = {
      'diagramhq.yaml': yamlContent,
    };
    const ctx = {
      activeModel,
      localFiles: virtualFiles,
    };
    const result = executeDhqCommand(tokens, ctx);
    if (ctx.localFiles['diagramhq.yaml'] && ctx.localFiles['diagramhq.yaml'] !== yamlContent) {
      setYamlContent(ctx.localFiles['diagramhq.yaml']);
    }
    setCliHistory((prev) => [...prev, { cmd: commandString, result }]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex h-[90vh] w-full max-w-5xl flex-col rounded-xl border border-border bg-background shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/20">
          <div className="flex items-center space-x-3">
            <span className="material-symbols-outlined text-primary text-2xl">code_blocks</span>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-foreground">Model-as-Code & dhq CLI</h2>
                <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  F125
                </span>
                <span className="rounded bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
                  YAML 1.0
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Bidirectional YAML model definition and command-line synchronization
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePullFromCanvas}
              title="Pull current canvas model into YAML"
              className="flex items-center space-x-1 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              <span>Pull</span>
            </button>
            <button
              onClick={handlePushToCanvas}
              title="Push YAML definition into canvas model"
              className="flex items-center space-x-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              <span className="material-symbols-outlined text-sm">upload</span>
              <span>Push to Canvas</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-border bg-muted/40 px-6">
          <button
            onClick={() => setActiveTab('yaml')}
            className={`flex items-center space-x-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'yaml'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="material-symbols-outlined text-base">description</span>
            <span>YAML Definition</span>
            <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px]">
              {parsedDoc.objects.length} obj
            </span>
          </button>
          <button
            onClick={() => setActiveTab('validate')}
            className={`flex items-center space-x-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'validate'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="material-symbols-outlined text-base">verified</span>
            <span>Live Validation</span>
            {validation.isValid ? (
              <span className="rounded-full bg-green-500/10 px-1.5 py-0.2 text-[10px] text-green-500">
                Valid
              </span>
            ) : (
              <span className="rounded-full bg-destructive/10 px-1.5 py-0.2 text-[10px] text-destructive">
                {validation.errors.length} err
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('diff')}
            className={`flex items-center space-x-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'diff'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="material-symbols-outlined text-base">difference</span>
            <span>Diff Viewer</span>
            {diffResult.hasChanges && (
              <span className="rounded-full bg-amber-500/10 px-1.5 py-0.2 text-[10px] text-amber-500">
                Modified
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('cli')}
            className={`flex items-center space-x-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'cli'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="material-symbols-outlined text-base">terminal</span>
            <span>dhq CLI Terminal</span>
          </button>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div
            className={`flex items-center justify-between px-6 py-2 text-xs font-medium ${
              notification.type === 'success'
                ? 'bg-green-500/10 text-green-500'
                : 'bg-destructive/10 text-destructive'
            }`}
          >
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)} className="hover:opacity-75">
              ✕
            </button>
          </div>
        )}

        {/* Tab Content Body */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'yaml' && (
            <div className="flex h-full flex-col space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center space-x-4">
                  <span>
                    Objects:{' '}
                    <strong className="text-foreground">{parsedDoc.objects.length}</strong>
                  </span>
                  <span>
                    Connections:{' '}
                    <strong className="text-foreground">{parsedDoc.connections.length}</strong>
                  </span>
                  <span>
                    Slug:{' '}
                    <code className="text-foreground font-mono">{parsedDoc.architectureSlug}</code>
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCopyYaml}
                    className="flex items-center space-x-1 rounded border border-border px-2 py-1 text-xs hover:bg-muted"
                  >
                    <span className="material-symbols-outlined text-xs">content_copy</span>
                    <span>Copy</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('validate')}
                    className="flex items-center space-x-1 rounded border border-border px-2 py-1 text-xs hover:bg-muted"
                  >
                    <span className="material-symbols-outlined text-xs">check_circle</span>
                    <span>Check Syntax</span>
                  </button>
                </div>
              </div>
              <textarea
                aria-label="Model-as-Code YAML Specification"
                value={yamlContent}
                onChange={(e) => setYamlContent(e.target.value)}
                className="flex-1 w-full rounded-md border border-border bg-muted/10 p-4 font-mono text-xs leading-relaxed text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                rows={22}
                spellCheck={false}
              />
            </div>
          )}

          {activeTab === 'validate' && (
            <div className="space-y-6">
              <div
                className={`rounded-lg border p-4 ${
                  validation.isValid
                    ? 'border-green-500/20 bg-green-500/5'
                    : 'border-destructive/20 bg-destructive/5'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span
                    className={`material-symbols-outlined text-xl ${
                      validation.isValid ? 'text-green-500' : 'text-destructive'
                    }`}
                  >
                    {validation.isValid ? 'check_circle' : 'error'}
                  </span>
                  <h3 className="font-semibold text-sm text-foreground">
                    {validation.isValid ? 'Document is Valid' : 'Validation Invariants Failed'}
                  </h3>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{validation.summary}</p>
              </div>

              {validation.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Errors ({validation.errors.length})
                  </h4>
                  <div className="space-y-1.5">
                    {validation.errors.map((err, idx) => (
                      <div
                        key={idx}
                        className="flex items-start space-x-2 rounded border border-destructive/20 bg-card p-2 text-xs"
                      >
                        <span className="rounded bg-destructive/10 px-1.5 py-0.5 font-mono text-[10px] text-destructive">
                          {err.code}
                        </span>
                        <div>
                          <strong className="font-mono text-foreground">{err.field}:</strong>{' '}
                          <span className="text-muted-foreground">{err.message}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Model Invariant Checks
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="material-symbols-outlined text-sm text-green-500">check</span>
                    <span>Unique Object Slugs</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="material-symbols-outlined text-sm text-green-500">check</span>
                    <span>No Dangling Connection References</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="material-symbols-outlined text-sm text-green-500">check</span>
                    <span>Acyclic Parent Hierarchies</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="material-symbols-outlined text-sm text-green-500">check</span>
                    <span>C4 Kind Conformance</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'diff' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="text-sm font-semibold text-foreground">Structural Comparison</h3>
                <p className="mt-1 text-xs text-muted-foreground">{diffResult.summary}</p>
                <div className="mt-3 flex items-center space-x-2 text-xs">
                  <span className="rounded bg-green-500/10 px-2 py-0.5 text-green-500 font-medium">
                    +{diffResult.addedObjects.length} objects
                  </span>
                  <span className="rounded bg-destructive/10 px-2 py-0.5 text-destructive font-medium">
                    -{diffResult.removedObjects.length} objects
                  </span>
                  <span className="rounded bg-amber-500/10 px-2 py-0.5 text-amber-500 font-medium">
                    ~{diffResult.modifiedObjects.length} objects
                  </span>
                  <span className="rounded bg-blue-500/10 px-2 py-0.5 text-blue-500 font-medium">
                    +{diffResult.addedConnections.length} connections
                  </span>
                </div>
              </div>

              {diffResult.addedObjects.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-green-500">Added Objects</span>
                  {diffResult.addedObjects.map((o) => (
                    <div
                      key={o.slug}
                      className="rounded border border-green-500/20 bg-green-500/5 p-2 font-mono text-xs text-foreground"
                    >
                      + object: <strong>{o.slug}</strong> ({o.name}, kind: {o.kind})
                    </div>
                  ))}
                </div>
              )}

              {diffResult.removedObjects.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-destructive">Removed Objects</span>
                  {diffResult.removedObjects.map((o) => (
                    <div
                      key={o.slug}
                      className="rounded border border-destructive/20 bg-destructive/5 p-2 font-mono text-xs text-foreground"
                    >
                      - object: <strong>{o.slug}</strong> ({o.name})
                    </div>
                  ))}
                </div>
              )}

              {!diffResult.hasChanges && (
                <div className="rounded border border-border bg-muted/10 p-8 text-center text-xs text-muted-foreground">
                  Local YAML is fully synchronized with remote canvas model. No drift detected.
                </div>
              )}
            </div>
          )}

          {activeTab === 'cli' && (
            <div className="flex h-full flex-col space-y-4">
              {/* Quick Command Chips */}
              <div className="flex flex-wrap gap-2">
                {[
                  'dhq validate',
                  'dhq diff',
                  'dhq push',
                  'dhq pull',
                  'dhq export --format json',
                  'dhq deploy --env staging',
                  'dhq generate --from openapi',
                  'dhq --help',
                ].map((cmd) => (
                  <button
                    key={cmd}
                    onClick={() => {
                      setCliInput(cmd);
                      handleRunCli(cmd);
                    }}
                    className="rounded border border-border bg-card px-2.5 py-1 font-mono text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    ${cmd}
                  </button>
                ))}
              </div>

              {/* Terminal Screen */}
              <div className="flex-1 rounded-lg border border-border bg-neutral-950 p-4 font-mono text-xs text-neutral-100 overflow-y-auto space-y-3 min-h-[300px]">
                <div className="text-neutral-500">
                  DiagramHQ CLI v1.0.0 (dhq) - Connected to in-memory workspace
                </div>
                {cliHistory.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="text-primary-foreground font-semibold flex items-center space-x-1">
                      <span className="text-green-400">$</span>
                      <span>{item.cmd}</span>
                    </div>
                    {item.result.stdout && (
                      <pre className="whitespace-pre-wrap text-neutral-300">
                        {item.result.stdout}
                      </pre>
                    )}
                    {item.result.stderr && (
                      <pre className="whitespace-pre-wrap text-destructive">
                        {item.result.stderr}
                      </pre>
                    )}
                  </div>
                ))}
              </div>

              {/* Terminal Input Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (cliInput.trim()) {
                    handleRunCli(cliInput);
                  }
                }}
                className="flex items-center space-x-2"
              >
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-3 flex items-center font-mono text-xs text-muted-foreground">
                    $
                  </span>
                  <input
                    type="text"
                    value={cliInput}
                    onChange={(e) => setCliInput(e.target.value)}
                    placeholder="Enter dhq command (e.g. dhq validate, dhq diff, dhq push)"
                    className="w-full rounded-md border border-border bg-muted/20 py-2 pl-7 pr-4 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Run
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-3 bg-muted/20 text-xs text-muted-foreground">
          <div className="flex items-center space-x-2">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
            <span>dhq CLI Runtime Ready</span>
          </div>
          <div>
            Press <kbd className="rounded border px-1 py-0.5 font-mono text-[10px]">Esc</kbd> to close
          </div>
        </div>
      </div>
    </div>
  );
}
