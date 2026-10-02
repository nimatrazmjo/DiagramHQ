import { describe, it, expect } from 'vitest';
import {
  normalizeK8sKind,
  determineObjectKindForK8s,
  parseKubernetesYaml,
  importKubernetesManifests,
  createMockKubernetesManifests,
} from './kubernetes';

describe('Kubernetes Cluster Topology Mapping Engine (F082)', () => {
  describe('Resource Kind and Classification', () => {
    it('normalizes Kubernetes kinds to canonical types', () => {
      expect(normalizeK8sKind('Deployment')).toBe('deployment');
      expect(normalizeK8sKind('StatefulSet')).toBe('statefulset');
      expect(normalizeK8sKind('Service')).toBe('service');
      expect(normalizeK8sKind('Ingress')).toBe('ingress');
      expect(normalizeK8sKind('ConfigMap')).toBe('configmap');
      expect(normalizeK8sKind('Secret')).toBe('secret');
      expect(normalizeK8sKind('PersistentVolumeClaim')).toBe('pvc');
      expect(normalizeK8sKind('PersistentVolume')).toBe('pv');
      expect(normalizeK8sKind('CronJob')).toBe('cronjob');
      expect(normalizeK8sKind('Namespace')).toBe('namespace');
    });

    it('classifies Kubernetes resources to DiagramHQ ModelObjectKind', () => {
      expect(determineObjectKindForK8s('cluster')).toBe('group');
      expect(determineObjectKindForK8s('namespace')).toBe('group');
      expect(determineObjectKindForK8s('configmap')).toBe('store');
      expect(determineObjectKindForK8s('secret')).toBe('store');
      expect(determineObjectKindForK8s('pvc')).toBe('store');
      expect(determineObjectKindForK8s('pv')).toBe('store');
      expect(determineObjectKindForK8s('deployment')).toBe('application');
      expect(determineObjectKindForK8s('service')).toBe('application');
      expect(determineObjectKindForK8s('ingress')).toBe('application');
      expect(determineObjectKindForK8s('cronjob')).toBe('application');
    });
  });

  describe('Multi-Document Manifest Parsing', () => {
    it('parses multi-document YAML manifests into K8sResource objects', () => {
      const manifest = `
apiVersion: v1
kind: Service
metadata:
  name: web-svc
  namespace: prod
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: prod
`;
      const resources = parseKubernetesYaml(manifest);
      expect(resources).toHaveLength(2);
      expect(resources[0]?.name).toBe('web-svc');
      expect(resources[0]?.resourceType).toBe('service');
      expect(resources[1]?.name).toBe('web-app');
      expect(resources[1]?.resourceType).toBe('deployment');
    });
  });

  describe('Acceptance Test: Sample Kubernetes Manifests Import', () => {
    it('imports sample manifests and generates complete topology model', () => {
      const manifests = createMockKubernetesManifests();
      const result = importKubernetesManifests({
        manifestContent: manifests,
        clusterName: 'production-k8s',
      });

      // 1. Cluster & Namespace Group Containment
      const groupObjects = result.objects.filter((o) => o.kind === 'group');
      expect(groupObjects.length).toBeGreaterThanOrEqual(2);
      const clusterObj = groupObjects.find((o) => o.name.includes('production-k8s'));
      const nsObj = groupObjects.find((o) => o.name === 'Namespace: production');
      expect(clusterObj).toBeDefined();
      expect(nsObj).toBeDefined();
      expect(nsObj?.parentId).toBe(clusterObj?.id);

      // 2. Workloads & Storage Objects
      const appObjects = result.objects.filter((o) => o.kind === 'application');
      const storeObjects = result.objects.filter((o) => o.kind === 'store');

      expect(appObjects.length).toBeGreaterThanOrEqual(5); // Ingress, Service, Deployment, StatefulSet, CronJob, Pod
      expect(storeObjects.length).toBeGreaterThanOrEqual(4); // ConfigMap, Secret, PVC, PV

      // Verify containment under Namespace
      const apiGatewayObj = appObjects.find((o) => o.name.includes('api-gateway-deployment'));
      expect(apiGatewayObj).toBeDefined();
      expect(apiGatewayObj?.parentId).toBe(nsObj?.id);

      // 3. Topology Connection Inferences
      expect(result.connections.length).toBeGreaterThanOrEqual(5);

      // Ingress -> Service
      const ingressToSvc = result.connections.find((c) => c.label === 'Routes HTTP/S');
      expect(ingressToSvc).toBeDefined();
      expect(ingressToSvc?.metadata?.protocol).toBe('HTTPS');

      // Service -> Deployment (selector match: app=api-gateway)
      const svcToDeploy = result.connections.find((c) => c.label === 'Dispatches traffic');
      expect(svcToDeploy).toBeDefined();
      expect(svcToDeploy?.metadata?.protocol).toBe('TCP / Service Port');

      // StatefulSet -> PVC
      const workloadToPvc = result.connections.find((c) => c.label === 'Mounts PVC');
      expect(workloadToPvc).toBeDefined();

      // PVC -> PV
      const pvcToPv = result.connections.find((c) => c.label === 'Binds PV');
      expect(pvcToPv).toBeDefined();

      // Workload -> ConfigMap & Secret
      const configConn = result.connections.find((c) => c.label === 'References ConfigMap');
      const secretConn = result.connections.find((c) => c.label === 'References Secret');
      expect(configConn).toBeDefined();
      expect(secretConn).toBeDefined();

      // 4. Grounded Kubernetes Evidence
      for (const obj of result.objects) {
        if (!obj.name.includes('Cluster')) {
          expect(result.evidence[obj.id]).toBeDefined();
          expect(result.evidence[obj.id]?.sourceType).toBe('kubernetes_manifest');
          expect(result.evidence[obj.id]?.confidence).toBe(1.0);
        }
      }

      // 5. Summary
      expect(result.summary.mappedObjectCount).toBeGreaterThanOrEqual(10);
      expect(result.summary.mappedConnectionCount).toBeGreaterThanOrEqual(5);
    });

    it('supports namespace filtering', () => {
      const manifests = createMockKubernetesManifests();
      const result = importKubernetesManifests(
        { manifestContent: manifests },
        { filterNamespaces: ['non-existent-ns'] }
      );

      // Should only contain the cluster group object
      expect(result.resources).toHaveLength(0);
      expect(result.objects.filter((o) => o.kind !== 'group')).toHaveLength(0);
    });
  });
});
