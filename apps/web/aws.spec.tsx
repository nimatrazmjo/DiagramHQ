import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { AwsImportModal } from './components/canvas/aws-panel';
import type { ArchitectureId, VersionId } from '@diagramhq/domain';

describe('AWS Infrastructure Import Canvas UI (F078)', () => {
  const archId = 'arch-prod-aws' as ArchitectureId;
  const verId = 'ver-prod-v1' as VersionId;

  it('renders AwsImportModal with header, configuration inputs, resource chips, and discovered inventory', () => {
    const html = renderToString(
      <AwsImportModal
        isOpen={true}
        onClose={vi.fn()}
        architectureId={archId}
        versionId={verId}
        onImportSuccess={vi.fn()}
      />
    );

    expect(html).toContain('AWS Infrastructure Import (F078)');
    expect(html).toContain('123456789012');
    expect(html).toContain('DiagramHQReadOnlyAccess');
    expect(html).toContain('us-east-1');
    expect(html).toContain('SUPPORTED RESOURCE TYPES');
    expect(html).toContain('LAMBDA');
    expect(html).toContain('DYNAMODB');
    expect(html).toContain('RDS');
    expect(html).toContain('VPC');
    expect(html).toContain('Discovered AWS Inventory');
    expect(html).toContain('Import to Model');
  });

  it('renders closed state returning null without rendering modal content', () => {
    const html = renderToString(
      <AwsImportModal
        isOpen={false}
        onClose={vi.fn()}
      />
    );

    expect(html).toBe('');
  });

  it('renders inventory items representing all 13 canonical AWS resource types', () => {
    const html = renderToString(
      <AwsImportModal
        isOpen={true}
        onClose={vi.fn()}
        architectureId={archId}
        versionId={verId}
      />
    );

    // Verify all 13 types are visible in the rendered modal
    const types = [
      'EC2',
      'ECS',
      'EKS',
      'LAMBDA',
      'RDS',
      'DYNAMODB',
      'S3',
      'CLOUDFRONT',
      'API_GATEWAY',
      'SQS',
      'SNS',
      'EVENTBRIDGE',
      'VPC',
    ];

    for (const t of types) {
      expect(html).toContain(t);
    }
  });
});
