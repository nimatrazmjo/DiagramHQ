import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { InspectorPanel } from './components/shell/inspector-panel';

describe('InspectorPanel', () => {
  it('renders inspector-panel with object name and kind badge', () => {
    const html = renderToString(
      <InspectorPanel objectId="obj-1" objectName="TestObject" objectKind="Service" />
    );
    expect(html).toContain('TestObject');
    expect(html).toContain('Service');
    expect(html).toContain('data-testid="inspector-panel"');
  });

  it('renders all major field sections (identity, ownership, technical)', () => {
    const html = renderToString(<InspectorPanel objectId="obj-1" />);
    expect(html).toContain('Identity');
    expect(html).toContain('Ownership');
    expect(html).toContain('Technical');
  });

  it('renders close button', () => {
    const html = renderToString(<InspectorPanel objectId="obj-1" />);
    expect(html).toContain('data-testid="inspector-close"');
  });

  it('renders metadata field values when provided', () => {
    const html = renderToString(
      <InspectorPanel
        objectId="obj-1"
        metadata={{ owner: 'Alice', technology: 'Node.js' }}
      />
    );
    expect(html).toContain('Alice');
    expect(html).toContain('Node.js');
  });
});
