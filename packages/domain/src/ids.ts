/**
 * Stable, opaque, type-prefixed identifiers for model entities.
 * Prefixes keep IDs self-describing in logs, URLs, and API payloads
 * (see .harness/rules/conventions.md). The brand stops an ObjectId from
 * being used where a ConnectionId is expected, without any runtime cost.
 */
export type IdPrefix =
  | 'org'
  | 'ws'
  | 'arch'
  | 'ver'
  | 'sys'
  | 'app'
  | 'sto'
  | 'cmp'
  | 'act'
  | 'grp'
  | 'con'
  | 'vw'
  | 'flw'
  | 'dec'
  | 'env'
  | 'ph'
  | 'tag'
  | 'tech'
  | 'usr'
  | 'mem'
  | 'cmt'
  | 'tsk'
  | 'ntf'
  | 'shl'
  | 'team'
  | 'snp'
  | 'brn'
  | 'pr'
  | 'scn'
  | 'rdm'
  | 'msg'
  | 'pub'
  | 'ptl'
  | 'idp'
  | 'sso'
  | 'saml'
  | 'scim'
  | 'role'
  | 'aud'
  | 'pol'
  | 'sec'
  | 'dep'
  | 'cpl'
  | 'sub'
  | 'mkt'
  | 'ins'
  | 'dom';

export type Id<P extends IdPrefix> = string & { readonly __brand: P };

export type OrgId = Id<'org'>;
export type WorkspaceId = Id<'ws'>;
export type ArchitectureId = Id<'arch'>;
export type VersionId = Id<'ver'>;
export type ObjectId = Id<'sys' | 'app' | 'sto' | 'cmp' | 'act' | 'grp'>;
export type ConnectionId = Id<'con'>;
export type ViewId = Id<'vw'>;
export type FlowId = Id<'flw'>;
export type DecisionId = Id<'dec'>;
export type EnvironmentId = Id<'env'>;
export type PhaseId = Id<'ph'>;
export type TagId = Id<'tag'>;
export type TechnologyId = Id<'tech'>;
export type UserId = Id<'usr'>;
export type MemberId = Id<'mem'>;
export type CommentId = Id<'cmt'>;
export type TaskId = Id<'tsk'>;
export type NotificationId = Id<'ntf'>;
export type ShareLinkId = Id<'shl'>;
export type TeamId = Id<'team'>;
export type SnapshotId = Id<'snp'>;
export type BranchId = Id<'brn'>;
export type PullRequestId = Id<'pr'>;
export type ScenarioId = Id<'scn'>;
export type RoadmapItemId = Id<'rdm'>;
export type MessageId = Id<'msg'>;
export type PublicationId = Id<'pub'>;
export type PortalId = Id<'ptl'>;
export type SsoProviderId = Id<'idp'>;
export type SsoSessionId = Id<'sso'>;
export type SamlRequestId = Id<'saml'>;
export type ScimConfigId = Id<'scim'>;
export type CustomRoleId = Id<'role'>;
export type AuditLogEntryId = Id<'aud'>;
export type OrgPolicyId = Id<'pol'>;
export type SecurityProfileId = Id<'sec'>;
export type DeploymentId = Id<'dep'>;
export type ComplianceMappingId = Id<'cpl'>;
export type SubscriptionId = Id<'sub'>;
export type MarketplaceItemId = Id<'mkt'>;
export type InstallationId = Id<'ins'>;
export type DomainId = Id<'dom'>;

let sequence = 0;

/** Generates a monotonic, prefixed id. Monotonicity keeps logs and tests stable. */
export function createId<P extends IdPrefix>(prefix: P): Id<P> {
  sequence += 1;
  const rand = Math.random().toString(36).slice(2, 6);
  return `${prefix}_${Date.now().toString(36)}${sequence.toString(36)}${rand}` as Id<P>;
}
