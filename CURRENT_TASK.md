# Current Task: F078 — AWS

**Status**: NOT STARTED

## Description
Import and map real AWS cloud infrastructure into the DiagramHQ architecture model:
- Discovers and parses AWS resources across accounts and regions:
  - Compute: EC2 instances, ECS clusters & services, EKS clusters & node groups, Lambda functions
  - Storage & Database: RDS instances & clusters, DynamoDB tables, S3 buckets
  - Networking & Content Delivery: VPCs, Subnets, Internet Gateways, Route Tables, CloudFront distributions, API Gateway REST & HTTP APIs
  - Messaging & Events: SQS queues, SNS topics, EventBridge event buses & rules
- Resource to DiagramHQ Object mapping:
  - Maps AWS ARNs, resource types, tags, regions, and configuration metadata to typed `ModelObject` instances
  - Derives inter-resource connections (e.g., API Gateway -> Lambda, Lambda -> DynamoDB/RDS/SQS, ECS/EC2 -> VPC/Subnet)
  - Retains raw cloud evidence and ARN references for governance and drift auditing
- Acceptance test: import a mocked AWS account -> resources correctly mapped to model objects and connections.

Acceptance Criteria:
- Import EC2, ECS, EKS, Lambda, RDS, DynamoDB, S3, CloudFront, API Gateway, SQS, SNS, EventBridge, VPC as objects
- Test: import a mocked account -> resources mapped.

- Feature ID: F078
- Phase: 10 — Infrastructure Integrations
- Dependencies: Phase 03, Phase 09

## Next Steps
1. In `packages/domain/src/`, implement the AWS infrastructure mapper module (`aws.ts`):
   - Type definitions: `AwsResource`, `AwsResourceType`, `AwsAccountScanResult`, `AwsObjectMappingResult`, etc.
   - Resource parsers and normalizers for EC2, ECS, EKS, Lambda, RDS, DynamoDB, S3, CloudFront, API Gateway, SQS, SNS, EventBridge, VPC.
   - Relationship and dependency linkers for AWS topologies.
   - Unit tests in `packages/domain/src/aws.test.ts`.
2. In `apps/web/`, implement canvas UI components:
   - `<AwsImportModal />` in `apps/web/components/canvas/aws-panel.tsx`.
   - Integration specs in `apps/web/aws.spec.tsx`.
3. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
