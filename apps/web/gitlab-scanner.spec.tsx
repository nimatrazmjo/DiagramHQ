import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  scanGitLabRepository,
  scanGitHubRepository,
  type GitLabScanInput,
  type GitHubScanInput,
  type GitLabScanResult,
} from '@diagramhq/domain';
import {
  GitLabConnectModal,
  GitLabScanResultDrawer,
} from './components/canvas/gitlab-scanner-panel';

describe('GitLab Repository Scanner & Parity (F073)', () => {
  const commonFiles = [
    {
      path: 'package.json',
      content: JSON.stringify(
        {
          name: 'checkout-service',
          version: '1.2.0',
          dependencies: {
            '@nestjs/core': '^10.0.0',
            '@nestjs/common': '^10.0.0',
            '@aws-sdk/client-s3': '^3.500.0',
            pg: '^8.11.0',
            ioredis: '^5.3.0',
            kafkajs: '^2.2.4',
          },
          devDependencies: {
            typescript: '^5.0.0',
          },
        },
        null,
        2
      ),
    },
    {
      path: 'docker-compose.yml',
      content: `version: '3.8'
services:
  app:
    build: .
    ports:
      - '3000:3000'
  redis:
    image: redis:7.2-alpine
    ports:
      - '6379:6379'
`,
    },
    {
      path: 'src/routes/checkout.controller.ts',
      content: `@Controller('api/v1/checkout')
export class CheckoutController {
  @Post()
  async processPayment() {
    return { status: 'ok' };
  }
}
`,
    },
  ];

  const sampleGitLabInput: GitLabScanInput = {
    project: {
      namespace: 'acme-corp/platform',
      project: 'checkout-service',
      ref: 'main',
      commitSha: 'a1b2c3d4e5f6',
    },
    files: commonFiles,
  };

  const sampleGitHubInput: GitHubScanInput = {
    repo: {
      owner: 'acme-corp',
      repo: 'checkout-service',
      branch: 'main',
      commitSha: 'a1b2c3d4e5f6',
    },
    files: commonFiles,
  };

  it('scans GitLab repository with parity to GitHub scanner', () => {
    const gitlabResult: GitLabScanResult = scanGitLabRepository(sampleGitLabInput);
    const githubResult = scanGitHubRepository(sampleGitHubInput);

    // Parity verification
    expect(gitlabResult.services.length).toBe(githubResult.services.length);
    expect(gitlabResult.databases.length).toBe(githubResult.databases.length);
    expect(gitlabResult.queues.length).toBe(githubResult.queues.length);
    expect(gitlabResult.apis.length).toBe(githubResult.apis.length);
    expect(gitlabResult.detectedFrameworks).toEqual(githubResult.detectedFrameworks);
    expect(gitlabResult.detectedCloudSdks).toEqual(githubResult.detectedCloudSdks);

    // Service inspection
    const service = gitlabResult.services[0];
    expect(service).toBeDefined();
    expect(service?.name).toBe('Checkout Service');
    expect(service?.kind).toBe('application');
    expect(service?.technologies).toContain('NestJS');
    expect(service?.confidence.tier).toBe('high');
    expect(service?.confidence.score).toBeGreaterThan(0.7);
    expect(service?.evidence?.[0]?.location?.repo).toBe('acme-corp/platform/checkout-service');
    expect(service?.evidence?.[0]?.location?.filePath).toBe('package.json');

    // Database inspection
    const pg = gitlabResult.databases.find((d) => d.technologies.includes('PostgreSQL'));
    expect(pg).toBeDefined();
    expect(pg?.kind).toBe('store');
    expect(pg?.evidence.length).toBeGreaterThan(0);

    // Queue inspection
    const kafka = gitlabResult.queues.find((q) => q.technologies.some((t) => t.includes('Kafka')));
    expect(kafka).toBeDefined();
    expect(kafka?.kind).toBe('store');
    expect(kafka?.category).toBe('queue');

    // Route inspection
    const api = gitlabResult.apis[0];
    expect(api).toBeDefined();
    expect(api?.name).toContain('Checkout Controller Endpoint');
    expect(api?.evidence?.[0]?.location?.filePath).toBe('src/routes/checkout.controller.ts');
  });

  it('renders GitLabConnectModal with project inputs and submit button', () => {
    const onScan = vi.fn();
    const onClose = vi.fn();

    const html = renderToString(
      <GitLabConnectModal
        isOpen={true}
        onClose={onClose}
        onScanProject={onScan}
        isScanning={false}
      />
    );

    expect(html).toContain('Connect GitLab Project');
    expect(html).toContain('Scan GitLab Project');
    expect(html).toContain('data-testid="gitlab-connect-modal"');
    expect(html).toContain('GitLab Project Path');
  });

  it('renders GitLabScanResultDrawer with detected objects and confidence badges', () => {
    const scanResult: GitLabScanResult = scanGitLabRepository(sampleGitLabInput);

    const onImport = vi.fn();
    const onClose = vi.fn();

    const html = renderToString(
      <GitLabScanResultDrawer
        isOpen={true}
        onClose={onClose}
        scanResult={scanResult}
        onImportObjects={onImport}
      />
    );

    expect(html).toContain('GitLab Project Architecture Discovery');
    expect(html).toContain('acme-corp/platform/checkout-service');
    expect(html).toContain('Checkout Service');
    expect(html).toContain('PostgreSQL');
    expect(html).toContain('Kafka');
    expect(html).toContain('Checkout Controller Endpoint');
    expect(html).toContain('Import');
    expect(html).toContain('data-testid="gitlab-scan-drawer"');
  });

  it('returns null when modals are closed', () => {
    const modalHtml = renderToString(
      <GitLabConnectModal
        isOpen={false}
        onClose={() => {}}
        onScanProject={() => {}}
      />
    );
    expect(modalHtml).toBe('');

    const scanResult: GitLabScanResult = scanGitLabRepository(sampleGitLabInput);
    const drawerHtml = renderToString(
      <GitLabScanResultDrawer
        isOpen={false}
        onClose={() => {}}
        scanResult={scanResult}
        onImportObjects={() => {}}
      />
    );
    expect(drawerHtml).toBe('');
  });
});
