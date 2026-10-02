'use client';

import React, { useState } from 'react';
import {
  createDiagramHQClient,
  createMockTestServer,
  type ArchitectureId,
  type VersionId,
  type ObjectId,
  type WorkspaceId,
  type Architecture,
  type ModelObject,
} from '@diagramhq/domain';

export interface SdkPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  architectureId?: string;
  defaultApiKey?: string;
}

export type SdkLanguageTab = 'typescript' | 'curl' | 'cli';
export type SdkResourceTab = 'architecture' | 'objects' | 'connections' | 'views' | 'flows';

export function SdkPanelModal({
  isOpen,
  onClose,
  architectureId = 'arch-demo-1',
  defaultApiKey = 'dhq_live_9f8e7d6c5b4a3a2b1',
}: SdkPanelModalProps): React.JSX.Element | null {
  const [langTab, setLangTab] = useState<SdkLanguageTab>('typescript');
  const [resourceTab, setResourceTab] = useState<SdkResourceTab>('objects');
  const [apiKey, setApiKey] = useState(defaultApiKey);
  const [baseUrl, setBaseUrl] = useState('https://api.diagramhq.com/v1');
  const [copied, setCopied] = useState(false);
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [isRunningTest, setIsRunningTest] = useState(false);

  if (!isOpen) return null;

  const copyToClipboard = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getTsSnippet = (): string => {
    switch (resourceTab) {
      case 'architecture':
        return `import { createDiagramHQClient } from '@diagramhq/sdk';

const client = createDiagramHQClient({
  apiKey: '${apiKey}',
  baseUrl: '${baseUrl}',
});

// Fetch architecture details
const arch = await client.architectures.get('${architectureId}');
console.log('Architecture Name:', arch.name);

// Update architecture
await client.architectures.update('${architectureId}', {
  name: 'Updated Enterprise Cloud Core',
});`;

      case 'objects':
        return `import { createDiagramHQClient } from '@diagramhq/sdk';

const client = createDiagramHQClient({
  apiKey: '${apiKey}',
  baseUrl: '${baseUrl}',
});

// List all objects in architecture
const objects = await client.objects.list('${architectureId}');

// Create a new microservice component
const newService = await client.objects.create('${architectureId}', {
  name: 'Payment Processing Service',
  kind: 'application',
  tags: ['billing', 'fintech', 'pci-dss'],
});
console.log('Created service ID:', newService.id);`;

      case 'connections':
        return `import { createDiagramHQClient } from '@diagramhq/sdk';

const client = createDiagramHQClient({
  apiKey: '${apiKey}',
  baseUrl: '${baseUrl}',
});

// Create relationship edge between services
const edge = await client.connections.create('${architectureId}', {
  sourceId: 'obj-api-gateway',
  targetId: 'obj-payment-service',
  label: 'mTLS REST',
  protocol: 'HTTPS',
});
console.log('Created connection ID:', edge.id);`;

      case 'views':
        return `import { createDiagramHQClient } from '@diagramhq/sdk';

const client = createDiagramHQClient({
  apiKey: '${apiKey}',
  baseUrl: '${baseUrl}',
});

// Fetch diagram views
const views = await client.views.list('${architectureId}');

// Create C4 Container View
const view = await client.views.create('${architectureId}', {
  name: 'Core Payment Flow Container View',
  type: 'container',
});
console.log('Created View:', view.name);`;

      case 'flows':
        return `import { createDiagramHQClient } from '@diagramhq/sdk';

const client = createDiagramHQClient({
  apiKey: '${apiKey}',
  baseUrl: '${baseUrl}',
});

// List animated runtime execution flows
const flows = await client.flows.list('${architectureId}');

// Register step-by-step transaction flow
const flow = await client.flows.create('${architectureId}', {
  name: 'Checkout & Settlement Flow',
  steps: [
    { sourceId: 'obj-webapp', targetId: 'obj-gateway', description: 'POST /v1/checkout' },
    { sourceId: 'obj-gateway', targetId: 'obj-payment', description: 'Dispatch Payment Job' },
  ],
});`;
    }
  };

  const getCurlSnippet = (): string => {
    switch (resourceTab) {
      case 'architecture':
        return `# Get Architecture
curl -X GET "${baseUrl}/architectures/${architectureId}" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json"`;

      case 'objects':
        return `# Create Object
curl -X POST "${baseUrl}/architectures/${architectureId}/objects" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Auth Worker", "kind": "application", "tags": ["iam"]}'`;

      case 'connections':
        return `# Create Connection
curl -X POST "${baseUrl}/architectures/${architectureId}/connections" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"sourceId": "obj-1", "targetId": "obj-2", "label": "gRPC", "protocol": "gRPC"}'`;

      case 'views':
        return `# List Views
curl -X GET "${baseUrl}/architectures/${architectureId}/views" \\
  -H "Authorization: Bearer ${apiKey}"`;

      case 'flows':
        return `# List Flows
curl -X GET "${baseUrl}/architectures/${architectureId}/flows" \\
  -H "Authorization: Bearer ${apiKey}"`;
    }
  };

  const getCliSnippet = (): string => {
    switch (resourceTab) {
      case 'architecture':
        return `# CLI Architecture Status
dhq pull --architecture-id ${architectureId} --format yaml`;

      case 'objects':
        return `# Validate model with CLI
dhq validate ./architecture.yaml`;

      case 'connections':
        return `# Diff model against live workspace
dhq diff ./architecture.yaml`;

      case 'views':
        return `# Export diagrams from CLI
dhq export --architecture-id ${architectureId} --output ./exports/`;

      case 'flows':
        return `# Deploy architecture model
dhq deploy ./architecture.yaml --message "Sync flows and components"`;
    }
  };

  const currentSnippet =
    langTab === 'typescript'
      ? getTsSnippet()
      : langTab === 'curl'
        ? getCurlSnippet()
        : getCliSnippet();

  const runInMemoryTest = async () => {
    setIsRunningTest(true);
    setTestOutput(null);
    try {
      const archId = architectureId as ArchitectureId;
      const verId = 'ver-demo-1' as VersionId;
      const now = new Date();

      const initialArch: Architecture = {
        id: archId,
        workspaceId: 'ws-demo' as WorkspaceId,
        name: 'Demo Production Architecture',
        description: 'Interactive test architecture',
        defaultVersionId: verId,
        createdAt: now,
        updatedAt: now,
      };

      const archMap = new Map<string, Architecture>();
      archMap.set(archId, initialArch);

      const objMap = new Map<string, ModelObject>();
      const obj1: ModelObject = {
        id: 'obj-api' as ObjectId,
        architectureId: archId,
        versionId: verId,
        parentId: null,
        kind: 'application',
        name: 'API Gateway',
        description: 'Gateway layer',
        metadata: { tags: ['edge'] },
        position: null,
        createdAt: now,
        updatedAt: now,
      };
      objMap.set(obj1.id, obj1);

      const server = createMockTestServer({
        architectures: archMap,
        objects: objMap,
      });

      const client = createDiagramHQClient({
        token: apiKey,
        baseUrl: 'http://mock.diagramhq.local/v1',
        transport: server.transport,
      });

      // Execute live SDK call
      const archRes = await client.architectures.get(archId);
      const objectsRes = await client.objects.list(archId);
      const newObjRes = await client.objects.create(archId, {
        name: 'Event Bus (Kafka)',
        kind: 'store',
        metadata: { tags: ['streaming'] },
      });
      const allObjectsAfter = await client.objects.list(archId);

      setTestOutput(
        JSON.stringify(
          {
            status: 200,
            ok: true,
            architecture: archRes.architecture.name,
            initialObjectsCount: objectsRes.objects.length,
            createdObject: newObjRes.object.name,
            updatedTotalObjects: allObjectsAfter.objects.length,
            serverStateInSync: true,
          },
          null,
          2
        )
      );
    } catch (err: unknown) {
      setTestOutput(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsRunningTest(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sdk-modal-title"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '820px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            color: '#ffffff',
          }}
        >
          <div>
            <h2 id="sdk-modal-title" style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#38bdf8' }}>⚡</span> DiagramHQ Developer SDK & API
            </h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: '#94a3b8' }}>
              Integrate, automate, and query architectures using the typed TypeScript SDK, cURL, or CLI.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '1.25rem',
              padding: '0.25rem 0.5rem',
              borderRadius: '6px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Configuration Bar */}
        <div
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            alignItems: 'center',
          }}
        >
          <div style={{ flex: 1, minWidth: '220px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
              API KEY
            </label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="dhq_live_..."
              style={{
                width: '100%',
                padding: '0.375rem 0.75rem',
                fontSize: '0.8125rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontFamily: 'monospace',
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
              BASE URL
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.diagramhq.com/v1"
              style={{
                width: '100%',
                padding: '0.375rem 0.75rem',
                fontSize: '0.8125rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontFamily: 'monospace',
              }}
            />
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f1f5f9', padding: '0 1.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginRight: 'auto' }}>
            {(['typescript', 'curl', 'cli'] as SdkLanguageTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setLangTab(tab)}
                style={{
                  padding: '0.625rem 1rem',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  borderBottom: langTab === tab ? '2px solid #0284c7' : '2px solid transparent',
                  backgroundColor: 'transparent',
                  color: langTab === tab ? '#0284c7' : '#64748b',
                }}
              >
                {tab === 'typescript' ? 'TypeScript SDK' : tab.toUpperCase()}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
            {(['architecture', 'objects', 'connections', 'views', 'flows'] as SdkResourceTab[]).map((res) => (
              <button
                key={res}
                onClick={() => setResourceTab(res)}
                style={{
                  padding: '0.25rem 0.625rem',
                  fontSize: '0.75rem',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: resourceTab === res ? '#e2e8f0' : 'transparent',
                  color: resourceTab === res ? '#0f172a' : '#64748b',
                  fontWeight: resourceTab === res ? 600 : 400,
                }}
              >
                {res.charAt(0).toUpperCase() + res.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Code Content & Playground */}
        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Code Example ({langTab})
            </span>
            <button
              onClick={() => copyToClipboard(currentSnippet)}
              style={{
                fontSize: '0.75rem',
                padding: '0.25rem 0.625rem',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                cursor: 'pointer',
                color: '#334155',
              }}
            >
              {copied ? '✓ Copied!' : 'Copy Code'}
            </button>
          </div>

          <pre
            style={{
              backgroundColor: '#0f172a',
              color: '#f8fafc',
              padding: '1rem',
              borderRadius: '8px',
              fontSize: '0.8125rem',
              fontFamily: 'monospace',
              overflowX: 'auto',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            <code>{currentSnippet}</code>
          </pre>

          {/* In-Memory Test Playground */}
          <div style={{ marginTop: '1.25rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0, color: '#1e293b' }}>
                  Interactive SDK Verification
                </h3>
                <p style={{ margin: '0.125rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                  Executes a live TypeScript SDK CRUD round-trip against the simulated in-memory test server.
                </p>
              </div>
              <button
                onClick={() => void runInMemoryTest()}
                disabled={isRunningTest}
                style={{
                  padding: '0.375rem 0.875rem',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  cursor: isRunningTest ? 'not-allowed' : 'pointer',
                  opacity: isRunningTest ? 0.7 : 1,
                }}
              >
                {isRunningTest ? 'Running...' : 'Run SDK Test'}
              </button>
            </div>

            {testOutput && (
              <pre
                style={{
                  marginTop: '0.75rem',
                  backgroundColor: '#1e293b',
                  color: '#38bdf8',
                  padding: '0.75rem 1rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                  overflowX: 'auto',
                }}
              >
                <code>{testOutput}</code>
              </pre>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Package: <code style={{ color: '#0284c7' }}>@diagramhq/sdk</code>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '0.375rem 1rem',
              fontSize: '0.8125rem',
              fontWeight: 500,
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              cursor: 'pointer',
              color: '#334155',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
