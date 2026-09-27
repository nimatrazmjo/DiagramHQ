/**
 * F135 — Architecture templates — integration spec.
 *
 * Tests the full instantiation pipeline: template → ModelObjects + ModelConnections
 * in the context of an ArchitectureModel, verifying the acceptance criteria:
 *   - Templates: SaaS, e-commerce, fintech, healthcare, microservices, monolith,
 *     serverless, event-driven, data-platform, Kubernetes, AWS, Azure, GCP.
 *   - Instantiate a template into a new architecture.
 *   - Test: instantiate a template → expected objects/connections created.
 */
import { describe, it, expect } from 'vitest';
import {
  createId,
  listTemplates,
  getTemplate,
  instantiateTemplate,
  createArchitectureModel,
  addModelObject,
  addModelConnection,
  validateArchitectureModel,
  type Architecture,
  type Version,
  type ArchitectureId,
  type VersionId,
  type WorkspaceId,
  type ObjectId,
  type ConnectionId,
  type TemplateId,
} from '@diagramhq/domain';

// ─── Test fixtures ─────────────────────────────────────────────────────────────

const archId = createId('arch') as ArchitectureId;
const wsId   = createId('ws')   as WorkspaceId;
const verId  = createId('ver')  as VersionId;
const NOW    = new Date('2026-01-01T00:00:00Z');

const arch: Architecture = {
  id:          archId,
  workspaceId: wsId,
  name:        'Template Instantiation Test',
  createdAt:   NOW,
  updatedAt:   NOW,
};

const ver: Version = {
  id:             verId,
  architectureId: archId,
  name:           'main',
  kind:           'main',
  status:         'approved',
  createdAt:      NOW,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeInstantiateParams(templateId: TemplateId) {
  return {
    templateId,
    architectureId: archId,
    versionId: verId,
    createObjectId: () => createId('sys') as unknown as ObjectId,
    createConnectionId: () => createId('con') as ConnectionId,
    now: NOW,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Architecture Templates (F135)', () => {
  describe('All 13 required templates exist', () => {
    const requiredIds = [
      'saas', 'ecommerce', 'fintech', 'healthcare',
      'microservices', 'monolith', 'serverless', 'event-driven',
      'data-platform', 'kubernetes', 'aws', 'azure', 'gcp',
    ] as const;

    it('listTemplates returns exactly 13 templates', () => {
      expect(listTemplates()).toHaveLength(13);
    });

    for (const id of requiredIds) {
      it(`template '${id}' is registered`, () => {
        expect(getTemplate(id as TemplateId)).toBeDefined();
      });
    }
  });

  describe('instantiate a template → expected objects/connections created', () => {
    it('instantiating SaaS produces correct objects and connections', () => {
      const result = instantiateTemplate(makeInstantiateParams('saas'));

      const tmpl = getTemplate('saas')!;
      // Object count matches template definition
      expect(result.objects).toHaveLength(tmpl.objects.length);
      // Connection count matches template definition
      expect(result.connections).toHaveLength(tmpl.connections.length);

      // All objects are bound to the correct architecture and version
      for (const obj of result.objects) {
        expect(obj.architectureId).toBe(archId);
        expect(obj.versionId).toBe(verId);
      }

      // All connections reference objects that exist in the result
      const objIds = new Set(result.objects.map((o) => o.id));
      for (const conn of result.connections) {
        expect(objIds.has(conn.sourceObjectId)).toBe(true);
        expect(objIds.has(conn.targetObjectId)).toBe(true);
        expect(conn.architectureId).toBe(archId);
        expect(conn.versionId).toBe(verId);
      }

      // Spot-checks on expected content
      expect(result.objects.some((o) => o.name === 'API Gateway')).toBe(true);
      expect(result.connections.some((c) => c.label === 'REST/GraphQL')).toBe(true);
    });

    it('instantiated objects+connections can be added to an ArchitectureModel without invariant violations', () => {
      const result = instantiateTemplate(makeInstantiateParams('microservices'));

      let model = createArchitectureModel(arch, ver, [], []);

      // Add all objects first
      for (const obj of result.objects) {
        model = addModelObject(model, obj);
      }
      // Then add all connections
      for (const conn of result.connections) {
        model = addModelConnection(model, conn);
      }

      const validation = validateArchitectureModel(model);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('every template instantiates cleanly and validates', () => {
      for (const tmpl of listTemplates()) {
        const result = instantiateTemplate(makeInstantiateParams(tmpl.id as TemplateId));

        let model = createArchitectureModel(arch, ver, [], []);
        for (const obj of result.objects) {
          model = addModelObject(model, obj);
        }
        for (const conn of result.connections) {
          model = addModelConnection(model, conn);
        }

        const validation = validateArchitectureModel(model);
        expect(validation.valid, `${tmpl.id}: ${validation.errors.join(', ')}`).toBe(true);
      }
    });

    it('two instantiations of the same template produce disjoint object ID sets', () => {
      const r1 = instantiateTemplate(makeInstantiateParams('aws'));
      const r2 = instantiateTemplate(makeInstantiateParams('aws'));

      const ids1 = new Set(r1.objects.map((o) => o.id));
      const ids2 = new Set(r2.objects.map((o) => o.id));
      for (const id of ids2) {
        expect(ids1.has(id), `duplicate object id: ${id}`).toBe(false);
      }
    });

    it('instantiating a template does not mutate the template definition', () => {
      const tmpl = getTemplate('kubernetes')!;
      const originalObjectCount = tmpl.objects.length;
      const originalConnectionCount = tmpl.connections.length;

      instantiateTemplate(makeInstantiateParams('kubernetes'));

      expect(getTemplate('kubernetes')!.objects).toHaveLength(originalObjectCount);
      expect(getTemplate('kubernetes')!.connections).toHaveLength(originalConnectionCount);
    });
  });
});
