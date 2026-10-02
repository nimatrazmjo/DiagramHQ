import { describe, expect, it } from 'vitest';
import {
  annotateDataFlowStep,
  createDataFlow,
  extractDataLineage,
  type CreateFlowStepInput,
} from './flow';
import {
  createFlowPlayback,
  getDataFlowPlaybackStepInfo,
  nextFlowStep,
  playFlow,
  seekFlowStep,
} from './flow-playback';
import { projectFlowToCanvas } from './flow-view';
import type { ArchitectureId, ConnectionId, FlowId, ObjectId, VersionId } from './ids';
import type { ModelConnection, ModelObject } from './types';

describe('F046 — Data flows & Data Lineage (Domain)', () => {
  const architectureId = 'arch_fintech' as ArchitectureId;
  const versionId = 'ver_1' as VersionId;

  const webClientId = 'obj_web_client' as ObjectId;
  const checkoutSvcId = 'obj_checkout_svc' as ObjectId;
  const paymentGatewayId = 'obj_payment_gateway' as ObjectId;
  const stripeExternalId = 'obj_stripe_ext' as ObjectId;

  const mockObjects: ModelObject[] = [
    {
      id: webClientId,
      architectureId,
      name: 'Web Browser Client',
      kind: 'application',
      versionId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: checkoutSvcId,
      architectureId,
      name: 'Checkout Microservice',
      kind: 'application',
      versionId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: paymentGatewayId,
      architectureId,
      name: 'Payment Gateway',
      kind: 'application',
      versionId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: stripeExternalId,
      architectureId,
      name: 'Stripe API (Third Party)',
      kind: 'system',
      versionId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const conn1: ModelConnection = {
    id: 'conn_client_to_checkout' as ConnectionId,
    architectureId,
    sourceObjectId: webClientId,
    targetObjectId: checkoutSvcId,
    label: 'POST /checkout',
    kind: 'data',
    versionId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const conn2: ModelConnection = {
    id: 'conn_checkout_to_payment' as ConnectionId,
    architectureId,
    sourceObjectId: checkoutSvcId,
    targetObjectId: paymentGatewayId,
    label: 'gRPC / AuthorizePayment',
    kind: 'data',
    versionId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const conn3: ModelConnection = {
    id: 'conn_payment_to_stripe' as ConnectionId,
    architectureId,
    sourceObjectId: paymentGatewayId,
    targetObjectId: stripeExternalId,
    label: 'HTTPS / v1/charges',
    kind: 'data',
    versionId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockConnections: ModelConnection[] = [conn1, conn2, conn3];

  it('creates a data flow with classification, payload schema, and step transformations', () => {
    const steps: CreateFlowStepInput[] = [
      {
        connectionId: conn1.id,
        note: 'Customer submits credit card and billing details',
        dataElements: ['UserEmail', 'RawCreditCard', 'BillingAddress'],
        dataClassification: 'pci',
        transformation: 'Plaintext ingress from browser',
      },
      {
        connectionId: conn2.id,
        note: 'Checkout microservice tokenizes payment details',
        dataElements: ['PaymentToken', 'OrderTotal', 'UserEmail'],
        dataClassification: 'confidential',
        transformation: 'Tokenizes PAN, creates single-use payment token',
      },
      {
        connectionId: conn3.id,
        note: 'Dispatches charge to third-party processor',
        dataElements: ['PaymentToken', 'OrderTotal'],
        dataClassification: 'restricted',
        transformation: 'Payload encrypted via TLS 1.3 to external provider',
      },
    ];

    const flow = createDataFlow(
      {
        id: 'flw_payment_pipeline' as FlowId,
        architectureId,
        name: 'Payment Tokenization Pipeline',
        description: 'End-to-end data flow for cardholder authorization',
        dataClassification: 'pci',
        dataElements: ['UserEmail', 'RawCreditCard', 'PaymentToken', 'OrderTotal'],
        steps,
      },
      mockConnections,
    );

    expect(flow.id).toBe('flw_payment_pipeline');
    expect(flow.type).toBe('data_flow');
    expect(flow.dataClassification).toBe('pci');
    expect(flow.dataElements).toContain('RawCreditCard');
    expect(flow.steps).toHaveLength(3);
    expect(flow.steps[0]?.dataClassification).toBe('pci');
    expect(flow.steps[1]?.transformation).toBe(
      'Tokenizes PAN, creates single-use payment token',
    );
  });

  it('annotates a data flow step with updated data elements and transformation', () => {
    const flow = createDataFlow(
      {
        architectureId,
        name: 'Telemetry Ingest Data Flow',
        dataClassification: 'internal',
        steps: [{ connectionId: conn1.id, note: 'Initial ingest' }],
      },
      mockConnections,
    );

    const annotated = annotateDataFlowStep(flow, 0, {
      note: 'Sanitized ingress',
      dataElements: ['SessionId', 'AnonymizedIP'],
      transformation: 'Hashes IP address with salt',
      dataClassification: 'internal',
    });

    expect(annotated.steps[0]?.note).toBe('Sanitized ingress');
    expect(annotated.steps[0]?.dataElements).toEqual(['SessionId', 'AnonymizedIP']);
    expect(annotated.steps[0]?.transformation).toBe('Hashes IP address with salt');
    expect(annotated.steps[0]?.dataClassification).toBe('internal');
  });

  it('plays back a data flow step-by-step with structured step payload info', () => {
    const flow = createDataFlow(
      {
        architectureId,
        name: 'Audit Log Stream',
        dataClassification: 'internal',
        steps: [
          {
            connectionId: conn1.id,
            dataElements: ['AuditEvent'],
            transformation: 'Emits audit log event',
          },
          {
            connectionId: conn2.id,
            dataElements: ['AuditEvent', 'Signature'],
            transformation: 'Cryptographically signs log batch',
          },
        ],
      },
      mockConnections,
    );

    let state = createFlowPlayback(flow);
    state = playFlow(state);
    expect(state.flowType).toBe('data_flow');

    // Step 0 check
    const step0Info = getDataFlowPlaybackStepInfo(flow, state);
    expect(step0Info).not.toBeNull();
    expect(step0Info?.flowType).toBe('data_flow');
    expect(step0Info?.stepNumber).toBe(1);
    expect(step0Info?.dataElements).toEqual(['AuditEvent']);
    expect(step0Info?.transformation).toBe('Emits audit log event');

    // Step 1 check
    state = nextFlowStep(state);
    const step1Info = getDataFlowPlaybackStepInfo(flow, state);
    expect(step1Info?.stepNumber).toBe(2);
    expect(step1Info?.dataElements).toEqual(['AuditEvent', 'Signature']);
    expect(step1Info?.transformation).toBe('Cryptographically signs log batch');

    // Seek back
    state = seekFlowStep(state, 0);
    const seekInfo = getDataFlowPlaybackStepInfo(flow, state);
    expect(seekInfo?.stepNumber).toBe(1);
    expect(seekInfo?.dataElements).toEqual(['AuditEvent']);
  });

  it('extracts complete data lineage trace and detects external egress points (feeds F091)', () => {
    const flow = createDataFlow(
      {
        architectureId,
        name: 'Credit Card Billing Flow',
        dataClassification: 'pci',
        steps: [
          {
            connectionId: conn1.id,
            dataElements: ['RawCreditCard', 'UserEmail'],
            dataClassification: 'pci',
          },
          {
            connectionId: conn2.id,
            dataElements: ['PaymentToken', 'OrderTotal'],
            transformation: 'Tokenization',
            dataClassification: 'confidential',
          },
          {
            connectionId: conn3.id,
            dataElements: ['PaymentToken', 'OrderTotal'],
            transformation: 'Dispatch to Stripe',
            dataClassification: 'restricted',
          },
        ],
      },
      mockConnections,
    );

    // Full lineage trace
    const fullLineage = extractDataLineage(flow, mockConnections, {
      externalObjectIds: [stripeExternalId],
    });

    expect(fullLineage.hops).toHaveLength(3);
    expect(fullLineage.hops[0]?.sourceObjectId).toBe(webClientId);
    expect(fullLineage.hops[0]?.targetObjectId).toBe(checkoutSvcId);
    expect(fullLineage.hops[2]?.targetObjectId).toBe(stripeExternalId);

    // Egress detection: answers "where does <data> leave our infrastructure?"
    expect(fullLineage.exits).toHaveLength(1);
    expect(fullLineage.exits[0]?.exitObjectId).toBe(stripeExternalId);
    expect(fullLineage.exits[0]?.connectionId).toBe(conn3.id);
    expect(fullLineage.exits[0]?.dataElements).toEqual(['PaymentToken', 'OrderTotal']);

    // Filtered lineage query: trace specific data element 'RawCreditCard'
    const pciTrace = extractDataLineage(flow, mockConnections, {
      searchedElement: 'RawCreditCard',
      externalObjectIds: [stripeExternalId],
    });

    expect(pciTrace.hops).toHaveLength(1);
    expect(pciTrace.hops[0]?.dataElements).toContain('RawCreditCard');
    // RawCreditCard never leaves infrastructure!
    expect(pciTrace.exits).toHaveLength(0);
  });

  it('projects data flow onto canvas with data classification and transformation badges', () => {
    const flow = createDataFlow(
      {
        architectureId,
        name: 'Data Pipeline Canvas View',
        dataClassification: 'pci',
        steps: [
          {
            connectionId: conn1.id,
            dataElements: ['RawCreditCard'],
            transformation: 'Browser submission',
            dataClassification: 'pci',
          },
        ],
      },
      mockConnections,
    );

    const projected = projectFlowToCanvas(
      mockObjects,
      mockConnections,
      flow,
      undefined,
      { activeStepIndex: 0 },
    );

    expect(projected.flowMetadata.flowType).toBe('data_flow');
    expect(projected.flowMetadata.dataClassification).toBe('pci');
    expect(projected.flowMetadata.activeDataElements).toEqual(['RawCreditCard']);
    expect(projected.flowMetadata.activeTransformation).toBe('Browser submission');

    const edge = projected.edges.find((e) => e.id === conn1.id);
    expect(edge).toBeDefined();
    expect(edge?.data?.dataElements).toEqual(['RawCreditCard']);
    expect(edge?.data?.transformation).toBe('Browser submission');
    expect(edge?.data?.dataClassification).toBe('pci');
  });
});
