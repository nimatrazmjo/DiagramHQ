import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { SsoSettingsModal } from './components/enterprise/sso-settings-modal';
import { GET as getServiceProviderConfig } from './app/api/scim/v2/ServiceProviderConfig/route';
import { GET as listUsers, POST as createUser } from './app/api/scim/v2/Users/route';
import {
  GET as getUser,
  PATCH as patchUser,
  DELETE as deleteUser,
} from './app/api/scim/v2/Users/[id]/route';
import { resetGlobalScimState } from './lib/scim-server';

describe('SCIM 2.0 Provisioning and Deprovisioning (F103) - Web & API Layer', () => {
  describe('SsoSettingsModal SCIM Tab UI', () => {
    it('renders the SCIM tab, badges, and settings in enterprise modal', () => {
      const html = renderToString(
        <SsoSettingsModal isOpen={true} onClose={() => {}} orgName="Acme Enterprise" />
      );

      expect(html).toContain('SCIM 2.0 Provisioning');
      expect(html).toContain('F103');
      expect(html).toContain('Enterprise Single Sign-On (SSO / SAML / SCIM)');
    });
  });

  describe('SCIM 2.0 API Endpoints', () => {
    it('GET /api/scim/v2/ServiceProviderConfig returns RFC 7643 config', async () => {
      const req = new Request('http://localhost:3000/api/scim/v2/ServiceProviderConfig');
      const res = await getServiceProviderConfig(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.schemas).toContain('urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig');
      expect(json.patch.supported).toBe(true);
      expect(json.filter.supported).toBe(true);
    });

    it('enforces Bearer token authentication on /Users endpoint', async () => {
      resetGlobalScimState();

      // Missing token
      const reqUnauth = new Request('http://localhost:3000/api/scim/v2/Users');
      const resUnauth = await listUsers(reqUnauth);
      expect(resUnauth.status).toBe(401);

      // Invalid token
      const reqInvalid = new Request('http://localhost:3000/api/scim/v2/Users', {
        headers: { Authorization: 'Bearer bad_token_123' },
      });
      const resInvalid = await listUsers(reqInvalid);
      expect(resInvalid.status).toBe(401);
    });

    it('executes full RFC 7644 user lifecycle via API: create -> get -> patch deprovision -> get -> delete', async () => {
      const state = resetGlobalScimState();
      const token = state.config.bearerToken;
      const authHeaders = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // 1. POST /Users (Create active user)
      const postReq = new Request('http://localhost:3000/api/scim/v2/Users', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          userName: 'kyle.reese@resistance.future',
          displayName: 'Kyle Reese',
          name: { givenName: 'Kyle', familyName: 'Reese' },
          title: 'Sergeant',
          active: true,
          externalId: 'okta-ext-usr-9001',
        }),
      });
      const postRes = await createUser(postReq);
      expect(postRes.status).toBe(201);
      const createdUser = await postRes.json();
      expect(createdUser.active).toBe(true);
      expect(createdUser.id).toBeDefined();
      const userId = createdUser.id;

      // 2. GET /Users/{id}
      const getReq = new Request(`http://localhost:3000/api/scim/v2/Users/${userId}`, {
        headers: authHeaders,
      });
      const getRes = await getUser(getReq, { params: { id: userId } });
      expect(getRes.status).toBe(200);
      const fetchedUser = await getRes.json();
      expect(fetchedUser.userName).toBe('kyle.reese@resistance.future');
      expect(fetchedUser.active).toBe(true);

      // 3. PATCH /Users/{id} (Deprovision via active: false)
      const patchReq = new Request(`http://localhost:3000/api/scim/v2/Users/${userId}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
          Operations: [{ op: 'replace', path: 'active', value: false }],
        }),
      });
      const patchRes = await patchUser(patchReq, { params: { id: userId } });
      expect(patchRes.status).toBe(200);
      const patchedUser = await patchRes.json();
      expect(patchedUser.active).toBe(false);

      // 4. Verify in GET that user is now deprovisioned/inactive
      const getAfterPatchRes = await getUser(getReq, { params: { id: userId } });
      const inactiveUser = await getAfterPatchRes.json();
      expect(inactiveUser.active).toBe(false);

      // 5. DELETE /Users/{id}
      const deleteReq = new Request(`http://localhost:3000/api/scim/v2/Users/${userId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      const delRes = await deleteUser(deleteReq, { params: { id: userId } });
      expect(delRes.status).toBe(204);

      // 6. Verify 404 after delete
      const getAfterDelRes = await getUser(getReq, { params: { id: userId } });
      expect(getAfterDelRes.status).toBe(404);
    });
  });
});
