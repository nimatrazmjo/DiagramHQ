# Phase 10 — Infrastructure Integrations

Status: IN PROGRESS

## Description
Import real infrastructure into the model: AWS/Azure/GCP, Terraform, Kubernetes, plus cloud resource discovery and cost.

## Dependencies
Phase 03, Phase 09

## Features

### F078 — AWS

Status: COMPLETE

Description: Import AWS resources.

Acceptance Criteria:

- Import EC2, ECS, EKS, Lambda, RDS, DynamoDB, S3, CloudFront, API Gateway, SQS, SNS, EventBridge, VPC as objects

Test: import a mocked account -> resources mapped.

### F079 — Azure

Status: COMPLETE

Description: Import Azure resources.

Dependencies: F078

Acceptance Criteria:

- Equivalent Azure resource import

Test: import mocked Azure resources.

### F080 — GCP

Status: COMPLETE

Description: Import GCP resources.

Dependencies: F078

Acceptance Criteria:

- Equivalent GCP resource import

Test: import mocked GCP resources.

### F081 — Terraform

Status: COMPLETE

Description: Parse Terraform.

Dependencies: F072

Acceptance Criteria:

- Map aws_instance, aws_db_instance, aws_s3_bucket, aws_lambda_function, aws_sqs_queue, etc. to objects

Test: parse sample TF -> expected resources mapped.

### F082 — Kubernetes

Status: COMPLETE

Description: Import cluster topology.

Acceptance Criteria:

- Import cluster, namespace, deployment, statefulset, pod, service, ingress, configmap, secret, pv, job, cronjob; render topology

Test: import sample manifests -> topology renders.

### F083 — Cloud resource discovery

Status: COMPLETE

Description: Live discovery.

Dependencies: F078

Acceptance Criteria:

- Discover live resources across accounts; propose objects with evidence

Test: discovery proposes resources with evidence.

### F128 — Cost visualization

Status: NOT STARTED

Description: Cost per service.

Dependencies: F078

Acceptance Criteria:

- Attach cloud cost to infra objects; per-service rollup (compute/db/storage/networking)

Test: mocked cost data rolls up per service.

---

## Phase Completion Criteria

This phase is COMPLETE only when:

- Every feature above is COMPLETE with recorded evidence
- All acceptance criteria pass; tests pass (typecheck, lint, unit, integration as applicable)
- No critical blockers remain (BLOCKERS.md)
- Documentation exists; existing functionality still works (no regressions)
- check-architecture is clean (layer boundaries)
- PROJECT_STATE.md, ROADMAP.md, and CHANGELOG.md are updated
