import { describe, it, expect, beforeEach } from 'vitest';
import {
  BUILTIN_OBJECT_TYPES,
  registerObjectType,
  getObjectType,
  hasObjectType,
  listObjectTypes,
  listObjectTypeKinds,
  unregisterObjectType,
  resetObjectTypeRegistry,
  getInspectorSectionsForType,
  isParentAllowedForKind,
  validateParentChildRelationship,
  isConnectionKindAllowedForObject,
  validateConnectionAllowed,
  type ObjectTypeDefinition,
} from './object-type-catalog';

describe('Object Type Catalog (F112 / MODULES.md §1)', () => {
  beforeEach(() => {
    resetObjectTypeRegistry();
  });

  const REQUIRED_BUILTIN_KINDS = [
    'person',
    'actor',
    'system',
    'external-system',
    'application',
    'service',
    'component',
    'database',
    'cache',
    'queue',
    'topic',
    'bucket',
    'api',
    'function',
    'server',
    'container',
    'k8s-workload',
    'cloud-resource',
    'load-balancer',
    'gateway',
    'group',
    'boundary',
  ] as const;

  it('seeds registry with all 22 required built-in object types', () => {
    expect(BUILTIN_OBJECT_TYPES.length).toBe(22);
    const kinds = listObjectTypeKinds();
    expect(kinds.length).toBe(22);

    for (const kind of REQUIRED_BUILTIN_KINDS) {
      expect(hasObjectType(kind)).toBe(true);
      const def = getObjectType(kind);
      expect(def).toBeDefined();
      expect(def?.kind).toBe(kind);
    }
  });

  it('each built-in type declares icon, allowedParents, allowedConnectionKinds, metadataSchema, and inspectorSection', () => {
    for (const def of listObjectTypes()) {
      expect(def.icon).toBeTruthy();
      expect(typeof def.icon).toBe('string');

      expect(Array.isArray(def.allowedParents)).toBe(true);
      expect(def.allowedParents!.length).toBeGreaterThan(0);

      expect(Array.isArray(def.allowedConnectionKinds)).toBe(true);
      expect(def.allowedConnectionKinds!.length).toBeGreaterThan(0);

      expect(def.metadataSchema).toBeDefined();
      expect(typeof def.metadataSchema).toBe('object');

      expect(def.inspectorSection).toBeDefined();
      expect(def.inspectorSection?.id).toBeTruthy();
      expect(def.inspectorSection?.title).toBeTruthy();
      expect(Array.isArray(def.inspectorSection?.fields)).toBe(true);
      expect(def.inspectorSection!.fields.length).toBeGreaterThan(0);
    }
  });

  it('adding a new type is a registration call with NO core edit (MODULES.md §1)', () => {
    const customType: ObjectTypeDefinition = {
      kind: 'quantum-processor',
      label: 'Quantum Processing Unit (QPU)',
      icon: 'cpu',
      category: 'compute',
      description: 'Superconducting quantum co-processor node.',
      allowedParents: ['server', 'cloud-resource'],
      allowedConnectionKinds: ['sync', 'data'],
      metadataSchema: {
        qubitCount: 127,
        coherenceMicroseconds: 300,
        cryostatTemperatureKelvin: 0.015,
      },
      inspectorSection: {
        id: 'qpu-details',
        title: 'Quantum Processor Telemetry',
        fields: [
          { key: 'qubitCount', label: 'Qubit Capacity', type: 'number', defaultValue: 127 },
          { key: 'coherenceMicroseconds', label: 'Coherence Time (µs)', type: 'number', defaultValue: 300 },
        ],
      },
    };

    expect(hasObjectType('quantum-processor')).toBe(false);

    // Register without touching core domain code
    registerObjectType(customType);

    expect(hasObjectType('quantum-processor')).toBe(true);
    const retrieved = getObjectType('quantum-processor');
    expect(retrieved?.label).toBe('Quantum Processing Unit (QPU)');
    expect(retrieved?.category).toBe('compute');
    expect(retrieved?.metadataSchema?.qubitCount).toBe(127);

    // Inspector section should be directly retrievable
    const sections = getInspectorSectionsForType('quantum-processor');
    expect(sections.length).toBe(1);
    expect(sections[0].title).toBe('Quantum Processor Telemetry');
    expect(sections[0].fields[0].key).toBe('qubitCount');

    // Unregister should cleanly remove it
    expect(unregisterObjectType('quantum-processor')).toBe(true);
    expect(hasObjectType('quantum-processor')).toBe(false);
  });

  it('validates parent-child relationships according to allowedParents', () => {
    // Component inside application is allowed
    expect(isParentAllowedForKind('application', 'component')).toBe(true);
    const validResult = validateParentChildRelationship('application', 'component');
    expect(validResult.valid).toBe(true);

    // Component cannot be placed directly inside a database
    expect(isParentAllowedForKind('database', 'component')).toBe(false);
    const invalidResult = validateParentChildRelationship('database', 'component');
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.reason).toContain('cannot be placed inside parent kind "database"');

    // Top-level root nodes (parent null/undefined) are permitted
    expect(isParentAllowedForKind(null, 'system')).toBe(true);
    expect(validateParentChildRelationship(null, 'system').valid).toBe(true);
  });

  it('validates connection kinds according to allowedConnectionKinds', () => {
    // Service to Database with 'data' connection
    expect(isConnectionKindAllowedForObject('service', 'data')).toBe(true);
    expect(isConnectionKindAllowedForObject('database', 'data')).toBe(true);
    expect(validateConnectionAllowed('service', 'database', 'data').valid).toBe(true);

    // Database cannot have 'deploys_to' connection
    expect(isConnectionKindAllowedForObject('database', 'deploys_to')).toBe(false);
    const connCheck = validateConnectionAllowed('service', 'database', 'deploys_to');
    expect(connCheck.valid).toBe(false);
    expect(connCheck.reason).toContain('Target kind "database" does not allow connection kind "deploys_to"');
  });

  it('resetObjectTypeRegistry resets any dynamically added or modified types', () => {
    registerObjectType({
      kind: 'temp-widget',
      label: 'Temp',
      icon: 'widget',
      category: 'custom',
    });
    expect(hasObjectType('temp-widget')).toBe(true);

    resetObjectTypeRegistry();
    expect(hasObjectType('temp-widget')).toBe(false);
    expect(listObjectTypeKinds().length).toBe(22);
  });
});
