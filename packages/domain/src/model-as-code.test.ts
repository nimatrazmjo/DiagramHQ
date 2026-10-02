import { describe, expect, it } from 'vitest';
import {
  diffModelAsCode,
  executeDhqCommand,
  parseYamlToModelDocument,
  pullModelAsCode,
  pushModelAsCode,
  sanitizeSlug,
  serializeModelToYaml,
  slugToConnectionId,
  slugToObjectId,
  validateModelAsCodeDocument,
  type DhqCliContext,
  type ModelAsCodeDocument,
  type ModelAsCodeObjectKind,
} from './model-as-code';
import type { ArchitectureId } from './ids';

describe('F125 — Model-as-Code & dhq CLI Engine', () => {
  const sampleDoc: ModelAsCodeDocument = {
    version: '1.0',
    architectureSlug: 'payment-platform',
    name: 'Payment Platform Architecture',
    description: 'Core banking and payment processing engine',
    objects: [
      {
        slug: 'customer-web-app',
        name: 'Customer Web App',
        kind: 'container',
        description: 'Next.js frontend application',
        technology: ['React', 'TypeScript', 'Tailwind'],
        tags: ['frontend', 'web'],
      },
      {
        slug: 'edge-api-gateway',
        name: 'Edge API Gateway',
        kind: 'container',
        description: 'Reverse proxy and auth boundary',
        technology: ['Fastify', 'Envoy'],
        tags: ['gateway', 'edge'],
      },
      {
        slug: 'ledger-service',
        name: 'Ledger Microservice',
        kind: 'component',
        description: 'Immutable transaction ledger',
        parentSlug: 'edge-api-gateway',
        technology: ['Go', 'gRPC'],
      },
      {
        slug: 'ledger-db',
        name: 'Ledger Database',
        kind: 'component',
        description: 'Primary transactional database',
        technology: ['PostgreSQL 16'],
      },
    ],
    connections: [
      {
        source: 'customer-web-app',
        target: 'edge-api-gateway',
        label: 'HTTPS / REST',
        protocol: 'HTTPS',
        port: 443,
        description: 'Client incoming requests',
      },
      {
        source: 'edge-api-gateway',
        target: 'ledger-service',
        label: 'gRPC / TLS',
        protocol: 'gRPC',
        port: 50051,
      },
      {
        source: 'ledger-service',
        target: 'ledger-db',
        label: 'TCP / SSL',
        protocol: 'TCP',
        port: 5432,
      },
    ],
  };

  describe('Slug to Stable ID Mapping', () => {
    it('generates deterministic ObjectIds and ConnectionIds from slugs', () => {
      const archId = 'arch-payment' as ArchitectureId;
      const objId1 = slugToObjectId(archId, 'edge-api-gateway');
      const objId2 = slugToObjectId(archId, 'edge-api-gateway');
      expect(objId1).toBe('obj-arch-payment-edge-api-gateway');
      expect(objId1).toBe(objId2);

      const connId = slugToConnectionId(archId, 'customer-web-app', 'edge-api-gateway', 'HTTPS / REST');
      expect(connId).toBe('conn-arch-payment-customer-web-app-edge-api-gateway-https-rest');
    });

    it('sanitizes slugs reliably', () => {
      expect(sanitizeSlug('Payment Gateway V2!')).toBe('payment-gateway-v2');
      expect(sanitizeSlug('---My Service---')).toBe('my-service');
    });
  });

  describe('YAML Serialization & Round-Trip Fidelity', () => {
    it('serializes a model document to clean YAML and parses it back with zero semantic loss', () => {
      const yaml = serializeModelToYaml(sampleDoc);
      expect(yaml).toContain('architectureSlug: "payment-platform"');
      expect(yaml).toContain('name: "Payment Platform Architecture"');
      expect(yaml).toContain('- slug: "customer-web-app"');
      expect(yaml).toContain('technology: ["React", "TypeScript", "Tailwind"]');
      expect(yaml).toContain('- source: "customer-web-app"');

      const parsed = parseYamlToModelDocument(yaml);
      expect(parsed.version).toBe(sampleDoc.version);
      expect(parsed.name).toBe(sampleDoc.name);
      expect(parsed.architectureSlug).toBe(sampleDoc.architectureSlug);
      expect(parsed.objects).toHaveLength(4);
      expect(parsed.connections).toHaveLength(3);

      expect(parsed.objects[0].slug).toBe('customer-web-app');
      expect(parsed.objects[0].technology).toEqual(['React', 'TypeScript', 'Tailwind']);
      expect(parsed.objects[2].parentSlug).toBe('edge-api-gateway');
      expect(parsed.connections[0].source).toBe('customer-web-app');
      expect(parsed.connections[0].port).toBe(443);
    });

    it('round-trips: push YAML -> model; pull -> equivalent YAML', () => {
      // 1. Start with sample document and convert to YAML
      const initialYaml = serializeModelToYaml(sampleDoc);

      // 2. Push YAML into domain ArchitectureModel
      const parsedDoc = parseYamlToModelDocument(initialYaml);
      const domainModel = pushModelAsCode(parsedDoc);

      expect(domainModel.objects).toHaveLength(4);
      expect(domainModel.connections).toHaveLength(3);

      // Verify stable object and connection IDs were generated
      const gatewayObj = domainModel.objects.find((o) => o.name === 'Edge API Gateway');
      expect(gatewayObj).toBeDefined();
      expect(gatewayObj?.id).toBe('obj-arch-payment-platform-edge-api-gateway');

      const ledgerObj = domainModel.objects.find((o) => o.name === 'Ledger Microservice');
      expect(ledgerObj?.parentId).toBe(gatewayObj?.id);

      // 3. Pull domain ArchitectureModel back into ModelAsCodeDocument
      const pulledDoc = pullModelAsCode(domainModel);

      // 4. Serialize pulled document back to YAML
      const roundTrippedYaml = serializeModelToYaml(pulledDoc);

      // 5. Verify round-trip equivalence
      expect(pulledDoc.name).toBe(sampleDoc.name);
      expect(pulledDoc.objects.map((o) => o.slug)).toEqual(sampleDoc.objects.map((o) => o.slug));
      expect(pulledDoc.connections.map((c) => ({ s: c.source, t: c.target, p: c.protocol }))).toEqual(
        sampleDoc.connections.map((c) => ({ s: c.source, t: c.target, p: c.protocol }))
      );
      expect(roundTrippedYaml).toContain('- slug: "customer-web-app"');
    });
  });

  describe('Validation Engine', () => {
    it('passes on valid documents', () => {
      const validation = validateModelAsCodeDocument(sampleDoc);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.summary).toContain('is valid');
    });

    it('catches missing required fields', () => {
      const invalidDoc: ModelAsCodeDocument = {
        version: '1.0',
        architectureSlug: '',
        name: '',
        objects: [],
        connections: [],
      };
      const validation = validateModelAsCodeDocument(invalidDoc);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.field === 'name')).toBe(true);
      expect(validation.errors.some((e) => e.field === 'architectureSlug')).toBe(true);
    });

    it('catches duplicate slugs and invalid kinds', () => {
      const invalidDoc: ModelAsCodeDocument = {
        version: '1.0',
        architectureSlug: 'test-arch',
        name: 'Test Arch',
        objects: [
          { slug: 'dup-slug', name: 'Object 1', kind: 'container' },
          { slug: 'dup-slug', name: 'Object 2', kind: 'invalid-kind' as unknown as ModelAsCodeObjectKind },
        ],
        connections: [],
      };
      const validation = validateModelAsCodeDocument(invalidDoc);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.code === 'DUPLICATE_SLUG')).toBe(true);
      expect(validation.errors.some((e) => e.code === 'INVALID_KIND')).toBe(true);
    });

    it('catches dangling connection references', () => {
      const invalidDoc: ModelAsCodeDocument = {
        version: '1.0',
        architectureSlug: 'test-arch',
        name: 'Test Arch',
        objects: [{ slug: 'valid-service', name: 'Valid Service', kind: 'container' }],
        connections: [
          {
            source: 'valid-service',
            target: 'non-existent-target',
          },
        ],
      };
      const validation = validateModelAsCodeDocument(invalidDoc);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.code === 'DANGLING_REFERENCE')).toBe(true);
    });

    it('catches parent hierarchy cycles', () => {
      const invalidDoc: ModelAsCodeDocument = {
        version: '1.0',
        architectureSlug: 'test-arch',
        name: 'Test Arch',
        objects: [
          { slug: 'node-a', name: 'Node A', kind: 'container', parentSlug: 'node-b' },
          { slug: 'node-b', name: 'Node B', kind: 'container', parentSlug: 'node-a' },
        ],
        connections: [],
      };
      const validation = validateModelAsCodeDocument(invalidDoc);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.code === 'PARENT_CYCLE')).toBe(true);
    });
  });

  describe('Model Diff Engine', () => {
    it('detects added, removed, and modified objects and connections', () => {
      const modifiedDoc: ModelAsCodeDocument = {
        ...sampleDoc,
        objects: [
          ...sampleDoc.objects.slice(1), // removed customer-web-app
          {
            slug: 'auth-service',
            name: 'Auth Microservice',
            kind: 'component',
            technology: ['Node.js'],
          },
        ],
        connections: [
          {
            source: 'edge-api-gateway',
            target: 'ledger-service',
            label: 'gRPC / TLS v2', // modified label
            protocol: 'gRPC',
          },
        ],
      };

      const diff = diffModelAsCode(sampleDoc, modifiedDoc);
      expect(diff.hasChanges).toBe(true);
      expect(diff.removedObjects.map((o) => o.slug)).toContain('customer-web-app');
      expect(diff.addedObjects.map((o) => o.slug)).toContain('auth-service');
      expect(diff.summary).toContain('Diff:');
    });
  });

  describe('dhq CLI Commands', () => {
    it('executes dhq --help and dhq --version', () => {
      const help = executeDhqCommand(['dhq', '--help']);
      expect(help.exitCode).toBe(0);
      expect(help.stdout).toContain('DiagramHQ CLI (dhq)');
      expect(help.stdout).toContain('validate');

      const version = executeDhqCommand(['dhq', '--version']);
      expect(version.exitCode).toBe(0);
      expect(version.stdout).toContain('dhq (DiagramHQ CLI)');
    });

    it('executes dhq login with token', () => {
      const ctx: DhqCliContext = {};
      const login = executeDhqCommand(['dhq', 'login', '--token', 'pat_xyz123', '--url', 'https://api.mycorp.com'], ctx);
      expect(login.exitCode).toBe(0);
      expect(ctx.token).toBe('pat_xyz123');
      expect(ctx.apiUrl).toBe('https://api.mycorp.com');
    });

    it('executes dhq init and generates starter diagramhq.yaml', () => {
      const ctx: DhqCliContext = { localFiles: {} };
      const res = executeDhqCommand(['dhq', 'init', '--name', 'Fintech Cloud', '--slug', 'fintech-cloud'], ctx);
      expect(res.exitCode).toBe(0);
      expect(ctx.localFiles?.['diagramhq.yaml']).toBeDefined();
      expect(ctx.localFiles?.['diagramhq.yaml']).toContain('Fintech Cloud');
    });

    it('executes dhq validate on virtual filesystem', () => {
      const yaml = serializeModelToYaml(sampleDoc);
      const ctx: DhqCliContext = {
        localFiles: {
          'diagramhq.yaml': yaml,
        },
      };

      const res = executeDhqCommand(['dhq', 'validate', 'diagramhq.yaml'], ctx);
      expect(res.exitCode).toBe(0);
      expect(res.stdout).toContain('Validation passed');

      // Invalid test
      ctx.localFiles!['broken.yaml'] = 'name: ""\narchitectureSlug: ""\nobjects:\n  []\nconnections:\n  []\n';
      const failRes = executeDhqCommand(['dhq', 'validate', 'broken.yaml'], ctx);
      expect(failRes.exitCode).toBe(1);
      expect(failRes.stderr).toContain('Validation failed');
    });

    it('executes dhq push, diff, pull, and export', () => {
      const yaml = serializeModelToYaml(sampleDoc);
      const ctx: DhqCliContext = {
        localFiles: {
          'diagramhq.yaml': yaml,
        },
      };

      // 1. Push
      const pushRes = executeDhqCommand(['dhq', 'push', 'diagramhq.yaml'], ctx);
      expect(pushRes.exitCode).toBe(0);
      expect(ctx.activeModel).toBeDefined();

      // 2. Diff
      const diffRes = executeDhqCommand(['dhq', 'diff', 'diagramhq.yaml'], ctx);
      expect(diffRes.exitCode).toBe(0);
      expect(diffRes.stdout).toContain('No changes detected');

      // 3. Pull
      const pullRes = executeDhqCommand(['dhq', 'pull', '--output', 'pulled.yaml'], ctx);
      expect(pullRes.exitCode).toBe(0);
      expect(ctx.localFiles?.['pulled.yaml']).toBeDefined();

      // 4. Export JSON
      const exportRes = executeDhqCommand(['dhq', 'export', '--format', 'json'], ctx);
      expect(exportRes.exitCode).toBe(0);
      expect(exportRes.stdout).toContain('"name": "Payment Platform Architecture"');

      // 5. Deploy
      const deployRes = executeDhqCommand(['dhq', 'deploy', '--env', 'staging'], ctx);
      expect(deployRes.exitCode).toBe(0);
      expect(deployRes.stdout).toContain('staging');

      // 6. Generate
      const genRes = executeDhqCommand(['dhq', 'generate', '--from', 'openapi'], ctx);
      expect(genRes.exitCode).toBe(0);
      expect(genRes.stdout).toContain('openapi');
    });
  });
});
