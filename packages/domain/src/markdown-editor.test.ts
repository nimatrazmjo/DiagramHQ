import { describe, expect, it } from 'vitest';
import {
  parseMarkdownDocument,
  renderMarkdownToHtml,
  createDiagramEmbedDirective,
  createObjectEmbedDirective,
  createFlowEmbedDirective,
  createAdrEmbedDirective,
  insertTableMarkdown,
  insertCodeBlockMarkdown,
  insertImageMarkdown,
  addDocumentComment,
  resolveDocumentComment,
  slugifyHeading,
} from './markdown-editor';
import type {
  ArchitectureModel,
  ModelObject,
  View,
  Flow,
} from './types';
import type { ArchitectureDecisionRecord } from './adrs';
import type { Comment, CommentAuthor } from './comments';
import { createId, type ArchitectureId, type VersionId, type WorkspaceId } from './ids';

describe('F093: Markdown Documentation Editor Engine', () => {
  const archId = 'arch-test-1' as ArchitectureId;
  const verId = 'ver-test-1' as VersionId;
  const wsId = 'ws-test-1' as unknown as WorkspaceId;

  const orderSvcId = createId('object');
  const paymentSvcId = createId('object');

  const objects: ModelObject[] = [
    {
      id: orderSvcId,
      architectureId: archId,
      versionId: verId,
      kind: 'application',
      name: 'Order Service',
      description: 'Microservice managing order checkout and fulfillment.',
      metadata: { technology: 'Go / gRPC' },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: paymentSvcId,
      architectureId: archId,
      versionId: verId,
      kind: 'application',
      name: 'Payment Service',
      description: 'Handles tokenized payments via Stripe.',
      metadata: { technology: 'Rust / Actix' },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const model: ArchitectureModel = {
    architecture: {
      id: archId,
      workspaceId: wsId,
      name: 'ShopSphere Core',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    version: {
      id: verId,
      architectureId: archId,
      name: 'v1.0.0',
      kind: 'main',
      status: 'approved',
      createdAt: new Date(),
    },
    objects,
    connections: [],
  };

  const sampleViews: View[] = [
    {
      id: createId('view'),
      architectureId: archId,
      name: 'Checkout Flow Container View',
      kind: 'container',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const sampleFlows: Flow[] = [
    {
      id: createId('flow'),
      architectureId: archId,
      name: 'Customer Checkout Flow',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const sampleAdrs: ArchitectureDecisionRecord[] = [
    {
      id: createId('decision'),
      number: 14,
      title: 'Adopt Kafka for Async Messaging',
      status: 'accepted',
      context: 'Need event backbone',
      decision: 'Use Apache Kafka',
      consequences: 'Requires cluster maintenance',
      alternatives: ['RabbitMQ'],
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  describe('Directive Builders & Helpers', () => {
    it('creates diagram embed directive correctly', () => {
      const directive = createDiagramEmbedDirective({
        viewId: 'view-checkout-container',
        title: 'Checkout Container View',
        caption: 'Detailed container interactions',
        width: '100%',
        height: '450px',
      });

      expect(directive).toContain('```diagram');
      expect(directive).toContain('id: view-checkout-container');
      expect(directive).toContain('title: Checkout Container View');
      expect(directive).toContain('caption: Detailed container interactions');
      expect(directive).toContain('width: 100%');
      expect(directive).toContain('height: 450px');
      expect(directive).toContain('```');
    });

    it('creates object, flow, and adr embed directives', () => {
      const objDir = createObjectEmbedDirective({ objectId: 'obj-orders', title: 'Orders System' });
      expect(objDir).toContain('```object');
      expect(objDir).toContain('id: obj-orders');
      expect(objDir).toContain('title: Orders System');

      const flowDir = createFlowEmbedDirective({ flowId: 'flow-checkout', title: 'Checkout Process' });
      expect(flowDir).toContain('```flow');
      expect(flowDir).toContain('id: flow-checkout');

      const adrDir = createAdrEmbedDirective({ adrId: 'adr-014', title: 'Kafka Adoption' });
      expect(adrDir).toContain('```adr');
      expect(adrDir).toContain('id: adr-014');
    });

    it('formats markdown tables cleanly', () => {
      const table = insertTableMarkdown(
        ['Service', 'Protocol', 'Port'],
        [
          ['Order Service', 'gRPC', '50051'],
          ['Payment Service', 'HTTPS', '443'],
        ],
      );

      expect(table).toContain('| Service');
      expect(table).toContain('| Order Service');
      expect(table).toContain('| Payment Service');
      expect(table).toContain(':---');
    });

    it('formats code blocks and image markdown', () => {
      const code = insertCodeBlockMarkdown('typescript', 'const a = 1;');
      expect(code).toBe('```typescript\nconst a = 1;\n```');

      const img = insertImageMarkdown('Network Diagram', 'https://example.com/net.png', 'VPC Setup');
      expect(img).toBe('![Network Diagram](https://example.com/net.png "VPC Setup")');
    });

    it('slugifies headings reliably', () => {
      expect(slugifyHeading('Overview & System Architecture!')).toBe('overview-system-architecture');
      expect(slugifyHeading('  API Gateway 2.0 ')).toBe('api-gateway-20');
    });
  });

  describe('Document Parser', () => {
    it('parses markdown document, builds TOC, and extracts all embed types', () => {
      const docMarkdown = `# E-Commerce Architecture Spec

## System Overview
The platform provides multi-tier commerce services. See @[Order Service] for checkout.

### Core Dependencies
| Component | Technology | Owner |
| :--- | :--- | :--- |
| Storefront | React | Frontend Team |
| Order Service | Go | Commerce Squad |

\`\`\`diagram
id: ${sampleViews[0]?.id}
title: Checkout Flow Container View
caption: Main user journey through order microservices
\`\`\`

\`\`\`object
id: ${orderSvcId}
title: Order Microservice
\`\`\`

\`\`\`flow
id: ${sampleFlows[0]?.id}
title: Customer Checkout Flow
\`\`\`

\`\`\`adr
id: ${sampleAdrs[0]?.id}
title: Adopt Kafka
\`\`\`

\`\`\`typescript
interface OrderPayload {
  id: string;
  amount: number;
}
\`\`\`

![Architecture Overview Diagram](https://assets.example.com/arch.png "System Overview")
`;

      const parsed = parseMarkdownDocument(docMarkdown, model, {
        views: sampleViews,
        flows: sampleFlows,
        adrs: sampleAdrs,
      });

      expect(parsed.title).toBe('E-Commerce Architecture Spec');

      // Table of Contents
      expect(parsed.toc.length).toBe(3);
      expect(parsed.toc[0]?.title).toBe('E-Commerce Architecture Spec');
      expect(parsed.toc[1]?.title).toBe('System Overview');
      expect(parsed.toc[2]?.title).toBe('Core Dependencies');

      // Embeds extraction
      expect(parsed.embeds.length).toBe(5); // 1 diagram, 1 object, 1 flow, 1 adr, 1 image
      expect(parsed.embeds.some((e) => e.kind === 'diagram')).toBe(true);
      expect(parsed.embeds.some((e) => e.kind === 'object')).toBe(true);
      expect(parsed.embeds.some((e) => e.kind === 'flow')).toBe(true);
      expect(parsed.embeds.some((e) => e.kind === 'adr')).toBe(true);
      expect(parsed.embeds.some((e) => e.kind === 'image')).toBe(true);

      // Mentions
      expect(parsed.mentions.some((m) => m.handle === 'Order Service')).toBe(true);

      // Counts & Stats
      expect(parsed.tablesCount).toBe(1);
      expect(parsed.codeBlocksCount).toBe(1); // typescript block
      expect(parsed.imagesCount).toBe(1);
      expect(parsed.wordCount).toBeGreaterThan(20);
      expect(parsed.readingTimeMinutes).toBeGreaterThanOrEqual(1);

      // Embed references are valid
      expect(parsed.validationIssues.length).toBe(0);
    });

    it('flags validation issues when embedded diagram view or object does not exist', () => {
      const brokenDoc = `# Broken Spec

\`\`\`diagram
id: non-existent-view-999
title: Missing Diagram View
\`\`\`

\`\`\`object
id: non-existent-object-888
title: Missing Object
\`\`\`
`;

      const parsed = parseMarkdownDocument(brokenDoc, model, { views: sampleViews });

      expect(parsed.validationIssues.length).toBe(2);
      expect(parsed.validationIssues.some((v) => v.embedKind === 'diagram' && v.severity === 'warning')).toBe(true);
      expect(parsed.validationIssues.some((v) => v.embedKind === 'object' && v.severity === 'error')).toBe(true);
    });
  });

  describe('HTML Rendering & Embedded Diagrams (Acceptance Criteria)', () => {
    it('renders edited doc with embedded diagram into interactive HTML card', () => {
      const docWithDiagram = `# Checkout Architecture Guide

Here is the container topology for checkout:

\`\`\`diagram
id: ${sampleViews[0]?.id}
title: Checkout Flow Container View
caption: Real-time container topology projection
\`\`\`

Contact @alice or inspect @[Order Service] for issues.
`;

      const html = renderMarkdownToHtml(docWithDiagram, model, {
        views: sampleViews,
      });

      // Headings
      expect(html).toContain('<h1 id="checkout-architecture-guide">Checkout Architecture Guide</h1>');

      // Embedded Diagram Card rendered
      expect(html).toContain('class="doc-embed doc-embed-diagram"');
      expect(html).toContain('DIAGRAM VIEW');
      expect(html).toContain('Checkout Flow Container View');
      expect(html).toContain('CONTAINER');
      expect(html).toContain('Real-time container topology projection');
      expect(html).toContain('Open Diagram in Studio →');

      // Mentions rendered
      expect(html).toContain('<span class="doc-mention doc-mention-user">@alice</span>');
      expect(html).toContain('<span class="doc-mention doc-mention-object">@Order Service</span>');
    });

    it('renders tables, code blocks, images, and lists correctly', () => {
      const content = `## Technical Stack

| Tier | Language | Framework |
| :--- | :--- | :--- |
| Backend | Go | gRPC |
| Frontend | TypeScript | Next.js |

\`\`\`bash
pnpm test
\`\`\`

- Scalable microservices
- Asynchronous events

![System Diagram](https://example.com/arch.svg "System Diagram")
`;

      const html = renderMarkdownToHtml(content, model);

      expect(html).toContain('<table class="doc-table">');
      expect(html).toContain('<th>Tier</th>');
      expect(html).toContain('<td>Backend</td>');
      expect(html).toContain('<pre class="doc-code-block"><code class="language-bash">pnpm test</code></pre>');
      expect(html).toContain('<li class="doc-list-item">Scalable microservices</li>');
      expect(html).toContain('<figure class="doc-image-figure"><img src="https://example.com/arch.svg" alt="System Diagram" />');
    });
  });

  describe('Document Comments', () => {
    const author: CommentAuthor = {
      id: 'usr-1',
      name: 'Alice Dev',
      email: 'alice@example.com',
    };

    it('adds and resolves comments on architecture documentation', () => {
      const initialComments: Comment[] = [];

      const withComment = addDocumentComment(initialComments, {
        docId: 'doc-orders-guide',
        workspaceId: 'ws-1',
        content: 'Should we specify timeout parameters for the gRPC connection?',
        author,
        lineNumber: 12,
      });

      expect(withComment.length).toBe(1);
      const added = withComment[0];
      expect(added?.targetType).toBe('doc');
      expect(added?.targetId).toBe('doc-orders-guide');
      expect(added?.content).toContain('timeout parameters');
      expect(added?.resolved).toBe(false);

      // Resolve comment
      const resolved = resolveDocumentComment(withComment, added!.id, author);
      expect(resolved[0]?.resolved).toBe(true);
      expect(resolved[0]?.resolvedBy?.name).toBe('Alice Dev');
    });
  });
});
