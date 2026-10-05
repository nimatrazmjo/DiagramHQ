import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  registerObjectType,
  resetObjectTypeRegistry,
  listObjectTypes,
  createDomain,
  nestDomain,
  assignObjectToDomain,
  filterObjectsByDomain,
  type ArchitectureId,
  type ObjectTypeDefinition,
} from '@diagramhq/domain';
import { InspectorPanel } from './components/shell/inspector-panel';

describe('Object Type Catalog & DDD Domains Web Integration (F112, F113)', () => {
  const archId = 'arch-demo' as ArchitectureId;

  it('renders dynamic inspector sections for built-in types (F112)', () => {
    resetObjectTypeRegistry();

    // 1. Render InspectorPanel for a database node
    const dbHtml = renderToString(
      <InspectorPanel
        isOpen={true}
        objectId="db-1"
        objectName="Primary Postgres"
        objectKind="database"
        metadata={{ engine: 'PostgreSQL' }}
      />,
    );

    expect(dbHtml).toContain('data-testid="inspector-section-database-details"');
    expect(dbHtml).toContain('Database Engine');
    expect(dbHtml).toContain('data-testid="inspector-field-engine"');

    // 2. Render InspectorPanel for a k8s-workload node
    const k8sHtml = renderToString(
      <InspectorPanel
        isOpen={true}
        objectId="k8s-1"
        objectName="Order Service Deployment"
        objectKind="k8s-workload"
        metadata={{ workloadKind: 'Deployment', replicas: 3 }}
      />,
    );

    expect(k8sHtml).toContain('data-testid="inspector-section-k8s-details"');
    expect(k8sHtml).toContain('Kubernetes Workload Specification');
    expect(k8sHtml).toContain('data-testid="inspector-field-workloadKind"');
  });

  it('renders dynamic inspector section for a novel custom type registered at runtime with no core change (F112 / MODULES.md §1)', () => {
    resetObjectTypeRegistry();

    const customAiAgentType: ObjectTypeDefinition = {
      kind: 'ai-agent-executor',
      label: 'Autonomous AI Agent',
      icon: 'bot',
      category: 'compute',
      allowedParents: ['system', 'group'],
      allowedConnectionKinds: ['sync', 'async', 'data'],
      metadataSchema: {
        modelId: 'claude-3-7-sonnet',
        maxTokens: 8192,
      },
      inspectorSection: {
        id: 'ai-agent-details',
        title: 'AI Agent Parameters',
        description: 'Autonomous reasoning loop and LLM model bindings.',
        fields: [
          { key: 'modelId', label: 'Inference Model', type: 'text', defaultValue: 'claude-3-7-sonnet' },
          { key: 'maxTokens', label: 'Context Window (Tokens)', type: 'number', defaultValue: 8192 },
        ],
      },
    };

    // Register dynamically
    registerObjectType(customAiAgentType);

    // Verify it is recognized across the platform
    expect(listObjectTypes().some((t) => t.kind === 'ai-agent-executor')).toBe(true);

    // Render inspector for the new type
    const customHtml = renderToString(
      <InspectorPanel
        isOpen={true}
        objectId="agent-1"
        objectName="Copilot Autonomous Worker"
        objectKind="ai-agent-executor"
        metadata={{ modelId: 'claude-3-7-sonnet', maxTokens: 8192 }}
      />,
    );

    expect(customHtml).toContain('data-testid="inspector-section-ai-agent-details"');
    expect(customHtml).toContain('AI Agent Parameters');
    expect(customHtml).toContain('Autonomous reasoning loop and LLM model bindings.');
    expect(customHtml).toContain('data-testid="inspector-field-modelId"');
  });

  it('supports DDD domain creation, nesting bounded contexts, and assignment (F113)', () => {
    // 1. Create top-level domain
    const payments = createDomain({
      architectureId: archId,
      name: 'Payments',
      description: 'Customer payment processing and settlements',
      color: '#0ea5e9',
    });

    // 2. Create sub-domain / bounded context
    const cardProcessing = createDomain({
      architectureId: archId,
      name: 'Card Processing Context',
      description: 'PCI-DSS compliant card processing vault',
    });

    const nestedContext = nestDomain(cardProcessing.id, payments.id, [payments, cardProcessing]);
    expect(nestedContext.parentDomainId).toBe(payments.id);

    // 3. Assign an object to the domain
    const initialObject = {
      id: 'app-checkout',
      name: 'Checkout Gateway',
      kind: 'application',
      metadata: { env: 'production' },
    };

    const assignedObject = assignObjectToDomain(initialObject, payments);
    expect(assignedObject.metadata.domain).toBe('Payments');
    expect(assignedObject.metadata.domainId).toBe(payments.id);

    // 4. Render inspector with availableDomains
    const inspectorHtml = renderToString(
      <InspectorPanel
        isOpen={true}
        objectId="app-checkout"
        objectName="Checkout Gateway"
        objectKind="application"
        metadata={assignedObject.metadata}
        availableDomains={[payments, nestedContext]}
      />,
    );

    expect(inspectorHtml).toContain('data-testid="inspector-field-domain-select"');
    expect(inspectorHtml).toContain('Payments');
    expect(inspectorHtml).toContain('Card Processing Context');
  });

  it('filters architecture objects by domain (F113)', () => {
    const domainA = createDomain({ architectureId: archId, name: 'Billing' });
    const domainB = createDomain({ architectureId: archId, name: 'Shipping' });

    const objA1 = assignObjectToDomain({ id: 'srv-1', name: 'Invoice Generator' }, domainA);
    const objA2 = assignObjectToDomain({ id: 'db-1', name: 'Ledger SQL' }, domainA);
    const objB1 = assignObjectToDomain({ id: 'srv-2', name: 'Fleet Dispatcher' }, domainB);
    const objUnassigned = { id: 'srv-3', name: 'Global Ping Monitor' };

    const pool = [objA1, objA2, objB1, objUnassigned];

    // Filter by domain name
    const billingObjects = filterObjectsByDomain(pool, 'Billing');
    expect(billingObjects.map((o) => o.id)).toEqual(['srv-1', 'db-1']);

    // Filter by domain ID
    const shippingObjects = filterObjectsByDomain(pool, domainB.id);
    expect(shippingObjects.map((o) => o.id)).toEqual(['srv-2']);
  });
});
