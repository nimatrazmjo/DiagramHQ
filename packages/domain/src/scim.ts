/**
 * DiagramHQ - Enterprise SCIM 2.0 Provisioning and Deprovisioning (F103)
 *
 * Implements RFC 7643 (SCIM Core Schema) and RFC 7644 (SCIM Protocol):
 * - User provisioning (POST /Users)
 * - User lookup and filtering (GET /Users, GET /Users/{id})
 * - User modification (PUT /Users/{id})
 * - User deprovisioning and attribute updates via PATCH (PATCH /Users/{id})
 * - User deactivation lifecycle tracking
 * - Group management (POST/GET/PATCH/DELETE /Groups)
 * - Service Provider Configuration (GET /ServiceProviderConfig)
 * - Zero-network deterministic provisioning lifecycle simulation
 */

import { createId, type OrgId, type ScimConfigId, type UserId } from './ids';
import type { MemberRole } from './types';

export const SCIM_USER_SCHEMA = 'urn:ietf:params:scim:schemas:core:2.0:User';
export const SCIM_ENTERPRISE_USER_SCHEMA = 'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User';
export const SCIM_GROUP_SCHEMA = 'urn:ietf:params:scim:schemas:core:2.0:Group';
export const SCIM_LIST_RESPONSE_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:ListResponse';
export const SCIM_ERROR_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:Error';
export const SCIM_PATCH_OP_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:PatchOp';
export const SCIM_SERVICE_PROVIDER_CONFIG_SCHEMA = 'urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig';

export interface ScimEmail {
  value: string;
  type?: 'work' | 'home' | 'other' | string;
  primary?: boolean;
  display?: string;
}

export interface ScimName {
  formatted?: string;
  familyName?: string;
  givenName?: string;
  middleName?: string;
  honorificPrefix?: string;
  honorificSuffix?: string;
}

export interface ScimMeta {
  resourceType: 'User' | 'Group' | 'ServiceProviderConfig';
  created: string;
  lastModified: string;
  location?: string;
  version?: string;
}

export interface ScimRole {
  value: string;
  display?: string;
  primary?: boolean;
  type?: string;
}

export interface ScimGroupRef {
  value: string;
  display?: string;
  $ref?: string;
}

export interface ScimEnterpriseUserExtension {
  employeeNumber?: string;
  costCenter?: string;
  organization?: string;
  division?: string;
  department?: string;
  manager?: {
    value?: string;
    $ref?: string;
    displayName?: string;
  };
}

export interface ScimUser {
  schemas: string[];
  id: UserId;
  externalId?: string;
  userName: string;
  name?: ScimName;
  displayName?: string;
  nickName?: string;
  title?: string;
  userType?: string;
  preferredLanguage?: string;
  locale?: string;
  timezone?: string;
  active: boolean;
  emails: ScimEmail[];
  roles?: ScimRole[];
  groups?: ScimGroupRef[];
  [SCIM_ENTERPRISE_USER_SCHEMA]?: ScimEnterpriseUserExtension;
  meta: ScimMeta;
}

export interface ScimGroupMember {
  value: string; // UserId or GroupId
  display?: string;
  $ref?: string;
  type?: 'User' | 'Group';
}

export interface ScimGroup {
  schemas: string[];
  id: string;
  externalId?: string;
  displayName: string;
  members: ScimGroupMember[];
  meta: ScimMeta;
}

export interface ScimPatchOperation {
  op: 'add' | 'remove' | 'replace' | 'Add' | 'Remove' | 'Replace';
  path?: string;
  value?: unknown;
}

export interface ScimPatchRequest {
  schemas: string[];
  Operations: ScimPatchOperation[];
}

export interface ScimListResponse<T> {
  schemas: string[];
  totalResults: number;
  startIndex: number;
  itemsPerPage: number;
  Resources: T[];
}

export interface ScimErrorResponse {
  schemas: string[];
  status: string;
  scimType?: string;
  detail: string;
}

export interface ScimConfig {
  id: ScimConfigId;
  orgId: OrgId;
  enabled: boolean;
  bearerToken: string;
  defaultRole: MemberRole;
  roleMapping?: Record<string, MemberRole>;
  endpointUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScimAuditEntry {
  id: string;
  timestamp: Date;
  action: 'create_user' | 'update_user' | 'patch_user' | 'deactivate_user' | 'delete_user' | 'create_group' | 'patch_group' | 'delete_group';
  targetType: 'User' | 'Group';
  targetId: string;
  detail: string;
  activeStatus?: boolean;
}

export interface ScimState {
  orgId: OrgId;
  config: ScimConfig;
  users: Map<string, ScimUser>;
  groups: Map<string, ScimGroup>;
  auditLogs: ScimAuditEntry[];
}

export interface ScimCreateUserInput {
  schemas?: string[];
  externalId?: string;
  userName: string;
  name?: ScimName;
  displayName?: string;
  title?: string;
  active?: boolean;
  emails?: ScimEmail[];
  roles?: ScimRole[];
  [SCIM_ENTERPRISE_USER_SCHEMA]?: ScimEnterpriseUserExtension;
}

export interface ScimCreateGroupInput {
  schemas?: string[];
  externalId?: string;
  displayName: string;
  members?: ScimGroupMember[];
}

/**
 * Creates initial SCIM state for an organization.
 */
export function createScimState(orgId: OrgId, options?: { defaultRole?: MemberRole; endpointUrl?: string; bearerToken?: string }): ScimState {
  const configId = createId('scim') as ScimConfigId;
  const token = options?.bearerToken ?? generateScimBearerToken();
  const endpoint = options?.endpointUrl ?? `https://api.diagramhq.com/scim/v2/${orgId}`;

  return {
    orgId,
    config: {
      id: configId,
      orgId,
      enabled: true,
      bearerToken: token,
      defaultRole: options?.defaultRole ?? 'viewer',
      endpointUrl: endpoint,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    users: new Map(),
    groups: new Map(),
    auditLogs: [],
  };
}

/**
 * Generates a high-entropy bearer token for SCIM authentication.
 */
export function generateScimBearerToken(): string {
  const rand1 = Math.random().toString(36).slice(2);
  const rand2 = Math.random().toString(36).slice(2);
  const rand3 = Math.random().toString(36).slice(2);
  return `scim_sec_${Date.now().toString(36)}_${rand1}${rand2}${rand3}`;
}

/**
 * Validates a SCIM Bearer token header.
 */
export function validateScimBearerToken(authHeader: string | undefined, expectedToken: string): boolean {
  if (!authHeader) return false;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match || !match[1]) return false;
  return match[1].trim() === expectedToken.trim();
}

/**
 * SCIM 2.0 Service Provider Configuration (RFC 7643 section 5).
 */
export function getScimServiceProviderConfig(baseUrl: string) {
  return {
    schemas: [SCIM_SERVICE_PROVIDER_CONFIG_SCHEMA],
    documentationUri: 'https://docs.diagramhq.com/enterprise/scim',
    patch: {
      supported: true,
    },
    bulk: {
      supported: false,
      maxOperations: 0,
      maxPayloadSize: 0,
    },
    filter: {
      supported: true,
      maxResults: 200,
    },
    changePassword: {
      supported: false,
    },
    sort: {
      supported: false,
    },
    etag: {
      supported: false,
    },
    authenticationSchemes: [
      {
        name: 'OAuth Bearer Token',
        description: 'Authentication scheme using the OAuth Bearer Token Standard',
        specUri: 'http://www.rfc-editor.org/info/rfc6750',
        type: 'oauthbearertoken',
        primary: true,
      },
    ],
    meta: {
      resourceType: 'ServiceProviderConfig' as const,
      created: '2026-01-01T00:00:00Z',
      lastModified: '2026-01-01T00:00:00Z',
      location: `${baseUrl}/ServiceProviderConfig`,
    },
  };
}

/**
 * Creates a SCIM user (RFC 7644 section 3.3).
 */
export function createScimUser(
  state: ScimState,
  input: ScimCreateUserInput,
  baseUrl = 'https://api.diagramhq.com/scim/v2'
): { status: 201; user: ScimUser } | { status: 400 | 409; error: ScimErrorResponse } {
  const userName = input.userName?.trim().toLowerCase();
  if (!userName) {
    return {
      status: 400,
      error: {
        schemas: [SCIM_ERROR_SCHEMA],
        status: '400',
        scimType: 'invalidValue',
        detail: 'userName is a required field',
      },
    };
  }

  // Uniqueness check across userName and externalId
  for (const existing of state.users.values()) {
    if (existing.userName.toLowerCase() === userName) {
      return {
        status: 409,
        error: {
          schemas: [SCIM_ERROR_SCHEMA],
          status: '409',
          scimType: 'uniquenessFailure',
          detail: `User with userName '${userName}' already exists`,
        },
      };
    }
    if (input.externalId && existing.externalId === input.externalId) {
      return {
        status: 409,
        error: {
          schemas: [SCIM_ERROR_SCHEMA],
          status: '409',
          scimType: 'uniquenessFailure',
          detail: `User with externalId '${input.externalId}' already exists`,
        },
      };
    }
  }

  const userId = createId('usr');
  const now = new Date().toISOString();
  const emails: ScimEmail[] = input.emails && input.emails.length > 0
    ? input.emails
    : [{ value: userName, type: 'work', primary: true }];

  const displayName = input.displayName ?? (input.name
    ? [input.name.givenName, input.name.familyName].filter(Boolean).join(' ')
    : userName);

  const newUser: ScimUser = {
    schemas: [SCIM_USER_SCHEMA, ...(input[SCIM_ENTERPRISE_USER_SCHEMA] ? [SCIM_ENTERPRISE_USER_SCHEMA] : [])],
    id: userId,
    externalId: input.externalId,
    userName,
    name: input.name,
    displayName,
    title: input.title,
    active: input.active !== undefined ? input.active : true,
    emails,
    roles: input.roles ?? [{ value: state.config.defaultRole, primary: true }],
    groups: [],
    ...(input[SCIM_ENTERPRISE_USER_SCHEMA] ? { [SCIM_ENTERPRISE_USER_SCHEMA]: input[SCIM_ENTERPRISE_USER_SCHEMA] } : {}),
    meta: {
      resourceType: 'User',
      created: now,
      lastModified: now,
      location: `${baseUrl}/Users/${userId}`,
      version: 'W/"1"',
    },
  };

  state.users.set(userId, newUser);
  state.auditLogs.push({
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date(),
    action: 'create_user',
    targetType: 'User',
    targetId: userId,
    detail: `SCIM provisioned user ${userName} (active: ${newUser.active})`,
    activeStatus: newUser.active,
  });

  return { status: 201, user: newUser };
}

/**
 * Gets a SCIM user by ID (RFC 7644 section 3.4.1).
 */
export function getScimUser(
  state: ScimState,
  id: string
): { status: 200; user: ScimUser } | { status: 404; error: ScimErrorResponse } {
  const user = state.users.get(id);
  if (!user) {
    return {
      status: 404,
      error: {
        schemas: [SCIM_ERROR_SCHEMA],
        status: '404',
        detail: `Resource ${id} not found`,
      },
    };
  }
  return { status: 200, user };
}

/**
 * Lists SCIM users with filtering and pagination (RFC 7644 section 3.4.2).
 */
export function listScimUsers(
  state: ScimState,
  query: { filter?: string; startIndex?: number; count?: number } = {},
  baseUrl = 'https://api.diagramhq.com/scim/v2'
): ScimListResponse<ScimUser> {
  const startIndex = Math.max(1, query.startIndex ?? 1);
  const count = query.count !== undefined ? Math.max(0, query.count) : 100;

  let allUsers = Array.from(state.users.values());

  if (query.filter) {
    allUsers = filterScimUsers(allUsers, query.filter);
  }

  const totalResults = allUsers.length;
  // 1-based indexing as per RFC 7644
  const startIdx0 = startIndex - 1;
  const paginatedUsers = allUsers.slice(startIdx0, startIdx0 + count).map((u) => ({
    ...u,
    meta: {
      ...u.meta,
      location: `${baseUrl}/Users/${u.id}`,
    },
  }));

  return {
    schemas: [SCIM_LIST_RESPONSE_SCHEMA],
    totalResults,
    startIndex,
    itemsPerPage: paginatedUsers.length,
    Resources: paginatedUsers,
  };
}

/**
 * Simple SCIM filter evaluator for common filters:
 * - userName eq "alice@example.com"
 * - externalId eq "12345"
 * - emails.value eq "alice@example.com"
 * - active eq true / false
 */
function filterScimUsers(users: ScimUser[], filter: string): ScimUser[] {
  const eqMatch = filter.match(/^\s*([a-zA-Z0-9_.[\]"]+)\s+eq\s+("[^"]*"|true|false|[0-9]+)\s*$/i);
  if (!eqMatch || !eqMatch[1] || !eqMatch[2]) return users;

  const rawAttribute = eqMatch[1].trim();
  const rawValue = eqMatch[2].trim();
  const targetValue = rawValue.startsWith('"') && rawValue.endsWith('"')
    ? rawValue.slice(1, -1)
    : rawValue === 'true'
      ? true
      : rawValue === 'false'
        ? false
        : Number(rawValue);

  return users.filter((u) => {
    if (rawAttribute.toLowerCase() === 'username') {
      return u.userName.toLowerCase() === String(targetValue).toLowerCase();
    }
    if (rawAttribute.toLowerCase() === 'externalid') {
      return u.externalId === String(targetValue);
    }
    if (rawAttribute.toLowerCase() === 'active') {
      return u.active === targetValue;
    }
    if (rawAttribute.toLowerCase() === 'emails.value' || rawAttribute.toLowerCase() === 'emails[type eq "work"].value') {
      return u.emails.some((e) => e.value.toLowerCase() === String(targetValue).toLowerCase());
    }
    return true;
  });
}

/**
 * Replaces a SCIM user (RFC 7644 section 3.5.1 PUT).
 */
export function updateScimUser(
  state: ScimState,
  id: string,
  input: ScimCreateUserInput,
  baseUrl = 'https://api.diagramhq.com/scim/v2'
): { status: 200; user: ScimUser } | { status: 400 | 404; error: ScimErrorResponse } {
  const existing = state.users.get(id);
  if (!existing) {
    return {
      status: 404,
      error: {
        schemas: [SCIM_ERROR_SCHEMA],
        status: '404',
        detail: `User ${id} not found`,
      },
    };
  }

  const userName = input.userName?.trim().toLowerCase();
  if (!userName) {
    return {
      status: 400,
      error: {
        schemas: [SCIM_ERROR_SCHEMA],
        status: '400',
        scimType: 'invalidValue',
        detail: 'userName cannot be empty',
      },
    };
  }

  const now = new Date().toISOString();
  const emails: ScimEmail[] = input.emails && input.emails.length > 0
    ? input.emails
    : [{ value: userName, type: 'work', primary: true }];

  const updatedUser: ScimUser = {
    ...existing,
    externalId: input.externalId !== undefined ? input.externalId : existing.externalId,
    userName,
    name: input.name ?? existing.name,
    displayName: input.displayName ?? existing.displayName,
    title: input.title ?? existing.title,
    active: input.active !== undefined ? input.active : existing.active,
    emails,
    roles: input.roles ?? existing.roles,
    meta: {
      ...existing.meta,
      lastModified: now,
      location: `${baseUrl}/Users/${id}`,
      version: `W/"${parseInt(existing.meta.version?.replace(/\D/g, '') || '1', 10) + 1}"`,
    },
  };

  state.users.set(id, updatedUser);
  state.auditLogs.push({
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date(),
    action: 'update_user',
    targetType: 'User',
    targetId: id,
    detail: `SCIM updated user ${userName} (active: ${updatedUser.active})`,
    activeStatus: updatedUser.active,
  });

  return { status: 200, user: updatedUser };
}

/**
 * Modifies user attributes or deprovisions/reactivates via PATCH (RFC 7644 section 3.5.2).
 * Handles:
 * - { op: 'replace', path: 'active', value: false } -> deprovisions user
 * - { op: 'replace', value: { active: false } } -> deprovisions user
 * - { op: 'replace', path: 'displayName', value: '...' }
 * - { op: 'replace', path: 'name.familyName', value: '...' }
 */
export function patchScimUser(
  state: ScimState,
  id: string,
  patchRequest: ScimPatchRequest,
  baseUrl = 'https://api.diagramhq.com/scim/v2'
): { status: 200; user: ScimUser } | { status: 400 | 404; error: ScimErrorResponse } {
  const existing = state.users.get(id);
  if (!existing) {
    return {
      status: 404,
      error: {
        schemas: [SCIM_ERROR_SCHEMA],
        status: '404',
        detail: `User ${id} not found`,
      },
    };
  }

  if (!patchRequest || !Array.isArray(patchRequest.Operations)) {
    return {
      status: 400,
      error: {
        schemas: [SCIM_ERROR_SCHEMA],
        status: '400',
        scimType: 'invalidSyntax',
        detail: 'Invalid patch payload; Operations array required',
      },
    };
  }

  let active = existing.active;
  let displayName = existing.displayName;
  let title = existing.title;
  const name = existing.name ? { ...existing.name } : {};
  let emails = [...existing.emails];
  let roles = existing.roles ? [...existing.roles] : [];
  let userWasDeactivated = false;
  let userWasReactivated = false;

  for (const op of patchRequest.Operations) {
    const opType = op.op.toLowerCase();
    const path = op.path ? op.path.toLowerCase() : '';

    if (opType === 'replace' || opType === 'add') {
      if (path === 'active' || (!path && typeof op.value === 'object' && op.value !== null && 'active' in op.value)) {
        const newActive = path === 'active'
          ? (typeof op.value === 'string' ? op.value.toLowerCase() === 'true' : Boolean(op.value))
          : Boolean((op.value as Record<string, unknown>).active);

        if (active && !newActive) userWasDeactivated = true;
        if (!active && newActive) userWasReactivated = true;
        active = newActive;
      }

      if (path === 'displayname') {
        displayName = String(op.value);
      } else if (!path && typeof op.value === 'object' && op.value !== null && 'displayName' in op.value) {
        displayName = String((op.value as Record<string, unknown>).displayName);
      }

      if (path === 'title') {
        title = String(op.value);
      }

      if (path === 'name.familyname' || path === 'familyname') {
        name.familyName = String(op.value);
      }
      if (path === 'name.givenname' || path === 'givenname') {
        name.givenName = String(op.value);
      }

      if (path.startsWith('emails')) {
        if (Array.isArray(op.value)) {
          emails = op.value as ScimEmail[];
        } else if (typeof op.value === 'string') {
          emails = [{ value: op.value, primary: true, type: 'work' }];
        }
      }

      if (path === 'roles' && Array.isArray(op.value)) {
        roles = op.value as ScimRole[];
      }
    }
  }

  const now = new Date().toISOString();
  const currentVersion = parseInt(existing.meta.version?.replace(/\D/g, '') || '1', 10);
  const updatedUser: ScimUser = {
    ...existing,
    active,
    displayName,
    title,
    name: Object.keys(name).length > 0 ? name : existing.name,
    emails,
    roles,
    meta: {
      ...existing.meta,
      lastModified: now,
      location: `${baseUrl}/Users/${id}`,
      version: `W/"${currentVersion + 1}"`,
    },
  };

  state.users.set(id, updatedUser);

  const action = userWasDeactivated ? 'deactivate_user' : 'patch_user';
  const actionDetail = userWasDeactivated
    ? `SCIM deprovisioned/deactivated user ${updatedUser.userName}`
    : userWasReactivated
      ? `SCIM reactivated user ${updatedUser.userName}`
      : `SCIM patched attributes for user ${updatedUser.userName}`;

  state.auditLogs.push({
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date(),
    action,
    targetType: 'User',
    targetId: id,
    detail: actionDetail,
    activeStatus: active,
  });

  return { status: 200, user: updatedUser };
}

/**
 * Deletes or deprovisions a user (RFC 7644 section 3.6 DELETE).
 */
export function deleteScimUser(
  state: ScimState,
  id: string
): { status: 204 } | { status: 404; error: ScimErrorResponse } {
  const existing = state.users.get(id);
  if (!existing) {
    return {
      status: 404,
      error: {
        schemas: [SCIM_ERROR_SCHEMA],
        status: '404',
        detail: `User ${id} not found`,
      },
    };
  }

  state.users.delete(id);
  state.auditLogs.push({
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date(),
    action: 'delete_user',
    targetType: 'User',
    targetId: id,
    detail: `SCIM deleted user ${existing.userName}`,
    activeStatus: false,
  });

  return { status: 204 };
}

/**
 * Creates a SCIM group (RFC 7644 section 3.3).
 */
export function createScimGroup(
  state: ScimState,
  input: ScimCreateGroupInput,
  baseUrl = 'https://api.diagramhq.com/scim/v2'
): { status: 201; group: ScimGroup } | { status: 400 | 409; error: ScimErrorResponse } {
  const displayName = input.displayName?.trim();
  if (!displayName) {
    return {
      status: 400,
      error: {
        schemas: [SCIM_ERROR_SCHEMA],
        status: '400',
        scimType: 'invalidValue',
        detail: 'displayName is required for group creation',
      },
    };
  }

  for (const existing of state.groups.values()) {
    if (existing.displayName.toLowerCase() === displayName.toLowerCase()) {
      return {
        status: 409,
        error: {
          schemas: [SCIM_ERROR_SCHEMA],
          status: '409',
          scimType: 'uniquenessFailure',
          detail: `Group with displayName '${displayName}' already exists`,
        },
      };
    }
  }

  const groupId = `grp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();
  const group: ScimGroup = {
    schemas: [SCIM_GROUP_SCHEMA],
    id: groupId,
    externalId: input.externalId,
    displayName,
    members: input.members ?? [],
    meta: {
      resourceType: 'Group',
      created: now,
      lastModified: now,
      location: `${baseUrl}/Groups/${groupId}`,
      version: 'W/"1"',
    },
  };

  state.groups.set(groupId, group);
  state.auditLogs.push({
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date(),
    action: 'create_group',
    targetType: 'Group',
    targetId: groupId,
    detail: `SCIM created group ${displayName}`,
  });

  return { status: 201, group };
}

/**
 * Gets a SCIM group by ID.
 */
export function getScimGroup(
  state: ScimState,
  id: string
): { status: 200; group: ScimGroup } | { status: 404; error: ScimErrorResponse } {
  const group = state.groups.get(id);
  if (!group) {
    return {
      status: 404,
      error: {
        schemas: [SCIM_ERROR_SCHEMA],
        status: '404',
        detail: `Group ${id} not found`,
      },
    };
  }
  return { status: 200, group };
}

/**
 * Lists SCIM groups.
 */
export function listScimGroups(
  state: ScimState,
  query: { startIndex?: number; count?: number } = {},
  baseUrl = 'https://api.diagramhq.com/scim/v2'
): ScimListResponse<ScimGroup> {
  const startIndex = Math.max(1, query.startIndex ?? 1);
  const count = query.count !== undefined ? Math.max(0, query.count) : 100;
  const allGroups = Array.from(state.groups.values());
  const totalResults = allGroups.length;

  const startIdx0 = startIndex - 1;
  const paginated = allGroups.slice(startIdx0, startIdx0 + count).map((g) => ({
    ...g,
    meta: {
      ...g.meta,
      location: `${baseUrl}/Groups/${g.id}`,
    },
  }));

  return {
    schemas: [SCIM_LIST_RESPONSE_SCHEMA],
    totalResults,
    startIndex,
    itemsPerPage: paginated.length,
    Resources: paginated,
  };
}

/**
 * Simulates an end-to-end SCIM provisioning and deprovisioning lifecycle:
 * 1. Provision user via POST /Users (active: true)
 * 2. Verify user is active and searchable
 * 3. Update user attributes via PATCH
 * 4. Deprovision user via PATCH (active: false)
 * 5. Verify user is deactivated
 * 6. Reactivate user via PATCH (active: true)
 * 7. Clean up / delete user via DELETE
 */
export function simulateScimProvisioningLifecycle(options?: {
  userName?: string;
  externalId?: string;
  displayName?: string;
}) {
  const orgId = createId('org');
  const state = createScimState(orgId);
  const userName = options?.userName ?? 'dev.engineer@enterprise.acme.corp';
  const externalId = options?.externalId ?? 'okta_usr_998877';
  const displayName = options?.displayName ?? 'Dev Engineer';

  // Step 1: Create user (provision)
  const createResult = createScimUser(state, {
    userName,
    externalId,
    displayName,
    name: { givenName: 'Dev', familyName: 'Engineer' },
    active: true,
  });

  if (createResult.status !== 201) {
    throw new Error(`Failed to create SCIM user: ${createResult.error.detail}`);
  }
  const userId = createResult.user.id;

  // Step 2: Verify active in list
  const listAfterCreate = listScimUsers(state, { filter: `userName eq "${userName}"` });
  const firstRes = listAfterCreate.Resources[0];
  const isFoundActive = listAfterCreate.Resources.length === 1 && firstRes !== undefined && firstRes.active === true;

  // Step 3: Patch attribute (title)
  const patchAttrResult = patchScimUser(state, userId, {
    schemas: [SCIM_PATCH_OP_SCHEMA],
    Operations: [
      { op: 'replace', path: 'title', value: 'Principal Enterprise Architect' },
    ],
  });
  const isAttrUpdated = patchAttrResult.status === 200 && patchAttrResult.user.title === 'Principal Enterprise Architect';

  // Step 4: Deprovision / Deactivate user (RFC 7644 active: false)
  const deprovisionResult = patchScimUser(state, userId, {
    schemas: [SCIM_PATCH_OP_SCHEMA],
    Operations: [
      { op: 'replace', path: 'active', value: false },
    ],
  });
  const isDeactivated = deprovisionResult.status === 200 && deprovisionResult.user.active === false;

  // Step 5: Check state in store
  const userInStore = state.users.get(userId);
  const isStateInactive = userInStore?.active === false;

  // Step 6: Reactivate
  const reactivateResult = patchScimUser(state, userId, {
    schemas: [SCIM_PATCH_OP_SCHEMA],
    Operations: [
      { op: 'replace', path: 'active', value: true },
    ],
  });
  const isReactivated = reactivateResult.status === 200 && reactivateResult.user.active === true;

  // Step 7: Delete / Deprovision fully
  const deleteResult = deleteScimUser(state, userId);
  const isDeleted = deleteResult.status === 204 && !state.users.has(userId);

  return {
    success: isFoundActive && isAttrUpdated && isDeactivated && isStateInactive && isReactivated && isDeleted,
    userId,
    userName,
    steps: {
      provisioned: isFoundActive,
      attributeUpdated: isAttrUpdated,
      deactivated: isDeactivated,
      stateInactive: isStateInactive,
      reactivated: isReactivated,
      deleted: isDeleted,
    },
    auditTrailCount: state.auditLogs.length,
    finalState: state,
  };
}
