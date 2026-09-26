import { describe, it, expect } from 'vitest';
import {
  createId,
  createSystem,
  isExternalSystem,
  isInternalSystem,
  isSystem,
  projectSystemToCanvas,
  type ModelObject,
} from './';

describe('System Domain Module (F023)', () => {
  const archId = createId('arch');
  const verId = createId('ver');

  it('creates an internal System with domain, systemType, and criticality', () => {
    const system = createSystem(archId, verId, 'Core Banking Ledger', {
      domain: 'Core Banking',
      systemType: 'Financial Ledger',
      critical: true,
      description: 'Records all double-entry ledger transactions',
    });

    expect(system.id.startsWith('sys_')).toBe(true);
    expect(system.kind).toBe('system');
    expect(system.name).toBe('Core Banking Ledger');
    expect(system.description).toBe('Records all double-entry ledger transactions');
    expect(system.metadata?.domain).toBe('Core Banking');
    expect(system.metadata?.systemType).toBe('Financial Ledger');
    expect(system.metadata?.critical).toBe(true);
    expect(system.metadata?.external).toBe(false);
    expect(system.metadata?.c4Level).toBe(1);
    expect(isSystem(system)).toBe(true);
    expect(isInternalSystem(system)).toBe(true);
    expect(isExternalSystem(system)).toBe(false);
  });

  it('creates an external Software System (third-party / SaaS provider)', () => {
    const externalSystem = createSystem(archId, verId, 'Twilio SMS Gateway', {
      external: true,
      domain: 'Telecommunications',
      systemType: 'External SaaS',
      description: 'Dispatches 2FA one-time passwords via SMS',
    });

    expect(externalSystem.id.startsWith('sys_')).toBe(true);
    expect(externalSystem.kind).toBe('system');
    expect(externalSystem.metadata?.external).toBe(true);
    expect(externalSystem.metadata?.c4Kind).toBe('external_system');
    expect(isSystem(externalSystem)).toBe(true);
    expect(isExternalSystem(externalSystem)).toBe(true);
    expect(isInternalSystem(externalSystem)).toBe(false);
  });

  it('correctly discriminates non-system model objects', () => {
    const actor: ModelObject = {
      id: createId('act'),
      architectureId: archId,
      versionId: verId,
      kind: 'actor',
      name: 'Bank Teller',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(isSystem(actor)).toBe(false);
    expect(isExternalSystem(actor)).toBe(false);
    expect(isInternalSystem(actor)).toBe(false);
  });

  it('projects internal System to canvas with drill-down capability', () => {
    const system = createSystem(archId, verId, 'Payments Engine', {
      domain: 'Payments',
      critical: true,
      position: { x: 300, y: 150 },
    });

    const node = projectSystemToCanvas(system);
    expect(node.id).toBe(system.id);
    expect(node.type).toBe('system');
    expect(node.position).toEqual({ x: 300, y: 150 });
    expect(node.data.label).toBe('Payments Engine');
    expect(node.data.external).toBe(false);
    expect(node.data.canDrillDown).toBe(true);
    expect(node.data.critical).toBe(true);
    expect(node.data.domain).toBe('Payments');
    expect(node.width).toBe(260);
    expect(node.height).toBe(160);
  });

  it('projects external System to canvas without drill-down capability', () => {
    const extSystem = createSystem(archId, verId, 'Stripe Billing', {
      external: true,
      position: { x: 600, y: 150 },
    });

    const node = projectSystemToCanvas(extSystem);
    expect(node.data.external).toBe(true);
    expect(node.data.canDrillDown).toBe(false);
  });
});
