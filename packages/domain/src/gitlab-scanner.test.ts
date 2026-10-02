import { describe, it, expect } from 'vitest';
import {
  scanGitLabRepository,
  type GitLabScanInput,
} from './gitlab-scanner';
import { scanGitHubRepository, type GitHubScanInput } from './github-scanner';

describe('GitLab Repository Scanner & Parity Discovery (F073)', () => {
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
      commitSha: 'c0d3e1f2a3b4',
    },
    files: commonFiles,
  };

  const equivalentGitHubInput: GitHubScanInput = {
    repo: {
      owner: 'acme-corp',
      repo: 'checkout-service',
      branch: 'main',
      commitSha: 'c0d3e1f2a3b4',
    },
    files: commonFiles,
  };

  it('acceptance test: scans a sample GitLab repo with parity to GitHub', () => {
    const gitlabResult = scanGitLabRepository(sampleGitLabInput);
    const githubResult = scanGitHubRepository(equivalentGitHubInput);

    // Parity: Identical count of architectural categories
    expect(gitlabResult.services.length).toBe(githubResult.services.length);
    expect(gitlabResult.apis.length).toBe(githubResult.apis.length);
    expect(gitlabResult.databases.length).toBe(githubResult.databases.length);
    expect(gitlabResult.queues.length).toBe(githubResult.queues.length);
    expect(gitlabResult.dependencies.length).toBe(githubResult.dependencies.length);

    // Parity: Identical framework & cloud SDK discovery
    expect(gitlabResult.detectedFrameworks).toEqual(githubResult.detectedFrameworks);
    expect(gitlabResult.detectedCloudSdks).toEqual(githubResult.detectedCloudSdks);

    // Service inspection
    const svc = gitlabResult.services[0];
    expect(svc).toBeDefined();
    expect(svc?.name).toBe('Checkout Service');
    expect(svc?.kind).toBe('application');
    expect(svc?.technologies).toContain('NestJS');
    expect(svc?.technologies).toContain('AWS SDK');
    expect(svc?.confidence.score).toBeGreaterThan(0.7);
    expect(svc?.evidence[0]?.location?.repo).toBe('acme-corp/platform/checkout-service');
    expect(svc?.evidence[0]?.location?.filePath).toBe('package.json');

    // Databases inspection
    const pg = gitlabResult.databases.find((d) => d.technologies.includes('PostgreSQL'));
    expect(pg).toBeDefined();
    expect(pg?.kind).toBe('store');
    expect(pg?.confidence.score).toBeGreaterThan(0.7);

    // Queues inspection
    const kafka = gitlabResult.queues.find((q) => q.technologies.some((t) => t.includes('Kafka')));
    expect(kafka).toBeDefined();
    expect(kafka?.kind).toBe('store');
    expect(kafka?.category).toBe('queue');

    // APIs inspection
    const api = gitlabResult.apis[0];
    expect(api).toBeDefined();
    expect(api?.name).toBe('Checkout Controller Endpoint');
    expect(api?.kind).toBe('component');
  });

  it('detects datastores declared in .gitlab-ci.yml service blocks', () => {
    const gitlabCiInput: GitLabScanInput = {
      project: {
        namespace: 'acme-corp',
        project: 'analytics-worker',
        ref: 'main',
      },
      files: [
        {
          path: '.gitlab-ci.yml',
          content: `
default:
  image: node:20

test:
  services:
    - postgres:15-alpine
    - redis:7-alpine
  script:
    - npm test
`,
        },
      ],
    };

    const result = scanGitLabRepository(gitlabCiInput);

    expect(result.databases.length).toBe(2);
    const pg = result.databases.find((d) => d.technologies.includes('PostgreSQL'));
    const redis = result.databases.find((d) => d.technologies.includes('Redis'));

    expect(pg).toBeDefined();
    expect(pg?.evidence[0]?.location?.filePath).toBe('.gitlab-ci.yml');
    expect(pg?.evidence[0]?.location?.repo).toBe('acme-corp/analytics-worker');

    expect(redis).toBeDefined();
    expect(redis?.evidence[0]?.location?.filePath).toBe('.gitlab-ci.yml');
  });

  it('handles minimal repositories gracefully with heuristic grounding', () => {
    const minimalInput: GitLabScanInput = {
      project: {
        namespace: 'acme-corp',
        project: 'docs-site',
      },
      files: [
        {
          path: 'README.md',
          content: '# Docs Site\nDocumentation repository.',
        },
      ],
    };

    const result = scanGitLabRepository(minimalInput);
    expect(result.services.length).toBe(1);
    expect(result.services[0]?.name).toBe('Docs Site Service');
    expect(result.services[0]?.confidence.tier).toBe('low');
    expect(result.services[0]?.evidence[0]?.sourceType).toBe('heuristic');
    expect(result.summary).toContain('acme-corp/docs-site');
  });
});
