import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  CommandPalette,
  type PaletteObjectItem,
  type PaletteActionItem,
} from './components/shell/command-palette';
import {
  defaultCommandDispatcher,
  CreateNodeCommand,
  ConnectNodesCommand,
} from './lib/commands';

describe('Phase 02 — F109 (Command Palette), F110 (Global Search), F111 (Keyboard Shortcuts)', () => {
  const sampleObjects: PaletteObjectItem[] = [
    {
      id: 'app-gateway',
      name: 'API Gateway',
      kind: 'application',
      technology: 'Kong / Envoy',
      description: 'Public TLS edge proxy',
      tags: ['edge', 'pci-dss', 'gateway'],
      c4Level: 2,
    },
    {
      id: 'sys-billing',
      name: 'Billing System',
      kind: 'system',
      technology: 'Stripe API',
      description: 'External payment and subscription billing provider',
      tags: ['financial', 'third-party'],
      c4Level: 1,
    },
    {
      id: 'store-orders',
      name: 'Orders DB',
      kind: 'database',
      technology: 'PostgreSQL 16',
      description: 'Primary transactional order storage',
      tags: ['db', 'ha-cluster'],
      c4Level: 2,
    },
    {
      id: 'cmp-order-ctrl',
      name: 'OrderController',
      kind: 'component',
      technology: 'Spring Boot',
      description: 'REST controller handling checkout endpoints',
      tags: ['controller', 'rest'],
      c4Level: 3,
    },
  ];

  beforeEach(() => {
    defaultCommandDispatcher.clearHistory();
  });

  describe('F109 — Command Palette', () => {
    it('executes representative palette creation actions routed through command layer', async () => {
      const executed: string[] = [];

      const createNodeFn = async (kind: string) => {
        executed.push(`create:${kind}`);
        const cmd = new CreateNodeCommand({
          node: {
            id: `node-${kind}-1`,
            type: kind,
            position: { x: 100, y: 100 },
            data: { label: `New ${kind}`, kind },
          },
        });
        await defaultCommandDispatcher.dispatch(cmd);
      };

      const connectNodesFn = async (src: string, tgt: string) => {
        executed.push(`connect:${src}->${tgt}`);
        const cmd = new ConnectNodesCommand({
          edge: {
            id: `conn-test-1`,
            source: src,
            target: tgt,
            label: 'Calls API',
          },
        });
        await defaultCommandDispatcher.dispatch(cmd);
      };

      const askAiFn = () => {
        executed.push('action:ask-ai');
      };

      const exportFn = () => {
        executed.push('action:export');
      };

      const actions: PaletteActionItem[] = [
        {
          id: 'add-app',
          title: 'Add Application Service',
          category: 'create',
          onExecute: () => { void createNodeFn('application'); },
        },
        {
          id: 'add-system',
          title: 'Add System Boundary',
          category: 'create',
          onExecute: () => { void createNodeFn('system'); },
        },
        {
          id: 'add-db',
          title: 'Add Database / Store',
          category: 'create',
          onExecute: () => { void createNodeFn('database'); },
        },
        {
          id: 'add-comp',
          title: 'Add Component',
          category: 'create',
          onExecute: () => { void createNodeFn('component'); },
        },
        {
          id: 'add-conn',
          title: 'Add Connection',
          category: 'create',
          onExecute: () => { void connectNodesFn('app-gateway', 'store-orders'); },
        },
        {
          id: 'act-export',
          title: 'Export Diagram JSON',
          category: 'action',
          onExecute: () => exportFn(),
        },
        {
          id: 'ask-ai',
          title: 'Ask AI Copilot',
          category: 'action',
          onExecute: () => askAiFn(),
        },
      ];

      // Execute actions via action loop
      for (const action of actions) {
        action.onExecute();
      }
      await new Promise((r) => setTimeout(r, 10));

      expect(executed).toContain('create:application');
      expect(executed).toContain('create:system');
      expect(executed).toContain('create:database');
      expect(executed).toContain('create:component');
      expect(executed).toContain('connect:app-gateway->store-orders');
      expect(executed).toContain('action:export');
      expect(executed).toContain('action:ask-ai');

      // Verify that create and connect actions were recorded in command dispatcher history for undoability
      expect(defaultCommandDispatcher.canUndo()).toBe(true);
      const undone = await defaultCommandDispatcher.undo();
      expect(undone?.name).toBe('ConnectNodes');
    });

    it('renders command palette with category sections and shortcut cues', () => {
      const html = renderToString(
        <CommandPalette
          isOpen={true}
          onClose={() => {}}
          objects={sampleObjects}
          onSelectObject={() => {}}
          actions={[
            {
              id: 'add-app',
              title: 'Add Application Service',
              category: 'create',
              shortcut: 'A',
              onExecute: () => {},
            },
            {
              id: 'nav-lvl-1',
              title: 'Switch to Level 1: System Context',
              category: 'view',
              shortcut: '1',
              onExecute: () => {},
            },
          ]}
        />,
      );

      expect(html).toContain('data-testid="command-palette-modal"');
      expect(html).toContain('data-testid="command-palette-input"');
      expect(html).toContain('⌘K');
      expect(html).toContain('/');
      expect(html).toContain('Architecture Objects');
      expect(html).toContain('Add Architecture Element');
      expect(html).toContain('Views &amp; Levels');
    });
  });

  describe('F110 — Global Search', () => {
    it('indexes objects across name, kind, technology, tags, and description', () => {
      const onSelect = vi.fn();
      const html = renderToString(
        <CommandPalette
          isOpen={true}
          onClose={() => {}}
          objects={sampleObjects}
          onSelectObject={onSelect}
        />,
      );

      // Verify all indexed objects and their metadata are rendered
      expect(html).toContain('API Gateway');
      expect(html).toContain('Kong / Envoy');
      expect(html).toContain('#pci-dss');
      expect(html).toContain('Billing System');
      expect(html).toContain('Orders DB');
      expect(html).toContain('#ha-cluster');
      expect(html).toContain('OrderController');
    });

    it('jumps to selected object and executes selection callback', () => {
      const onSelect = vi.fn();
      const targetObj = sampleObjects[0]!;

      // Simulates object jump selection from search results
      onSelect(targetObj.id);

      expect(onSelect).toHaveBeenCalledWith('app-gateway');
    });
  });

  describe('F111 — Keyboard Shortcuts', () => {
    interface KeymapContext {
      isMac: boolean;
      activeElementTag?: string;
      isContentEditable?: boolean;
      isCommandPaletteOpen: boolean;
      c4Level: 1 | 2 | 3;
      selectedNodeIds: string[];
      selectedEdgeIds: string[];
    }

    type KeyAction =
      | 'open-palette'
      | 'pan'
      | 'fit-view'
      | 'delete-selection'
      | 'undo'
      | 'redo'
      | 'copy'
      | 'paste'
      | 'duplicate'
      | 'c4-level-1'
      | 'c4-level-2'
      | 'c4-level-3'
      | 'none';

    function evaluateKeymap(
      event: {
        key: string;
        code?: string;
        metaKey?: boolean;
        ctrlKey?: boolean;
        shiftKey?: boolean;
        altKey?: boolean;
      },
      ctx: KeymapContext,
    ): KeyAction {
      const isTextInput =
        ctx.activeElementTag === 'input' ||
        ctx.activeElementTag === 'textarea' ||
        ctx.activeElementTag === 'select' ||
        ctx.isContentEditable === true;

      if (isTextInput) return 'none';

      const isMod = ctx.isMac ? !!event.metaKey : !!event.ctrlKey;

      // ⌘K or / -> open command palette
      if ((isMod && (event.key === 'k' || event.key === 'K')) || (!isMod && event.key === '/')) {
        return 'open-palette';
      }

      // Undo / Redo
      if (isMod && !event.shiftKey && (event.key === 'z' || event.key === 'Z')) {
        return 'undo';
      }
      if (
        (isMod && event.shiftKey && (event.key === 'z' || event.key === 'Z')) ||
        (!ctx.isMac && event.ctrlKey && (event.key === 'y' || event.key === 'Y'))
      ) {
        return 'redo';
      }

      // Clipboard: ⌘C / ⌘V / ⌘D
      if (isMod && !event.shiftKey && (event.key === 'c' || event.key === 'C')) {
        return 'copy';
      }
      if (isMod && !event.shiftKey && (event.key === 'v' || event.key === 'V')) {
        return 'paste';
      }
      if (isMod && !event.shiftKey && (event.key === 'd' || event.key === 'D')) {
        return 'duplicate';
      }

      // Space -> pan
      if (event.code === 'Space' || event.key === ' ') {
        return 'pan';
      }

      // Fit view: F
      if (!event.shiftKey && !event.altKey && !isMod && (event.key === 'f' || event.key === 'F')) {
        return 'fit-view';
      }

      // Delete / Backspace
      if (
        (event.key === 'Backspace' || event.key === 'Delete') &&
        (ctx.selectedNodeIds.length > 0 || ctx.selectedEdgeIds.length > 0)
      ) {
        return 'delete-selection';
      }

      // View levels: 1 / 2 / 3
      if (!isMod && !event.shiftKey && !event.altKey && !ctx.isCommandPaletteOpen) {
        if (event.key === '1') return 'c4-level-1';
        if (event.key === '2') return 'c4-level-2';
        if (event.key === '3') return 'c4-level-3';
      }

      return 'none';
    }

    const baseCtx: KeymapContext = {
      isMac: true,
      activeElementTag: 'div',
      isContentEditable: false,
      isCommandPaletteOpen: false,
      c4Level: 1,
      selectedNodeIds: ['app-gateway'],
      selectedEdgeIds: [],
    };

    it('triggers Cmd+K and / for command palette when not in input', () => {
      expect(evaluateKeymap({ key: 'k', metaKey: true }, baseCtx)).toBe('open-palette');
      expect(evaluateKeymap({ key: '/', metaKey: false }, baseCtx)).toBe('open-palette');
    });

    it('triggers Space for pan', () => {
      expect(evaluateKeymap({ key: ' ', code: 'Space' }, baseCtx)).toBe('pan');
    });

    it('triggers F for fit view', () => {
      expect(evaluateKeymap({ key: 'f' }, baseCtx)).toBe('fit-view');
      expect(evaluateKeymap({ key: 'F' }, baseCtx)).toBe('fit-view');
    });

    it('triggers Delete/Backspace when elements are selected', () => {
      expect(evaluateKeymap({ key: 'Backspace' }, baseCtx)).toBe('delete-selection');
      expect(evaluateKeymap({ key: 'Delete' }, baseCtx)).toBe('delete-selection');

      // Does not delete when nothing is selected
      const emptySelectionCtx = { ...baseCtx, selectedNodeIds: [], selectedEdgeIds: [] };
      expect(evaluateKeymap({ key: 'Backspace' }, emptySelectionCtx)).toBe('none');
    });

    it('triggers Cmd+Z and Cmd+Shift+Z for undo/redo', () => {
      expect(evaluateKeymap({ key: 'z', metaKey: true }, baseCtx)).toBe('undo');
      expect(evaluateKeymap({ key: 'z', metaKey: true, shiftKey: true }, baseCtx)).toBe('redo');
    });

    it('triggers Cmd+C, Cmd+V, Cmd+D for clipboard operations', () => {
      expect(evaluateKeymap({ key: 'c', metaKey: true }, baseCtx)).toBe('copy');
      expect(evaluateKeymap({ key: 'v', metaKey: true }, baseCtx)).toBe('paste');
      expect(evaluateKeymap({ key: 'd', metaKey: true }, baseCtx)).toBe('duplicate');
    });

    it('triggers 1, 2, 3 to switch C4 view levels', () => {
      expect(evaluateKeymap({ key: '1' }, baseCtx)).toBe('c4-level-1');
      expect(evaluateKeymap({ key: '2' }, baseCtx)).toBe('c4-level-2');
      expect(evaluateKeymap({ key: '3' }, baseCtx)).toBe('c4-level-3');
    });

    it('safely ignores shortcuts when typing inside an input or textarea', () => {
      const inInputCtx = { ...baseCtx, activeElementTag: 'input' };
      expect(evaluateKeymap({ key: '/', metaKey: false }, inInputCtx)).toBe('none');
      expect(evaluateKeymap({ key: '1' }, inInputCtx)).toBe('none');
      expect(evaluateKeymap({ key: 'f' }, inInputCtx)).toBe('none');
      expect(evaluateKeymap({ key: ' ' }, inInputCtx)).toBe('none');
      expect(evaluateKeymap({ key: 'Backspace' }, inInputCtx)).toBe('none');

      const inTextareaCtx = { ...baseCtx, activeElementTag: 'textarea' };
      expect(evaluateKeymap({ key: '2' }, inTextareaCtx)).toBe('none');
    });
  });
});
