# Current Task: F080 — GCP

**Status**: NOT STARTED

## Description
Import and map real Google Cloud Platform (GCP) cloud infrastructure into the DiagramHQ architecture model (equivalent feature parity with F078 — AWS and F079 — Azure):
- Discovers and parses GCP resources across projects, folders, and regions:
  - Compute: Compute Engine (GCE VMs), Google Kubernetes Engine (GKE Clusters), Cloud Run (Serverless containers), Cloud Functions (Gen 1 & Gen 2), App Engine
  - Storage & Database: Cloud SQL (PostgreSQL, MySQL, SQL Server), Cloud Spanner, Cloud Bigtable, Cloud Firestore / Datastore, Cloud Storage (GCS buckets)
  - Networking & Ingress: VPC Networks, Subnets, Cloud Load Balancing, Cloud CDN, Cloud Armor, Cloud Endpoints / API Gateway
  - Messaging & Integration: Cloud Pub/Sub (Topics & Subscriptions), Eventarc, Cloud Tasks
- Resource to DiagramHQ Object mapping:
  - Maps GCP Resource URIs / names (`projects/{project}/regions/{region}/...`), resource types, labels, regions, and configuration metadata to typed `ModelObject` instances
  - Derives inter-resource connections (e.g., Cloud Load Balancing -> Cloud Run / GKE, Cloud Functions -> Cloud SQL / Firestore, Pub/Sub -> Cloud Functions / Cloud Run)
  - Retains raw cloud evidence and Resource URI references for governance and drift auditing
- Acceptance test: import mocked GCP resources -> resources mapped.

Acceptance Criteria:
- Equivalent GCP resource import (Compute, Storage, Networking, Messaging)
- Test: import mocked GCP resources.

- Feature ID: F080
- Phase: 10 — Infrastructure Integrations
- Dependencies: F078, F079, Phase 03, Phase 09

## Next Steps
1. In `packages/domain/src/`, implement the GCP infrastructure mapper module (`gcp.ts`):
   - Type definitions: `GcpResource`, `GcpResourceType`, `GcpProjectScanInput`, `GcpImportResult`, `GcpCloudEvidence`, etc.
   - Resource parsers and normalizers for GCE, GKE, Cloud Run, Cloud Functions, Cloud SQL, Spanner, Bigtable, Firestore, GCS, Cloud LB, Cloud CDN, VPC, Pub/Sub, Eventarc.
   - Relationship and dependency linkers for GCP topologies.
   - Unit tests in `packages/domain/src/gcp.test.ts`.
2. In `apps/web/`, implement canvas UI components:
   - `<GcpImportModal />` in `apps/web/components/canvas/gcp-panel.tsx`.
   - Integration specs in `apps/web/gcp.spec.tsx`.
3. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
