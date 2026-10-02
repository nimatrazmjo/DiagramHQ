# Current Task: F083 — Cloud resource discovery

**Status**: NOT STARTED

## Description
Unified multi-cloud resource discovery and automated architecture proposal engine for DiagramHQ (Phase 10 — Infrastructure Integrations):
- Multi-cloud live resource discovery across accounts and subscriptions:
  - Supports multiple cloud providers (AWS, Azure, GCP, Kubernetes) and accounts/projects/subscriptions.
  - Discover resources: compute (instances, container clusters, serverless functions), databases (relational, NoSQL, caches), storage (buckets, volumes), networking (VPCs, VNets, load balancers, API gateways), messaging (queues, topics, streams).
  - Collects discovered inventory with metadata (resource ARN/ID, type, region, tags, network coordinates).
- Automated architecture reconciliation and proposal generation:
  - Compares discovered cloud resources against active architecture model objects.
  - Categorizes discovered assets:
    - `matched`: Resource already mapped to an existing model object (updates metadata/tags/freshness).
    - `unmanaged`: Resource detected in cloud account but not yet present in architecture model (proposes new model object).
    - `drifted`: Previously mapped model object whose backing cloud resource is missing or modified.
  - Grounded evidence: each proposal attaches traceable `CloudDiscoveryEvidence` with resource ID/ARN, provider, region, account/project ID, discovery timestamp, and confidence score.
  - Human-in-the-loop review: interactive acceptance/rejection of proposed additions before applying to the model.

Acceptance Criteria:
- Discover live resources across accounts; propose objects with evidence
- Test: discovery proposes resources with evidence.

- Feature ID: F083
- Phase: 10 — Infrastructure Integrations
- Dependencies: F078, F079, F080, F081, F082, Phase 03, Phase 09

## Next Steps
1. In `packages/domain/src/`, implement the cloud resource discovery engine (`cloud-discovery.ts`):
   - Type definitions: `DiscoveredResource`, `CloudAccountConfig`, `DiscoveryProposal`, `CloudDiscoveryEvidence`, `DiscoveryRunResult`, etc.
   - Resource discovery scanner across providers (AWS, Azure, GCP, K8s).
   - Reconciliation logic matching discovered resources against existing `ModelObject` records.
   - Generation of typed additions/updates with concrete evidence and confidence.
   - Unit tests in `packages/domain/src/cloud-discovery.test.ts`.
2. In `apps/web/`, implement canvas UI components:
   - `<CloudDiscoveryPanel />` / `<CloudDiscoveryModal />` in `apps/web/components/canvas/cloud-discovery-panel.tsx`.
   - Integration specs in `apps/web/cloud-discovery.spec.tsx`.
3. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
