import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { OrgId } from './ids';
import {
  createDefaultPrivateDeploymentConfig,
  generateKubernetesHelmValues,
} from './private-deployment';

describe('DiagramHQ Helm Chart Implementation', () => {
  const repoRoot = path.resolve(__dirname, '../../../');
  const chartDir = path.join(repoRoot, 'charts/diagramhq');

  it('contains valid Chart.yaml metadata', () => {
    const chartYamlPath = path.join(chartDir, 'Chart.yaml');
    expect(fs.existsSync(chartYamlPath)).toBe(true);

    const chartContent = fs.readFileSync(chartYamlPath, 'utf-8');
    expect(chartContent).toContain('name: diagramhq');
    expect(chartContent).toContain('apiVersion: v2');
    expect(chartContent).toContain('appVersion: "1.0.0"');
  });

  it('contains comprehensive values.yaml covering web, api, db, redis, storage, and security', () => {
    const valuesYamlPath = path.join(chartDir, 'values.yaml');
    expect(fs.existsSync(valuesYamlPath)).toBe(true);

    const valuesContent = fs.readFileSync(valuesYamlPath, 'utf-8');
    expect(valuesContent).toContain('web:');
    expect(valuesContent).toContain('api:');
    expect(valuesContent).toContain('database:');
    expect(valuesContent).toContain('postgresql:');
    expect(valuesContent).toContain('redis:');
    expect(valuesContent).toContain('storage:');
    expect(valuesContent).toContain('security:');
    expect(valuesContent).toContain('networkPolicy:');
  });

  it('contains required Kubernetes templates', () => {
    const templatesDir = path.join(chartDir, 'templates');
    const expectedTemplates = [
      '_helpers.tpl',
      'web-deployment.yaml',
      'web-service.yaml',
      'web-ingress.yaml',
      'api-deployment.yaml',
      'api-service.yaml',
      'configmap.yaml',
      'secrets.yaml',
      'serviceaccount.yaml',
      'networkpolicy.yaml',
      'migration-job.yaml',
      'postgres-statefulset.yaml',
      'postgres-service.yaml',
      'redis-deployment.yaml',
      'redis-service.yaml',
      'minio-deployment.yaml',
      'minio-service.yaml',
      'NOTES.txt',
    ];

    for (const file of expectedTemplates) {
      expect(fs.existsSync(path.join(templatesDir, file))).toBe(true);
    }
  });

  it('passes helm lint and renders templates without errors', () => {
    const lintOutput = execSync(`helm lint "${chartDir}"`, { encoding: 'utf-8' });
    expect(lintOutput).toContain('0 chart(s) failed');

    const templateOutput = execSync(`helm template test-release "${chartDir}"`, { encoding: 'utf-8' });
    expect(templateOutput).toContain('kind: Deployment');
    expect(templateOutput).toContain('kind: Service');
    expect(templateOutput).toContain('kind: ConfigMap');
    expect(templateOutput).toContain('kind: Secret');
    expect(templateOutput).toContain('test-release-diagramhq-web');
    expect(templateOutput).toContain('test-release-diagramhq-api');
  });

  it('renders correctly with air-gapped values from generateKubernetesHelmValues', () => {
    const orgId = 'org_vpc_defense' as OrgId;
    const config = createDefaultPrivateDeploymentConfig(orgId, 'Lockheed Martin', 'air_gapped');
    const helmValuesYaml = generateKubernetesHelmValues(config);

    const tempValuesPath = path.join(chartDir, 'temp-test-airgap-values.yaml');
    try {
      fs.writeFileSync(tempValuesPath, helmValuesYaml, 'utf-8');
      const rendered = execSync(`helm template test-airgap "${chartDir}" -f "${tempValuesPath}"`, {
        encoding: 'utf-8',
      });

      // Air-gapped container images from customer internal registry
      expect(rendered).toContain('docker.customer.internal/diagramhq/diagramhq-web:1.0.0');
      expect(rendered).toContain('docker.customer.internal/diagramhq/diagramhq-api:1.0.0');

      // Network Policy with internal CIDR restrictions
      expect(rendered).toContain('kind: NetworkPolicy');
      expect(rendered).toContain('cidr: 10.0.0.0/8');
      expect(rendered).toContain('cidr: 172.16.0.0/12');

      // Environment and secrets
      expect(rendered).toContain('NEXT_PUBLIC_AIR_GAPPED: "true"');
      expect(rendered).toContain('DHQ-ENTERPRISE-OFFLINE-AIRGAP-KEY-2026-SIGNED');
      expect(rendered).toContain('postgres.customer.internal');
    } finally {
      if (fs.existsSync(tempValuesPath)) {
        fs.unlinkSync(tempValuesPath);
      }
    }
  });
});
