import { describe, it, expect } from 'vitest';
import {
  createCodeMapping,
  generateRemoteCodeUrl,
  normalizeRepoCoordinates,
  validateCodeMapping,
  attachCodeMappingToObject,
  getCodeMappingFromObject,
  updateCodeMapping,
  type CodeLocationSpec,
} from './code-mapping';
import type { ModelObject } from './types';
import type { ObjectId, ArchitectureId, VersionId } from './ids';

describe('Code-to-Architecture Mapping (F075)', () => {
  const mockObjectId = 'obj-checkout-service' as ObjectId;
  const mockArchId = 'arch-system-1' as ArchitectureId;
  const mockVersionId = 'ver-v1' as VersionId;

  const mockComponent: ModelObject = {
    id: mockObjectId,
    architectureId: mockArchId,
    versionId: mockVersionId,
    name: 'Checkout Service',
    kind: 'application',
    position: { x: 100, y: 100 },
    description: 'Processes checkout transactions and orders',
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  it('acceptance test: a component links to its repo path and generates open-in-GitHub link', () => {
    const location: CodeLocationSpec = {
      repositoryUrl: 'https://github.com/acme-corp/checkout-service.git',
      provider: 'github',
      branchOrRef: 'main',
      folderPath: 'services/checkout',
      filePath: 'src/checkout/checkout.controller.ts',
      lineStart: 15,
      lineEnd: 45,
    };

    const mapping = createCodeMapping({
      objectId: mockObjectId,
      architectureId: mockArchId,
      location,
    });

    expect(mapping.id).toBeDefined();
    expect(mapping.objectId).toBe(mockObjectId);
    expect(mapping.location.filePath).toBe('src/checkout/checkout.controller.ts');

    // Remote GitHub link generation with line range anchor
    const remoteUrl = generateRemoteCodeUrl(mapping.location);
    expect(remoteUrl).toBe(
      'https://github.com/acme-corp/checkout-service/blob/main/src/checkout/checkout.controller.ts#L15-L45'
    );

    // Attach to ModelObject and retrieve
    const updatedComponent = attachCodeMappingToObject(mockComponent, mapping);
    const retrieved = getCodeMappingFromObject(updatedComponent);

    expect(retrieved).toBeDefined();
    expect(retrieved?.filePath).toBe('src/checkout/checkout.controller.ts');
    expect(retrieved?.remoteUrl).toBe(remoteUrl);
    expect(retrieved?.provider).toBe('github');
  });

  it('generates accurate remote URLs for GitLab projects with folder, file, and line anchors', () => {
    const gitlabLocation: CodeLocationSpec = {
      repositoryUrl: 'git@gitlab.com:acme-corp/platform/billing-worker.git',
      provider: 'gitlab',
      branchOrRef: 'release/v2.0',
      filePath: 'cmd/server/main.go',
      lineStart: 12,
      lineEnd: 24,
    };

    const fileUrl = generateRemoteCodeUrl(gitlabLocation);
    expect(fileUrl).toBe(
      'https://gitlab.com/acme-corp/platform/billing-worker/-/blob/release/v2.0/cmd/server/main.go#L12-24'
    );

    // Folder navigation
    const folderUrl = generateRemoteCodeUrl({
      ...gitlabLocation,
      filePath: undefined,
      folderPath: 'cmd/server',
    });
    expect(folderUrl).toBe(
      'https://gitlab.com/acme-corp/platform/billing-worker/-/tree/release/v2.0/cmd/server'
    );

    // Project root navigation
    const rootUrl = generateRemoteCodeUrl({
      ...gitlabLocation,
      filePath: undefined,
      folderPath: undefined,
    });
    expect(rootUrl).toBe(
      'https://gitlab.com/acme-corp/platform/billing-worker/-/tree/release/v2.0'
    );
  });

  it('normalizes repository coordinates across HTTPS URLs, SSH URIs, and plain slugs', () => {
    const httpsCoord = normalizeRepoCoordinates('https://github.com/org/repo.git', 'github');
    expect(httpsCoord.owner).toBe('org');
    expect(httpsCoord.repo).toBe('repo');
    expect(httpsCoord.host).toBe('github.com');

    const sshCoord = normalizeRepoCoordinates('git@github.com:my-team/backend.git', 'github');
    expect(sshCoord.owner).toBe('my-team');
    expect(sshCoord.repo).toBe('backend');

    const slugCoord = normalizeRepoCoordinates('group/subgroup/project', 'gitlab');
    expect(slugCoord.owner).toBe('group/subgroup');
    expect(slugCoord.repo).toBe('project');
    expect(slugCoord.host).toBe('gitlab.com');
  });

  it('validates code mappings and reports structural errors', () => {
    const validMapping = createCodeMapping({
      objectId: mockObjectId,
      architectureId: mockArchId,
      location: {
        repositoryUrl: 'acme/repo',
        provider: 'github',
        lineStart: 10,
        lineEnd: 20,
      },
    });

    const validResult = validateCodeMapping(validMapping);
    expect(validResult.isValid).toBe(true);
    expect(validResult.errors).toHaveLength(0);

    // Invalid mapping with lineEnd < lineStart
    const invalidMapping = updateCodeMapping(validMapping, {
      lineStart: 50,
      lineEnd: 20,
    });
    const invalidResult = validateCodeMapping(invalidMapping);
    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.errors).toContain('lineEnd must be greater than or equal to lineStart');
  });
});
