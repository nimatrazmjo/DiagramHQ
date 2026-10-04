import { describe, expect, it } from 'vitest';
import { createId } from './ids';
import {
  createScimGroup,
  createScimState,
  createScimUser,
  deleteScimUser,
  generateScimBearerToken,
  getScimGroup,
  getScimServiceProviderConfig,
  getScimUser,
  listScimGroups,
  listScimUsers,
  patchScimUser,
  SCIM_ERROR_SCHEMA,
  SCIM_LIST_RESPONSE_SCHEMA,
  SCIM_PATCH_OP_SCHEMA,
  SCIM_USER_SCHEMA,
  simulateScimProvisioningLifecycle,
  updateScimUser,
  validateScimBearerToken,
} from './scim';

describe('SCIM 2.0 Provisioning and Deprovisioning (F103)', () => {
  it('initializes SCIM state with default config and bearer token', () => {
    const orgId = createId('org');
    const state = createScimState(orgId);

    expect(state.orgId).toBe(orgId);
    expect(state.config.enabled).toBe(true);
    expect(state.config.bearerToken).toMatch(/^scim_sec_/);
    expect(state.config.defaultRole).toBe('viewer');
    expect(state.users.size).toBe(0);
    expect(state.groups.size).toBe(0);
    expect(state.auditLogs.length).toBe(0);
  });

  it('generates high-entropy bearer tokens and validates Bearer header', () => {
    const token1 = generateScimBearerToken();
    const token2 = generateScimBearerToken();
    expect(token1).not.toBe(token2);

    expect(validateScimBearerToken(`Bearer ${token1}`, token1)).toBe(true);
    expect(validateScimBearerToken(`bearer ${token1}`, token1)).toBe(true);
    expect(validateScimBearerToken(`Bearer ${token2}`, token1)).toBe(false);
    expect(validateScimBearerToken(undefined, token1)).toBe(false);
    expect(validateScimBearerToken('Basic dXNlcjpwYXNz', token1)).toBe(false);
  });

  it('returns valid SCIM 2.0 Service Provider Configuration', () => {
    const config = getScimServiceProviderConfig('https://api.diagramhq.com/scim/v2');
    expect(config.patch.supported).toBe(true);
    expect(config.filter.supported).toBe(true);
    expect(config.authenticationSchemes[0].type).toBe('oauthbearertoken');
    expect(config.meta.location).toBe('https://api.diagramhq.com/scim/v2/ServiceProviderConfig');
  });

  describe('User Provisioning (POST /Users)', () => {
    it('provisions a new active user successfully', () => {
      const orgId = createId('org');
      const state = createScimState(orgId);

      const res = createScimUser(state, {
        userName: 'alice@acme.corp',
        externalId: 'okta-ext-001',
        name: { givenName: 'Alice', familyName: 'Smith' },
        displayName: 'Alice Smith',
        title: 'Cloud Architect',
      });

      expect(res.status).toBe(201);
      if (res.status === 201) {
        expect(res.user.schemas).toContain(SCIM_USER_SCHEMA);
        expect(res.user.userName).toBe('alice@acme.corp');
        expect(res.user.externalId).toBe('okta-ext-001');
        expect(res.user.active).toBe(true);
        expect(res.user.displayName).toBe('Alice Smith');
        expect(res.user.emails[0].value).toBe('alice@acme.corp');
        expect(res.user.meta.resourceType).toBe('User');
        expect(state.users.has(res.user.id)).toBe(true);
      }

      expect(state.auditLogs.length).toBe(1);
      expect(state.auditLogs[0].action).toBe('create_user');
      expect(state.auditLogs[0].activeStatus).toBe(true);
    });

    it('rejects provisioning without userName', () => {
      const state = createScimState(createId('org'));
      const res = createScimUser(state, { userName: '' });

      expect(res.status).toBe(400);
      if (res.status === 400) {
        expect(res.error.schemas).toContain(SCIM_ERROR_SCHEMA);
        expect(res.error.scimType).toBe('invalidValue');
      }
    });

    it('enforces uniqueness on userName and externalId', () => {
      const state = createScimState(createId('org'));
      createScimUser(state, { userName: 'bob@acme.corp', externalId: 'ext-bob' });

      // Duplicate userName
      const dupUser = createScimUser(state, { userName: 'BOB@acme.corp' });
      expect(dupUser.status).toBe(409);
      if (dupUser.status === 409) {
        expect(dupUser.error.scimType).toBe('uniquenessFailure');
      }

      // Duplicate externalId
      const dupExt = createScimUser(state, { userName: 'other@acme.corp', externalId: 'ext-bob' });
      expect(dupExt.status).toBe(409);
      if (dupExt.status === 409) {
        expect(dupExt.error.scimType).toBe('uniquenessFailure');
      }
    });
  });

  describe('User Querying & Filtering (GET /Users, GET /Users/{id})', () => {
    it('retrieves user by id or returns 404', () => {
      const state = createScimState(createId('org'));
      const createRes = createScimUser(state, { userName: 'carol@acme.corp' });
      if (createRes.status !== 201) throw new Error('Setup failed');

      const found = getScimUser(state, createRes.user.id);
      expect(found.status).toBe(200);

      const notFound = getScimUser(state, 'usr_missing');
      expect(notFound.status).toBe(404);
    });

    it('filters users by userName, externalId, and active status', () => {
      const state = createScimState(createId('org'));
      createScimUser(state, { userName: 'user1@acme.corp', externalId: 'ext-1', active: true });
      createScimUser(state, { userName: 'user2@acme.corp', externalId: 'ext-2', active: false });
      createScimUser(state, { userName: 'user3@acme.corp', externalId: 'ext-3', active: true });

      const all = listScimUsers(state);
      expect(all.schemas).toContain(SCIM_LIST_RESPONSE_SCHEMA);
      expect(all.totalResults).toBe(3);

      const filteredName = listScimUsers(state, { filter: 'userName eq "user1@acme.corp"' });
      expect(filteredName.totalResults).toBe(1);
      expect(filteredName.Resources[0].userName).toBe('user1@acme.corp');

      const filteredExt = listScimUsers(state, { filter: 'externalId eq "ext-2"' });
      expect(filteredExt.totalResults).toBe(1);
      expect(filteredExt.Resources[0].userName).toBe('user2@acme.corp');

      const filteredActive = listScimUsers(state, { filter: 'active eq true' });
      expect(filteredActive.totalResults).toBe(2);

      const filteredInactive = listScimUsers(state, { filter: 'active eq false' });
      expect(filteredInactive.totalResults).toBe(1);
      expect(filteredInactive.Resources[0].userName).toBe('user2@acme.corp');
    });

    it('supports 1-based pagination', () => {
      const state = createScimState(createId('org'));
      for (let i = 1; i <= 5; i++) {
        createScimUser(state, { userName: `worker${i}@acme.corp` });
      }

      const page1 = listScimUsers(state, { startIndex: 1, count: 2 });
      expect(page1.totalResults).toBe(5);
      expect(page1.startIndex).toBe(1);
      expect(page1.itemsPerPage).toBe(2);
      expect(page1.Resources[0].userName).toBe('worker1@acme.corp');

      const page2 = listScimUsers(state, { startIndex: 3, count: 2 });
      expect(page2.startIndex).toBe(3);
      expect(page2.itemsPerPage).toBe(2);
      expect(page2.Resources[0].userName).toBe('worker3@acme.corp');
    });
  });

  describe('User Updating & Deprovisioning (PUT & PATCH /Users/{id})', () => {
    it('fully updates user via PUT and updates version and timestamp', () => {
      const state = createScimState(createId('org'));
      const createRes = createScimUser(state, { userName: 'dan@acme.corp', displayName: 'Dan Old' });
      if (createRes.status !== 201) throw new Error('Setup failed');

      const updateRes = updateScimUser(state, createRes.user.id, {
        userName: 'dan@acme.corp',
        displayName: 'Dan New',
        title: 'Lead Architect',
      });

      expect(updateRes.status).toBe(200);
      if (updateRes.status === 200) {
        expect(updateRes.user.displayName).toBe('Dan New');
        expect(updateRes.user.title).toBe('Lead Architect');
        expect(updateRes.user.meta.version).toBe('W/"2"');
      }
    });

    it('deprovisions user via PATCH with active: false (RFC 7644 path: "active")', () => {
      const state = createScimState(createId('org'));
      const createRes = createScimUser(state, { userName: 'eva@acme.corp', active: true });
      if (createRes.status !== 201) throw new Error('Setup failed');

      // Deactivate / deprovision
      const patchRes = patchScimUser(state, createRes.user.id, {
        schemas: [SCIM_PATCH_OP_SCHEMA],
        Operations: [
          { op: 'replace', path: 'active', value: false },
        ],
      });

      expect(patchRes.status).toBe(200);
      if (patchRes.status === 200) {
        expect(patchRes.user.active).toBe(false);
      }

      // Verify in store
      expect(state.users.get(createRes.user.id)?.active).toBe(false);

      // Verify audit log has deactivate_user action
      const deactivateLog = state.auditLogs.find((l) => l.action === 'deactivate_user');
      expect(deactivateLog).toBeDefined();
      expect(deactivateLog?.activeStatus).toBe(false);
    });

    it('deprovisions user via PATCH with object value { active: false }', () => {
      const state = createScimState(createId('org'));
      const createRes = createScimUser(state, { userName: 'frank@acme.corp', active: true });
      if (createRes.status !== 201) throw new Error('Setup failed');

      const patchRes = patchScimUser(state, createRes.user.id, {
        schemas: [SCIM_PATCH_OP_SCHEMA],
        Operations: [
          { op: 'replace', value: { active: false } },
        ],
      });

      expect(patchRes.status).toBe(200);
      if (patchRes.status === 200) {
        expect(patchRes.user.active).toBe(false);
      }
    });

    it('reactivates deactivated user via PATCH active: true', () => {
      const state = createScimState(createId('org'));
      const createRes = createScimUser(state, { userName: 'grace@acme.corp', active: false });
      if (createRes.status !== 201) throw new Error('Setup failed');

      const patchRes = patchScimUser(state, createRes.user.id, {
        schemas: [SCIM_PATCH_OP_SCHEMA],
        Operations: [
          { op: 'replace', path: 'active', value: true },
        ],
      });

      expect(patchRes.status).toBe(200);
      if (patchRes.status === 200) {
        expect(patchRes.user.active).toBe(true);
      }
      expect(state.users.get(createRes.user.id)?.active).toBe(true);
    });

    it('patches multiple attributes including name and displayName', () => {
      const state = createScimState(createId('org'));
      const createRes = createScimUser(state, { userName: 'heidi@acme.corp' });
      if (createRes.status !== 201) throw new Error('Setup failed');

      const patchRes = patchScimUser(state, createRes.user.id, {
        schemas: [SCIM_PATCH_OP_SCHEMA],
        Operations: [
          { op: 'replace', path: 'displayName', value: 'Heidi Enterprise' },
          { op: 'replace', path: 'name.familyName', value: 'Enterprise' },
          { op: 'replace', path: 'title', value: 'Staff Security Engineer' },
        ],
      });

      expect(patchRes.status).toBe(200);
      if (patchRes.status === 200) {
        expect(patchRes.user.displayName).toBe('Heidi Enterprise');
        expect(patchRes.user.name?.familyName).toBe('Enterprise');
        expect(patchRes.user.title).toBe('Staff Security Engineer');
      }
    });
  });

  describe('User Deletion (DELETE /Users/{id})', () => {
    it('deletes user from state and records audit log', () => {
      const state = createScimState(createId('org'));
      const createRes = createScimUser(state, { userName: 'ivan@acme.corp' });
      if (createRes.status !== 201) throw new Error('Setup failed');

      const deleteRes = deleteScimUser(state, createRes.user.id);
      expect(deleteRes.status).toBe(204);
      expect(state.users.has(createRes.user.id)).toBe(false);

      const notFoundDelete = deleteScimUser(state, 'usr_nonexistent');
      expect(notFoundDelete.status).toBe(404);
    });
  });

  describe('Groups Provisioning (POST/GET/LIST /Groups)', () => {
    it('creates and lists SCIM groups', () => {
      const state = createScimState(createId('org'));
      const groupRes = createScimGroup(state, {
        displayName: 'Enterprise Architects',
        members: [{ value: 'usr_1', display: 'Alice' }],
      });

      expect(groupRes.status).toBe(201);
      if (groupRes.status === 201) {
        expect(groupRes.group.displayName).toBe('Enterprise Architects');
        expect(groupRes.group.members.length).toBe(1);

        const fetched = getScimGroup(state, groupRes.group.id);
        expect(fetched.status).toBe(200);
      }

      const listRes = listScimGroups(state);
      expect(listRes.totalResults).toBe(1);
      expect(listRes.Resources[0].displayName).toBe('Enterprise Architects');
    });

    it('rejects duplicate group displayName', () => {
      const state = createScimState(createId('org'));
      createScimGroup(state, { displayName: 'DevOps' });

      const dup = createScimGroup(state, { displayName: 'DevOps' });
      expect(dup.status).toBe(409);
    });
  });

  describe('End-to-End Simulation (simulateScimProvisioningLifecycle)', () => {
    it('executes the full provisioning, modification, deprovisioning, and deactivation cycle', () => {
      const result = simulateScimProvisioningLifecycle({
        userName: 'john.doe@enterprise.corp',
        displayName: 'John Doe',
        externalId: 'okta-john-doe',
      });

      expect(result.success).toBe(true);
      expect(result.steps.provisioned).toBe(true);
      expect(result.steps.attributeUpdated).toBe(true);
      expect(result.steps.deactivated).toBe(true);
      expect(result.steps.stateInactive).toBe(true);
      expect(result.steps.reactivated).toBe(true);
      expect(result.steps.deleted).toBe(true);
      expect(result.auditTrailCount).toBeGreaterThanOrEqual(5);
    });
  });
});
