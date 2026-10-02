import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  type ModelObject,
  type CodeLocationSpec,
  type ObjectId,
  type ArchitectureId,
  type VersionId,
  createCodeMapping,
  attachCodeMappingToObject,
} from '@diagramhq/domain';
import {
  CodeMappingBadge,
  OpenInRepoButton,
  CodeMappingEditorDrawer,
} from './components/canvas/code-mapping-panel';

describe('Code-to-Architecture Mapping Canvas UI (F075)', () => {
  const mockComponent: ModelObject = {
    id: 'obj-order-api' as ObjectId,
    architectureId: 'arch-sys-1' as ArchitectureId,
    versionId: 'ver-v1' as VersionId,
    name: 'Order API Service',
    kind: 'application',
    position: { x: 200, y: 150 },
    description: 'Order processing and dispatch endpoint',
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const sampleLocation: CodeLocationSpec = {
    repositoryUrl: 'https://github.com/acme-corp/order-service',
    provider: 'github',
    branchOrRef: 'main',
    folderPath: 'services/order-service',
    filePath: 'src/routes/order.controller.ts',
    lineStart: 18,
    lineEnd: 54,
  };

  it('renders CodeMappingBadge with provider icon, file target, line numbers, and link', () => {
    const html = renderToString(<CodeMappingBadge location={sampleLocation} />);

    expect(html).toContain('🐙');
    expect(html).toContain('src/routes/order.controller.ts:18-54');
    expect(html).toContain(
      'href="https://github.com/acme-corp/order-service/blob/main/src/routes/order.controller.ts#L18-L54"'
    );
    expect(html).toContain('data-testid="code-mapping-badge"');
  });

  it('renders OpenInRepoButton with canonical GitHub and GitLab remote links', () => {
    const githubHtml = renderToString(<OpenInRepoButton location={sampleLocation} />);
    expect(githubHtml).toContain('Open in GitHub');
    expect(githubHtml).toContain('🐙');
    expect(githubHtml).toContain(
      'href="https://github.com/acme-corp/order-service/blob/main/src/routes/order.controller.ts#L18-L54"'
    );

    const gitlabLocation: CodeLocationSpec = {
      repositoryUrl: 'https://gitlab.com/acme-corp/billing-service',
      provider: 'gitlab',
      branchOrRef: 'develop',
      filePath: 'pkg/billing/invoice.go',
      lineStart: 10,
      lineEnd: 25,
    };
    const gitlabHtml = renderToString(<OpenInRepoButton location={gitlabLocation} />);
    expect(gitlabHtml).toContain('Open in GitLab');
    expect(gitlabHtml).toContain('🦊');
    expect(gitlabHtml).toContain(
      'href="https://gitlab.com/acme-corp/billing-service/-/blob/develop/pkg/billing/invoice.go#L10-25"'
    );
  });

  it('renders CodeMappingEditorDrawer with live computed preview and form controls', () => {
    const mapping = createCodeMapping({
      objectId: mockComponent.id,
      architectureId: mockComponent.architectureId,
      location: sampleLocation,
    });
    const mappedObject = attachCodeMappingToObject(mockComponent, mapping);

    const onClose = vi.fn();
    const onSave = vi.fn();

    const html = renderToString(
      <CodeMappingEditorDrawer
        isOpen={true}
        onClose={onClose}
        object={mappedObject}
        initialMapping={sampleLocation}
        onSaveMapping={onSave}
      />
    );

    expect(html).toContain('Code-to-Architecture Mapping');
    expect(html).toContain('Order API Service');
    expect(html).toContain('https://github.com/acme-corp/order-service/blob/main/src/routes/order.controller.ts#L18-L54');
    expect(html).toContain('data-testid="code-mapping-editor-drawer"');
    expect(html).toContain('data-testid="preview-url"');
    expect(html).toContain('Save Code Mapping');
  });

  it('returns null when drawer is closed', () => {
    const html = renderToString(
      <CodeMappingEditorDrawer
        isOpen={false}
        onClose={() => {}}
        object={mockComponent}
      />
    );
    expect(html).toBe('');
  });
});
