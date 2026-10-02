# Current Task: F081 — Terraform

**Status**: NOT STARTED

## Description
Parse Terraform (HCL and state files) and map infrastructure as code into the DiagramHQ architecture model (Phase 10 — Infrastructure Integrations):
- Parse Terraform configurations (`.tf`, `.tfvars`, `.tfstate` / JSON plans):
  - Extract resources (`resource "type" "name"`), data sources (`data "type" "name"`), modules (`module "name"`), and outputs (`output "name"`).
  - Multi-provider support (AWS, Azure, GCP, Kubernetes, generic resources).
  - Module hierarchy resolution and parameter propagation.
- Map to architecture model:
  - Map Terraform resources to typed `ModelObject` instances (`application`, `store`, `group`, `component`).
  - Derive inter-resource `ModelConnection` links based on resource references and dependency graphs (`depends_on`, attribute interpolation like `${aws_security_group.sg.id}`).
  - Maintain traceability with code location evidence (file path, line numbers) and Terraform address (`aws_instance.web`).
- Acceptance test: parse a sample Terraform repo -> model generated with resources, modules, and connections.

Acceptance Criteria:
- Parse Terraform configs
- Extract resources, modules, outputs
- Map to architecture model
- Test: parse a sample Terraform repo -> model generated.

- Feature ID: F081
- Phase: 10 — Infrastructure Integrations
- Dependencies: F072, F078, F079, F080, Phase 03, Phase 09

## Next Steps
1. In `packages/domain/src/`, implement the Terraform parser and mapping engine (`terraform.ts`):
   - Type definitions: `TerraformResource`, `TerraformModule`, `TerraformOutput`, `TerraformConfigScanInput`, `TerraformImportResult`, etc.
   - HCL / AST token-based parser and state JSON interpreter.
   - Resource-to-model object mapping and reference-based connection derivation.
   - Unit tests in `packages/domain/src/terraform.test.ts`.
2. In `apps/web/`, implement canvas UI components:
   - `<TerraformImportModal />` in `apps/web/components/canvas/terraform-panel.tsx`.
   - Integration specs in `apps/web/terraform.spec.tsx`.
3. Verify with `pnpm typecheck && pnpm lint && pnpm check-architecture && pnpm test && pnpm build`.
