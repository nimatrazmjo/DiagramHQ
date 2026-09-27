import { describe, it, expect } from 'vitest';
import {
  listTemplates,
  getTemplate,
  getTemplatesByCategory,
  instantiateTemplate,
} from './architecture-template';
import type { TemplateId } from './architecture-template';
import type { ArchitectureId, ConnectionId, ObjectId, VersionId } from './ids';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ARCH_ID = 'arch_test' as ArchitectureId;
const VER_ID  = 'ver_test'  as VersionId;
const NOW     = new Date('2026-01-01T00:00:00Z');

// ─── Registry tests ───────────────────────────────────────────────────────────

describe('Architecture Template Registry', () => {
  it('listTemplates returns all 13 templates', () => {
    const templates = listTemplates();
    expect(templates).toHaveLength(13);
  });

  it('all required template IDs are present', () => {
    const ids = listTemplates().map((t) => t.id).sort();
    expect(ids).toEqual(
      [
        'aws',
        'azure',
        'data-platform',
        'ecommerce',
        'event-driven',
        'fintech',
        'gcp',
        'healthcare',
        'kubernetes',
        'microservices',
        'monolith',
        'saas',
        'serverless',
      ],
    );
  });

  it('getTemplate returns the correct template', () => {
    const tmpl = getTemplate('saas');
    expect(tmpl).toBeDefined();
    expect(tmpl!.id).toBe('saas');
    expect(tmpl!.name).toBe('SaaS');
  });

  it('getTemplate returns undefined for an unknown id', () => {
    expect(getTemplate('unknown' as TemplateId)).toBeUndefined();
  });

  it('getTemplatesByCategory returns only pattern templates', () => {
    const patterns = getTemplatesByCategory('patterns');
    const ids = patterns.map((t) => t.id).sort();
    expect(ids).toEqual([
      'ecommerce',
      'event-driven',
      'fintech',
      'healthcare',
      'microservices',
      'monolith',
      'saas',
      'serverless',
    ]);
  });

  it('getTemplatesByCategory returns the data template', () => {
    const data = getTemplatesByCategory('data');
    expect(data.map((t) => t.id)).toEqual(['data-platform']);
  });

  it('getTemplatesByCategory returns cloud templates', () => {
    const cloud = getTemplatesByCategory('cloud');
    expect(cloud.map((t) => t.id).sort()).toEqual(['aws', 'azure', 'gcp']);
  });

  it('every template has at least 2 objects and 1 connection', () => {
    for (const tmpl of listTemplates()) {
      expect(tmpl.objects.length, `${tmpl.id} objects`).toBeGreaterThanOrEqual(2);
      expect(tmpl.connections.length, `${tmpl.id} connections`).toBeGreaterThanOrEqual(1);
    }
  });

  it('every template connection refs resolve to object refs', () => {
    for (const tmpl of listTemplates()) {
      const refs = new Set(tmpl.objects.map((o) => o.ref));
      for (const conn of tmpl.connections) {
        expect(refs.has(conn.sourceRef), `${tmpl.id}: sourceRef '${conn.sourceRef}'`).toBe(true);
        expect(refs.has(conn.targetRef), `${tmpl.id}: targetRef '${conn.targetRef}'`).toBe(true);
      }
    }
  });
});

// ─── Instantiation tests ──────────────────────────────────────────────────────

describe('instantiateTemplate', () => {
  it('instantiate saas → expected objects/connections created', () => {
    let objN = 0;
    let conN = 0;
    const result = instantiateTemplate({
      templateId: 'saas',
      architectureId: ARCH_ID,
      versionId: VER_ID,
      createObjectId: () => `sys_${++objN}` as ObjectId,
      createConnectionId: () => `con_${++conN}` as ConnectionId,
      now: NOW,
    });

    const tmpl = getTemplate('saas')!;
    expect(result.objects).toHaveLength(tmpl.objects.length);
    expect(result.connections).toHaveLength(tmpl.connections.length);

    // Every object has the correct architecture + version IDs
    for (const obj of result.objects) {
      expect(obj.architectureId).toBe(ARCH_ID);
      expect(obj.versionId).toBe(VER_ID);
      expect(obj.createdAt).toEqual(NOW);
    }

    // Every connection references an object that exists in the result set
    const objectIds = new Set(result.objects.map((o) => o.id));
    for (const conn of result.connections) {
      expect(objectIds.has(conn.sourceObjectId)).toBe(true);
      expect(objectIds.has(conn.targetObjectId)).toBe(true);
      expect(conn.architectureId).toBe(ARCH_ID);
      expect(conn.versionId).toBe(VER_ID);
    }

    // Spot-check: one expected object name is present
    expect(result.objects.some((o) => o.name === 'API Gateway')).toBe(true);
    // Spot-check: one expected connection label is present
    expect(result.connections.some((c) => c.label === 'REST/GraphQL')).toBe(true);
  });

  it('instantiate every template without throwing', () => {
    for (const tmpl of listTemplates()) {
      let objN = 0;
      let conN = 0;
      expect(() =>
        instantiateTemplate({
          templateId: tmpl.id,
          architectureId: ARCH_ID,
          versionId: VER_ID,
          createObjectId: () => `sys_${++objN}` as ObjectId,
          createConnectionId: () => `con_${++conN}` as ConnectionId,
          now: NOW,
        }),
      ).not.toThrow();
    }
  });

  it('instantiated objects have no shared IDs across calls', () => {
    // Two separate instantiations of the same template should produce different IDs.
    let n = 0;
    const mkObj = () => `sys_${++n}` as ObjectId;
    const mkCon = () => `con_${++n}` as ConnectionId;

    const r1 = instantiateTemplate({
      templateId: 'microservices',
      architectureId: ARCH_ID,
      versionId: VER_ID,
      createObjectId: mkObj,
      createConnectionId: mkCon,
      now: NOW,
    });
    const r2 = instantiateTemplate({
      templateId: 'microservices',
      architectureId: ARCH_ID,
      versionId: VER_ID,
      createObjectId: mkObj,
      createConnectionId: mkCon,
      now: NOW,
    });

    const ids1 = new Set(r1.objects.map((o) => o.id));
    const ids2 = new Set(r2.objects.map((o) => o.id));
    // No overlap between the two sets
    for (const id of ids2) {
      expect(ids1.has(id)).toBe(false);
    }
  });

  it('throws on unknown template id', () => {
    expect(() =>
      instantiateTemplate({
        templateId: 'nonexistent' as TemplateId,
        architectureId: ARCH_ID,
        versionId: VER_ID,
        createObjectId: () => 'sys_x' as ObjectId,
        createConnectionId: () => 'con_x' as ConnectionId,
      }),
    ).toThrow("Unknown architecture template: 'nonexistent'");
  });

  it('instantiate kubernetes → objects match template count', () => {
    let objN = 0;
    let conN = 0;
    const result = instantiateTemplate({
      templateId: 'kubernetes',
      architectureId: ARCH_ID,
      versionId: VER_ID,
      createObjectId: () => `sys_${++objN}` as ObjectId,
      createConnectionId: () => `con_${++conN}` as ConnectionId,
      now: NOW,
    });
    const tmpl = getTemplate('kubernetes')!;
    expect(result.objects).toHaveLength(tmpl.objects.length);
    expect(result.connections).toHaveLength(tmpl.connections.length);
  });
});
