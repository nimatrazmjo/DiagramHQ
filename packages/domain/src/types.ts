import type {
  ArchitectureId,
  ConnectionId,
  DecisionId,
  EnvironmentId,
  FlowId,
  ObjectId,
  OrgId,
  PhaseId,
  TagId,
  TechnologyId,
  UserId,
  MemberId,
  VersionId,
  ViewId,
  WorkspaceId,
} from './ids';

export type VersionKind = 'main' | 'branch' | 'fork' | 'future';
export type VersionStatus = 'draft' | 'open' | 'approved' | 'merged';

export type ObjectKind = 'system' | 'application' | 'store' | 'component' | 'actor' | 'group';

export type ConnectionKind = 'sync' | 'async' | 'data' | 'dependency' | 'deploys_to';

export type ViewKind =
  | 'context'
  | 'container'
  | 'component'
  | 'security'
  | 'data'
  | 'ownership'
  | 'technology'
  | 'custom';

export type MemberRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface Organization {
  readonly id: OrgId;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Workspace {
  readonly id: WorkspaceId;
  readonly orgId: OrgId;
  name: string;
  slug: string;
  settings?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Architecture {
  readonly id: ArchitectureId;
  readonly workspaceId: WorkspaceId;
  name: string;
  description?: string | null;
  defaultVersionId?: VersionId | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Version {
  readonly id: VersionId;
  readonly architectureId: ArchitectureId;
  readonly parentVersionId?: VersionId | null;
  name: string;
  kind: VersionKind;
  status: VersionStatus;
  createdBy?: string | null;
  createdAt: Date;
}

export interface ModelObject {
  readonly id: ObjectId;
  readonly architectureId: ArchitectureId;
  readonly versionId: VersionId;
  parentId?: ObjectId | null;
  kind: ObjectKind;
  name: string;
  description?: string | null;
  metadata?: Record<string, unknown>;
  position?: { x: number; y: number } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ModelConnection {
  readonly id: ConnectionId;
  readonly architectureId: ArchitectureId;
  readonly versionId: VersionId;
  readonly sourceObjectId: ObjectId;
  readonly targetObjectId: ObjectId;
  kind: ConnectionKind;
  label?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ArchitectureModel {
  readonly architecture: Architecture;
  readonly version: Version;
  readonly objects: ModelObject[];
  readonly connections: ModelConnection[];
}

export interface View {
  readonly id: ViewId;
  readonly architectureId: ArchitectureId;
  name: string;
  kind: ViewKind;
  filter?: Record<string, unknown>;
  level?: number;
  isStarred?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ViewObject {
  readonly viewId: ViewId;
  readonly objectId: ObjectId;
  position?: { x: number; y: number } | null;
  collapsed?: boolean;
  hidden?: boolean;
  style?: Record<string, unknown>;
}

export interface Member {
  readonly id: MemberId;
  readonly orgId: OrgId;
  readonly userId: string;
  role: MemberRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tag {
  readonly id: TagId;
  readonly architectureId: ArchitectureId;
  name: string;
  color?: string | null;
}

export interface Technology {
  readonly id: TechnologyId;
  name: string;
  category?: string | null;
  version?: string | null;
  vendor?: string | null;
  lifecycle?: string | null;
  securityStatus?: string | null;
  owner?: string | null;
  docs?: string | null;
}

export interface Flow {
  readonly id: FlowId;
  readonly architectureId: ArchitectureId;
  name: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Decision {
  readonly id: DecisionId;
  readonly architectureId: ArchitectureId;
  number: number;
  title: string;
  status: string;
  context?: string | null;
  decision?: string | null;
  consequences?: string | null;
  createdAt: Date;
}

export interface Environment {
  readonly id: EnvironmentId;
  readonly architectureId: ArchitectureId;
  name: string;
}

export interface Phase {
  readonly id: PhaseId;
  readonly architectureId: ArchitectureId;
  name: string;
  versionId?: VersionId | null;
}

export interface User {
  readonly id: UserId;
  email: string;
  name?: string | null;
  image?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuthSessionUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
}

export interface AuthTokenPayload {
  sub: string;
  email: string;
  name?: string | null;
  iat?: number;
  exp?: number;
}

