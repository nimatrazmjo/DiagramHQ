# DiagramHQ Helm Chart

Production-grade Helm chart for deploying [DiagramHQ](https://github.com/diagramhq/diagramhq) on Kubernetes, supporting multi-cloud customer VPCs (AWS EKS, GCP GKE, Azure AKS) and self-hosted air-gapped enclaves with zero outbound egress.

## Architecture

The chart deploys:
- **DiagramHQ Web Gateway**: Next.js App Router interactive infinite canvas and architecture portal.
- **DiagramHQ API Server**: NestJS backend executing C4 domain projections, graph algorithms, and model persistence.
- **PostgreSQL**: Relational database (embedded StatefulSet or external AWS RDS / GCP Cloud SQL).
- **Redis**: In-memory caching and session synchronization (embedded or external).
- **MinIO / Object Storage**: S3-compatible document and snapshot storage (embedded or AWS S3 / GCS / Azure Blob).
- **NetworkPolicy**: Strict egress filtering for zero-trust and air-gapped compliance.
- **Migration Job**: Database migration runner ensuring schema updates are applied.

## Quick Start

### 1. Install Default Chart (Standalone Mode)

```bash
helm install diagramhq ./charts/diagramhq --namespace diagramhq --create-namespace
```

### 2. Verify Deployment

```bash
helm test diagramhq --namespace diagramhq
```

### 3. Port Forward Web Studio

```bash
kubectl --namespace diagramhq port-forward svc/diagramhq-web 3000:3000
# Open http://localhost:3000
```

---

## Air-Gapped & Customer VPC Deployment

To deploy in an air-gapped customer VPC with internal container registries and egress restriction:

```yaml
# customer-airgap-values.yaml
global:
  customer: "Enterprise Customer"
  environment: "prod-vpc-us-east"
  provider: "aws_vpc"
  airGapped: true

image:
  registry: "docker.customer.internal/diagramhq"
  pullPolicy: IfNotPresent
  tag: "1.0.0"

security:
  networkPolicy:
    enabled: true
    egress:
      to:
        - ipBlock: { cidr: "10.0.0.0/8" }
        - ipBlock: { cidr: "172.16.0.0/12" }

database:
  host: "postgres.customer.internal"
  port: 5432
  name: "diagramhq_production"
  sslMode: "require"

storage:
  provider: "s3_vpc_endpoint"
  endpoint: "https://bucket.vpce-s3.us-east-1.amazonaws.com"
  bucket: "diagramhq-enterprise-assets"

license:
  offlineKey: "DHQ-ENTERPRISE-OFFLINE-AIRGAP-KEY-2026-SIGNED"
```

Install using:

```bash
helm install diagramhq ./charts/diagramhq -f customer-airgap-values.yaml --namespace diagramhq
```

---

## Configuration Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `global.customer` | Customer name for enterprise telemetry/licensing | `"DiagramHQ Customer"` |
| `global.environment` | Environment label (`production`, `staging`, `vpc`) | `"production"` |
| `global.airGapped` | Enable air-gapped zero-outbound-egress mode | `false` |
| `image.registry` | Global image registry prefix | `""` |
| `image.tag` | DiagramHQ container image tag | `"1.0.0"` |
| `image.pullPolicy` | Image pull policy | `IfNotPresent` |
| `web.replicaCount` | Replicas for Web Gateway | `2` |
| `web.service.type` | Web Gateway service type | `ClusterIP` |
| `web.service.port` | Web Gateway service port | `3000` |
| `web.ingress.enabled` | Enable Kubernetes Ingress for Web | `false` |
| `web.resources` | CPU/Memory requests and limits for Web | `{ limits: { cpu: 1000m, memory: 1Gi }, requests: { cpu: 250m, memory: 512Mi } }` |
| `web.autoscaling.enabled`| Enable HorizontalPodAutoscaler for Web | `false` |
| `api.replicaCount` | Replicas for Backend API | `2` |
| `api.service.type` | API service type | `ClusterIP` |
| `api.service.port` | API service port | `4000` |
| `api.ingress.enabled` | Enable Kubernetes Ingress for API | `false` |
| `api.resources` | CPU/Memory requests and limits for API | `{ limits: { cpu: 2000m, memory: 2Gi }, requests: { cpu: 500m, memory: 1Gi } }` |
| `api.autoscaling.enabled`| Enable HorizontalPodAutoscaler for API | `false` |
| `database.host` | Host of external PostgreSQL database | `""` (uses embedded postgres if empty) |
| `database.port` | Port of PostgreSQL database | `5432` |
| `database.name` | Database name | `"diagramhq"` |
| `database.sslMode` | SSL mode (`disable`, `require`, `verify-full`)| `"disable"` |
| `postgresql.enabled` | Deploy embedded PostgreSQL StatefulSet | `true` |
| `postgresql.persistence.size` | PVC size for embedded PostgreSQL | `10Gi` |
| `redis.enabled` | Deploy embedded Redis | `true` |
| `storage.provider` | Object storage provider (`minio`, `s3_vpc_endpoint`, etc.) | `"minio"` |
| `minio.enabled` | Deploy embedded MinIO server | `false` |
| `license.offlineKey` | Signed enterprise offline license key | `""` |
| `security.networkPolicy.enabled` | Enforce Kubernetes NetworkPolicy | `false` |
| `security.networkPolicy.egress.to` | Allowed egress IPBlocks/CIDRs | `[]` |
| `migration.enabled` | Run Prisma migration job on install/upgrade | `true` |
