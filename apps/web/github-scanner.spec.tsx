import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  scanGitHubRepository,
  type GitHubScanInput,
  type GitHubScanResult,
} from '@diagramhq/domain';
import {
  GitHubConnectModal,
  GitHubScanResultDrawer,
} from './components/canvas/github-scanner-panel';

describe('GitHub Repository Scanner (F072)', () => {
  const sampleScanInput: GitHubScanInput = {
    repo: {
      owner: 'acme-corp',
      repo: 'checkout-service',
      branch: 'main',
      commitSha: 'a1b2c3d4e5f6',
    },
    files: [
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
    ],
  };

  it('scans GitHub repository tree and identifies services, databases, queues, and endpoints with evidence', () => {
    const scanResult: GitHubScanResult = scanGitHubRepository(sampleScanInput);

    expect(scanResult.repo.owner).toBe('acme-corp');
    expect(scanResult.repo.repo).toBe('checkout-service');
    expect(scanResult.services.length).toBeGreaterThanOrEqual(1);
    expect(scanResult.apis.length).toBeGreaterThanOrEqual(1);
    expect(scanResult.databases.length).toBeGreaterThanOrEqual(2);
    expect(scanResult.queues.length).toBeGreaterThanOrEqual(1);
    expect(scanResult.detectedFrameworks).toContain('NestJS');
    expect(scanResult.detectedCloudSdks).toContain('AWS SDK');

    // Verify service detection
    const service = scanResult.services[0];
    expect(service).toBeDefined();
    expect(service?.name).toBe('Checkout Service');
    expect(service?.kind).toBe('application');
    expect(service?.technologies).toContain('NestJS');
    expect(service?.confidence.tier).toBe('high');
    expect(service?.confidence.score).toBeGreaterThan(0.7);
    expect(service?.evidence?.[0]?.location?.repo).toBe('acme-corp/checkout-service');
    expect(service?.evidence?.[0]?.location?.filePath).toBe('package.json');

    // Verify database detection
    const pg = scanResult.databases.find((d) => d.technologies.includes('PostgreSQL'));
    expect(pg).toBeDefined();
    expect(pg?.kind).toBe('store');
    expect(pg?.evidence.length).toBeGreaterThan(0);

    // Verify queue detection
    const kafka = scanResult.queues.find((q) => q.technologies.some((t) => t.includes('Kafka')));
    expect(kafka).toBeDefined();
    expect(kafka?.kind).toBe('store');
    expect(kafka?.category).toBe('queue');

    // Verify endpoint detection
    const api = scanResult.apis[0];
    expect(api).toBeDefined();
    expect(api?.name).toContain('Checkout Controller Endpoint');
    expect(api?.evidence?.[0]?.location?.filePath).toBe('src/routes/checkout.controller.ts');
  });

  it('renders GitHubConnectModal with form inputs and controls', () => {
    const onScan = vi.fn();
    const onClose = vi.fn();

    const html = renderToString(
      <GitHubConnectModal
        isOpen={true}
        onClose={onClose}
        onScanRepo={onScan}
        isScanning={false}
      />
    );

    expect(html).toContain('Connect GitHub Repository');
    expect(html).toContain('Scan Repository');
    expect(html).toContain('data-testid="github-connect-modal"');
    expect(html).toContain('Repository (owner/repo or URL)');
  });

  it('renders GitHubScanResultDrawer with detected objects and confidence badges', () => {
    const scanResult: GitHubScanResult = scanGitHubRepository(sampleScanInput);

    const onImport = vi.fn();
    const onClose = vi.fn();

    const html = renderToString(
      <GitHubScanResultDrawer
        isOpen={true}
        onClose={onClose}
        scanResult={scanResult}
        onImportObjects={onImport}
      />
    );

    expect(html).toContain('GitHub Repository Architecture Discovery');
    expect(html).toContain('acme-corp/checkout-service');
    expect(html).toContain('Checkout Service');
    expect(html).toContain('PostgreSQL');
    expect(html).toContain('Kafka');
    expect(html).toContain('Checkout Controller Endpoint');
    expect(html).toContain('Import');
    expect(html).toContain('data-testid="github-scan-drawer"');
  });

  it('returns null when modals are closed', () => {
    const modalHtml = renderToString(
      <GitHubConnectModal
        isOpen={false}
        onClose={() => {}}
        onScanRepo={() => {}}
      />
    );
    expect(modalHtml).toBe('');

    const scanResult: GitHubScanResult = scanGitHubRepository(sampleScanInput);
    const drawerHtml = renderToString(
      <GitHubScanResultDrawer
        isOpen={false}
        onClose={() => {}}
        scanResult={scanResult}
        onImportObjects={() => {}}
      />
    );
    expect(drawerHtml).toBe('');
  });
});
