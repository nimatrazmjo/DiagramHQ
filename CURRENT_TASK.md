# Current Task: F079 — Azure

**Status**: NOT STARTED

## Description
Import and map real Microsoft Azure cloud infrastructure into the DiagramHQ architecture model (equivalent feature parity with F078 — AWS):
- Discovers and parses Azure resources across subscriptions, resource groups, and regions:
  - Compute: Virtual Machines (Azure VM), Azure App Services / Web Apps, Azure Functions, Azure Kubernetes Service (AKS), Container Apps
  - Storage & Database: Azure SQL Database, Azure Cosmos DB, Azure Blob Storage
  - Networking & Ingress: Virtual Networks (VNet), Subnets, Azure Application Gateway, Azure Front Door / CDN, Azure API Management (APIM)
  - Messaging & Events: Azure Service Bus (Queues & Topics), Azure Event Hubs, Azure Event Grid
- Resource to DiagramHQ Object mapping:
  - Maps Azure Resource IDs (`/subscriptions/.../resourceGroups/.../providers/...`), resource types, tags, regions, and configuration metadata to typed `ModelObject` instances
  - Derives inter-resource connections (e.g., Front Door -> App Service, APIM -> Functions, AKS/VM -> SQL Database, Functions -> Service Bus)
  - Retains raw cloud evidence and Resource ID references for governance and drift auditing
- Acceptance test: import mocked Azure resources -> resources mapped.

Acceptance Criteria:
- Equivalent Azure resource import (Compute, Storage, Networking, Messaging)
- Test: import mocked Azure resources.

- Feature ID: F079
- Phase: 10 — Infrastructure Integrations
- Dependencies: F078, Phase 03, Phase 09

## Next Steps
1. In `packages/domain/src/`, implement the Azure infrastructure mapper module (`azure.ts`):
   - Type definitions: `AzureResource`, `AzureResourceType`, `AzureSubscriptionScanInput`, `AzureImportResult`, `AzureCloudEvidence`, etc.
   - Resource parsers and normalizers for Azure VMs, App Services, Functions, AKS, SQL, Cosmos DB, Blob Storage, Front Door, APIM, Service Bus, Event Hubs, Event Grid, VNets.
   - Relationship and dependency linkers for Azure topologies.
   - Unit tests in `packages/domain/src/azure.test.ts`.
2. In `apps/web/`, implement canvas UI components:
   - `<AzureImportModal />` in `apps/web/components/canvas/azure-panel.tsx`.
   - Integration specs in `apps/web/azure.spec.tsx`.
3. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
