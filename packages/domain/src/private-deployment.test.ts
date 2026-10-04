import { describe, expect, it } from 'vitest';
import type { OrgId } from './ids';
import {
  createDefaultPrivateDeploymentConfig,
  generateDockerComposeManifest,
  generateKubernetesHelmValues,
  runPrivateDeploymentSmokeTests,
  validatePrivateDeploymentConfig,
  type PrivateDeploymentConfig,
} from './private-deployment';

describe('F108 — Private Deployment & Air-Gapped VPC Domain Logic', () => {
  const orgId = 'org_vpc_defense' as OrgId;

  describe('Acceptance Criteria: Deploy to a clean environment; smoke passes', () => {
    it('executes smoke tests in a clean environment and achieves 100% pass rate', () => {
      const config = createDefaultPrivateDeploymentConfig(orgId, 'Lockheed Martin', 'aws_vpc');
      const report = runPrivateDeploymentSmokeTests(config, true);

      // Acceptance test: smoke passes
      expect(report.overallStatus).toBe('healthy');
      expect(report.cleanEnvironmentVerified).toBe(true);
      expect(report.airGappedBarrierIntact).toBe(true);
      expect(report.failedCount).toBe(0);
      expect(report.passedCount).toBe(report.totalCount);
      expect(report.totalCount).toBe(6);

      // Verify all component probes are checked
      const components = report.results.map((r) => r.component);
      expect(components).toContain('web_gateway');
      expect(components).toContain('api_server');
      expect(components).toContain('database');
      expect(components).toContain('storage_s3');
      expect(components).toContain('local_ai');
      expect(components).toContain('egress_isolation');
    });

    it('identifies failures when deploying to a degraded or non-clean environment', () => {
      const config = createDefaultPrivateDeploymentConfig(orgId, 'Boeing Defense', 'on_premises');
      const report = runPrivateDeploymentSmokeTests(config, false);

      expect(report.overallStatus).toBe('failed');
      expect(report.cleanEnvironmentVerified).toBe(false);
      expect(report.failedCount).toBeGreaterThanOrEqual(4);
    });

    it('detects egress barrier compromise if external egress blocking is disabled', () => {
      const config = createDefaultPrivateDeploymentConfig(orgId, 'Raytheon', 'air_gapped');
      config.airGapped.blockExternalEgress = false; // leak!

      const report = runPrivateDeploymentSmokeTests(config, true);
      const egressTest = report.results.find((r) => r.component === 'egress_isolation');

      expect(egressTest?.status).toBe('fail');
      expect(report.airGappedBarrierIntact).toBe(false);
      expect(report.overallStatus).toBe('failed');
    });
  });

  describe('Air-Gapped & Topology Manifest Generators', () => {
    it('generates fully offline Docker Compose manifest referencing internal registry', () => {
      const config = createDefaultPrivateDeploymentConfig(orgId, 'General Dynamics', 'air_gapped');
      const composeYaml = generateDockerComposeManifest(config);

      expect(composeYaml).toContain('Customer: General Dynamics');
      expect(composeYaml).toContain('docker.customer.internal/diagramhq/diagramhq-web:1.0.0');
      expect(composeYaml).toContain('docker.customer.internal/diagramhq/diagramhq-api:1.0.0');
      expect(composeYaml).toContain('postgres:');
      expect(composeYaml).toContain('minio:');
      expect(composeYaml).toContain('NEXT_PUBLIC_AIR_GAPPED=true');
      expect(composeYaml).toContain('OFFLINE_LICENSE_KEY=DHQ-ENTERPRISE-OFFLINE-AIRGAP-KEY-2026-SIGNED');
      expect(composeYaml).toContain(config.vpcCidr);
    });

    it('generates Kubernetes Helm values with network egress policy restrictions', () => {
      const config = createDefaultPrivateDeploymentConfig(orgId, 'Northrop Grumman', 'aws_vpc');
      const helmValues = generateKubernetesHelmValues(config);

      expect(helmValues).toContain('customer: "Northrop Grumman"');
      expect(helmValues).toContain('airGapped: true');
      expect(helmValues).toContain('registry: "docker.customer.internal/diagramhq"');
      expect(helmValues).toContain('networkPolicy:');
      expect(helmValues).toContain('cidr: "10.0.0.0/8"');
      expect(helmValues).toContain('offlineKey: "DHQ-ENTERPRISE-OFFLINE-AIRGAP-KEY-2026-SIGNED"');
    });
  });

  describe('Configuration Validation', () => {
    it('approves compliant customer VPC deployment profile', () => {
      const config = createDefaultPrivateDeploymentConfig(orgId);
      const validation = validatePrivateDeploymentConfig(config);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('catches missing internal registry or missing offline license in air-gapped mode', () => {
      const invalid: PrivateDeploymentConfig = {
        ...createDefaultPrivateDeploymentConfig(orgId),
        customerName: '',
        vpcCidr: 'invalid_cidr_without_slash',
        airGapped: {
          ...createDefaultPrivateDeploymentConfig(orgId).airGapped,
          internalRegistryUrl: '',
          offlineLicenseKey: '',
        },
      };

      const validation = validatePrivateDeploymentConfig(invalid);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes('Customer name is required'))).toBe(true);
      expect(validation.errors.some((e) => e.includes('Invalid VPC CIDR'))).toBe(true);
      expect(validation.errors.some((e) => e.includes('Internal container registry URL is mandatory'))).toBe(true);
      expect(validation.errors.some((e) => e.includes('Offline signed license key is required'))).toBe(true);
    });
  });
});
