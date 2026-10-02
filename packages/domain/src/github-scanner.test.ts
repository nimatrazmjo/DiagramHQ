import { describe, it, expect } from 'vitest';
import {
  scanGitHubRepository,
  type GitHubScanInput,
} from './github-scanner';

describe('GitHub Repository Scanner & Architecture Discovery (F072)', () => {
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

  it('acceptance test: scans a sample repo and proposes expected objects with evidence and confidence', () => {
    const result = scanGitHubRepository(sampleScanInput);

    // 1. Expected objects detected
    expect(result.services.length).toBeGreaterThanOrEqual(1);
    expect(result.apis.length).toBeGreaterThanOrEqual(1);
    expect(result.databases.length).toBeGreaterThanOrEqual(2); // PostgreSQL and Redis
    expect(result.queues.length).toBeGreaterThanOrEqual(1); // Kafka
    expect(result.detectedFrameworks).toContain('NestJS');
    expect(result.detectedCloudSdks).toContain('AWS SDK');

    // 2. Services detected
    const service = result.services[0];
    expect(service).toBeDefined();
    expect(service?.name).toBe('Checkout Service');
    expect(service?.kind).toBe('application');
    expect(service?.technologies).toContain('NestJS');
    expect(service?.technologies).toContain('AWS SDK');
    expect(service?.evidence.length).toBeGreaterThan(0);
    expect(service?.evidence[0]?.location?.repo).toBe('acme-corp/checkout-service');
    expect(service?.evidence[0]?.location?.filePath).toBe('package.json');
    expect(service?.confidence.score).toBeGreaterThan(0.7);

    // 3. Databases detected with evidence
    const pgDb = result.databases.find((d) => d.technologies.includes('PostgreSQL'));
    expect(pgDb).toBeDefined();
    expect(pgDb?.kind).toBe('store');
    expect(pgDb?.evidence.length).toBeGreaterThan(0);
    expect(pgDb?.evidence[0]?.location?.filePath).toBe('package.json');
    expect(pgDb?.evidence[0]?.location?.lineStart).toBeDefined();

    const redisCache = result.databases.find((d) => d.technologies.includes('Redis'));
    expect(redisCache).toBeDefined();
    expect(redisCache?.kind).toBe('store');
    expect(redisCache?.evidence.length).toBeGreaterThan(0);

    // 4. Queues detected with evidence
    const kafkaQueue = result.queues.find((q) => q.technologies.includes('Apache Kafka'));
    expect(kafkaQueue).toBeDefined();
    expect(kafkaQueue?.kind).toBe('store');
    expect(kafkaQueue?.evidence.length).toBeGreaterThan(0);
    expect(kafkaQueue?.evidence[0]?.location?.filePath).toBe('package.json');

    // 5. APIs / Routes detected with evidence
    const apiRoute = result.apis.find((a) => a.name.includes('Checkout Controller'));
    expect(apiRoute).toBeDefined();
    expect(apiRoute?.kind).toBe('component');
    expect(apiRoute?.evidence.length).toBeGreaterThan(0);
    expect(apiRoute?.evidence[0]?.location?.filePath).toBe('src/routes/checkout.controller.ts');

    // 6. Dependencies / connections carry evidence
    expect(result.dependencies.length).toBeGreaterThanOrEqual(3);
    for (const dep of result.dependencies) {
      expect(dep.evidence.length).toBeGreaterThan(0);
      expect(dep.evidence[0]?.location?.repo).toBe('acme-corp/checkout-service');
      expect(dep.confidence.score).toBeGreaterThan(0.5);
    }

    // 7. Proposed objects list contains all items ready for review
    expect(result.proposedObjects).toHaveLength(
      result.services.length + result.apis.length + result.databases.length + result.queues.length
    );
    expect(result.totalEvidenceCount).toBeGreaterThan(0);
    expect(result.summary).toContain('acme-corp/checkout-service');
  });

  it('handles minimal repositories gracefully with heuristic grounding', () => {
    const minimalScan = scanGitHubRepository({
      repo: {
        owner: 'acme-corp',
        repo: 'legacy-monolith',
      },
      files: [],
    });

    expect(minimalScan.services).toHaveLength(1);
    expect(minimalScan.services[0]?.name).toBe('Legacy Monolith Service');
    expect(minimalScan.services[0]?.evidence).toHaveLength(1);
    expect(minimalScan.services[0]?.evidence[0]?.sourceType).toBe('heuristic');
  });
});
