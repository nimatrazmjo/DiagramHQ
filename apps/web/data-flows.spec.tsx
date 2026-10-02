/**
 * F046 — Data flows — integration spec.
 *
 * Verifies acceptance criteria from PHASE-05-FLOWS.md:
 * - Data-flow type; feeds data lineage (F091)
 * - Test: a data flow plays back.
 */
import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  createId,
  createArchitectureModel,
  addModelObject,
  addModelConnection,
  createDataFlow,
  extractDataLineage,
  projectFlowToCanvas,
  createFlowPlayback,
  nextFlowStep,
  playFlow,
  getDataFlowPlaybackStepInfo,
  type Architecture,
  type Version,
  type ArchitectureId,
  type VersionId,
  type WorkspaceId,
  type ObjectId,
  type ConnectionId,
} from '@diagramhq/domain';
import { DataFlowOverlay } from './components/canvas/data-flow-overlay';

describe('F046 — Data flows & Data Lineage (Web / Integration)', () => {
  const archId = createId('arch') as ArchitectureId;
  const wsId = createId('ws') as WorkspaceId;
  const verId = createId('ver') as VersionId;
  const NOW = new Date('2026-01-01T00:00:00Z');

  const arch: Architecture = {
    id: archId,
    workspaceId: wsId,
    name: 'Core Payments Architecture',
    createdAt: NOW,
    updatedAt: NOW,
  };

  const ver: Version = {
    id: verId,
    architectureId: archId,
    name: 'main',
    kind: 'main',
    status: 'approved',
    createdAt: NOW,
  };

  // Model: Browser Client (App) -> Ingestion API (App) -> Ledger DB (Store) -> Analytics Warehouse (External)
  const browserId = createId('app') as ObjectId;
  const ingestApiId = createId('app') as ObjectId;
  const ledgerDbId = createId('sto') as ObjectId;
  const analyticsWarehouseId = createId('sys') as ObjectId;

  let model = createArchitectureModel(arch, ver);
  model = addModelObject(model, {
    id: browserId,
    architectureId: archId,
    versionId: verId,
    name: 'Browser Client',
    kind: 'application',
    createdAt: NOW,
    updatedAt: NOW,
  });
  model = addModelObject(model, {
    id: ingestApiId,
    architectureId: archId,
    versionId: verId,
    name: 'Ingestion Gateway',
    kind: 'application',
    createdAt: NOW,
    updatedAt: NOW,
  });
  model = addModelObject(model, {
    id: ledgerDbId,
    architectureId: archId,
    versionId: verId,
    name: 'Primary Ledger DB',
    kind: 'store',
    createdAt: NOW,
    updatedAt: NOW,
  });
  model = addModelObject(model, {
    id: analyticsWarehouseId,
    architectureId: archId,
    versionId: verId,
    name: 'Snowflake Analytics Cloud',
    kind: 'system',
    createdAt: NOW,
    updatedAt: NOW,
  });

  const conn1Id = createId('con') as ConnectionId;
  const conn2Id = createId('con') as ConnectionId;
  const conn3Id = createId('con') as ConnectionId;

  model = addModelConnection(model, {
    id: conn1Id,
    architectureId: archId,
    versionId: verId,
    sourceObjectId: browserId,
    targetObjectId: ingestApiId,
    label: 'HTTPS / Ingestion',
    kind: 'data',
    createdAt: NOW,
    updatedAt: NOW,
  });

  model = addModelConnection(model, {
    id: conn2Id,
    architectureId: archId,
    versionId: verId,
    sourceObjectId: ingestApiId,
    targetObjectId: ledgerDbId,
    label: 'TCP : 5432 / Commit',
    kind: 'data',
    createdAt: NOW,
    updatedAt: NOW,
  });

  model = addModelConnection(model, {
    id: conn3Id,
    architectureId: archId,
    versionId: verId,
    sourceObjectId: ledgerDbId,
    targetObjectId: analyticsWarehouseId,
    label: 'CDC / Stream Export',
    kind: 'data',
    createdAt: NOW,
    updatedAt: NOW,
  });

  const dataPipelineFlow = createDataFlow(
    {
      architectureId: archId,
      name: 'Cardholder Ledger Pipeline',
      dataClassification: 'pci',
      dataElements: ['CardToken', 'Amount', 'Timestamp'],
      steps: [
        {
          connectionId: conn1Id,
          note: 'Tokenized transaction submitted by client',
          dataElements: ['CardToken', 'Amount'],
          dataClassification: 'pci',
          transformation: 'Client encrypts with public key',
        },
        {
          connectionId: conn2Id,
          note: 'Persisted to immutable ledger store',
          dataElements: ['CardToken', 'Amount', 'LedgerSequence'],
          dataClassification: 'confidential',
          transformation: 'Appends cryptographically signed block',
        },
        {
          connectionId: conn3Id,
          note: 'CDC stream replays anonymized metrics to data warehouse',
          dataElements: ['Amount', 'Timestamp'],
          dataClassification: 'internal',
          transformation: 'Strips card tokens; exports aggregated metrics',
        },
      ],
    },
    model.connections,
  );

  it('instantiates data flow with type, schema, and step transformations', () => {
    expect(dataPipelineFlow.type).toBe('data_flow');
    expect(dataPipelineFlow.name).toBe('Cardholder Ledger Pipeline');
    expect(dataPipelineFlow.dataClassification).toBe('pci');
    expect(dataPipelineFlow.steps).toHaveLength(3);
    expect(dataPipelineFlow.steps[0]?.dataElements).toEqual(['CardToken', 'Amount']);
    expect(dataPipelineFlow.steps[0]?.transformation).toBe(
      'Client encrypts with public key',
    );
    expect(dataPipelineFlow.steps[2]?.dataClassification).toBe('internal');
  });

  it('plays back a data flow step-by-step and reports active step payload', () => {
    let state = createFlowPlayback(dataPipelineFlow);
    state = playFlow(state);
    expect(state.isPlaying).toBe(true);
    expect(state.flowType).toBe('data_flow');

    // Step 0 context
    let info = getDataFlowPlaybackStepInfo(dataPipelineFlow, state);
    expect(info).not.toBeNull();
    expect(info?.stepIndex).toBe(0);
    expect(info?.stepNumber).toBe(1);
    expect(info?.dataElements).toEqual(['CardToken', 'Amount']);
    expect(info?.stepClassification).toBe('pci');
    expect(info?.transformation).toBe('Client encrypts with public key');

    // Advance to Step 1
    state = nextFlowStep(state);
    info = getDataFlowPlaybackStepInfo(dataPipelineFlow, state);
    expect(info?.stepIndex).toBe(1);
    expect(info?.stepNumber).toBe(2);
    expect(info?.dataElements).toContain('LedgerSequence');
    expect(info?.stepClassification).toBe('confidential');

    // Advance to Step 2
    state = nextFlowStep(state);
    info = getDataFlowPlaybackStepInfo(dataPipelineFlow, state);
    expect(info?.stepIndex).toBe(2);
    expect(info?.stepNumber).toBe(3);
    expect(info?.dataElements).toEqual(['Amount', 'Timestamp']);
    expect(info?.stepClassification).toBe('internal');
  });

  it('feeds data lineage and tracks external exit points (feeds F091)', () => {
    // Extract complete lineage trace
    const lineage = extractDataLineage(dataPipelineFlow, model.connections, {
      externalObjectIds: [analyticsWarehouseId],
    });

    expect(lineage.flowId).toBe(dataPipelineFlow.id);
    expect(lineage.hops).toHaveLength(3);
    expect(lineage.hops[0]?.sourceObjectId).toBe(browserId);
    expect(lineage.hops[0]?.targetObjectId).toBe(ingestApiId);
    expect(lineage.hops[2]?.targetObjectId).toBe(analyticsWarehouseId);

    // Answers "where does <data> leave our infrastructure?"
    expect(lineage.exits).toHaveLength(1);
    expect(lineage.exits[0]?.exitObjectId).toBe(analyticsWarehouseId);
    expect(lineage.exits[0]?.dataElements).toEqual(['Amount', 'Timestamp']);
    expect(lineage.exits[0]?.dataClassification).toBe('internal');

    // Trace sensitive element 'CardToken'
    const cardTokenTrace = extractDataLineage(dataPipelineFlow, model.connections, {
      searchedElement: 'CardToken',
      externalObjectIds: [analyticsWarehouseId],
    });

    expect(cardTokenTrace.hops).toHaveLength(2); // Only hops 0 and 1 carry CardToken
    expect(cardTokenTrace.exits).toHaveLength(0); // CardToken never leaves to Snowflake!
  });

  it('projects data flow onto canvas with data classification and transformation badges', () => {
    const state = createFlowPlayback(dataPipelineFlow);
    const projection = projectFlowToCanvas(
      model.objects,
      model.connections,
      dataPipelineFlow,
      undefined,
      { activeStepIndex: state.currentStepIndex },
    );

    expect(projection.flowMetadata.flowType).toBe('data_flow');
    expect(projection.flowMetadata.dataClassification).toBe('pci');
    expect(projection.flowMetadata.activeDataElements).toEqual(['CardToken', 'Amount']);
    expect(projection.flowMetadata.activeTransformation).toBe(
      'Client encrypts with public key',
    );

    const activeEdge = projection.edges.find((e) => e.id === conn1Id);
    expect(activeEdge?.data?.isActiveStep).toBe(true);
    expect(activeEdge?.data?.dataElements).toEqual(['CardToken', 'Amount']);
    expect(activeEdge?.data?.dataClassification).toBe('pci');
    expect(activeEdge?.data?.transformation).toBe('Client encrypts with public key');
  });

  it('renders data flow details inside DataFlowOverlay component', () => {
    let state = createFlowPlayback(dataPipelineFlow);
    state = playFlow(state);
    const info = getDataFlowPlaybackStepInfo(dataPipelineFlow, state);

    const html = renderToString(<DataFlowOverlay dataFlowInfo={info} />);
    expect(html).toContain('data-testid="data-flow-overlay"');
    expect(html).toContain('Cardholder Ledger Pipeline');
    expect(html).toContain('data-testid="data-flow-classification"');
    expect(html).toContain('pci');
    expect(html).toContain('Step 1 of 3');
    expect(html).toContain('CardToken');
    expect(html).toContain('Client encrypts with public key');
  });
});
