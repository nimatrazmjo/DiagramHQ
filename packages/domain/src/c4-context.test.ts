import { describe, expect, it } from 'vitest';
import { createId } from './ids';
import {
  canDrillToContainers,
  createC4ExternalSystem,
  createC4Person,
  createC4System,
  getC4ContextKind,
  isExternalSystem,
  isInternalSystem,
  isPerson,
  projectC4ContextToCanvas,
} from './c4-context';
import type { ModelConnection } from './types';

describe('C4 Context Domain Specification (F019)', () => {
  const archId = createId('arch');
  const verId = createId('ver');

  it('creates a C4 Person (Actor) with Level 1 context metadata', () => {
    const person = createC4Person(archId, verId, 'Customer', 'A customer of the bank');
    expect(person.id).toMatch(/^act_/);
    expect(person.kind).toBe('actor');
    expect(person.name).toBe('Customer');
    expect(person.metadata?.c4Level).toBe(1);
    expect(person.metadata?.c4Kind).toBe('person');

    expect(isPerson(person)).toBe(true);
    expect(isInternalSystem(person)).toBe(false);
    expect(isExternalSystem(person)).toBe(false);
    expect(getC4ContextKind(person)).toBe('person');
    expect(canDrillToContainers(person)).toBe(false);
  });

  it('creates an internal C4 Software System with drill-down capability', () => {
    const system = createC4System(
      archId,
      verId,
      'Internet Banking System',
      'Allows customers to view account info and make payments',
    );
    expect(system.id).toMatch(/^sys_/);
    expect(system.kind).toBe('system');
    expect(system.name).toBe('Internet Banking System');
    expect(system.metadata?.external).toBe(false);

    expect(isPerson(system)).toBe(false);
    expect(isInternalSystem(system)).toBe(true);
    expect(isExternalSystem(system)).toBe(false);
    expect(getC4ContextKind(system)).toBe('system');
    // Acceptance criterion: drill from a system to its containers
    expect(canDrillToContainers(system)).toBe(true);
  });

  it('creates an external C4 Software System with external flag and no container drill-down', () => {
    const externalSystem = createC4ExternalSystem(
      archId,
      verId,
      'Mainframe Banking System',
      'Stores core bank accounts and ledgers',
    );
    expect(externalSystem.id).toMatch(/^sys_/);
    expect(externalSystem.kind).toBe('system');
    expect(externalSystem.name).toBe('Mainframe Banking System');
    expect(externalSystem.metadata?.external).toBe(true);

    expect(isPerson(externalSystem)).toBe(false);
    expect(isInternalSystem(externalSystem)).toBe(false);
    expect(isExternalSystem(externalSystem)).toBe(true);
    expect(getC4ContextKind(externalSystem)).toBe('external_system');
    expect(canDrillToContainers(externalSystem)).toBe(false);
  });

  it('projects C4 Context entities to canvas nodes and edges with visual data and drill down', () => {
    const person = createC4Person(archId, verId, 'Customer');
    const system = createC4System(archId, verId, 'Banking System');
    const external = createC4ExternalSystem(archId, verId, 'Payment Gateway');

    const connPersonSystem: ModelConnection = {
      id: createId('con'),
      architectureId: archId,
      versionId: verId,
      sourceObjectId: person.id,
      targetObjectId: system.id,
      kind: 'sync',
      label: 'Uses',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const connSystemExternal: ModelConnection = {
      id: createId('con'),
      architectureId: archId,
      versionId: verId,
      sourceObjectId: system.id,
      targetObjectId: external.id,
      kind: 'sync',
      label: 'Processes credit card charges',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const { nodes, edges } = projectC4ContextToCanvas(
      [person, system, external],
      [connPersonSystem, connSystemExternal],
      [
        { objectId: person.id, x: 50, y: 100 },
        { objectId: system.id, x: 350, y: 100 },
        { objectId: external.id, x: 650, y: 100 },
      ],
    );

    expect(nodes).toHaveLength(3);
    expect(edges).toHaveLength(2);

    const personNode = nodes.find((n) => n.id === person.id);
    expect(personNode?.type).toBe('c4Context');
    expect(personNode?.data.c4Kind).toBe('person');
    expect(personNode?.data.canDrillDown).toBe(false);

    const systemNode = nodes.find((n) => n.id === system.id);
    expect(systemNode?.type).toBe('c4Context');
    expect(systemNode?.data.c4Kind).toBe('system');
    expect(systemNode?.data.canDrillDown).toBe(true);
    expect(systemNode?.data.systemId).toBe(system.id);

    const externalNode = nodes.find((n) => n.id === external.id);
    expect(externalNode?.type).toBe('c4Context');
    expect(externalNode?.data.c4Kind).toBe('external_system');
    expect(externalNode?.data.external).toBe(true);
    expect(externalNode?.data.canDrillDown).toBe(false);

    expect(edges[0]?.label).toBe('Uses');
    expect(edges[1]?.label).toBe('Processes credit card charges');
  });
});
