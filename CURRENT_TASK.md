# Current Task: F082 — Kubernetes

**Status**: NOT STARTED

## Description
Import and map Kubernetes cluster topology and workload manifests into the DiagramHQ architecture model (Phase 10 — Infrastructure Integrations):
- Import Kubernetes resources across namespaces and clusters:
  - Cluster / Namespaces: `Namespace` (mapped as group objects for multi-tenant containment)
  - Workloads: `Deployment`, `StatefulSet`, `DaemonSet`, `Job`, `CronJob`, `Pod` (mapped as application objects)
  - Networking & Routing: `Ingress`, `Service` (ClusterIP, NodePort, LoadBalancer) (mapped as application/proxy objects)
  - Storage: `PersistentVolume`, `PersistentVolumeClaim`, `StorageClass` (mapped as store objects)
  - Configuration & Secrets: `ConfigMap`, `Secret` (mapped as store/configuration objects)
- Topology and Dependency Resolution:
  - Ingress -> Service routing rules (hosts, paths)
  - Service -> Pod / Deployment label selectors (`selector: { app: "orders" }`)
  - Workload -> PVC storage mounts (`persistentVolumeClaim.claimName`)
  - Workload -> ConfigMap/Secret env bindings (`valueFrom.configMapKeyRef`, `envFrom`)
- Acceptance test: import sample Kubernetes YAML manifests -> topology renders with namespaces, workloads, services, and storage.

Acceptance Criteria:
- Import cluster, namespace, deployment, statefulset, pod, service, ingress, configmap, secret, pv, job, cronjob; render topology
- Test: import sample manifests -> topology renders.

- Feature ID: F082
- Phase: 10 — Infrastructure Integrations
- Dependencies: F072, F078, F079, F080, F081, Phase 03, Phase 09

## Next Steps
1. In `packages/domain/src/`, implement the Kubernetes parser and topology mapping engine (`kubernetes.ts`):
   - Type definitions: `K8sResource`, `K8sResourceType`, `K8sManifestScanInput`, `K8sImportResult`, etc.
   - Multi-document YAML / manifest parser for Kubernetes specs.
   - Resource-to-model object mapping and selector-based connection derivation.
   - Unit tests in `packages/domain/src/kubernetes.test.ts`.
2. In `apps/web/`, implement canvas UI components:
   - `<KubernetesImportModal />` in `apps/web/components/canvas/kubernetes-panel.tsx`.
   - Integration specs in `apps/web/kubernetes.spec.tsx`.
3. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
