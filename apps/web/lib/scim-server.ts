import {
  createId,
  createScimState,
  createScimUser,
  type ScimState,
} from '@diagramhq/domain';

// Default global SCIM state singleton for DiagramHQ Enterprise
const DEFAULT_ORG_ID = createId('org');
const defaultState = createScimState(DEFAULT_ORG_ID, {
  bearerToken: 'scim_enterprise_token_demo_987654321',
  endpointUrl: 'https://app.diagramhq.com/api/scim/v2',
});

// Seed an initial enterprise architect user
createScimUser(defaultState, {
  userName: 'sarah.connor@cyberdyne.corp',
  displayName: 'Sarah Connor',
  name: { givenName: 'Sarah', familyName: 'Connor' },
  title: 'Principal Systems Architect',
  active: true,
  externalId: 'okta-ext-usr-1001',
});

createScimUser(defaultState, {
  userName: 'john.anderson@matrix.io',
  displayName: 'Thomas Anderson',
  name: { givenName: 'Thomas', familyName: 'Anderson' },
  title: 'Senior Software Engineer',
  active: false, // Deprovisioned user demo
  externalId: 'okta-ext-usr-1002',
});

let activeScimState: ScimState = defaultState;

export function getGlobalScimState(): ScimState {
  return activeScimState;
}

export function resetGlobalScimState(newState?: ScimState): ScimState {
  activeScimState = newState ?? createScimState(DEFAULT_ORG_ID, {
    bearerToken: 'scim_enterprise_token_demo_987654321',
    endpointUrl: 'https://app.diagramhq.com/api/scim/v2',
  });
  return activeScimState;
}
