'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  type CanvasNode,
  type CanvasEdge,
  type TemplateId,
  type PersonaMode,
  instantiateTemplate,
  projectViewModelToCanvas,
  applyLayout,
  type LayoutEdge,
  type ArchitectureId,
  type VersionId,
  type ObjectId,
  type ConnectionId,
  type FlowPlaybackState,
  type Comment,
  type CommentAuthor,
  createComment,
  replyToComment,
  resolveComment,
  reopenComment,
  buildCommentThreads,
  createArchitecturePullRequest,
  submitPullRequestReview,
  addPullRequestComment,
  computeVisualArchitectureDiff,
  computeArchitectureChangeSet,
  type ViewId,
  type FlowId,
  type ObjectKind,
  type ArchitecturePullRequest,
  type ReviewDecision,
  type TeamId,
  createMainBranch,
  forkBranch,
  createArchitectureModel,
  type ArchitectureModel,
  type View,
  type ArchitectureBranch,
  type LiveArchitectureVersion,
  type NumberedSnapshot,
  type FullArchitectureSnapshot,
  type SnapshotId,
  type WorkspaceId,
  type ArchitectureGroundedContext,
  type GeneratedArchitectureProposal,
  type ArchitectureReviewReport,
  type DraftedADR,
  generateArchitectureFromPrompt,
  runArchitectureReview,
  draftADRFromChange,
  createIcePanelBoutiqueModel,
  createShareLink,
  generateShareLinkUrl,
} from '@diagramhq/domain';
import {
  InfiniteCanvas,
  toAlignableNode,
  IcePanelSidebar,
  IconPickerModal,
  FlowPlaybackToolbar,
  PresenceIndicators,
  CommentsPanel,
  PullRequestModal,
  BranchBadge,
  BranchSelector,
  VersionTimeline,
  SnapshotDetailsModal,
  VisualDiffViewer,
  ExportModal,
  MermaidModal,
  PlantUmlModal,
  ShareLinkModal,
  AICopilotPanel,
  AIGenerationModal,
  ArchitectureReviewModal,
  ADRGenerationModal,
  type PresencePeerBadge,
} from '../../components/canvas';
import { InspectorPanel } from '../../components/shell/inspector-panel';
import { useDiagramAutosave, type SavedDiagramData } from '../../hooks/use-diagram-autosave';
import { PreviewAffordance } from '../../lib/preview-flags';
import {
  getNodeC4Level,
  filterNodesByC4Level,
  filterEdgesByVisibleNodes,
} from '../../lib/c4-hierarchy';
import {
  CommandPalette,
  type PaletteObjectItem,
  type PaletteActionItem,
} from '../../components/shell';
import {
  UpdateNodeMetadataCommand,
  ConnectNodesCommand,
  defaultCommandDispatcher,
} from '../../lib/commands';

// F136 Preview Fixture: simulated peer presence (PREVIEW_REGISTRY.presence)
const INITIAL_PEERS: PresencePeerBadge[] = [
  {
    userId: 'user-alice',
    userName: 'Alice Chen',
    userColor: '#10b981',
    status: 'active',
    role: 'Lead Architect',
    currentObjectName: 'Edge API Gateway',
    currentViewName: 'Containers & Apps',
  },
  {
    userId: 'user-bob',
    userName: 'Bob Smith',
    userColor: '#3b82f6',
    status: 'active',
    role: 'Security Engineer',
    currentObjectName: 'Postgres Database',
    currentViewName: 'Security',
  },
  {
    userId: 'user-carol',
    userName: 'Carol Davis',
    userColor: '#8b5cf6',
    status: 'idle',
    role: 'DevOps Lead',
    currentObjectName: 'Web Application',
    currentViewName: 'Context',
  },
];

const CURRENT_AUTHOR: CommentAuthor = {
  id: 'user-admin',
  name: 'Admin Superuser',
  email: 'admin@diagramhq.internal',
  color: '#3b82f6',
};

// F136 Preview Fixture: simulated architecture branches (PREVIEW_REGISTRY.branches)
const INITIAL_BRANCHES: ArchitectureBranch[] = (() => {
  const main = createMainBranch('ws-demo' as WorkspaceId, 'arch-studio-init' as ArchitectureId, {
    objects: [
      {
        id: 'app-gateway' as ObjectId,
        architectureId: 'arch-studio-init' as ArchitectureId,
        versionId: 'v1' as VersionId,
        name: 'Edge API Gateway',
        kind: 'application',
        position: { x: 50, y: 50 },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'app-auth' as ObjectId,
        architectureId: 'arch-studio-init' as ArchitectureId,
        versionId: 'v1' as VersionId,
        name: 'Auth Service',
        kind: 'application',
        position: { x: 200, y: 200 },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    connections: [],
  });

  const featAuth = forkBranch(main, 'feat/auth-v2', {
    description: 'OAuth2 / OIDC migration and dedicated billing service',
  });
  featAuth.state.objects.push({
    id: 'app-billing' as ObjectId,
    architectureId: 'arch-studio-init' as ArchitectureId,
    versionId: 'v2' as VersionId,
    name: 'Billing Microservice',
    kind: 'application',
    position: { x: 400, y: 400 },
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return [main, featAuth];
})();

// F136 Preview Fixture: simulated version history and snapshots (PREVIEW_REGISTRY.versionHistory)
const INITIAL_SNAPSHOTS: NumberedSnapshot[] = [
  {
    id: 'snap-v10' as SnapshotId,
    architectureId: 'arch-studio-init' as ArchitectureId,
    liveVersionId: 'v1' as VersionId,
    versionNumber: 'v1.0.0',
    label: 'Initial MVP Production Baseline',
    createdBy: 'Alice Chen',
    createdAt: Date.now() - 86400000 * 14,
    isImmutable: true,
    snapshotData: {
      objects: [
        {
          id: 'app-gateway' as ObjectId,
          architectureId: 'arch-studio-init' as ArchitectureId,
          versionId: 'v1' as VersionId,
          name: 'Edge API Gateway',
          kind: 'application',
          position: { x: 50, y: 50 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      connections: [],
    },
  },
  {
    id: 'snap-v11' as SnapshotId,
    architectureId: 'arch-studio-init' as ArchitectureId,
    liveVersionId: 'v1' as VersionId,
    versionNumber: 'v1.1.0',
    label: 'Added Edge API Gateway & C4 Container Views',
    createdBy: 'Bob Smith',
    createdAt: Date.now() - 86400000 * 3,
    isImmutable: true,
    snapshotData: {
      objects: [
        {
          id: 'app-gateway' as ObjectId,
          architectureId: 'arch-studio-init' as ArchitectureId,
          versionId: 'v1' as VersionId,
          name: 'Edge API Gateway',
          kind: 'application',
          position: { x: 50, y: 50 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'app-auth' as ObjectId,
          architectureId: 'arch-studio-init' as ArchitectureId,
          versionId: 'v1' as VersionId,
          name: 'Auth Service',
          kind: 'application',
          position: { x: 200, y: 200 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      connections: [],
    },
  },
];

const SAMPLE_FULL_SNAPSHOT: FullArchitectureSnapshot = {
  id: 'snap-full-1' as SnapshotId,
  architectureId: 'arch-studio-init' as ArchitectureId,
  versionNumber: 'v1.0.0',
  label: 'Initial MVP Production Baseline',
  description: 'First production release with core auth and edge services.',
  createdBy: 'Alice Chen',
  createdAt: Date.now() - 86400000 * 14,
  isImmutable: true,
  state: {
    objects: [
      {
        id: 'app-gateway' as ObjectId,
        architectureId: 'arch-studio-init' as ArchitectureId,
        versionId: 'v1' as VersionId,
        name: 'Edge API Gateway',
        kind: 'application',
        position: { x: 50, y: 50 },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'app-auth' as ObjectId,
        architectureId: 'arch-studio-init' as ArchitectureId,
        versionId: 'v1' as VersionId,
        name: 'Auth Service',
        kind: 'application',
        position: { x: 200, y: 200 },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    connections: [
      {
        id: 'con-1' as ConnectionId,
        architectureId: 'arch-studio-init' as ArchitectureId,
        versionId: 'v1' as VersionId,
        sourceObjectId: 'app-gateway' as ObjectId,
        targetObjectId: 'app-auth' as ObjectId,
        label: 'Auth Token',
        kind: 'sync',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    views: [
      {
        id: 'view-1' as ViewId,
        architectureId: 'arch-studio-init' as ArchitectureId,
        name: 'System Context',
        kind: 'context',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    flows: [
      {
        id: 'flw-1' as FlowId,
        architectureId: 'arch-studio-init' as ArchitectureId,
        name: 'Authentication Trace',
        type: 'api_flow',
        steps: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    metadata: { env: 'production' },
    documentation: {
      pages: [],
    },
  },
};

export default function StudioPage(): JSX.Element {
  // Pre-seed with the SaaS 3-tier starter architecture respecting containment hierarchy (F142)
  const [initialGraph] = useState(() => {
    // Level 1: Systems & Actors
    const sysSaas: CanvasNode = {
      id: 'sys-saas',
      type: 'system',
      position: { x: 420, y: 180 },
      data: {
        label: 'SaaS Platform',
        kind: 'system',
        c4Level: 1,
        canDrillDown: true,
        status: 'Active',
        description: 'Core multi-tenant SaaS application system',
      },
    };
    const actorUser: CanvasNode = {
      id: 'actor-user',
      type: 'person',
      position: { x: 80, y: 180 },
      data: {
        label: 'End User',
        kind: 'actor',
        c4Level: 1,
        status: 'Active',
        description: 'Customer using web browser or mobile client',
      },
    };
    const sysEmail: CanvasNode = {
      id: 'sys-email',
      type: 'system',
      position: { x: 780, y: 100 },
      data: {
        label: 'Email Service',
        kind: 'system',
        c4Level: 1,
        external: true,
        status: 'Active',
        description: 'External transactional email delivery (SendGrid / SES)',
      },
    };
    const sysBilling: CanvasNode = {
      id: 'sys-billing',
      type: 'system',
      position: { x: 780, y: 260 },
      data: {
        label: 'Billing Service',
        kind: 'system',
        c4Level: 1,
        external: true,
        status: 'Active',
        description: 'External recurring subscription provider (Stripe)',
      },
    };

    // Level 2: Containers of sys-saas
    const appWeb: CanvasNode = {
      id: 'app-web',
      type: 'app',
      position: { x: 80, y: 140 },
      data: {
        label: 'Web App',
        kind: 'application',
        c4Level: 2,
        parentId: 'sys-saas',
        technology: 'Next.js 14, React, Tailwind',
        status: 'Active',
        description: 'Single-page web frontend application bundle',
      },
    };
    const appApi: CanvasNode = {
      id: 'app-api',
      type: 'app',
      position: { x: 380, y: 140 },
      data: {
        label: 'API Gateway',
        kind: 'application',
        c4Level: 2,
        parentId: 'sys-saas',
        technology: 'Node.js, Express, Envoy',
        status: 'Active',
        description: 'Reverse proxy and API gateway routing requests',
      },
    };
    const appAuth: CanvasNode = {
      id: 'app-auth',
      type: 'app',
      position: { x: 680, y: 80 },
      data: {
        label: 'Auth Service',
        kind: 'application',
        c4Level: 2,
        parentId: 'sys-saas',
        canDrillToComponents: true,
        canDrillDown: true,
        technology: 'Go 1.22, gRPC',
        status: 'Active',
        description: 'Microservice managing authentication, sessions, and tokens',
      },
    };
    const storeDb: CanvasNode = {
      id: 'store-db',
      type: 'store',
      position: { x: 680, y: 240 },
      data: {
        label: 'Primary Database',
        kind: 'store',
        c4Level: 2,
        parentId: 'sys-saas',
        technology: 'PostgreSQL 16',
        status: 'Active',
        description: 'Multi-AZ relational database for tenant records',
      },
    };
    const storeCache: CanvasNode = {
      id: 'store-cache',
      type: 'store',
      position: { x: 380, y: 320 },
      data: {
        label: 'Cache Cluster',
        kind: 'store',
        c4Level: 2,
        parentId: 'sys-saas',
        technology: 'Redis 7.2',
        status: 'Active',
        description: 'In-memory cache for fast session and token lookup',
      },
    };
    const storeStorage: CanvasNode = {
      id: 'store-storage',
      type: 'store',
      position: { x: 80, y: 320 },
      data: {
        label: 'Object Storage',
        kind: 'store',
        c4Level: 2,
        parentId: 'sys-saas',
        technology: 'AWS S3',
        status: 'Active',
        description: 'Encrypted object storage for user assets and reports',
      },
    };

    // Level 3: Components of app-auth
    const cmpAuthCtrl: CanvasNode = {
      id: 'cmp-auth-ctrl',
      type: 'component',
      position: { x: 100, y: 160 },
      data: {
        label: 'Auth Controller',
        kind: 'component',
        c4Level: 3,
        parentId: 'app-auth',
        technology: 'Go Gin / REST',
        status: 'Active',
        description: 'HTTP controller handling /login, /register, /refresh',
      },
    };
    const cmpJwtSvc: CanvasNode = {
      id: 'cmp-jwt-svc',
      type: 'component',
      position: { x: 380, y: 100 },
      data: {
        label: 'JWT Token Service',
        kind: 'component',
        c4Level: 3,
        parentId: 'app-auth',
        technology: 'golang-jwt/jwt',
        status: 'Active',
        description: 'Signs and validates RS256 JSON Web Tokens',
      },
    };
    const cmpUserRepo: CanvasNode = {
      id: 'cmp-user-repo',
      type: 'component',
      position: { x: 380, y: 230 },
      data: {
        label: 'User Repository',
        kind: 'component',
        c4Level: 3,
        parentId: 'app-auth',
        technology: 'pgx / SQL',
        status: 'Active',
        description: 'Data access repository queries for user accounts',
      },
    };
    const cmpPwdHasher: CanvasNode = {
      id: 'cmp-pwd-hasher',
      type: 'component',
      position: { x: 650, y: 160 },
      data: {
        label: 'Password Hasher',
        kind: 'component',
        c4Level: 3,
        parentId: 'app-auth',
        technology: 'Argon2id',
        status: 'Active',
        description: 'Cryptographic password verification and hashing engine',
      },
    };

    const nodes = [
      sysSaas, actorUser, sysEmail, sysBilling,
      appWeb, appApi, appAuth, storeDb, storeCache, storeStorage,
      cmpAuthCtrl, cmpJwtSvc, cmpUserRepo, cmpPwdHasher,
    ];

    const edges: CanvasEdge[] = [
      // Level 1 Edges
      { id: 'e-l1-1', source: 'actor-user', target: 'sys-saas', type: 'icepanel', label: 'HTTPS : 443' },
      { id: 'e-l1-2', source: 'sys-saas', target: 'sys-email', type: 'icepanel', label: 'SES / SMTP' },
      { id: 'e-l1-3', source: 'sys-saas', target: 'sys-billing', type: 'icepanel', label: 'mTLS REST' },

      // Level 2 Edges
      { id: 'e-l2-1', source: 'app-web', target: 'app-api', type: 'icepanel', label: 'HTTPS / REST' },
      { id: 'e-l2-2', source: 'app-api', target: 'app-auth', type: 'icepanel', label: 'gRPC / TLS' },
      { id: 'e-l2-3', source: 'app-api', target: 'store-db', type: 'icepanel', label: 'TCP : 5432' },
      { id: 'e-l2-4', source: 'app-api', target: 'store-cache', type: 'icepanel', label: 'TCP : 6379' },
      { id: 'e-l2-5', source: 'app-api', target: 'store-storage', type: 'icepanel', label: 'S3 API' },

      // Level 3 Edges
      { id: 'e-l3-1', source: 'cmp-auth-ctrl', target: 'cmp-jwt-svc', type: 'icepanel', label: 'generateToken()' },
      { id: 'e-l3-2', source: 'cmp-auth-ctrl', target: 'cmp-user-repo', type: 'icepanel', label: 'findUserByEmail()' },
      { id: 'e-l3-3', source: 'cmp-user-repo', target: 'cmp-pwd-hasher', type: 'icepanel', label: 'verifyHash()' },
    ];

    return { nodes, edges };
  });

  const [activeView, setActiveView] = useState<
    'all' | 'context' | 'container' | 'security' | 'data' | 'ownership'
  >('all');
  const [activePersona, setActivePersona] = useState<PersonaMode | 'all'>('all');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [canvasKey, setCanvasKey] = useState(1);
  const [currentNodes, setCurrentNodes] = useState<CanvasNode[]>(initialGraph.nodes);
  const [currentEdges, setCurrentEdges] = useState<CanvasEdge[]>(initialGraph.edges);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [c4Level, setC4Level] = useState<1 | 2 | 3>(1);
  const [activeParentId, setActiveParentId] = useState<string | null>(null);
  const [parentHistory, setParentHistory] = useState<Array<{ id: string; name: string; level: 1 | 2 | 3 }>>([]);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Global ⌘K shortcut listener for Command Palette (F143)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const isMod = isMac ? e.metaKey : e.ctrlKey;
      if (isMod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleRestoreSavedDiagram = useCallback((saved: SavedDiagramData) => {
    if (Array.isArray(saved.nodes) && saved.nodes.length > 0) {
      setCurrentNodes(saved.nodes);
      if (Array.isArray(saved.edges)) {
        setCurrentEdges(saved.edges);
      }
      if (saved.c4Level && (saved.c4Level === 1 || saved.c4Level === 2 || saved.c4Level === 3)) {
        setC4Level(saved.c4Level);
      }
      if (saved.activeView) {
        setActiveView(saved.activeView as 'all' | 'context' | 'container' | 'security' | 'data' | 'ownership');
      }
      if (saved.activePersona) {
        setActivePersona(saved.activePersona as PersonaMode | 'all');
      }
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setCanvasKey((k) => k + 1);
    }
  }, []);

  const {
    saveStatus,
    lastSavedAt,
    isLoggedIn,
    sessionUser,
    saveNow,
    resetSavedDiagram,
  } = useDiagramAutosave({
    currentNodes,
    currentEdges,
    c4Level,
    activeView,
    activePersona,
    onRestore: handleRestoreSavedDiagram,
  });
  const [isFlowPlaybackActive, setIsFlowPlaybackActive] = useState(false);
  const [playbackState, setPlaybackState] = useState<FlowPlaybackState>({
    flowId: 'studio-trace-flow',
    totalSteps: 4,
    currentStepIndex: 0,
    isPlaying: false,
    speedMultiplier: 1,
    isLooping: false,
  });

  const STARTER_FLOW_STEPS = useMemo(
    () => [
      { note: 'End User dispatches HTTPS authentication request to Web App' },
      { note: 'Web App proxies request with CSRF token to Edge API Gateway' },
      { note: 'API Gateway verifies TLS and invokes gRPC AuthenticateUser() on Auth Service' },
      { note: 'Auth Service executes query on Postgres Database and issues signed JWT' },
    ],
    [],
  );

  // Auto-advance timer when playing
  React.useEffect(() => {
    if (!isFlowPlaybackActive || !playbackState.isPlaying) return;
    const intervalTime = 1800 / playbackState.speedMultiplier;
    const timer = setInterval(() => {
      setPlaybackState((prev) => {
        if (prev.currentStepIndex >= prev.totalSteps - 1) {
          if (prev.isLooping) {
            return { ...prev, currentStepIndex: 0 };
          }
          return { ...prev, isPlaying: false };
        }
        return { ...prev, currentStepIndex: prev.currentStepIndex + 1 };
      });
    }, intervalTime);
    return () => clearInterval(timer);
  }, [isFlowPlaybackActive, playbackState.isPlaying, playbackState.speedMultiplier]);

  // Selected node item for Inspector
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return currentNodes.find((n) => n.id === selectedNodeId) ?? null;
  }, [selectedNodeId, currentNodes]);

  // Selected edge item for Inspector
  const selectedEdgeData = useMemo(() => {
    if (!selectedEdgeId) return null;
    const edge = currentEdges.find((e) => e.id === selectedEdgeId);
    if (!edge) return null;

    const sourceNode = currentNodes.find((n) => n.id === edge.source);
    const targetNode = currentNodes.find((n) => n.id === edge.target);
    const edgeData = (edge.data || {}) as Record<string, unknown>;

    let protocol = (edgeData.protocol as string) || (edgeData.kind as string) || undefined;
    let description = (edgeData.description as string) || (edge.label as string) || undefined;
    if (!protocol && typeof edge.label === 'string' && edge.label.includes(':')) {
      const parts = edge.label.split(':');
      protocol = parts[0]?.trim() || undefined;
      description = parts.slice(1).join(':').trim() || undefined;
    }

    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceName: (sourceNode?.data?.label as string) || edge.source,
      targetName: (targetNode?.data?.label as string) || edge.target,
      label: edge.label,
      protocol,
      description,
    };
  }, [selectedEdgeId, currentEdges, currentNodes]);

  // Collaboration: Live Presence & Peer collaborators (simulated preview)
  const [peers] = useState<PresencePeerBadge[]>(INITIAL_PEERS);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isPullRequestModalOpen, setIsPullRequestModalOpen] = useState(false);

  // F136 Preview Fixture: simulated threaded comments (PREVIEW_REGISTRY.comments)
  const [comments, setComments] = useState<Comment[]>(() => {
    const root1 = createComment({
      id: 'cmt-root-1',
      workspaceId: 'ws-demo',
      targetType: 'object',
      targetId: 'obj-1',
      author: { id: 'user-alice', name: 'Alice Chen', color: '#10b981' },
      content: 'Should we terminate TLS at the API Gateway or at the ingress load balancer?',
    });
    const reply1 = replyToComment(root1, {
      id: 'cmt-rep-1',
      author: { id: 'user-bob', name: 'Bob Smith', color: '#3b82f6' },
      content: "Gateway handles TLS termination with automatic Let's Encrypt certificates.",
    });
    const root2 = createComment({
      id: 'cmt-root-2',
      workspaceId: 'ws-demo',
      targetType: 'diagram',
      targetId: 'studio-diagram',
      author: { id: 'user-carol', name: 'Carol Davis', color: '#8b5cf6' },
      content: 'Architecture baseline approved for SOC2 and ISO27001 audit.',
    });
    const resolvedRoot2 = resolveComment(root2, { id: 'user-carol', name: 'Carol Davis' });
    return [root1, reply1, resolvedRoot2];
  });

  // F136 Preview Fixture: simulated architecture PR review (PREVIEW_REGISTRY.pullRequests)
  const [architecturePR, setArchitecturePR] = useState<ArchitecturePullRequest>(() => {
    return createArchitecturePullRequest({
      number: 14,
      title: 'feat(auth): Upgrade Auth Service to OAuth2 / OIDC & Deploy Billing',
      description:
        'Replaces legacy authentication with OIDC standard and provisions billing microservice.',
      sourceBranch: 'feat/auth-v2',
      targetBranch: 'main',
      author: {
        id: 'user-alice',
        name: 'Alice Chen',
        email: 'alice@diagramhq.internal',
      },
      diff: computeVisualArchitectureDiff(
        {
          objects: [
            {
              id: 'app-gateway' as ObjectId,
              architectureId: 'arch-demo' as ArchitectureId,
              versionId: 'v1' as VersionId,
              name: 'Edge API Gateway',
              kind: 'application',
              position: { x: 50, y: 50 },
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: 'app-auth' as ObjectId,
              architectureId: 'arch-demo' as ArchitectureId,
              versionId: 'v1' as VersionId,
              name: 'Auth Service',
              kind: 'application',
              position: { x: 200, y: 200 },
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          connections: [],
        },
        {
          objects: [
            {
              id: 'app-gateway' as ObjectId,
              architectureId: 'arch-demo' as ArchitectureId,
              versionId: 'v2' as VersionId,
              name: 'Edge API Gateway',
              kind: 'application',
              position: { x: 50, y: 50 },
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: 'app-auth' as ObjectId,
              architectureId: 'arch-demo' as ArchitectureId,
              versionId: 'v2' as VersionId,
              name: 'OAuth2 / OIDC Auth Service',
              kind: 'application',
              position: { x: 200, y: 200 },
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: 'app-billing' as ObjectId,
              architectureId: 'arch-demo' as ArchitectureId,
              versionId: 'v2' as VersionId,
              name: 'Billing Microservice',
              kind: 'application',
              position: { x: 400, y: 400 },
              createdAt: new Date(),
              updatedAt: new Date(),
              metadata: { ownerTeamId: 'team-billing' as TeamId },
            },
          ],
          connections: [],
        },
      ),
      changeSet: computeArchitectureChangeSet({
        baseObjects: [
          {
            id: 'app-gateway' as ObjectId,
            architectureId: 'arch-demo' as ArchitectureId,
            versionId: 'v1' as VersionId,
            name: 'Edge API Gateway',
            kind: 'application',
            position: { x: 50, y: 50 },
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'app-auth' as ObjectId,
            architectureId: 'arch-demo' as ArchitectureId,
            versionId: 'v1' as VersionId,
            name: 'Auth Service',
            kind: 'application',
            position: { x: 200, y: 200 },
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        targetObjects: [
          {
            id: 'app-gateway' as ObjectId,
            architectureId: 'arch-demo' as ArchitectureId,
            versionId: 'v2' as VersionId,
            name: 'Edge API Gateway',
            kind: 'application',
            position: { x: 50, y: 50 },
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'app-auth' as ObjectId,
            architectureId: 'arch-demo' as ArchitectureId,
            versionId: 'v2' as VersionId,
            name: 'OAuth2 / OIDC Auth Service',
            kind: 'application',
            position: { x: 200, y: 200 },
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'app-billing' as ObjectId,
            architectureId: 'arch-demo' as ArchitectureId,
            versionId: 'v2' as VersionId,
            name: 'Billing Microservice',
            kind: 'application',
            position: { x: 400, y: 400 },
            createdAt: new Date(),
            updatedAt: new Date(),
            metadata: { ownerTeamId: 'team-billing' as TeamId },
          },
        ],
        baseConnections: [],
        targetConnections: [],
      }),
    });
  });

  const allCommentThreads = useMemo(() => buildCommentThreads(comments), [comments]);
  const unresolvedCommentCount = useMemo(
    () => comments.filter((c) => !c.parentCommentId && !c.resolved).length,
    [comments],
  );

  const commentTargetType = selectedNodeId ? 'object' : 'diagram';
  const commentTargetId = selectedNodeId || 'studio-diagram';
  const commentTargetName = selectedNode
    ? typeof selectedNode.data.label === 'string'
      ? selectedNode.data.label
      : selectedNode.id
    : 'Entire Architecture';

  const visibleThreads = useMemo(() => {
    if (selectedNodeId) {
      return allCommentThreads.filter((t) => t.targetId === selectedNodeId);
    }
    return allCommentThreads;
  }, [allCommentThreads, selectedNodeId]);

  const handleCreateComment = useCallback(
    (content: string) => {
      const targetId = selectedNodeId || 'studio-diagram';
      const targetType = selectedNodeId ? 'object' : 'diagram';
      const newComment = createComment({
        workspaceId: 'ws-demo',
        targetType,
        targetId,
        author: CURRENT_AUTHOR,
        content,
      });
      setComments((prev) => [...prev, newComment]);
    },
    [selectedNodeId],
  );

  const handleReplyComment = useCallback((parentComment: Comment, content: string) => {
    const reply = replyToComment(parentComment, {
      author: CURRENT_AUTHOR,
      content,
    });
    setComments((prev) => [...prev, reply]);
  }, []);

  const handleResolveComment = useCallback((comment: Comment) => {
    setComments((prev) =>
      prev.map((c) => (c.id === comment.id ? resolveComment(c, CURRENT_AUTHOR) : c)),
    );
  }, []);

  const handleReopenComment = useCallback((comment: Comment) => {
    setComments((prev) => prev.map((c) => (c.id === comment.id ? reopenComment(c) : c)));
  }, []);

  const handleSubmitPRReview = useCallback((decision: ReviewDecision, body?: string) => {
    setArchitecturePR((pr) =>
      submitPullRequestReview(pr, {
        reviewer: {
          id: CURRENT_AUTHOR.id,
          name: CURRENT_AUTHOR.name,
          email: CURRENT_AUTHOR.email,
        },
        decision,
        body,
      }),
    );
  }, []);

  const handleAddPRComment = useCallback((content: string) => {
    setArchitecturePR((pr) =>
      addPullRequestComment(pr, {
        author: {
          id: CURRENT_AUTHOR.id,
          name: CURRENT_AUTHOR.name,
          email: CURRENT_AUTHOR.email,
        },
        content,
      }),
    );
  }, []);

  // Area 8: Versioning, Branching, Snapshots & Visual Diff
  const defaultMainBranch = INITIAL_BRANCHES[0]!;
  const [branches, setBranches] = useState<ArchitectureBranch[]>(INITIAL_BRANCHES);
  const [currentBranchId, setCurrentBranchId] = useState<string>(defaultMainBranch.id);
  const [isBranchSelectorOpen, setIsBranchSelectorOpen] = useState(false);

  const [snapshots, setSnapshots] = useState<NumberedSnapshot[]>(INITIAL_SNAPSHOTS);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [selectedSnapshotModal, setSelectedSnapshotModal] =
    useState<FullArchitectureSnapshot | null>(null);

  const [isVisualDiffOpen, setIsVisualDiffOpen] = useState(false);

  const currentBranch: ArchitectureBranch = useMemo(
    () => branches.find((b) => b.id === currentBranchId) || defaultMainBranch,
    [branches, currentBranchId, defaultMainBranch],
  );

  const liveVersion: LiveArchitectureVersion = useMemo(
    () => ({
      id: 'v1' as VersionId,
      architectureId: 'arch-studio-init' as ArchitectureId,
      name: `${currentBranch.name} (Live)`,
      isLive: true,
      objects: currentNodes.map((n) => ({
        id: n.id as ObjectId,
        architectureId: 'arch-studio-init' as ArchitectureId,
        versionId: 'v1' as VersionId,
        name: typeof n.data.label === 'string' ? n.data.label : n.id,
        kind: ((typeof n.data.kind === 'string' ? n.data.kind : n.type) ??
          'application') as ObjectKind,
        position: n.position,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      connections: currentEdges.map((e) => ({
        id: e.id as ConnectionId,
        architectureId: 'arch-studio-init' as ArchitectureId,
        versionId: 'v1' as VersionId,
        sourceObjectId: e.source as ObjectId,
        targetObjectId: e.target as ObjectId,
        label: typeof e.label === 'string' ? e.label : 'connects to',
        kind: 'sync' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      updatedAt: Date.now(),
    }),
    [currentBranch.name, currentNodes, currentEdges],
  );

  const visualDiffResult = useMemo(() => {
    return computeVisualArchitectureDiff(
      {
        objects: [
          {
            id: 'app-gateway' as ObjectId,
            architectureId: 'arch-studio-init' as ArchitectureId,
            versionId: 'v1' as VersionId,
            name: 'Edge API Gateway',
            kind: 'application',
            position: { x: 50, y: 50 },
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'app-auth' as ObjectId,
            architectureId: 'arch-studio-init' as ArchitectureId,
            versionId: 'v1' as VersionId,
            name: 'Auth Service',
            kind: 'application',
            position: { x: 200, y: 200 },
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        connections: [],
      },
      {
        objects: [
          {
            id: 'app-gateway' as ObjectId,
            architectureId: 'arch-studio-init' as ArchitectureId,
            versionId: 'v2' as VersionId,
            name: 'Edge API Gateway',
            kind: 'application',
            position: { x: 50, y: 50 },
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'app-auth' as ObjectId,
            architectureId: 'arch-studio-init' as ArchitectureId,
            versionId: 'v2' as VersionId,
            name: 'OAuth2 / OIDC Auth Service',
            kind: 'application',
            position: { x: 200, y: 200 },
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'app-billing' as ObjectId,
            architectureId: 'arch-studio-init' as ArchitectureId,
            versionId: 'v2' as VersionId,
            name: 'Billing Microservice',
            kind: 'application',
            position: { x: 400, y: 400 },
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        connections: [],
      },
    );
  }, []);

  const handleSelectBranch = useCallback((branchId: string) => {
    setCurrentBranchId(branchId);
    setIsBranchSelectorOpen(false);
  }, []);

  const handleCreateBranch = useCallback(
    (name: string, description?: string) => {
      const newBranch = forkBranch(currentBranch, name, { description });
      setBranches((prev) => [...prev, newBranch]);
      setCurrentBranchId(newBranch.id);
      setIsBranchSelectorOpen(false);
    },
    [currentBranch],
  );

  // Area 9: Multi-Format Exports, Diagram-as-Code & Public Sharing
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isMermaidModalOpen, setIsMermaidModalOpen] = useState(false);
  const [isPlantUmlModalOpen, setIsPlantUmlModalOpen] = useState(false);
  const [isShareLinkModalOpen, setIsShareLinkModalOpen] = useState(false);

  const currentStudioView: View = useMemo(
    () => ({
      id: 'view-studio-main' as ViewId,
      architectureId: 'arch-studio-init' as ArchitectureId,
      name: 'SaaS Platform Architecture',
      kind: 'context' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    [],
  );

  const currentStudioModel: ArchitectureModel = useMemo(() => {
    return createArchitectureModel(
      {
        id: 'arch-studio-init' as ArchitectureId,
        workspaceId: 'default' as WorkspaceId,
        name: 'SaaS Platform Architecture',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'v1' as VersionId,
        architectureId: 'arch-studio-init' as ArchitectureId,
        name: currentBranch.name,
        kind: 'main',
        status: 'open',
        createdAt: new Date(),
      },
      liveVersion.objects,
      liveVersion.connections,
    );
  }, [currentBranch.name, liveVersion.objects, liveVersion.connections]);

  // Area 10: AI Architecture Copilot, Generation, Review & ADRs
  const [isAiCopilotOpen, setIsAiCopilotOpen] = useState(false);
  const [isAiGenerationOpen, setIsAiGenerationOpen] = useState(false);
  const [aiProposal, setAiProposal] = useState<GeneratedArchitectureProposal | null>(null);
  const [isAiReviewOpen, setIsAiReviewOpen] = useState(false);
  const [aiReviewReport, setAiReviewReport] = useState<ArchitectureReviewReport | null>(null);
  const [isAiAdrOpen, setIsAiAdrOpen] = useState(false);
  const [aiDraftedAdr, setAiDraftedAdr] = useState<DraftedADR | null>(null);

  const aiGroundedContext: ArchitectureGroundedContext = useMemo(
    () => ({
      objects: liveVersion.objects,
      connections: liveVersion.connections,
      flows: SAMPLE_FULL_SNAPSHOT.state.flows,
    }),
    [liveVersion.objects, liveVersion.connections],
  );

  const handleGenerateArchitecture = useCallback(
    (prompt: string) => {
      const proposal = generateArchitectureFromPrompt({
        prompt,
        workspaceId: 'default' as WorkspaceId,
        architectureId: 'arch-studio-init' as ArchitectureId,
        versionId: 'v1' as VersionId,
        baseObjects: liveVersion.objects,
        baseConnections: liveVersion.connections,
      });
      setAiProposal(proposal);
    },
    [liveVersion.objects, liveVersion.connections],
  );

  const handleApplyAiProposal = useCallback((proposal: GeneratedArchitectureProposal) => {
    const newCanvasNodes: CanvasNode[] = proposal.generatedObjects.map((o) => ({
      id: o.id,
      type: o.kind === 'application' ? 'app' : o.kind === 'store' ? 'database' : 'system',
      position: o.position || { x: 300, y: 300 },
      data: {
        label: o.name,
        kind: o.kind,
        description: o.description || undefined,
      },
    }));
    setCurrentNodes((prev) => [...prev, ...newCanvasNodes]);
    setAiProposal((prev) => (prev ? { ...prev, status: 'applied' } : null));
    setIsAiGenerationOpen(false);
  }, []);

  const handleRunArchitectureReview = useCallback(() => {
    const report = runArchitectureReview(currentStudioModel);
    setAiReviewReport(report);
    setIsAiReviewOpen(true);
  }, [currentStudioModel]);

  const handleOpenAiAdr = useCallback(() => {
    const drafted = draftADRFromChange({
      changeSet: architecturePR.changeSet,
      customTitle: 'Adopt Distributed Event Bus and Caching Layer',
      problemStatement:
        'Decouple high-throughput write path from read queries using Redis and Kafka cluster',
      author: {
        id: CURRENT_AUTHOR.id,
        name: CURRENT_AUTHOR.name,
        email: CURRENT_AUTHOR.email,
      },
    });
    setAiDraftedAdr(drafted);
    setIsAiAdrOpen(true);
  }, [architecturePR.changeSet]);

  const handleNodeSelect = useCallback(
    (nodeId: string | null) => {
      setSelectedNodeId(nodeId);
      if (nodeId) {
        setSelectedEdgeId(null);
        if (!isInspectorOpen) setIsInspectorOpen(true);
        const node = currentNodes.find((n) => n.id === nodeId);
        if (node) {
          const nodeLvl = getNodeC4Level(node);
          if (nodeLvl !== c4Level) {
            setC4Level(nodeLvl);
            if (node.data?.parentId) {
              setActiveParentId(node.data.parentId as string);
            }
            setCanvasKey((k) => k + 1);
          }
        }
      }
    },
    [isInspectorOpen, currentNodes, c4Level],
  );

  const handleEdgeSelect = useCallback(
    (edgeId: string | null) => {
      setSelectedEdgeId(edgeId);
      if (edgeId) {
        setSelectedNodeId(null);
        if (!isInspectorOpen) setIsInspectorOpen(true);
      }
    },
    [isInspectorOpen],
  );

  const handleMetadataChange = useCallback(
    (field: string, value: unknown) => {
      if (!selectedNodeId) return;
      const targetNode = currentNodes.find((n) => n.id === selectedNodeId);
      if (!targetNode) return;

      const prevData = { ...targetNode.data };
      const newData = { ...targetNode.data };
      if (field === 'name') {
        newData.label = String(value);
        newData.name = String(value);
      } else if (field === 'description') {
        newData.description = String(value);
      } else {
        newData[field] = value;
      }

      // Route through CommandDispatcher for full undoability (F143)
      const command = new UpdateNodeMetadataCommand({
        nodeId: selectedNodeId,
        prevData,
        newData,
      });

      void defaultCommandDispatcher.dispatch(command);

      setCurrentNodes((prev) =>
        prev.map((n) => (n.id === selectedNodeId ? { ...n, data: newData } : n)),
      );
    },
    [selectedNodeId, currentNodes],
  );

  const handleEdgeMetadataChange = useCallback(
    (edgeId: string, updates: { protocol?: string; description?: string }) => {
      setCurrentEdges((prev) =>
        prev.map((e) => {
          if (e.id !== edgeId) return e;
          const data = { ...(e.data || {}), ...updates };
          const label =
            updates.protocol && updates.description
              ? `${updates.protocol}: ${updates.description}`
              : updates.protocol || updates.description || e.label;
          return { ...e, label, data };
        }),
      );
    },
    [],
  );

  const handleDeleteEdge = useCallback(
    (edgeId: string) => {
      setCurrentEdges((prev) => prev.filter((e) => e.id !== edgeId));
      if (selectedEdgeId === edgeId) setSelectedEdgeId(null);
    },
    [selectedEdgeId],
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setCurrentNodes((prev) => prev.filter((n) => n.id !== nodeId));
      setCurrentEdges((prev) => prev.filter((e) => e.source !== nodeId && e.target !== nodeId));
      if (selectedNodeId === nodeId) setSelectedNodeId(null);
    },
    [selectedNodeId],
  );

  const handleNodeDragStop = useCallback(
    (nodeId: string, position: { x: number; y: number }) => {
      setCurrentNodes((prev) =>
        prev.map((n) => (n.id === nodeId ? { ...n, position } : n)),
      );
    },
    [],
  );

  // Connect two nodes from the Inspector (routed through CommandDispatcher for undoability, F143)
  const handleConnectNodesFromInspector = useCallback(
    (targetId: string, protocol?: string, description?: string) => {
      if (!selectedNodeId || !targetId || selectedNodeId === targetId) return;

      const newEdge: CanvasEdge = {
        id: `conn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        source: selectedNodeId,
        target: targetId,
        type: 'icepanel',
        label:
          protocol && description
            ? `${protocol}: ${description}`
            : protocol || description || 'connects to',
        data: {
          protocol: protocol || 'HTTPS',
          description: description || undefined,
        },
      };

      const command = new ConnectNodesCommand({
        edge: newEdge,
      });

      void defaultCommandDispatcher.dispatch(command);

      setCurrentEdges((prev) => [...prev, newEdge]);
    },
    [selectedNodeId],
  );

  // Add node from Sidebar or Palette
  const handleAddNode = useCallback(
    (
      kind: 'system' | 'application' | 'database' | 'queue' | 'person' | 'component',
      customData?: { label?: string; technology?: string; icon?: string; description?: string },
    ) => {
      const id = `${kind}-${Date.now().toString().slice(-5)}`;
      const defaultLabels: Record<string, string> = {
        system: 'New System',
        application: 'New Service',
        database: 'New Database',
        queue: 'New Message Queue',
        person: 'New Actor',
        component: 'New Component',
      };

      const label = customData?.label || defaultLabels[kind] || 'New Object';
      const offset = (currentNodes.length % 6) * 40;

      const newNode: CanvasNode = {
        id,
        type: kind,
        position: { x: 280 + offset, y: 160 + offset },
        data: {
          label,
          kind,
          c4Level,
          parentId: activeParentId || undefined,
          technology: customData?.technology,
          description: customData?.description || 'Newly created architecture element.',
          icon: customData?.icon,
          status: 'Active',
        },
      };

      setCurrentNodes((nds) => [...nds, newNode]);
      setSelectedNodeId(id);
      setSelectedEdgeId(null);
      if (!isInspectorOpen) setIsInspectorOpen(true);
    },
    [currentNodes.length, isInspectorOpen, c4Level, activeParentId],
  );

  const handleDrillIn = useCallback(
    (nodeId: string) => {
      const targetNode = currentNodes.find((n) => n.id === nodeId);
      if (!targetNode) return;
      const currentLvl = getNodeC4Level(targetNode);
      const targetName =
        (targetNode.data?.label as string) ||
        (targetNode.data?.name as string) ||
        targetNode.id;

      if (currentLvl === 1) {
        // Descend into Container level (L2)
        setC4Level(2);
        setActiveView('container');
        setActiveParentId(nodeId);
        setParentHistory([{ id: nodeId, name: targetName, level: 1 }]);
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setCanvasKey((k) => k + 1);
      } else if (currentLvl === 2) {
        // Descend into Component level (L3)
        setC4Level(3);
        setActiveView('all');
        setActiveParentId(nodeId);
        setParentHistory((prev) => {
          const l1 = prev.find((p) => p.level === 1);
          return [
            ...(l1 ? [l1] : []),
            { id: nodeId, name: targetName, level: 2 },
          ];
        });
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setCanvasKey((k) => k + 1);
      }
    },
    [currentNodes],
  );

  const handleAscendTo = useCallback(
    (targetLevel: 1 | 2 | 3, parentId: string | null = null) => {
      if (targetLevel === 1) {
        setC4Level(1);
        setActiveView('context');
        setActiveParentId(null);
        setParentHistory([]);
      } else if (targetLevel === 2) {
        setC4Level(2);
        setActiveView('container');
        setActiveParentId(parentId);
        setParentHistory((prev) => prev.filter((p) => p.level === 1));
      } else if (targetLevel === 3) {
        setC4Level(3);
        setActiveView('all');
        setActiveParentId(parentId);
      }
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setCanvasKey((k) => k + 1);
    },
    [],
  );

  const handleClearDiagram = useCallback(() => {
    if (window.confirm('Clear all objects and connections from the diagram?')) {
      setCurrentNodes([]);
      setCurrentEdges([]);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setCanvasKey((k) => k + 1);
      void resetSavedDiagram();
    }
  }, [resetSavedDiagram]);

  const handleExportJson = useCallback(() => {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      nodes: currentNodes,
      edges: currentEdges,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `diagramhq-architecture-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [currentNodes, currentEdges]);

  const handleImportJson = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
          setCurrentNodes(parsed.nodes);
          setCurrentEdges(parsed.edges);
          setSelectedNodeId(null);
          setSelectedEdgeId(null);
          setCanvasKey((k) => k + 1);
        } else {
          alert('Invalid diagram format: nodes and edges must be arrays.');
        }
      } catch {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }, []);

  // Filtered nodes based on active C4 level, parent hierarchy, active view and persona
  const displayNodes = useMemo(() => {
    const filteredByLevel = filterNodesByC4Level(currentNodes, c4Level, activeParentId);

    return filteredByLevel.map((node) => {
      const data = { ...node.data };
      if (activePersona !== 'all') {
        data.personaView = true;
        data.personaMode = activePersona;
      }
      if (activeView === 'security') {
        data.securityView = true;
      } else if (activeView === 'data') {
        data.dataView = true;
      } else if (activeView === 'ownership') {
        data.ownershipView = true;
      }
      return {
        ...node,
        selected: node.id === selectedNodeId,
        data,
      };
    });
  }, [currentNodes, c4Level, activeParentId, activePersona, activeView, selectedNodeId]);

  // Edges filtered to only connect currently visible nodes
  const displayEdges = useMemo(() => {
    const visibleNodeIds = new Set(displayNodes.map((n) => n.id));
    return filterEdgesByVisibleNodes(currentEdges, visibleNodeIds);
  }, [displayNodes, currentEdges]);

  const isDrillDownEmpty = activeParentId !== null && displayNodes.length === 0;

  // Connections formatted for the Inspector
  const incomingConnectionsForSelectedNode = useMemo(() => {
    if (!selectedNodeId) return [];
    return currentEdges
      .filter((e) => e.target === selectedNodeId)
      .map((e) => {
        const sourceNode = currentNodes.find((n) => n.id === e.source);
        const data = (e.data || {}) as Record<string, unknown>;
        return {
          id: e.id,
          sourceId: e.source,
          sourceName: (sourceNode?.data?.label as string) || e.source,
          protocol: (data.protocol as string) || undefined,
          description: (data.description as string) || (e.label as string) || undefined,
        };
      });
  }, [selectedNodeId, currentEdges, currentNodes]);

  const outgoingConnectionsForSelectedNode = useMemo(() => {
    if (!selectedNodeId) return [];
    return currentEdges
      .filter((e) => e.source === selectedNodeId)
      .map((e) => {
        const targetNode = currentNodes.find((n) => n.id === e.target);
        const data = (e.data || {}) as Record<string, unknown>;
        return {
          id: e.id,
          targetId: e.target,
          targetName: (targetNode?.data?.label as string) || e.target,
          protocol: (data.protocol as string) || undefined,
          description: (data.description as string) || (e.label as string) || undefined,
        };
      });
  }, [selectedNodeId, currentEdges, currentNodes]);

  const allNodesForInspector = useMemo(() => {
    return currentNodes.map((n) => ({
      id: n.id,
      label: (n.data?.label as string) || n.id,
      kind: (n.data?.kind as string) || n.type,
      icon: (n.data?.icon as string) || undefined,
    }));
  }, [currentNodes]);

  // F143 Command Palette Objects & Actions
  const paletteObjects: PaletteObjectItem[] = useMemo(() => {
    return currentNodes.map((n) => ({
      id: n.id,
      name: (n.data?.label as string) || (n.data?.name as string) || n.id,
      kind: (n.data?.kind as string) || (n.type as string),
      technology: (n.data?.technology as string) || undefined,
      description: (n.data?.description as string) || undefined,
      c4Level: getNodeC4Level(n),
    }));
  }, [currentNodes]);

  const paletteActions: PaletteActionItem[] = useMemo(
    () => [
      {
        id: 'add-app',
        title: 'Add Application Service',
        description: 'Microservice, web app, or worker container',
        category: 'create',
        icon: '📦',
        shortcut: 'A',
        onExecute: () => handleAddNode('application'),
      },
      {
        id: 'add-system',
        title: 'Add System Boundary',
        description: 'High-level software system or external SaaS boundary',
        category: 'create',
        icon: '🌐',
        shortcut: 'S',
        onExecute: () => handleAddNode('system'),
      },
      {
        id: 'add-db',
        title: 'Add Database / Store',
        description: 'Relational database, key-value store, or blob storage',
        category: 'create',
        icon: '🗄️',
        shortcut: 'D',
        onExecute: () => handleAddNode('database'),
      },
      {
        id: 'add-queue',
        title: 'Add Message Queue',
        description: 'Event broker, queue, or pub/sub channel',
        category: 'create',
        icon: '📨',
        shortcut: 'Q',
        onExecute: () => handleAddNode('queue'),
      },
      {
        id: 'add-comp',
        title: 'Add Component',
        description: 'Internal module, controller, or repository',
        category: 'create',
        icon: '🧩',
        shortcut: 'C',
        onExecute: () => handleAddNode('component'),
      },
      {
        id: 'add-actor',
        title: 'Add User / Actor',
        description: 'Customer, admin, or external persona',
        category: 'create',
        icon: '👤',
        shortcut: 'U',
        onExecute: () => handleAddNode('person'),
      },
      {
        id: 'nav-lvl-1',
        title: 'Switch to Level 1: System Context',
        description: 'High-level architecture view showing systems & users',
        category: 'view',
        icon: '1️⃣',
        shortcut: '1',
        onExecute: () => handleAscendTo(1, null),
      },
      {
        id: 'nav-lvl-2',
        title: 'Switch to Level 2: Containers & Applications',
        description: 'Services, databases, and message brokers',
        category: 'view',
        icon: '2️⃣',
        shortcut: '2',
        onExecute: () => {
          const defaultParent = parentHistory.find((p) => p.level === 1)?.id ?? 'sys-saas';
          handleAscendTo(2, defaultParent);
        },
      },
      {
        id: 'nav-lvl-3',
        title: 'Switch to Level 3: Components',
        description: 'Internal components of active container',
        category: 'view',
        icon: '3️⃣',
        shortcut: '3',
        onExecute: () => {
          setC4Level(3);
          setActiveView('all');
          setActiveParentId('app-auth');
          setParentHistory([
            { id: 'sys-saas', name: 'SaaS Platform', level: 1 },
            { id: 'app-auth', name: 'Auth Service', level: 2 },
          ]);
          setSelectedNodeId(null);
          setSelectedEdgeId(null);
          setCanvasKey((k) => k + 1);
        },
      },
      {
        id: 'view-security',
        title: 'Toggle Security Perspective',
        description: 'Highlight authentication boundaries and trust zones',
        category: 'view',
        icon: '🛡️',
        onExecute: () => setActiveView((v) => (v === 'security' ? 'all' : 'security')),
      },
      {
        id: 'view-data',
        title: 'Toggle Data Classification Perspective',
        description: 'Highlight data classifications and data stores',
        category: 'view',
        icon: '📊',
        onExecute: () => setActiveView((v) => (v === 'data' ? 'all' : 'data')),
      },
      {
        id: 'act-drill',
        title: 'Drill Into Selected Object',
        description: 'Descend one C4 level deeper into child containers or components',
        category: 'action',
        icon: '🔍',
        shortcut: '↵',
        onExecute: () => {
          if (selectedNodeId) {
            handleDrillIn(selectedNodeId);
          }
        },
      },
      {
        id: 'act-export',
        title: 'Export Diagram JSON',
        description: 'Download the current architecture model as a JSON file',
        category: 'action',
        icon: '📤',
        onExecute: handleExportJson,
      },
      {
        id: 'act-share',
        title: 'Share Diagram Link',
        description: 'Open share link modal to create shareable view link',
        category: 'action',
        icon: '🔗',
        onExecute: () => setIsShareLinkModalOpen(true),
      },
    ],
    [handleAddNode, handleAscendTo, handleDrillIn, handleExportJson, parentHistory, selectedNodeId],
  );

  const handleLoadStarter = useCallback(() => {
    let objCount = 0;
    let connCount = 0;
    const instantiated = instantiateTemplate({
      templateId: 'saas' as TemplateId,
      architectureId: 'arch-studio-init' as ArchitectureId,
      versionId: 'v1' as VersionId,
      createObjectId: () => `obj-${++objCount}` as ObjectId,
      createConnectionId: () => `conn-${++connCount}` as ConnectionId,
    });

    const { nodes: initNodes, edges: initEdges } = projectViewModelToCanvas({
      objects: instantiated.objects,
      connections: instantiated.connections.map((c) => ({
        id: c.id,
        sourceId: c.sourceObjectId,
        targetId: c.targetObjectId,
        kind: c.kind,
        description: c.description,
      })),
    });

    const layoutNodes = initNodes.map(toAlignableNode);
    const layoutEdges: LayoutEdge[] = initEdges.map((e) => ({
      source: e.source,
      target: e.target,
    }));

    try {
      const positions = applyLayout(layoutNodes, layoutEdges, 'layered');
      const posMap = new Map(layoutNodes.map((n, i) => [n.id, positions[i] ?? n.position]));
      setCurrentNodes(initNodes.map((n) => ({ ...n, position: posMap.get(n.id) ?? n.position })));
      setCurrentEdges(initEdges);
    } catch {
      setCurrentNodes(initNodes);
      setCurrentEdges(initEdges);
    }
    setCanvasKey((k) => k + 1);
  }, []);

  const handleLoadIcePanelBoutique = useCallback(() => {
    const boutique = createIcePanelBoutiqueModel();
    setCurrentNodes(boutique.nodes);
    setCurrentEdges(boutique.edges);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setCanvasKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get('template') === 'online-boutique' || sp.get('diagram') === 'online-boutique') {
        handleLoadIcePanelBoutique();
      }
    }
  }, [handleLoadIcePanelBoutique]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 select-none">
      {/* Studio Top Navigation Bar (IcePanel style) */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/90 px-4 flex items-center justify-between gap-4 shrink-0 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-white font-bold text-base hover:text-blue-400 transition-colors"
          >
            <span className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-mono text-sm shadow-md shadow-blue-500/30">
              ⬡
            </span>
            <span>DiagramHQ</span>
          </Link>

          {/* Dynamic Studio Mode Badge */}
          {isLoggedIn ? (
            <div
              data-testid="studio-mode-badge"
              className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#10b981]" />
              <span>Cloud Studio</span>
              <span className="text-slate-400 font-sans hidden md:inline">
                ({sessionUser?.name || sessionUser?.email})
              </span>
            </div>
          ) : (
            <span
              data-testid="studio-mode-badge"
              className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono"
            >
              Phase 0 Studio (Guest Mode)
            </span>
          )}

          {/* Auto-Save Status Indicator */}
          <div data-testid="autosave-status" className="flex items-center">
            {saveStatus === 'saving' && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[11px] font-medium animate-pulse">
                <svg className="animate-spin h-3 w-3 text-amber-400" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Saving...</span>
              </div>
            )}
            {(saveStatus === 'saved' || (saveStatus === 'idle' && isLoggedIn)) && (
              <button
                type="button"
                onClick={() => void saveNow()}
                title={lastSavedAt ? `All changes auto-saved at ${lastSavedAt.toLocaleTimeString()}. Click to force save.` : 'All changes auto-saved to cloud'}
                className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-medium transition-colors"
              >
                <svg className="h-3 w-3 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                <span>Auto-saved</span>
                {lastSavedAt && (
                  <span className="text-[10px] text-emerald-400/80 font-mono hidden xl:inline">
                    {lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                )}
              </button>
            )}
            {saveStatus === 'unsaved' && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[11px] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                <span>Saving...</span>
              </div>
            )}
            {(saveStatus === 'saved-local' || (saveStatus === 'idle' && !isLoggedIn)) && (
              <button
                type="button"
                onClick={() => void saveNow()}
                title="Saved locally in browser storage. Click to save now."
                className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-medium transition-colors"
              >
                <svg className="h-3 w-3 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                <span>Auto-saved (Local)</span>
              </button>
            )}
          </div>

          {/* Breadcrumb Hierarchy (IcePanel style) */}
          <div
            data-testid="studio-breadcrumb"
            className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 font-medium"
          >
            <span className="text-slate-600">/</span>
            <button
              type="button"
              data-testid="breadcrumb-root"
              onClick={() => handleAscendTo(1, null)}
              className="hover:text-blue-400 transition-colors"
            >
              Model
            </button>
            <span className="text-slate-600">/</span>
            <button
              type="button"
              data-testid="breadcrumb-l1"
              onClick={() => handleAscendTo(1, null)}
              className={`hover:text-blue-400 transition-colors ${c4Level === 1 && !activeParentId ? 'text-white font-semibold' : ''}`}
            >
              System Context
            </button>
            {parentHistory.map((parent, idx) => (
              <React.Fragment key={parent.id}>
                <span className="text-slate-600">/</span>
                <button
                  type="button"
                  data-testid={`breadcrumb-parent-${parent.id}`}
                  onClick={() => {
                    if (parent.level === 1) {
                      handleAscendTo(2, parent.id);
                    }
                  }}
                  className={`hover:text-blue-400 transition-colors ${idx === parentHistory.length - 1 && c4Level === (parent.level + 1) ? 'text-white font-semibold' : ''}`}
                >
                  {parent.name}
                </button>
              </React.Fragment>
            ))}
            <span className="text-slate-600">/</span>
            <span data-testid="studio-breadcrumb-level" className="text-white font-semibold">
              {c4Level === 1
                ? 'Context'
                : c4Level === 2
                  ? 'Containers'
                  : 'Components'}
            </span>
          </div>
        </div>

        {/* IcePanel signature C4 Level Switcher, View & Persona Filters */}
        <div className="flex items-center gap-2">
          {/* C4 Level Tabs */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              data-testid="c4-level-1-btn"
              onClick={() => {
                handleAscendTo(1, null);
              }}
              title="Level 1: System Context (High-level boundary)"
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                c4Level === 1
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              1. Context
            </button>
            <button
              type="button"
              data-testid="c4-level-2-btn"
              onClick={() => {
                const defaultParent = parentHistory.find((p) => p.level === 1)?.id ?? 'sys-saas';
                handleAscendTo(2, defaultParent);
              }}
              title="Level 2: Containers & Applications (Services, DBs, Queues)"
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                c4Level === 2
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              2. Containers
            </button>
            <button
              type="button"
              data-testid="c4-level-3-btn"
              onClick={() => {
                setC4Level(3);
                setActiveView('all');
                setActiveParentId('app-auth');
                setParentHistory([
                  { id: 'sys-saas', name: 'SaaS Platform', level: 1 },
                  { id: 'app-auth', name: 'Auth Service', level: 2 },
                ]);
                setSelectedNodeId(null);
                setSelectedEdgeId(null);
                setCanvasKey((k) => k + 1);
              }}
              title="Level 3: Components (Internal modules & controllers)"
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                c4Level === 3
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              3. Components
            </button>
          </div>

          {/* Perspective View Switcher */}
          <div className="hidden md:flex items-center gap-1 bg-slate-950/60 p-1 rounded-lg border border-slate-800 text-xs">
            <span className="text-[11px] text-slate-400 px-1 font-mono">View:</span>
            {(['all', 'security', 'data', 'ownership'] as const).map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => setActiveView(view)}
                className={`px-2 py-1 rounded text-xs capitalize transition-colors ${
                  activeView === view
                    ? 'bg-blue-600 text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {view}
              </button>
            ))}
          </div>

          {/* Persona Mode Switcher */}
          <div className="hidden xl:flex items-center gap-1 bg-slate-950/60 p-1 rounded-lg border border-slate-800 text-xs">
            <span className="text-[11px] text-slate-400 px-1 font-mono">Persona:</span>
            <select
              value={activePersona}
              onChange={(e) => setActivePersona(e.target.value as PersonaMode | 'all')}
              className="bg-transparent text-slate-200 text-xs py-1 px-1.5 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-slate-200">
                Default (All)
              </option>
              <option value="developer" className="bg-slate-900 text-slate-200">
                Developer
              </option>
              <option value="architect" className="bg-slate-900 text-slate-200">
                Architect
              </option>
              <option value="security" className="bg-slate-900 text-slate-200">
                Security
              </option>
              <option value="devops" className="bg-slate-900 text-slate-200">
                DevOps
              </option>
              <option value="executive" className="bg-slate-900 text-slate-200">
                Executive
              </option>
              <option value="data-engineer" className="bg-slate-900 text-slate-200">
                Data Engineer
              </option>
              <option value="compliance" className="bg-slate-900 text-slate-200">
                Compliance
              </option>
            </select>
          </div>
        </div>

        {/* Quick Actions & Admin Superuser Pill */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-full py-1">
          {/* Admin / User Status Pill */}
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-medium transition-colors"
              title="Switch to Dashboard"
            >
              <span>{sessionUser?.role === 'owner' ? '👑' : '👤'}</span>
              <span className="font-semibold">
                {sessionUser?.role === 'owner' ? 'Admin (Owner)' : (sessionUser?.name || 'Dashboard')}
              </span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-sm"
              title="Sign in to save and sync diagrams to cloud"
            >
              <span>🔑</span>
              <span className="font-semibold">Sign in</span>
            </Link>
          )}

          {/* Active Architecture Branch Badge & Switcher */}
          <PreviewAffordance feature="branches">
            <BranchBadge
              currentBranch={currentBranch}
              onClick={() => setIsBranchSelectorOpen((v) => !v)}
            />
          </PreviewAffordance>

          {/* Active Collaborators Presence Indicators */}
          <PreviewAffordance feature="presence">
            <PresenceIndicators peers={peers} currentUserId={CURRENT_AUTHOR.id} />
          </PreviewAffordance>

          {/* Version History & Snapshots Trigger */}
          <PreviewAffordance feature="versionHistory">
            <button
              type="button"
              data-testid="toggle-version-history-btn"
              onClick={() => setIsVersionHistoryOpen((v) => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                isVersionHistoryOpen
                  ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-500/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
              title="Toggle Version History & Snapshots (Preview — not saved)"
            >
              <span>🕒</span>
              <span className="hidden sm:inline">Versions</span>
            </button>
          </PreviewAffordance>

          {/* Visual Architecture Diff Trigger */}
          <PreviewAffordance feature="visualDiff">
            <button
              type="button"
              data-testid="toggle-visual-diff-btn"
              onClick={() => setIsVisualDiffOpen((v) => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                isVisualDiffOpen
                  ? 'bg-purple-600/30 text-purple-300 border-purple-500/50 shadow-sm shadow-purple-500/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
              title="Toggle Architecture Visual Diff (Preview — not saved)"
            >
              <span>⚖️</span>
              <span className="hidden sm:inline">Diff</span>
              <span className="px-1.5 py-0.2 rounded-full bg-purple-500/30 text-purple-200 font-mono text-[10px]">
                {`+${visualDiffResult.counts.added}`}
              </span>
            </button>
          </PreviewAffordance>

          {/* Architecture Pull Request Review trigger */}
          <PreviewAffordance feature="pullRequests">
            <button
              type="button"
              data-testid="toggle-review-pr-btn"
              onClick={() => setIsPullRequestModalOpen(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                architecturePR.status === 'open'
                  ? 'bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-300 border-cyan-700/70'
                  : 'bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border-emerald-700/70'
              }`}
              title={`Architecture PR #${architecturePR.number} (${architecturePR.status}) (Preview — not saved)`}
            >
              <span>🔀</span>
              <span className="hidden md:inline font-mono font-bold">{`#${architecturePR.number}`}</span>
              <span className="capitalize">{architecturePR.status}</span>
            </button>
          </PreviewAffordance>

          {/* Comments Panel Trigger */}
          <PreviewAffordance feature="comments">
            <button
              type="button"
              data-testid="toggle-comments-btn"
              onClick={() => setIsCommentsOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                isCommentsOpen
                  ? 'bg-amber-600/30 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
              title="Toggle Architecture Comments (Preview — not saved)"
            >
              <span>💬</span>
              <span className="hidden sm:inline">Comments</span>
              {unresolvedCommentCount > 0 && (
                <span
                  data-testid="comments-badge-count"
                  className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-bold text-[10px]"
                >
                  {unresolvedCommentCount}
                </span>
              )}
            </button>
          </PreviewAffordance>

          {/* Brand Icon catalog trigger */}
          <button
            type="button"
            onClick={() => setIsIconPickerOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors shadow-sm"
            title="Browse official brand icons (Azure, AWS, Postgres, Claude, Python...)"
          >
            <span>🎨</span>
            <span className="hidden sm:inline">Icons</span>
          </button>

          {/* Multi-Format Export Modal Trigger */}
          <button
            type="button"
            data-testid="toggle-export-btn"
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors shadow-sm"
            title="Export Diagram (PNG, SVG, PDF, JSON)"
          >
            <span>🖼️</span>
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Mermaid.js Diagram-as-Code Trigger */}
          <button
            type="button"
            data-testid="toggle-mermaid-btn"
            onClick={() => setIsMermaidModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors shadow-sm"
            title="Mermaid.js Diagram-as-Code"
          >
            <span>🧜‍♀️</span>
            <span className="hidden sm:inline">Mermaid</span>
          </button>

          {/* PlantUML Diagram-as-Code Trigger */}
          <button
            type="button"
            data-testid="toggle-plantuml-btn"
            onClick={() => setIsPlantUmlModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors shadow-sm"
            title="PlantUML Diagram-as-Code"
          >
            <span>🌱</span>
            <span className="hidden sm:inline">PlantUML</span>
          </button>

          {/* Public Read-Only Share Link Trigger */}
          <button
            type="button"
            data-testid="toggle-share-link-btn"
            onClick={() => setIsShareLinkModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors shadow-sm"
            title="Share Diagram View"
          >
            <span>🔗</span>
            <span className="hidden sm:inline">Share</span>
          </button>

          {/* AI Architecture Copilot Drawer Trigger */}
          <PreviewAffordance feature="aiCopilot">
            <button
              type="button"
              data-testid="toggle-ai-copilot-btn"
              onClick={() => setIsAiCopilotOpen((v) => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                isAiCopilotOpen
                  ? 'bg-cyan-600/30 text-cyan-300 border-cyan-500/50 shadow-sm shadow-cyan-500/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
              title="Toggle AI Architecture Copilot (Preview — not saved)"
            >
              <span>🤖</span>
              <span className="hidden sm:inline">Copilot</span>
            </button>
          </PreviewAffordance>

          {/* AI Architecture Generation Modal Trigger */}
          <PreviewAffordance feature="aiGeneration">
            <button
              type="button"
              data-testid="toggle-ai-generation-btn"
              onClick={() => setIsAiGenerationOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors shadow-sm"
              title="Generate Architecture with AI (Preview — not saved)"
            >
              <span>✨</span>
              <span className="hidden sm:inline">AI Gen</span>
            </button>
          </PreviewAffordance>

          {/* AI Architecture Review Modal Trigger */}
          <PreviewAffordance feature="aiReview">
            <button
              type="button"
              data-testid="toggle-ai-review-btn"
              onClick={handleRunArchitectureReview}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors shadow-sm"
              title="Run AI Architecture Governance Review (Preview — not saved)"
            >
              <span>🛡️</span>
              <span className="hidden sm:inline">AI Review</span>
            </button>
          </PreviewAffordance>

          {/* AI Architecture Decision Record (ADR) Modal Trigger */}
          <PreviewAffordance feature="aiAdr">
            <button
              type="button"
              data-testid="toggle-ai-adr-btn"
              onClick={handleOpenAiAdr}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors shadow-sm"
              title="Draft Architecture Decision Record (ADR) (Preview — not saved)"
            >
              <span>📜</span>
              <span className="hidden sm:inline">Draft ADR</span>
            </button>
          </PreviewAffordance>

          {/* Mobile Companion View Link */}
          <Link
            href="/mobile"
            data-testid="link-mobile-companion"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors shadow-sm"
            title="Open Mobile Companion"
          >
            <span>📱</span>
            <span className="hidden sm:inline">Mobile</span>
          </Link>

          {/* IcePanel Online Boutique Reference Architecture Button */}
          <button
            type="button"
            data-testid="load-icepanel-demo-btn"
            onClick={handleLoadIcePanelBoutique}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-950/80 hover:bg-sky-900 border border-sky-600/50 text-xs font-semibold text-sky-200 transition-colors shadow-sm"
            title="Load IcePanel Online Boutique Reference Architecture & Flows"
          >
            <span>🧊</span>
            <span className="hidden sm:inline">Online Boutique</span>
          </button>

          <label className="cursor-pointer px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors">
            📥 Import JSON
            <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
          </label>

          <button
            type="button"
            onClick={handleExportJson}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
            title="Export diagram as JSON"
          >
            📤 Export JSON
          </button>

          <button
            type="button"
            onClick={handleClearDiagram}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-red-900/40 text-xs font-medium text-slate-400 hover:text-red-300 border border-slate-700 hover:border-red-700 transition-colors"
            title="Clear canvas"
          >
            🧹 Reset
          </button>

          <button
            type="button"
            data-testid="toggle-flow-playback-btn"
            onClick={() => {
              setIsFlowPlaybackActive((prev) => !prev);
              setPlaybackState((prev) => ({ ...prev, currentStepIndex: 0, isPlaying: false }));
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isFlowPlaybackActive
                ? 'bg-sky-600/30 text-sky-300 border-sky-500/50 shadow-sm shadow-sky-500/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
            title="Toggle Flow Trace Playback"
          >
            <span>⚡</span>
            <span className="hidden sm:inline">Trace Flow</span>
          </button>

          <button
            type="button"
            data-testid="open-command-palette-btn"
            onClick={() => setIsCommandPaletteOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 border border-slate-700 transition-colors shadow-sm"
            title="Open Command Palette (Cmd+K)"
          >
            <svg
              className="w-3.5 h-3.5 text-blue-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span className="hidden sm:inline">Palette</span>
            <kbd className="hidden sm:inline-block px-1 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-700 rounded">
              ⌘K
            </kbd>
          </button>

          <button
            type="button"
            onClick={() => setIsInspectorOpen((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isInspectorOpen
                ? 'bg-blue-600/20 text-blue-300 border-blue-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Toggle Inspector Sidebar"
          >
            Inspector
          </button>
        </div>
      </header>

      {/* Main Studio Body: Left Sidebar + Canvas + Right Inspector */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* IcePanel Left Sidebar: Model Objects Tree & Diagram Views */}
        <IcePanelSidebar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen((prev) => !prev)}
          c4Level={c4Level}
          onSelectC4Level={(lvl) => {
            if (lvl === 1) {
              handleAscendTo(1, null);
            } else if (lvl === 2) {
              const defaultParent = parentHistory.find((p) => p.level === 1)?.id ?? 'sys-saas';
              handleAscendTo(2, defaultParent);
            } else {
              setC4Level(3);
              setActiveView('all');
              setActiveParentId('app-auth');
              setParentHistory([
                { id: 'sys-saas', name: 'SaaS Platform', level: 1 },
                { id: 'app-auth', name: 'Auth Service', level: 2 },
              ]);
              setSelectedNodeId(null);
              setSelectedEdgeId(null);
              setCanvasKey((k) => k + 1);
            }
          }}
          nodes={currentNodes}
          selectedNodeId={selectedNodeId}
          onSelectNode={handleNodeSelect}
          onAddNode={handleAddNode}
          onOpenIconPicker={() => setIsIconPickerOpen(true)}
        />

        {/* Full-bleed Infinite Canvas */}
        <div className="flex-1 h-full w-full relative">
          <InfiniteCanvas
            key={canvasKey}
            initialNodes={displayNodes}
            initialEdges={displayEdges}
            onNodeSelect={handleNodeSelect}
            onEdgeSelect={handleEdgeSelect}
            onNodeDragStop={handleNodeDragStop}
            onDrillIn={handleDrillIn}
            showPalette
            showTemplatePicker
            onNodeCreate={(newNode) => {
              const enrichedNode: CanvasNode = {
                ...newNode,
                data: {
                  ...newNode.data,
                  c4Level: newNode.data?.c4Level ?? c4Level,
                  parentId: newNode.data?.parentId ?? (activeParentId || undefined),
                },
              };
              setCurrentNodes((nds) => [...nds, enrichedNode]);
            }}
            onEdgeConnect={(newEdge) => {
              setCurrentEdges((eds) => [...eds, newEdge]);
            }}
            onEdgeReconnect={(oldEdge, _connection, updatedEdge) => {
              setCurrentEdges((eds) =>
                eds.map((e) => (e.id === oldEdge.id ? updatedEdge : e)),
              );
            }}
            onNodeDelete={handleDeleteNode}
            onNodeRename={(nodeId, newLabel) => {
              setCurrentNodes((prev) =>
                prev.map((n) => {
                  if (n.id !== nodeId) return n;
                  const data = { ...n.data, label: newLabel, name: newLabel };
                  return { ...n, data };
                }),
              );
            }}
            onNodeMetadataUpdate={(nodeId, data) => {
              setCurrentNodes((prev) =>
                prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n)),
              );
            }}
            onEdgeDisconnect={(edgeId) => {
              setCurrentEdges((prev) => prev.filter((e) => e.id !== edgeId));
            }}
            onEdgeLabelChange={(edgeId, newLabel) => {
              handleEdgeMetadataChange(edgeId, { description: newLabel });
            }}
          />

          {/* F142 Graceful Empty State for Drill-Down with No Children */}
          {isDrillDownEmpty && (
            <div
              data-testid="drill-empty-notice"
              className="absolute inset-0 pointer-events-none flex items-center justify-center z-20 p-4"
            >
              <div className="pointer-events-auto bg-slate-900/95 border border-slate-700/80 rounded-2xl p-6 max-w-sm text-center shadow-2xl backdrop-blur-md">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl mx-auto mb-3">
                  🔍
                </div>
                <h3 className="text-base font-semibold text-white mb-1">No Child Components</h3>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  This object has no child components defined yet. You can add components using the insert bar or return to the higher level.
                </p>
                <button
                  type="button"
                  data-testid="drill-ascend-btn"
                  onClick={() => {
                    if (c4Level === 3) {
                      handleAscendTo(2, parentHistory[0]?.id ?? null);
                    } else {
                      handleAscendTo(1, null);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-md shadow-blue-600/30 transition-all inline-flex items-center gap-1.5"
                >
                  <span>← Return to {c4Level === 3 ? 'Containers' : 'System Context'}</span>
                </button>
              </div>
            </div>
          )}

          {/* IcePanel Empty State Helper */}
          {currentNodes.length === 0 && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10 p-4">
              <div className="pointer-events-auto bg-slate-900/95 border border-slate-700/80 rounded-2xl p-6 max-w-sm text-center shadow-2xl backdrop-blur-md">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-2xl mx-auto mb-3">
                  🧊
                </div>
                <h3 className="text-base font-semibold text-white mb-1">Canvas is ready</h3>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  Use the Model Tree on the left or the Insert bar to add systems, services, and
                  databases, or load a starter architecture.
                </p>
                <button
                  type="button"
                  onClick={handleLoadStarter}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-md shadow-blue-600/30 transition-all"
                >
                  🚀 Load Reference Architecture
                </button>
              </div>
            </div>
          )}

          {/* Flow Playback Interactive Toolbar */}
          {isFlowPlaybackActive && (
            <FlowPlaybackToolbar
              state={playbackState}
              currentStepNote={STARTER_FLOW_STEPS[playbackState.currentStepIndex]?.note}
              persona="Security Architect"
              actorAction="Validates Auth Token"
              userIntent="End-to-end token verification trace"
              onPlay={() => setPlaybackState((s) => ({ ...s, isPlaying: true }))}
              onPause={() => setPlaybackState((s) => ({ ...s, isPlaying: false }))}
              onNext={() =>
                setPlaybackState((s) => ({
                  ...s,
                  currentStepIndex:
                    s.currentStepIndex < s.totalSteps - 1
                      ? s.currentStepIndex + 1
                      : s.isLooping
                        ? 0
                        : s.currentStepIndex,
                }))
              }
              onPrev={() =>
                setPlaybackState((s) => ({
                  ...s,
                  currentStepIndex: Math.max(s.currentStepIndex - 1, 0),
                }))
              }
              onRestart={() =>
                setPlaybackState((s) => ({
                  ...s,
                  currentStepIndex: 0,
                  isPlaying: false,
                }))
              }
              onSpeedChange={(speed) => setPlaybackState((s) => ({ ...s, speedMultiplier: speed }))}
              onToggleLoop={() => setPlaybackState((s) => ({ ...s, isLooping: !s.isLooping }))}
            />
          )}
        </div>

        {/* Right Inspector Sidebar */}
        <InspectorPanel
          isOpen={isInspectorOpen}
          onToggle={() => setIsInspectorOpen((prev) => !prev)}
          objectId={selectedNode?.id}
          objectName={
            typeof selectedNode?.data.label === 'string'
              ? selectedNode.data.label
              : selectedNode?.id
          }
          objectKind={
            typeof selectedNode?.data.kind === 'string'
              ? selectedNode.data.kind
              : selectedNode?.type
          }
          metadata={selectedNode?.data as Record<string, unknown> | undefined}
          onMetadataChange={handleMetadataChange}
          onOpenIconPicker={() => setIsIconPickerOpen(true)}
          onDeleteNode={handleDeleteNode}
          selectedEdge={selectedEdgeData}
          onEdgeChange={handleEdgeMetadataChange}
          onDeleteEdge={handleDeleteEdge}
          allNodes={allNodesForInspector}
          incomingConnections={incomingConnectionsForSelectedNode}
          outgoingConnections={outgoingConnectionsForSelectedNode}
          onConnectNodes={handleConnectNodesFromInspector}
        />
      </div>

      {/* Interactive Official Brand Icon Picker Modal */}
      <IconPickerModal
        isOpen={isIconPickerOpen}
        currentIcon={(selectedNode?.data.icon as string) ?? null}
        onSelectIcon={(iconPath) => {
          handleMetadataChange('icon', iconPath);
          setIsIconPickerOpen(false);
        }}
        onClose={() => setIsIconPickerOpen(false)}
      />

      {/* Collaboration: Threaded Comments Panel */}
      <CommentsPanel
        isOpen={isCommentsOpen}
        onClose={() => setIsCommentsOpen(false)}
        threads={visibleThreads}
        targetType={commentTargetType}
        targetId={commentTargetId}
        targetName={commentTargetName}
        currentAuthor={CURRENT_AUTHOR}
        onCreateComment={handleCreateComment}
        onReplyComment={handleReplyComment}
        onResolveComment={handleResolveComment}
        onReopenComment={handleReopenComment}
      />

      {/* Architecture Pull Request Review Modal */}
      {isPullRequestModalOpen && (
        <div
          data-testid="pull-request-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsPullRequestModalOpen(false);
          }}
        >
          <PullRequestModal
            pr={architecturePR}
            onClose={() => setIsPullRequestModalOpen(false)}
            onSubmitReview={handleSubmitPRReview}
            onAddComment={handleAddPRComment}
          />
        </div>
      )}

      {/* Architecture Branch Switcher Modal */}
      {isBranchSelectorOpen && (
        <div
          data-testid="branch-selector-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsBranchSelectorOpen(false);
          }}
        >
          <BranchSelector
            branches={branches}
            currentBranchId={currentBranchId}
            onSelectBranch={handleSelectBranch}
            onCreateBranch={handleCreateBranch}
            onClose={() => setIsBranchSelectorOpen(false)}
          />
        </div>
      )}

      {/* Architecture Version History Drawer */}
      {isVersionHistoryOpen && (
        <div
          data-testid="version-history-drawer"
          className="fixed right-4 top-20 bottom-4 w-96 z-40 overflow-y-auto"
        >
          <VersionTimeline
            liveVersion={liveVersion}
            snapshots={snapshots}
            onCreateSnapshot={() => {
              const newVer = `v1.${snapshots.length}.0`;
              const snap: NumberedSnapshot = {
                id: `snap-${Date.now()}` as SnapshotId,
                architectureId: 'arch-studio-init' as ArchitectureId,
                liveVersionId: 'v1' as VersionId,
                versionNumber: newVer,
                label: `Release Snapshot ${newVer}`,
                createdBy: 'Admin Superuser',
                createdAt: Date.now(),
                isImmutable: true,
                snapshotData: {
                  objects: liveVersion.objects,
                  connections: liveVersion.connections,
                },
              };
              setSnapshots((prev) => [snap, ...prev]);
            }}
            onSelectSnapshot={(snap) => {
              setSelectedSnapshotModal({
                ...SAMPLE_FULL_SNAPSHOT,
                versionNumber: snap.versionNumber,
                label: snap.label,
                createdBy: snap.createdBy,
                createdAt: snap.createdAt,
              });
            }}
            className="w-full h-full"
          />
        </div>
      )}

      {/* Snapshot Details Full-State Inspection Modal */}
      {selectedSnapshotModal && (
        <SnapshotDetailsModal
          snapshot={selectedSnapshotModal}
          isOpen={Boolean(selectedSnapshotModal)}
          onClose={() => setSelectedSnapshotModal(null)}
        />
      )}

      {/* Architecture Visual Diff Modal */}
      {isVisualDiffOpen && (
        <div
          data-testid="visual-diff-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsVisualDiffOpen(false);
          }}
        >
          <VisualDiffViewer
            diff={visualDiffResult}
            sourceLabel="main"
            targetLabel="feat/auth-v2"
            onClose={() => setIsVisualDiffOpen(false)}
          />
        </div>
      )}

      {/* Multi-Format Export Modal */}
      {isExportModalOpen && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          model={currentStudioModel}
          currentView={currentStudioView}
          views={[currentStudioView]}
        />
      )}

      {/* Mermaid Diagram-as-Code Modal */}
      {isMermaidModalOpen && (
        <MermaidModal
          isOpen={isMermaidModalOpen}
          onClose={() => setIsMermaidModalOpen(false)}
          model={currentStudioModel}
          currentView={currentStudioView}
          flows={SAMPLE_FULL_SNAPSHOT.state.flows}
        />
      )}

      {/* PlantUML Diagram-as-Code Modal */}
      {isPlantUmlModalOpen && (
        <PlantUmlModal
          isOpen={isPlantUmlModalOpen}
          onClose={() => setIsPlantUmlModalOpen(false)}
          model={currentStudioModel}
          currentView={currentStudioView}
          flows={SAMPLE_FULL_SNAPSHOT.state.flows}
        />
      )}

      {/* Public Read-Only Share Link Modal */}
      {isShareLinkModalOpen && (
        <ShareLinkModal
          isOpen={isShareLinkModalOpen}
          onClose={() => setIsShareLinkModalOpen(false)}
          workspaceId="default"
          viewId={currentStudioView.id}
          selectedObjectId={selectedNodeId}
          onGenerateLink={({ preserveCamera, preserveSelection, expiresInMs }) => {
            const payload = createShareLink({
              workspaceId: 'default',
              viewId: currentStudioView.id,
              camera: preserveCamera ? { panX: 0, panY: 0, zoom: 1 } : undefined,
              selectedObjectId: preserveSelection ? selectedNodeId : null,
              expiresInMs,
              diagramData: {
                nodes: currentNodes,
                edges: currentEdges,
                title: currentStudioView.name,
              },
            });
            const origin =
              typeof window !== 'undefined' && window.location.origin
                ? window.location.origin
                : 'https://diagramhq.com';
            return generateShareLinkUrl(origin, payload);
          }}
        />
      )}

      {/* Universal ⌘K Command Palette (F143) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        objects={paletteObjects}
        onSelectObject={(objId) => {
          handleNodeSelect(objId);
        }}
        actions={paletteActions}
      />

      {/* Area 10: AI Architecture Copilot Drawer */}
      <AICopilotPanel
        isOpen={isAiCopilotOpen}
        onClose={() => setIsAiCopilotOpen(false)}
        context={aiGroundedContext}
        onSelectEntity={(entityId) => {
          handleNodeSelect(entityId);
        }}
      />

      {/* Area 10: AI Architecture Generation Modal */}
      <AIGenerationModal
        isOpen={isAiGenerationOpen}
        onClose={() => setIsAiGenerationOpen(false)}
        proposal={aiProposal}
        onGenerate={handleGenerateArchitecture}
        onApplyProposal={handleApplyAiProposal}
        onRejectProposal={() => {
          setAiProposal((p) => (p ? { ...p, status: 'rejected' } : null));
          setIsAiGenerationOpen(false);
        }}
      />

      {/* Area 10: AI Architecture Review Modal */}
      <ArchitectureReviewModal
        isOpen={isAiReviewOpen}
        onClose={() => setIsAiReviewOpen(false)}
        report={aiReviewReport}
        onRerunReview={handleRunArchitectureReview}
        onSelectEntity={(entityId) => {
          handleNodeSelect(entityId);
          setIsAiReviewOpen(false);
        }}
      />

      {/* Area 10: AI-Drafted ADR Modal */}
      <ADRGenerationModal
        isOpen={isAiAdrOpen}
        onClose={() => setIsAiAdrOpen(false)}
        draft={aiDraftedAdr}
        onAccept={(modifications) => {
          if (aiDraftedAdr) {
            setAiDraftedAdr({
              ...aiDraftedAdr,
              status: 'accepted',
              title: modifications?.title ?? aiDraftedAdr.title,
              context: modifications?.context ?? aiDraftedAdr.context,
              decision: modifications?.decision ?? aiDraftedAdr.decision,
              consequences: modifications?.consequences ?? aiDraftedAdr.consequences,
            });
          }
          setIsAiAdrOpen(false);
        }}
        onDiscard={() => {
          setIsAiAdrOpen(false);
        }}
      />
    </div>
  );
}
