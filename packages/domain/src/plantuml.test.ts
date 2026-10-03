import { describe, it, expect } from 'vitest';
import {
  toPlantUmlId,
  sanitizePlantUmlText,
  exportViewToPlantUml,
  exportViewToPlantUmlResult,
  exportFlowToPlantUmlSequence,
  importPlantUml,
} from './plantuml';
import { createId } from './ids';
import type {
  ArchitectureModel,
  View,
  FlowWithSteps,
  ArchitectureId,
  VersionId,
  WorkspaceId,
  ObjectId,
  ConnectionId,
  ViewId,
  FlowId,
} from './types';

describe('PlantUML Export & Import Engine (F098)', () => {
  const archId = createId('arch') as ArchitectureId;
  const verId = createId('ver') as VersionId;
  const wsId = createId('ws') as unknown as WorkspaceId;

  const coreSystemId = createId('sys') as ObjectId;
  const webAppId = createId('app') as ObjectId;
  const authDbId = createId('sto') as ObjectId;
  const customerActorId = createId('act') as ObjectId;

  const mockModel: ArchitectureModel = {
    architecture: {
      id: archId,
      workspaceId: wsId,
      name: 'OmniBank Cloud',
      description: 'Global banking core.',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    version: {
      id: verId,
      architectureId: archId,
      name: 'v1.0.0',
      kind: 'main',
      status: 'approved',
      createdAt: new Date(),
    },
    objects: [
      {
        id: customerActorId,
        architectureId: archId,
        versionId: verId,
        kind: 'actor',
        name: 'Personal Banking Customer',
        description: 'Retail customer using mobile and web.',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: coreSystemId,
        architectureId: archId,
        versionId: verId,
        kind: 'system',
        name: 'OmniBank Banking Core',
        description: 'Main banking transaction system.',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: webAppId,
        architectureId: archId,
        versionId: verId,
        parentId: coreSystemId,
        kind: 'application',
        name: 'Internet Banking Web App',
        description: 'SPA delivered over CDN.',
        metadata: { technology: 'React / Next.js' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: authDbId,
        architectureId: archId,
        versionId: verId,
        parentId: coreSystemId,
        kind: 'store',
        name: 'Accounts Database',
        description: 'Stores customer balances.',
        metadata: { technology: 'PostgreSQL 16' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    connections: [
      {
        id: createId('con') as ConnectionId,
        architectureId: archId,
        versionId: verId,
        sourceObjectId: customerActorId,
        targetObjectId: coreSystemId,
        kind: 'sync',
        label: 'Uses online banking',
        metadata: { protocol: 'HTTPS' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: createId('con') as ConnectionId,
        architectureId: archId,
        versionId: verId,
        sourceObjectId: webAppId,
        targetObjectId: authDbId,
        kind: 'sync',
        label: 'Queries balances',
        metadata: { technology: 'SQL/TCP' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };

  const contextView: View = {
    id: createId('vw') as ViewId,
    architectureId: archId,
    name: 'System Context View',
    kind: 'context',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const containerView: View = {
    id: createId('vw') as ViewId,
    architectureId: archId,
    name: 'Container Architecture View',
    kind: 'container',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('Identifier & Text Sanitization', () => {
    it('sanitizes plantuml identifiers safely', () => {
      expect(toPlantUmlId('obj-customer-123')).toBe('obj_customer_123');
      expect(toPlantUmlId('999_start_with_number')).toBe('id_999_start_with_number');
      expect(toPlantUmlId('')).toBe('id_unknown');
    });

    it('sanitizes label and description text with quotes and newlines', () => {
      expect(sanitizePlantUmlText('Title "with quotes" and\nline breaks')).toBe("Title 'with quotes' and\\nline breaks");
      expect(sanitizePlantUmlText(null)).toBe('');
    });
  });

  describe('C4-PlantUML Export', () => {
    it('exports System Context view into C4-PlantUML format', () => {
      const puml = exportViewToPlantUml(contextView, mockModel, {
        c4Mode: true,
        direction: 'top to bottom',
        includeLegend: true,
      });

      expect(puml).toContain('@startuml');
      expect(puml).toContain('!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml');
      expect(puml).toContain('LAYOUT_TOP_DOWN()');
      expect(puml).toContain('Person(');
      expect(puml).toContain('Personal Banking Customer');
      expect(puml).toContain('System(');
      expect(puml).toContain('OmniBank Banking Core');
      expect(puml).toContain('Rel(');
      expect(puml).toContain('Uses online banking');
      expect(puml).toContain('SHOW_LEGEND()');
      expect(puml).toContain('@enduml');
    });

    it('exports Container view with boundaries and ContainerDb macros', () => {
      const puml = exportViewToPlantUml(containerView, mockModel, {
        c4Mode: true,
        direction: 'left to right',
      });

      expect(puml).toContain('!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml');
      expect(puml).toContain('LAYOUT_LEFT_RIGHT()');
      expect(puml).toContain('System_Boundary(');
      expect(puml).toContain('Container(');
      expect(puml).toContain('Internet Banking Web App');
      expect(puml).toContain('ContainerDb(');
      expect(puml).toContain('Accounts Database');
      expect(puml).toContain('PostgreSQL 16');
      expect(puml).toContain('Rel(');
    });

    it('exports structured PlantUmlExportResult with metrics', () => {
      const res = exportViewToPlantUmlResult(containerView, mockModel, { c4Mode: true });
      expect(res.diagramType).toBe('c4');
      expect(res.nodeCount).toBe(2);
      expect(res.edgeCount).toBe(1);
      expect(res.script).toContain('@startuml');
    });

    it('exports Native PlantUML component diagram when c4Mode is false', () => {
      const puml = exportViewToPlantUml(containerView, mockModel, {
        c4Mode: false,
      });

      expect(puml).toContain('@startuml');
      expect(puml).not.toContain('!include');
      expect(puml).toContain('component [Internet Banking Web App');
      expect(puml).toContain('database "Accounts Database');
      expect(puml).toContain('-->');
      expect(puml).toContain('@enduml');
    });
  });

  describe('Sequence Diagram Export', () => {
    it('exports execution flow with steps into PlantUML sequence diagram', () => {
      const flowId = createId('flw') as FlowId;
      const conn = mockModel.connections[1];

      const flow: FlowWithSteps = {
        id: flowId,
        architectureId: archId,
        name: 'Account Balance Inquiry Flow',
        description: 'Customer requests account balance.',
        type: 'sequence',
        httpMethod: 'GET',
        endpoint: '/api/v1/balances',
        statusCode: '200 OK',
        createdAt: new Date(),
        updatedAt: new Date(),
        steps: [
          {
            id: 'step_1',
            flowId,
            connectionId: conn.id,
            stepIndex: 0,
            httpMethod: 'GET',
            endpoint: '/api/v1/balances',
            note: 'Fetches cached balances',
          },
        ],
      };

      const res = exportFlowToPlantUmlSequence(flow, mockModel, {
        autonumber: true,
        includeNotes: true,
      });

      expect(res.diagramType).toBe('sequence');
      expect(res.nodeCount).toBe(2);
      expect(res.edgeCount).toBe(1);
      expect(res.script).toContain('@startuml');
      expect(res.script).toContain('autonumber');
      expect(res.script).toContain('participant "Internet Banking Web App"');
      expect(res.script).toContain('database "Accounts Database"');
      expect(res.script).toContain('GET /api/v1/balances');
      expect(res.script).toContain('note over');
      expect(res.script).toContain('Fetches cached balances');
      expect(res.script).toContain('200 OK');
      expect(res.script).toContain('@enduml');
    });
  });

  describe('PlantUML Importer', () => {
    it('imports C4-PlantUML script with Person, System, Container, ContainerDb, and Rel', () => {
      const pumlScript = `@startuml
title Sample C4 Import
Person(customer, "Customer", "Bank client")
System(bankingApp, "Banking App", "Core mobile app")
ContainerDb(db, "Customer DB", "PostgreSQL", "Stores customer records")
Rel(customer, bankingApp, "Views statements", "HTTPS")
Rel(bankingApp, db, "Reads transactions", "JDBC")
@enduml`;

      const result = importPlantUml(pumlScript, archId, verId);
      expect(result.success).toBe(true);
      expect(result.diagramType).toBe('c4');
      expect(result.objects.length).toBe(3);
      expect(result.connections.length).toBe(2);

      const customerObj = result.objects.find((o) => o.name === 'Customer');
      expect(customerObj).toBeDefined();
      expect(customerObj?.kind).toBe('actor');

      const dbObj = result.objects.find((o) => o.name === 'Customer DB');
      expect(dbObj).toBeDefined();
      expect(dbObj?.kind).toBe('store');
      expect(dbObj?.metadata?.technology).toBe('PostgreSQL');

      const rel = result.connections.find((c) => c.label === 'Views statements');
      expect(rel).toBeDefined();
    });

    it('imports Native PlantUML component diagram', () => {
      const nativeScript = `@startuml
actor "Shopper" as shopper
component [Storefront Web] as web
database "Orders DB" as db
shopper --> web : browses catalog
web --> db : writes order
@enduml`;

      const result = importPlantUml(nativeScript, archId, verId);
      expect(result.success).toBe(true);
      expect(result.objects.length).toBe(3);
      expect(result.connections.length).toBe(2);

      const shopperObj = result.objects.find((o) => o.name === 'Shopper');
      expect(shopperObj?.kind).toBe('actor');

      const dbObj = result.objects.find((o) => o.name === 'Orders DB');
      expect(dbObj?.kind).toBe('store');
    });

    it('imports PlantUML sequence diagram into flow and participants', () => {
      const seqScript = `@startuml
autonumber
actor "Client" as client
participant "API Gateway" as api
database "Vault" as vault
client -> api : Login Request
api -> vault : Validate Token
note over vault : Decrypts token
vault --> api : 200 OK
api --> client : Auth Granted
@enduml`;

      const result = importPlantUml(seqScript, archId, verId, 'Imported Auth Flow');
      expect(result.success).toBe(true);
      expect(result.diagramType).toBe('sequence');
      expect(result.objects.length).toBe(3);
      expect(result.flow).toBeDefined();
      expect(result.flow?.steps.length).toBe(4);
      expect(result.flow?.steps[1]?.note).toBe('Decrypts token');
    });

    it('returns error when empty script is provided', () => {
      const result = importPlantUml('  ', archId, verId);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Empty PlantUML script provided.');
    });
  });
});
