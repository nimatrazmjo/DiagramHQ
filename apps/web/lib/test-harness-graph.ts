import type { CanvasNode, CanvasEdge } from '@diagramhq/domain';

/**
 * Creates the deterministic reference architecture graph used specifically
 * by e2e tests and testing harnesses. Kept separate from the main production canvas
 * so DiagramHQ loads a completely clean, empty canvas by default.
 */
export function createTestHarnessGraph(): { nodes: CanvasNode[]; edges: CanvasEdge[] } {
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

  const nodes: CanvasNode[] = [
    sysSaas,
    actorUser,
    sysEmail,
    sysBilling,
    appWeb,
    appApi,
    appAuth,
    storeDb,
    storeCache,
    storeStorage,
    cmpAuthCtrl,
    cmpJwtSvc,
    cmpUserRepo,
    cmpPwdHasher,
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
}
