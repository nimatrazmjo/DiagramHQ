import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { TerraformImportModal } from './components/canvas/terraform-panel';
import type { ArchitectureId, VersionId } from '@diagramhq/domain';

describe('Terraform IaC Import Canvas UI (F081)', () => {
  const archId = 'arch-prod-tf' as ArchitectureId;
  const verId = 'ver-prod-v1' as VersionId;

  it('renders TerraformImportModal with header, repo input, provider chips, and inventory table', () => {
    const html = renderToString(
      <TerraformImportModal
        isOpen={true}
        onClose={vi.fn()}
        architectureId={archId}
        versionId={verId}
        onImportSuccess={vi.fn()}
      />
    );

    expect(html).toContain('Terraform IaC Importer');
    expect(html).toContain('https://github.com/diagramhq/infra-production');
    expect(html).toContain('Load Sample IaC Repo');
    expect(html).toContain('AWS');
    expect(html).toContain('AZURERM');
    expect(html).toContain('GOOGLE');
    expect(html).toContain('KUBERNETES');
    expect(html).toContain('Group Resources by Module');
    expect(html).toContain('Infer Inter-Resource Dependencies');
    expect(html).toContain('Discovered Architecture Preview');
    expect(html).toContain('Import to Architecture Model');
  });

  it('renders closed state returning null without rendering modal content', () => {
    const html = renderToString(
      <TerraformImportModal
        isOpen={false}
        onClose={vi.fn()}
      />
    );

    expect(html).toBe('');
  });

  it('renders discovered sample Terraform resources in the preview table', () => {
    const html = renderToString(
      <TerraformImportModal
        isOpen={true}
        onClose={vi.fn()}
        architectureId={archId}
        versionId={verId}
      />
    );

    expect(html).toContain('aws_vpc.main');
    expect(html).toContain('aws_db_instance.postgres');
    expect(html).toContain('aws_api_gateway_rest_api.gateway');
    expect(html).toContain('aws_ecs_service.order_service');
    expect(html).toContain('aws_lambda_function.auth_handler');
    expect(html).toContain('aws_s3_bucket.assets');
  });
});
