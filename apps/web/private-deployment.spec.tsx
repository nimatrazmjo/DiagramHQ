import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  createDefaultPrivateDeploymentConfig,
  generateDockerComposeManifest,
  generateKubernetesHelmValues,
  runPrivateDeploymentSmokeTests,
  type OrgId,
} from '@diagramhq/domain';
import { PrivateDeploymentModal } from './components/enterprise/private-deployment-modal';

describe('Private VPC & Air-Gapped Deployment UI & Smoke Verification (F108)', () => {
  const orgId = 'org_lockheed_vpc' as OrgId;

  describe('PrivateDeploymentModal Component Rendering', () => {
    it('renders modal with deployment status ribbon, manifests, and smoke test runner', () => {
      const html = renderToString(
        <PrivateDeploymentModal isOpen={true} onClose={() => {}} orgId={orgId} initialTab="smoke_tests" />
      );

      expect(html).toContain('Private VPC &amp; Air-Gapped Deployment');
      expect(html).toContain('F108 Self-Hosted');
      expect(html).toContain('Environment Cleanliness');
      expect(html).toContain('Air-Gapped Barrier');
      expect(html).toContain('Smoke Tests Passed');
      expect(html).toContain('VPC &amp; Air-Gapped Setup');
      expect(html).toContain('Topology Manifests (Compose / Helm)');
      expect(html).toContain('Clean Environment Smoke Tests');
      expect(html).toContain('Deploy to Clean Env &amp; Smoke Test');
    });

    it('returns empty string when closed', () => {
      const html = renderToString(
        <PrivateDeploymentModal isOpen={false} onClose={() => {}} />
      );
      expect(html).toBe('');
    });
  });

  describe('Acceptance Criteria: Deploy to a clean environment; smoke passes', () => {
    it('verifies that deploying to a clean environment passes all smoke tests and confirms air-gapped barrier', () => {
      const config = createDefaultPrivateDeploymentConfig(orgId, 'General Dynamics', 'air_gapped');

      // Deploy to clean environment
      const report = runPrivateDeploymentSmokeTests(config, true);

      // Smoke passes
      expect(report.overallStatus).toBe('healthy');
      expect(report.cleanEnvironmentVerified).toBe(true);
      expect(report.airGappedBarrierIntact).toBe(true);
      expect(report.failedCount).toBe(0);
      expect(report.passedCount).toBe(report.totalCount);
      expect(report.totalCount).toBeGreaterThanOrEqual(6);

      // Verify specific probe statuses
      const webProbe = report.results.find((r) => r.component === 'web_gateway');
      const apiProbe = report.results.find((r) => r.component === 'api_server');
      const dbProbe = report.results.find((r) => r.component === 'database');
      const egressProbe = report.results.find((r) => r.component === 'egress_isolation');

      expect(webProbe?.status).toBe('pass');
      expect(apiProbe?.status).toBe('pass');
      expect(dbProbe?.status).toBe('pass');
      expect(egressProbe?.status).toBe('pass');
    });

    it('generates deployable customer VPC manifests with air-gapped registry and network isolation', () => {
      const config = createDefaultPrivateDeploymentConfig(orgId, 'Northrop Grumman', 'aws_vpc');

      // Docker Compose
      const composeYaml = generateDockerComposeManifest(config);
      expect(composeYaml).toContain('Customer: Northrop Grumman');
      expect(composeYaml).toContain('diagramhq-web');
      expect(composeYaml).toContain('diagramhq-api');
      expect(composeYaml).toContain('NEXT_PUBLIC_AIR_GAPPED=true');
      expect(composeYaml).toContain(config.vpcCidr);

      // Kubernetes Helm values
      const helmValues = generateKubernetesHelmValues(config);
      expect(helmValues).toContain('customer: "Northrop Grumman"');
      expect(helmValues).toContain('airGapped: true');
      expect(helmValues).toContain('networkPolicy:');
    });
  });
});
