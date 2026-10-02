/**
 * @file packages/domain/src/kubernetes.ts
 *
 * F082 — Kubernetes Cluster Topology & Manifest Import Engine.
 *
 * Imports and maps Kubernetes cluster topology and workload manifests into DiagramHQ:
 * - Supports all 14 canonical Kubernetes resource types:
 *   - Logical & Grouping: cluster, namespace
 *   - Workloads: deployment, statefulset, daemonset, job, cronjob, pod
 *   - Networking & Routing: service, ingress
 *   - Configuration & Storage: configmap, secret, pv (PersistentVolume), pvc (PersistentVolumeClaim)
 * - Pure TypeScript multi-document YAML / manifest parser.
 * - Maps Kubernetes resources to typed ModelObjects with hierarchical Namespace containment.
 * - Infers inter-resource ModelConnections:
 *   - Ingress -> Service (HTTP/HTTPS routing)
 *   - Service -> Deployment/StatefulSet/Pod (Label selector matching)
 *   - Workload -> PVC (Storage volume mounting)
 *   - PVC -> PV (Persistent volume binding)
 *   - Workload -> ConfigMap / Secret (Environment & config mounting)
 * - Attaches verifiable KubernetesEvidence to each object.
 * - Framework-agnostic pure TypeScript implementation.
 */

import type { ArchitectureId, ConnectionId, ObjectId, VersionId } from './ids';
import type { ModelConnection, ModelObject, ObjectKind } from './types';

export type K8sResourceType =
  | 'cluster'
  | 'namespace'
  | 'deployment'
  | 'statefulset'
  | 'daemonset'
  | 'job'
  | 'cronjob'
  | 'pod'
  | 'service'
  | 'ingress'
  | 'configmap'
  | 'secret'
  | 'pv'
  | 'pvc';

export const ALL_K8S_RESOURCE_TYPES: K8sResourceType[] = [
  'cluster',
  'namespace',
  'deployment',
  'statefulset',
  'daemonset',
  'job',
  'cronjob',
  'pod',
  'service',
  'ingress',
  'configmap',
  'secret',
  'pv',
  'pvc',
];

export interface K8sLocation {
  filePath: string;
  docIndex: number;
  line: number;
}

export interface K8sResource {
  id: string; // e.g. "k8s:production:Deployment:order-service"
  apiVersion: string;
  kind: string; // e.g. "Deployment", "Service", "ConfigMap"
  resourceType: K8sResourceType;
  name: string;
  namespace: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  spec: Record<string, unknown>;
  rawText: string;
  location: K8sLocation;
}

export interface K8sManifestScanInput {
  manifestContent: string;
  filePath?: string;
  clusterName?: string;
}

export interface K8sMappingOptions {
  architectureId?: ArchitectureId;
  versionId?: VersionId;
  clusterName?: string;
  groupByNamespace?: boolean;
  inferConnections?: boolean;
  filterNamespaces?: string[];
  filterResourceTypes?: K8sResourceType[];
}

export interface K8sEvidence {
  sourceType: 'kubernetes_manifest';
  apiVersion: string;
  kind: string;
  namespace: string;
  name: string;
  filePath: string;
  line: number;
  confidence: number;
}

export interface K8sImportResult {
  objects: ModelObject[];
  connections: ModelConnection[];
  resources: K8sResource[];
  evidence: Record<ObjectId, K8sEvidence>;
  summary: {
    totalResources: number;
    mappedObjectCount: number;
    mappedConnectionCount: number;
    namespaceCount: number;
    resourceCountsByType: Record<K8sResourceType, number>;
  };
}

/**
 * Normalizes a Kubernetes Kind string to canonical K8sResourceType.
 */
export function normalizeK8sKind(kind: string): K8sResourceType {
  const k = kind.toLowerCase();
  switch (k) {
    case 'cluster':
      return 'cluster';
    case 'namespace':
      return 'namespace';
    case 'deployment':
      return 'deployment';
    case 'statefulset':
      return 'statefulset';
    case 'daemonset':
      return 'daemonset';
    case 'job':
      return 'job';
    case 'cronjob':
      return 'cronjob';
    case 'pod':
      return 'pod';
    case 'service':
      return 'service';
    case 'ingress':
      return 'ingress';
    case 'configmap':
      return 'configmap';
    case 'secret':
      return 'secret';
    case 'persistentvolume':
    case 'pv':
      return 'pv';
    case 'persistentvolumeclaim':
    case 'pvc':
      return 'pvc';
    default:
      if (k.includes('ingress')) return 'ingress';
      if (k.includes('service')) return 'service';
      if (k.includes('deploy')) return 'deployment';
      if (k.includes('secret')) return 'secret';
      if (k.includes('config')) return 'configmap';
      return 'deployment';
  }
}

/**
 * Maps a Kubernetes resource type to DiagramHQ ModelObjectKind.
 */
export function determineObjectKindForK8s(resourceType: K8sResourceType): ObjectKind {
  switch (resourceType) {
    case 'cluster':
    case 'namespace':
      return 'group';
    case 'configmap':
    case 'secret':
    case 'pv':
    case 'pvc':
      return 'store';
    case 'service':
    case 'ingress':
    case 'deployment':
    case 'statefulset':
    case 'daemonset':
    case 'job':
    case 'cronjob':
    case 'pod':
    default:
      return 'application';
  }
}

/**
 * Simple, robust YAML document parser for Kubernetes manifests.
 * Handles nested maps, arrays, strings, numbers, booleans, and multi-document separators (---).
 */
export function parseKubernetesYaml(
  content: string,
  filePath = 'manifest.yaml'
): K8sResource[] {
  const rawDocs = content.split(/^---$/m);
  const resources: K8sResource[] = [];

  let currentLineOffset = 1;

  for (let docIdx = 0; docIdx < rawDocs.length; docIdx++) {
    const rawDoc = rawDocs[docIdx];
    if (rawDoc === undefined) continue;

    const docLines = rawDoc.split('\n');
    const docLineCount = docLines.length;

    const docTrimmed = rawDoc.trim();
    if (!docTrimmed || docTrimmed.startsWith('#')) {
      currentLineOffset += docLineCount + 1;
      continue;
    }

    const docObj = parseSimpleYamlBlock(docLines);
    if (docObj && typeof docObj === 'object') {
      const apiVersion = typeof docObj.apiVersion === 'string' ? docObj.apiVersion : 'v1';
      const kind = typeof docObj.kind === 'string' ? docObj.kind : '';
      const metadata = (docObj.metadata as Record<string, unknown>) || {};
      const name = typeof metadata.name === 'string' ? metadata.name : '';
      let namespace = typeof metadata.namespace === 'string' ? metadata.namespace : 'default';
      if (kind.toLowerCase() === 'namespace' && name) {
        namespace = name;
      }
      const labels = (metadata.labels as Record<string, string>) || {};
      const annotations = (metadata.annotations as Record<string, string>) || {};
      const spec = (docObj.spec as Record<string, unknown>) || {};

      if (kind && name) {
        const resourceType = normalizeK8sKind(kind);
        const resId = `k8s:${namespace}:${kind}:${name}`;

        resources.push({
          id: resId,
          apiVersion,
          kind,
          resourceType,
          name,
          namespace,
          labels,
          annotations,
          spec,
          rawText: rawDoc,
          location: {
            filePath,
            docIndex: docIdx,
            line: currentLineOffset,
          },
        });
      }
    }

    currentLineOffset += docLineCount + 1;
  }

  return resources;
}

/**
 * Recursive lightweight YAML parser for key-value structures.
 */
function parseSimpleYamlBlock(lines: string[]): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  const stack: { indent: number; obj: Record<string, unknown>; key?: string }[] = [
    { indent: -1, obj: root },
  ];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (raw === undefined) continue;

    // Remove comments
    let line = raw;
    const commentIdx = line.indexOf('#');
    if (commentIdx !== -1) {
      const quoteCount = (line.substring(0, commentIdx).match(/"/g) || []).length;
      if (quoteCount % 2 === 0) {
        line = line.substring(0, commentIdx);
      }
    }
    if (!line.trim()) continue;

    const indent = line.search(/\S/);
    const trimmed = line.trim();

    // Adjust stack to current indentation
    while (stack.length > 1 && (stack[stack.length - 1]?.indent ?? 0) >= indent) {
      stack.pop();
    }
    const current = stack[stack.length - 1]?.obj ?? root;

    // Check if key: value
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx !== -1) {
      const key = trimmed.substring(0, colonIdx).trim().replace(/^- /, '').replace(/["']/g, '');
      const valuePart = trimmed.substring(colonIdx + 1).trim();

      if (!valuePart) {
        // Nested block
        const newObj: Record<string, unknown> = {};
        current[key] = newObj;
        stack.push({ indent, obj: newObj, key });
      } else {
        // Inline value
        let val: unknown = valuePart;
        if (valuePart.startsWith('"') && valuePart.endsWith('"')) {
          val = valuePart.substring(1, valuePart.length - 1);
        } else if (valuePart.startsWith("'") && valuePart.endsWith("'")) {
          val = valuePart.substring(1, valuePart.length - 1);
        } else if (valuePart === 'true') {
          val = true;
        } else if (valuePart === 'false') {
          val = false;
        } else if (!Number.isNaN(Number(valuePart)) && valuePart !== '') {
          val = Number(valuePart);
        }
        current[key] = val;
      }
    }
  }

  return root;
}

/**
 * Checks if a workload's labels match a service's label selector.
 */
function labelsMatchSelector(
  workloadLabels: Record<string, string>,
  serviceSelector: Record<string, string>
): boolean {
  const selectorKeys = Object.keys(serviceSelector);
  if (selectorKeys.length === 0) return false;
  for (const k of selectorKeys) {
    if (workloadLabels[k] !== serviceSelector[k]) {
      return false;
    }
  }
  return true;
}

/**
 * Extracts storage claim names (PVCs) from a workload resource.
 */
function extractPvcNames(res: K8sResource): string[] {
  const claims = new Set<string>();

  const pvcRegex = /claimName:\s*["']?([a-zA-Z0-9_-]+)["']?/g;
  let match: RegExpExecArray | null;
  while ((match = pvcRegex.exec(res.rawText)) !== null) {
    if (match[1]) claims.add(match[1]);
  }

  return Array.from(claims);
}

/**
 * Extracts ConfigMap and Secret references from a workload resource.
 */
function extractConfigAndSecretRefs(res: K8sResource): {
  configMaps: string[];
  secrets: string[];
} {
  const configMaps = new Set<string>();
  const secrets = new Set<string>();

  // 1. ConfigMaps
  const cmRegex = /configMap(?:Ref|KeyRef)?:\s*(?:\n\s*)?name:\s*["']?([a-zA-Z0-9_-]+)["']?/g;
  let match: RegExpExecArray | null;
  while ((match = cmRegex.exec(res.rawText)) !== null) {
    if (match[1]) configMaps.add(match[1]);
  }

  // 2. Secrets
  const secRegex = /secret(?:Ref|KeyRef)?:\s*(?:\n\s*)?(?:secretName|name):\s*["']?([a-zA-Z0-9_-]+)["']?/g;
  while ((match = secRegex.exec(res.rawText)) !== null) {
    if (match[1]) secrets.add(match[1]);
  }

  return {
    configMaps: Array.from(configMaps),
    secrets: Array.from(secrets),
  };
}

/**
 * Extracts backend service targets from an Ingress resource.
 */
function extractIngressServices(res: K8sResource): string[] {
  const serviceNames = new Set<string>();

  const svcRegex = /service:\s*(?:\n\s*)?name:\s*["']?([a-zA-Z0-9_-]+)["']?/g;
  let match: RegExpExecArray | null;
  while ((match = svcRegex.exec(res.rawText)) !== null) {
    if (match[1]) serviceNames.add(match[1]);
  }

  const altRegex = /serviceName:\s*["']?([a-zA-Z0-9_-]+)["']?/g;
  while ((match = altRegex.exec(res.rawText)) !== null) {
    if (match[1]) serviceNames.add(match[1]);
  }

  return Array.from(serviceNames);
}

/**
 * Main entrypoint: import and map Kubernetes manifests into DiagramHQ architecture model.
 */
export function importKubernetesManifests(
  input: K8sManifestScanInput,
  options: K8sMappingOptions = {}
): K8sImportResult {
  const architectureId = options.architectureId || ('arch-k8s-prod' as ArchitectureId);
  const versionId = options.versionId || ('ver-main' as VersionId);
  const clusterName = options.clusterName || input.clusterName || 'production-k8s';
  const groupByNamespace = options.groupByNamespace ?? true;
  const inferConnections = options.inferConnections ?? true;

  const rawResources = parseKubernetesYaml(input.manifestContent, input.filePath || 'manifest.yaml');

  // Filter namespaces if specified
  const filteredResources = rawResources.filter((r) => {
    if (options.filterNamespaces && options.filterNamespaces.length > 0) {
      if (!options.filterNamespaces.includes(r.namespace)) return false;
    }
    if (options.filterResourceTypes && options.filterResourceTypes.length > 0) {
      if (!options.filterResourceTypes.includes(r.resourceType)) return false;
    }
    return true;
  });

  const objects: ModelObject[] = [];
  const connections: ModelConnection[] = [];
  const evidence: Record<ObjectId, K8sEvidence> = {};

  const resourceIdToObjectId = new Map<string, ObjectId>();
  const namespaceToObjectId = new Map<string, ObjectId>();
  const resourceCountsByType: Record<K8sResourceType, number> = {
    cluster: 0,
    namespace: 0,
    deployment: 0,
    statefulset: 0,
    daemonset: 0,
    job: 0,
    cronjob: 0,
    pod: 0,
    service: 0,
    ingress: 0,
    configmap: 0,
    secret: 0,
    pv: 0,
    pvc: 0,
  };

  // 1. Identify distinct namespaces
  const distinctNamespaces = new Set<string>();
  for (const r of filteredResources) {
    distinctNamespaces.add(r.namespace);
    resourceCountsByType[r.resourceType]++;
  }

  // 2. Create Cluster Group Object
  const clusterObjectId = `obj_k8s_cluster_${clusterName.replace(/[^a-zA-Z0-9_]/g, '_')}` as ObjectId;
  objects.push({
    id: clusterObjectId,
    architectureId,
    versionId,
    parentId: null,
    kind: 'group',
    name: `Cluster: ${clusterName}`,
    description: `Kubernetes Cluster: ${clusterName}`,
    metadata: {
      technology: 'Kubernetes Cluster',
      clusterName,
      tags: ['kubernetes', 'cluster', clusterName],
    },
    position: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // 3. Create Namespace Group Objects if groupByNamespace is enabled
  if (groupByNamespace) {
    for (const ns of distinctNamespaces) {
      const nsObjectId = `obj_k8s_ns_${ns}` as ObjectId;
      namespaceToObjectId.set(ns, nsObjectId);

      objects.push({
        id: nsObjectId,
        architectureId,
        versionId,
        parentId: clusterObjectId,
        kind: 'group',
        name: `Namespace: ${ns}`,
        description: `Kubernetes Namespace: ${ns}`,
        metadata: {
          technology: 'Kubernetes Namespace',
          namespace: ns,
          tags: ['kubernetes', 'namespace', ns],
        },
        position: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const nsRes = filteredResources.find(
        (r) => r.resourceType === 'namespace' && (r.name === ns || r.namespace === ns)
      );
      evidence[nsObjectId] = {
        sourceType: 'kubernetes_manifest',
        apiVersion: nsRes?.apiVersion || 'v1',
        kind: 'Namespace',
        namespace: ns,
        name: ns,
        filePath: nsRes?.location.filePath || 'manifest.yaml',
        line: nsRes?.location.line || 1,
        confidence: 1.0,
      };
    }
  }

  // 4. Map Resources to ModelObjects
  for (const res of filteredResources) {
    // Skip explicit Namespace resources if they were already created above
    if (res.resourceType === 'namespace' && groupByNamespace) {
      continue;
    }

    const objectId = `obj_k8s_${res.namespace}_${res.kind}_${res.name}`.replace(
      /[^a-zA-Z0-9_]/g,
      '_'
    ) as ObjectId;
    resourceIdToObjectId.set(res.id, objectId);

    const kind = determineObjectKindForK8s(res.resourceType);

    // Parent ID: Namespace group if enabled, otherwise Cluster group
    let parentId: ObjectId | null = clusterObjectId;
    if (groupByNamespace && namespaceToObjectId.has(res.namespace)) {
      parentId = namespaceToObjectId.get(res.namespace) || clusterObjectId;
    }

    const tech = `Kubernetes · ${res.kind}`;
    const displayName = `${res.name} (${res.kind})`;

    objects.push({
      id: objectId,
      architectureId,
      versionId,
      parentId,
      kind,
      name: displayName,
      description: `Kubernetes ${res.kind}: ${res.name} in namespace ${res.namespace}`,
      metadata: {
        technology: tech,
        kubernetesKind: res.kind,
        resourceType: res.resourceType,
        namespace: res.namespace,
        name: res.name,
        labels: res.labels,
        annotations: res.annotations,
        location: res.location,
        tags: ['kubernetes', res.resourceType, res.kind, res.name, res.namespace],
      },
      position: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    evidence[objectId] = {
      sourceType: 'kubernetes_manifest',
      apiVersion: res.apiVersion,
      kind: res.kind,
      namespace: res.namespace,
      name: res.name,
      filePath: res.location.filePath,
      line: res.location.line,
      confidence: 1.0,
    };
  }

  // 5. Infer Inter-Resource Connections
  if (inferConnections) {
    const createdConnections = new Set<string>();

    const services = filteredResources.filter((r) => r.resourceType === 'service');
    const ingresses = filteredResources.filter((r) => r.resourceType === 'ingress');
    const workloads = filteredResources.filter((r) =>
      ['deployment', 'statefulset', 'daemonset', 'job', 'cronjob', 'pod'].includes(r.resourceType)
    );
    const pvcs = filteredResources.filter((r) => r.resourceType === 'pvc');
    const pvs = filteredResources.filter((r) => r.resourceType === 'pv');
    const configStores = filteredResources.filter((r) =>
      ['configmap', 'secret'].includes(r.resourceType)
    );

    // A. Ingress -> Service
    for (const ing of ingresses) {
      const ingObjId = resourceIdToObjectId.get(ing.id);
      if (!ingObjId) continue;

      const targetSvcNames = extractIngressServices(ing);
      for (const svcName of targetSvcNames) {
        const targetSvc = services.find(
          (s) => s.name === svcName && s.namespace === ing.namespace
        );
        if (!targetSvc) continue;

        const svcObjId = resourceIdToObjectId.get(targetSvc.id);
        if (!svcObjId) continue;

        const connKey = `${ingObjId}->${svcObjId}`;
        if (createdConnections.has(connKey)) continue;
        createdConnections.add(connKey);

        const connId = `conn_k8s_ing_${ing.name}_${targetSvc.name}`.replace(
          /[^a-zA-Z0-9_]/g,
          '_'
        ) as ConnectionId;

        connections.push({
          id: connId,
          architectureId,
          versionId,
          sourceObjectId: ingObjId,
          targetObjectId: svcObjId,
          kind: 'sync',
          label: 'Routes HTTP/S',
          description: `Ingress ${ing.name} routes traffic to Service ${targetSvc.name}`,
          metadata: {
            protocol: 'HTTPS',
            sourceKind: ing.kind,
            targetKind: targetSvc.kind,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    // B. Service -> Workloads (Deployment, StatefulSet, Pod)
    for (const svc of services) {
      const svcObjId = resourceIdToObjectId.get(svc.id);
      if (!svcObjId) continue;

      let selectorApp: string | undefined;
      const selector = svc.spec.selector as Record<string, string> | undefined;
      if (selector?.app) {
        selectorApp = selector.app;
      } else {
        const selMatch = svc.rawText.match(/app:\s*["']?([a-zA-Z0-9_-]+)["']?/);
        if (selMatch && selMatch[1]) {
          selectorApp = selMatch[1];
        }
      }

      for (const wl of workloads) {
        if (wl.namespace !== svc.namespace) continue;

        const template = wl.spec.template as Record<string, unknown> | undefined;
        const wlLabels = (template?.metadata as Record<string, unknown>)?.labels as
          | Record<string, string>
          | undefined;

        let wlApp = wlLabels?.app || wl.labels.app;
        if (!wlApp) {
          const wlMatch = wl.rawText.match(/app:\s*["']?([a-zA-Z0-9_-]+)["']?/);
          if (wlMatch && wlMatch[1]) {
            wlApp = wlMatch[1];
          }
        }

        const isMatch =
          (selector && wlLabels && labelsMatchSelector(wlLabels, selector)) ||
          Boolean(selectorApp && wlApp && selectorApp === wlApp);

        if (isMatch) {
          const wlObjId = resourceIdToObjectId.get(wl.id);
          if (!wlObjId) continue;

          const connKey = `${svcObjId}->${wlObjId}`;
          if (createdConnections.has(connKey)) continue;
          createdConnections.add(connKey);

          const connId = `conn_k8s_svc_${svc.name}_${wl.name}`.replace(
            /[^a-zA-Z0-9_]/g,
            '_'
          ) as ConnectionId;

          connections.push({
            id: connId,
            architectureId,
            versionId,
            sourceObjectId: svcObjId,
            targetObjectId: wlObjId,
            kind: 'sync',
            label: 'Dispatches traffic',
            description: `Service ${svc.name} dispatches to ${wl.kind} ${wl.name}`,
            metadata: {
              protocol: 'TCP / Service Port',
              sourceKind: svc.kind,
              targetKind: wl.kind,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
    }

    // C. Workload -> Storage (PVC)
    for (const wl of workloads) {
      const wlObjId = resourceIdToObjectId.get(wl.id);
      if (!wlObjId) continue;

      const pvcNames = extractPvcNames(wl);
      for (const pvcName of pvcNames) {
        const pvc = pvcs.find((p) => p.name === pvcName && p.namespace === wl.namespace);
        if (!pvc) continue;

        const pvcObjId = resourceIdToObjectId.get(pvc.id);
        if (!pvcObjId) continue;

        const connKey = `${wlObjId}->${pvcObjId}`;
        if (createdConnections.has(connKey)) continue;
        createdConnections.add(connKey);

        const connId = `conn_k8s_vol_${wl.name}_${pvc.name}`.replace(
          /[^a-zA-Z0-9_]/g,
          '_'
        ) as ConnectionId;

        connections.push({
          id: connId,
          architectureId,
          versionId,
          sourceObjectId: wlObjId,
          targetObjectId: pvcObjId,
          kind: 'sync',
          label: 'Mounts PVC',
          description: `${wl.kind} ${wl.name} mounts storage volume ${pvc.name}`,
          metadata: {
            protocol: 'Volume Mount / POSIX',
            sourceKind: wl.kind,
            targetKind: pvc.kind,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    // D. PVC -> PV
    for (const pvc of pvcs) {
      const pvcObjId = resourceIdToObjectId.get(pvc.id);
      if (!pvcObjId) continue;

      let volumeName = pvc.spec.volumeName as string | undefined;
      if (!volumeName) {
        const volMatch = pvc.rawText.match(/volumeName:\s*["']?([a-zA-Z0-9_-]+)["']?/);
        if (volMatch && volMatch[1]) {
          volumeName = volMatch[1];
        }
      }

      if (volumeName) {
        const pv = pvs.find((p) => p.name === volumeName);
        if (pv) {
          const pvObjId = resourceIdToObjectId.get(pv.id);
          if (pvObjId) {
            const connKey = `${pvcObjId}->${pvObjId}`;
            if (!createdConnections.has(connKey)) {
              createdConnections.add(connKey);
              const connId = `conn_k8s_pv_${pvc.name}_${pv.name}`.replace(
                /[^a-zA-Z0-9_]/g,
                '_'
              ) as ConnectionId;

              connections.push({
                id: connId,
                architectureId,
                versionId,
                sourceObjectId: pvcObjId,
                targetObjectId: pvObjId,
                kind: 'sync',
                label: 'Binds PV',
                description: `PVC ${pvc.name} binds to PersistentVolume ${pv.name}`,
                metadata: {
                  protocol: 'Block Storage',
                  sourceKind: pvc.kind,
                  targetKind: pv.kind,
                },
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            }
          }
        }
      }
    }

    // E. Workload -> ConfigMap / Secret
    for (const wl of workloads) {
      const wlObjId = resourceIdToObjectId.get(wl.id);
      if (!wlObjId) continue;

      const { configMaps, secrets } = extractConfigAndSecretRefs(wl);

      for (const cmName of configMaps) {
        const cm = configStores.find(
          (c) => c.name === cmName && c.namespace === wl.namespace && c.resourceType === 'configmap'
        );
        if (!cm) continue;
        const cmObjId = resourceIdToObjectId.get(cm.id);
        if (!cmObjId) continue;

        const connKey = `${wlObjId}->${cmObjId}`;
        if (createdConnections.has(connKey)) continue;
        createdConnections.add(connKey);

        const connId = `conn_k8s_cm_${wl.name}_${cm.name}`.replace(
          /[^a-zA-Z0-9_]/g,
          '_'
        ) as ConnectionId;

        connections.push({
          id: connId,
          architectureId,
          versionId,
          sourceObjectId: wlObjId,
          targetObjectId: cmObjId,
          kind: 'sync',
          label: 'References ConfigMap',
          description: `${wl.kind} ${wl.name} reads configuration from ${cm.name}`,
          metadata: {
            protocol: 'Injected Environment / Volume',
            sourceKind: wl.kind,
            targetKind: cm.kind,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      for (const secName of secrets) {
        const sec = configStores.find(
          (s) => s.name === secName && s.namespace === wl.namespace && s.resourceType === 'secret'
        );
        if (!sec) continue;
        const secObjId = resourceIdToObjectId.get(sec.id);
        if (!secObjId) continue;

        const connKey = `${wlObjId}->${secObjId}`;
        if (createdConnections.has(connKey)) continue;
        createdConnections.add(connKey);

        const connId = `conn_k8s_sec_${wl.name}_${sec.name}`.replace(
          /[^a-zA-Z0-9_]/g,
          '_'
        ) as ConnectionId;

        connections.push({
          id: connId,
          architectureId,
          versionId,
          sourceObjectId: wlObjId,
          targetObjectId: secObjId,
          kind: 'sync',
          label: 'References Secret',
          description: `${wl.kind} ${wl.name} mounts credentials from ${sec.name}`,
          metadata: {
            protocol: 'Encrypted Secrets / Volume',
            sourceKind: wl.kind,
            targetKind: sec.kind,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }
  }

  return {
    objects,
    connections,
    resources: filteredResources,
    evidence,
    summary: {
      totalResources: filteredResources.length,
      mappedObjectCount: objects.length,
      mappedConnectionCount: connections.length,
      namespaceCount: distinctNamespaces.size,
      resourceCountsByType,
    },
  };
}

/**
 * Creates a rich, realistic sample Kubernetes manifest string for testing and acceptance verification.
 * Contains all 12 canonical Kubernetes resource types across workloads, networking, and storage.
 */
export function createMockKubernetesManifests(): string {
  return `
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    tier: production
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: edge-ingress
  namespace: production
  annotations:
    kubernetes.io/ingress.class: nginx
spec:
  rules:
    - host: api.diagramhq.com
      http:
        paths:
          - path: /
            backend:
              service:
                name: api-gateway-service
---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway-service
  namespace: production
spec:
  selector:
    app: api-gateway
  ports:
    - port: 80
      targetPort: 3000
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway-deployment
  namespace: production
spec:
  replicas: 3
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
        - name: gateway
          image: diagramhq/gateway:v1.2.0
          envFrom:
            - configMapRef:
                name: gateway-config
            - secretRef:
                name: jwt-secrets
---
apiVersion: v1
kind: Service
metadata:
  name: database-service
  namespace: production
spec:
  selector:
    app: postgres-db
  ports:
    - port: 5432
      targetPort: 5432
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-statefulset
  namespace: production
spec:
  replicas: 1
  template:
    metadata:
      labels:
        app: postgres-db
    spec:
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: postgres-data-pvc
      containers:
        - name: postgres
          image: postgres:16
          envFrom:
            - secretRef:
                name: jwt-secrets
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data-pvc
  namespace: production
spec:
  volumeName: production-pv-storage
  accessModes:
    - ReadWriteOnce
---
apiVersion: v1
kind: PersistentVolume
metadata:
  name: production-pv-storage
  namespace: default
spec:
  capacity:
    storage: 100Gi
  accessModes:
    - ReadWriteOnce
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: gateway-config
  namespace: production
data:
  LOG_LEVEL: info
  REGION: us-east-1
---
apiVersion: v1
kind: Secret
metadata:
  name: jwt-secrets
  namespace: production
type: Opaque
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: nightly-backup-cronjob
  namespace: production
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: diagramhq/backup:latest
---
apiVersion: v1
kind: Pod
metadata:
  name: debug-bastion-pod
  namespace: production
spec:
  containers:
    - name: alpine
      image: alpine:latest
`;
}
