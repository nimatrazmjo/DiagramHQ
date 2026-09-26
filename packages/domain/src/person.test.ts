import { describe, it, expect } from 'vitest';
import {
  createId,
  createPerson,
  isExternalPerson,
  isPerson,
  projectPersonToCanvas,
  type ModelObject,
} from './';

describe('Person Domain Module (F022)', () => {
  const archId = createId('arch');
  const verId = createId('ver');

  it('creates an internal Person with role and department metadata', () => {
    const person = createPerson(archId, verId, 'Alice Engineer', {
      role: 'Staff Platform Engineer',
      department: 'Infrastructure',
      external: false,
      email: 'alice@company.com',
      description: 'Manages core cloud resources',
    });

    expect(person.id.startsWith('act_')).toBe(true);
    expect(person.kind).toBe('actor');
    expect(person.name).toBe('Alice Engineer');
    expect(person.description).toBe('Manages core cloud resources');
    expect(person.metadata?.role).toBe('Staff Platform Engineer');
    expect(person.metadata?.department).toBe('Infrastructure');
    expect(person.metadata?.external).toBe(false);
    expect(person.metadata?.email).toBe('alice@company.com');
    expect(isPerson(person)).toBe(true);
    expect(isExternalPerson(person)).toBe(false);
  });

  it('creates an external Person (customer/vendor)', () => {
    const customer = createPerson(archId, verId, 'Banking Customer', {
      role: 'Account Holder',
      external: true,
      description: 'Personal banking customer with a debit card',
    });

    expect(customer.name).toBe('Banking Customer');
    expect(customer.metadata?.external).toBe(true);
    expect(isPerson(customer)).toBe(true);
    expect(isExternalPerson(customer)).toBe(true);
  });

  it('correctly identifies non-person objects', () => {
    const system: ModelObject = {
      id: createId('sys'),
      architectureId: archId,
      versionId: verId,
      kind: 'system',
      name: 'Internet Banking',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(isPerson(system)).toBe(false);
    expect(isExternalPerson(system)).toBe(false);
  });

  it('projects Person to a canvas node', () => {
    const person = createPerson(archId, verId, 'Security Officer', {
      role: 'CISO',
      department: 'Security',
      external: false,
      position: { x: 150, y: 250 },
    });

    const node = projectPersonToCanvas(person);
    expect(node.id).toBe(person.id);
    expect(node.type).toBe('person');
    expect(node.position).toEqual({ x: 150, y: 250 });
    expect(node.data.label).toBe('Security Officer');
    expect(node.data.role).toBe('CISO');
    expect(node.data.department).toBe('Security');
    expect(node.data.external).toBe(false);
  });
});
