/**
 * DiagramHQ - Enterprise SAML 2.0 Integration Domain Logic (F102)
 *
 * Framework-agnostic, pure TypeScript implementation of SAML 2.0 Web Browser SSO:
 * - Service Provider (SP) metadata generation & configuration
 * - Identity Provider (IdP) metadata parsing & configuration
 * - AuthnRequest XML generation & Base64 encoding for HTTP-Redirect and HTTP-POST
 * - SAML 2.0 Response & Assertion parsing, condition verification, and claim extraction
 * - AttributeStatement normalization and group-to-role mapping
 * - Clock skew tolerance and time-validity window verification (NotBefore / NotOnOrAfter)
 * - Audience restriction and InResponseTo CSRF validation
 * - Just-In-Time (JIT) provisioning and account linking
 * - Deterministic Test SAML IdP simulation harness for automated end-to-end testing
 */

import { createId, type OrgId, type SamlRequestId, type SsoProviderId, type UserId } from './ids';
import type { MemberRole } from './types';
import { extractDomainFromEmail, normalizeDomain, type SsoAuthSession, type SsoUserIdentity } from './sso';

export interface SamlSpConfig {
  /** Unique entity ID of the DiagramHQ Service Provider */
  entityId: string;
  /** Assertion Consumer Service (ACS) endpoint URL */
  acsUrl: string;
  /** Single Logout (SLO) endpoint URL */
  singleLogoutUrl?: string;
  /** Requested NameID format */
  nameIdFormat?: string;
  /** Optional public X.509 certificate for signing verification */
  certificate?: string;
}

export interface SamlAttributeMapping {
  /** SAML attribute name for email address */
  emailField?: string;
  /** SAML attribute name for display / full name */
  nameField?: string;
  /** SAML attribute name for first name */
  firstNameField?: string;
  /** SAML attribute name for last name */
  lastNameField?: string;
  /** SAML attribute name for group membership */
  groupsField?: string;
  /** Map from corporate SAML group names to DiagramHQ MemberRole */
  roleMapping?: Record<string, MemberRole>;
}

export interface SamlIdpConfig {
  readonly id: SsoProviderId;
  readonly orgId: OrgId;
  name: string;
  /** IdP Entity ID / Issuer URI (e.g. http://www.okta.com/exk123) */
  entityId: string;
  /** Single Sign-On HTTP-POST / Redirect URL */
  singleSignOnServiceUrl: string;
  /** Optional Single Logout URL */
  singleLogoutServiceUrl?: string;
  /** Base64-encoded X.509 certificate string from IdP */
  certificate: string;
  /** Corporate email domains managed by this IdP (e.g. ['acme.com']) */
  domains: string[];
  status: 'active' | 'inactive' | 'testing';
  enforceSso: boolean;
  allowJitProvisioning: boolean;
  defaultRole: MemberRole;
  attributeMapping: SamlAttributeMapping;
  createdAt: Date;
  updatedAt: Date;
}

export interface SamlAuthnRequest {
  id: SamlRequestId;
  xml: string;
  base64: string;
  redirectUrl: string;
  relayState?: string;
  spEntityId: string;
  acsUrl: string;
  issuedAt: Date;
  expiresAt: Date;
}

export interface SamlAssertionClaims {
  nameId: string;
  nameIdFormat?: string;
  sessionIndex?: string;
  email: string;
  name: string;
  groups: string[];
  attributes: Record<string, string[]>;
}

export interface SamlValidationOptions {
  expectedInResponseTo?: string;
  expectedAudience?: string;
  clockSkewSeconds?: number;
  now?: Date;
}

export type SamlResponseResult =
  | { success: true; session: SsoAuthSession; claims: SamlAssertionClaims }
  | { success: false; error: string; code: string };

/**
 * Standard default SAML attribute mappings covering common IdPs (Okta, Azure AD, Ping).
 */
export const DEFAULT_SAML_ATTRIBUTE_MAPPING: SamlAttributeMapping = {
  emailField: 'email',
  nameField: 'displayName',
  firstNameField: 'firstName',
  lastNameField: 'lastName',
  groupsField: 'memberOf',
  roleMapping: {
    'DiagramHQ-Admins': 'admin',
    'DiagramHQ-Architects': 'editor',
    'DiagramHQ-Viewers': 'viewer',
    'admins': 'admin',
    'architects': 'editor',
    'editors': 'editor',
    'viewers': 'viewer',
  },
};

/**
 * Base64 helper supporting both Node.js Buffer and browser atob/btoa.
 */
export function base64Encode(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'utf8').toString('base64');
  }
  return btoa(encodeURIComponent(str));
}

export function base64Decode(b64: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(b64, 'base64').toString('utf8');
  }
  return decodeURIComponent(atob(b64));
}

/**
 * Escapes characters for XML content and attribute safety.
 */
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generates official Service Provider (SP) Metadata XML for customer IdP configuration.
 */
export function buildSpMetadataXml(spConfig: SamlSpConfig): string {
  const entityId = escapeXml(spConfig.entityId);
  const acsUrl = escapeXml(spConfig.acsUrl);
  const sloUrl = spConfig.singleLogoutUrl ? escapeXml(spConfig.singleLogoutUrl) : '';
  const nameIdFormat = escapeXml(
    spConfig.nameIdFormat || 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${entityId}">
  <md:SPSSODescriptor AuthnRequestsSigned="false" WantAssertionsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:NameIDFormat>${nameIdFormat}</md:NameIDFormat>
    <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${acsUrl}" index="0" isDefault="true"/>
    ${sloUrl ? `<md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${sloUrl}"/>` : ''}
  </md:SPSSODescriptor>
</md:EntityDescriptor>`.trim();
}

/**
 * Parses Identity Provider (IdP) Metadata XML (e.g. from Okta, Azure AD, or Ping).
 */
export function parseIdpMetadataXml(xmlContent: string): {
  entityId: string;
  singleSignOnServiceUrl: string;
  singleLogoutServiceUrl?: string;
  certificate?: string;
} {
  // Extract entityID
  const entityIdMatch = xmlContent.match(/entityID=["']([^"']+)["']/i);
  if (!entityIdMatch || !entityIdMatch[1]) {
    throw new Error('SAML IdP Metadata is missing required entityID attribute');
  }
  const entityId = entityIdMatch[1];

  // Extract SingleSignOnService Location
  const ssoMatch = xmlContent.match(
    /<(?:md:)?SingleSignOnService[^>]+Location=["']([^"']+)["'][^>]*>/i
  );
  if (!ssoMatch || !ssoMatch[1]) {
    throw new Error('SAML IdP Metadata is missing required SingleSignOnService endpoint Location');
  }
  const singleSignOnServiceUrl = ssoMatch[1];

  // Extract optional SingleLogoutService Location
  const sloMatch = xmlContent.match(
    /<(?:md:)?SingleLogoutService[^>]+Location=["']([^"']+)["'][^>]*>/i
  );
  const singleLogoutServiceUrl = sloMatch && sloMatch[1] ? sloMatch[1] : undefined;

  // Extract X.509 Certificate
  const certMatch = xmlContent.match(
    /<(?:ds:)?X509Certificate[^>]*>([\s\S]*?)<\/(?:ds:)?X509Certificate>/i
  );
  const certificate = certMatch && certMatch[1] ? certMatch[1].replace(/\s+/g, '') : undefined;

  return {
    entityId,
    singleSignOnServiceUrl,
    singleLogoutServiceUrl,
    certificate,
  };
}

/**
 * Constructs a SAML 2.0 AuthnRequest for redirecting the user to the IdP.
 */
export function buildSamlAuthnRequest(params: {
  idp: SamlIdpConfig;
  sp: SamlSpConfig;
  relayState?: string;
  ttlMinutes?: number;
}): SamlAuthnRequest {
  const { idp, sp, relayState, ttlMinutes = 15 } = params;

  if (idp.status === 'inactive') {
    throw new Error(`SAML IdP provider "${idp.name}" is currently inactive`);
  }

  const requestId = createId('saml');
  const now = new Date();
  const issueInstant = now.toISOString();
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
  xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
  ID="${requestId}"
  Version="2.0"
  IssueInstant="${issueInstant}"
  Destination="${escapeXml(idp.singleSignOnServiceUrl)}"
  AssertionConsumerServiceURL="${escapeXml(sp.acsUrl)}"
  ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
  <saml:Issuer>${escapeXml(sp.entityId)}</saml:Issuer>
  <samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress" AllowCreate="true"/>
</samlp:AuthnRequest>`.trim();

  const base64 = base64Encode(xml);

  // Construct HTTP-Redirect URL
  const url = new URL(idp.singleSignOnServiceUrl);
  url.searchParams.set('SAMLRequest', base64);
  if (relayState) {
    url.searchParams.set('RelayState', relayState);
  }

  return {
    id: requestId,
    xml,
    base64,
    redirectUrl: url.toString(),
    relayState,
    spEntityId: sp.entityId,
    acsUrl: sp.acsUrl,
    issuedAt: now,
    expiresAt,
  };
}

/**
 * Parses and validates an incoming SAML 2.0 Response XML, enforcing security conditions.
 */
export function parseAndValidateSamlResponse(
  samlResponseBase64: string,
  idp: SamlIdpConfig,
  options?: SamlValidationOptions,
  existingUsers?: Array<{ id: UserId; email: string; role?: MemberRole }>
): SamlResponseResult {
  if (!samlResponseBase64 || samlResponseBase64.trim().length === 0) {
    return { success: false, error: 'Empty SAMLResponse payload', code: 'EMPTY_RESPONSE' };
  }

  let xml: string;
  try {
    xml = base64Decode(samlResponseBase64.trim());
  } catch {
    return { success: false, error: 'Malformed Base64 in SAMLResponse', code: 'INVALID_BASE64' };
  }

  // 1. Verify StatusCode is Success
  const statusMatch = xml.match(/<samlp:StatusCode[^>]+Value=["']([^"']+)["']/i);
  if (!statusMatch || !statusMatch[1] || !statusMatch[1].endsWith(':Success')) {
    const errorDetails = statusMatch ? statusMatch[1] : 'Unknown status';
    return { success: false, error: `SAML IdP returned error status: ${errorDetails}`, code: 'IDP_ERROR_STATUS' };
  }

  // 2. Validate InResponseTo CSRF match if provided
  if (options?.expectedInResponseTo) {
    const inResponseToMatch = xml.match(/InResponseTo=["']([^"']+)["']/i);
    if (!inResponseToMatch || inResponseToMatch[1] !== options.expectedInResponseTo) {
      return {
        success: false,
        error: `InResponseTo mismatch: expected "${options.expectedInResponseTo}", found "${inResponseToMatch?.[1]}"`,
        code: 'IN_RESPONSE_TO_MISMATCH',
      };
    }
  }

  // 3. Validate Issuer matches configured IdP EntityID
  const issuerMatch = xml.match(/<saml:Issuer\b[^>]*>([^<]+)<\/saml:Issuer>/i);
  if (!issuerMatch || !issuerMatch[1] || issuerMatch[1].trim() !== idp.entityId) {
    return {
      success: false,
      error: `SAML Issuer mismatch: expected "${idp.entityId}", found "${issuerMatch?.[1]?.trim()}"`,
      code: 'ISSUER_MISMATCH',
    };
  }

  // 4. Validate Conditions: NotBefore and NotOnOrAfter
  const conditionsMatch = xml.match(/<saml:Conditions\s+([^>]+)>/i);
  if (conditionsMatch && conditionsMatch[1]) {
    const condAttributes = conditionsMatch[1];
    const notBeforeMatch = condAttributes.match(/NotBefore=["']([^"']+)["']/i);
    const notOnOrAfterMatch = condAttributes.match(/NotOnOrAfter=["']([^"']+)["']/i);

    const nowTime = (options?.now || new Date()).getTime();
    const skewMs = (options?.clockSkewSeconds || 120) * 1000; // 2 min default clock skew

    if (notBeforeMatch && notBeforeMatch[1]) {
      const notBeforeTime = new Date(notBeforeMatch[1]).getTime();
      if (nowTime + skewMs < notBeforeTime) {
        return { success: false, error: 'SAML Assertion is not yet valid (NotBefore)', code: 'ASSERTION_NOT_YET_VALID' };
      }
    }

    if (notOnOrAfterMatch && notOnOrAfterMatch[1]) {
      const notOnOrAfterTime = new Date(notOnOrAfterMatch[1]).getTime();
      if (nowTime - skewMs > notOnOrAfterTime) {
        return { success: false, error: 'SAML Assertion has expired (NotOnOrAfter)', code: 'ASSERTION_EXPIRED' };
      }
    }
  }

  // 5. Validate AudienceRestriction
  if (options?.expectedAudience) {
    const audienceMatch = xml.match(/<saml:Audience\b[^>]*>([^<]+)<\/saml:Audience>/i);
    if (!audienceMatch || !audienceMatch[1] || audienceMatch[1].trim() !== options.expectedAudience) {
      return {
        success: false,
        error: `Audience mismatch: expected "${options.expectedAudience}", found "${audienceMatch?.[1]?.trim()}"`,
        code: 'AUDIENCE_MISMATCH',
      };
    }
  }

  // 6. Extract Subject NameID
  const nameIdMatch = xml.match(/<saml:NameID\b(?:\s+Format=["']([^"']+)["'])?[^>]*>([^<]+)<\/saml:NameID>/i);
  if (!nameIdMatch || !nameIdMatch[2] || nameIdMatch[2].trim().length === 0) {
    return { success: false, error: 'Missing Subject NameID in SAML Assertion', code: 'MISSING_NAME_ID' };
  }
  const nameId = nameIdMatch[2].trim();
  const nameIdFormat = nameIdMatch[1];

  // 7. Extract AttributeStatement attributes
  const rawAttributes: Record<string, string[]> = {};
  const attrRegex = /<saml:Attribute\s+Name=["']([^"']+)["'][^>]*>([\s\S]*?)<\/saml:Attribute>/gi;
  let attrMatch: RegExpExecArray | null;

  while ((attrMatch = attrRegex.exec(xml)) !== null) {
    const attrName = attrMatch[1];
    const attrBody = attrMatch[2];
    if (!attrName || !attrBody) continue;

    const valRegex = /<saml:AttributeValue[^>]*>([\s\S]*?)<\/saml:AttributeValue>/gi;
    const values: string[] = [];
    let valMatch: RegExpExecArray | null;
    while ((valMatch = valRegex.exec(attrBody)) !== null) {
      if (valMatch[1]) {
        values.push(valMatch[1].trim());
      }
    }
    rawAttributes[attrName] = values;
  }

  // 8. Normalize claims using attribute mapping
  const mapping = idp.attributeMapping || DEFAULT_SAML_ATTRIBUTE_MAPPING;
  const emailAttr = mapping.emailField || 'email';
  const nameAttr = mapping.nameField || 'displayName';
  const groupsAttr = mapping.groupsField || 'memberOf';

  const emailCandidates = [
    rawAttributes[emailAttr]?.[0],
    rawAttributes['urn:oid:0.9.2342.19200300.100.1.3']?.[0], // standard LDAP mail OID
    rawAttributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress']?.[0],
    nameId.includes('@') ? nameId : undefined,
  ].filter(Boolean) as string[];

  const resolvedEmail = (emailCandidates[0] || nameId).toLowerCase().trim();

  // Name normalization
  const firstName = rawAttributes[mapping.firstNameField || 'firstName']?.[0];
  const lastName = rawAttributes[mapping.lastNameField || 'lastName']?.[0];
  const compositeName = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName;

  const resolvedName =
    rawAttributes[nameAttr]?.[0] ||
    rawAttributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']?.[0] ||
    compositeName ||
    resolvedEmail.split('@')[0] ||
    'SAML User';

  // Groups extraction
  const resolvedGroups: string[] = [
    ...(rawAttributes[groupsAttr] || []),
    ...(rawAttributes['http://schemas.xmlsoap.org/claims/Group'] || []),
    ...(rawAttributes['groups'] || []),
  ];

  // Verify email domain is authorized
  const emailDomain = extractDomainFromEmail(resolvedEmail);
  const domainAllowed = idp.domains.some((d) => normalizeDomain(d) === (emailDomain || ''));
  if (!domainAllowed) {
    return {
      success: false,
      error: `Email domain "${emailDomain}" is not authorized for SAML IdP "${idp.name}"`,
      code: 'UNAUTHORIZED_DOMAIN',
    };
  }

  // Determine user role based on attribute mapping
  let assignedRole: MemberRole = idp.defaultRole;
  if (mapping.roleMapping) {
    for (const g of resolvedGroups) {
      if (mapping.roleMapping[g]) {
        assignedRole = mapping.roleMapping[g]!;
        break;
      }
      const lower = g.toLowerCase();
      if (mapping.roleMapping[lower]) {
        assignedRole = mapping.roleMapping[lower]!;
        break;
      }
    }
  }

  // Provision user identity
  const existing = existingUsers?.find((u) => u.email.toLowerCase() === resolvedEmail);
  let userId: UserId;
  let isNewUser = false;

  if (existing) {
    userId = existing.id;
    assignedRole = existing.role || assignedRole;
  } else {
    if (!idp.allowJitProvisioning) {
      return {
        success: false,
        error: `User "${resolvedEmail}" does not exist and JIT provisioning is disabled for SAML IdP "${idp.name}"`,
        code: 'JIT_DISABLED',
      };
    }
    userId = createId('usr');
    isNewUser = true;
  }

  const user: SsoUserIdentity = {
    id: userId,
    email: resolvedEmail,
    name: resolvedName,
    role: assignedRole,
    orgId: idp.orgId,
    providerId: idp.id,
    externalSubject: nameId,
    groups: resolvedGroups,
    isNewUser,
  };

  const now = new Date();
  const session: SsoAuthSession = {
    sessionId: createId('sso'),
    user,
    providerId: idp.id,
    providerType: 'saml2',
    idToken: `saml_assertion_${nameId}`,
    issuedAt: now,
    expiresAt: new Date(now.getTime() + 8 * 60 * 60 * 1000), // 8 hours
  };

  const claims: SamlAssertionClaims = {
    nameId,
    nameIdFormat,
    email: resolvedEmail,
    name: resolvedName,
    groups: resolvedGroups,
    attributes: rawAttributes,
  };

  return { success: true, session, claims };
}

/**
 * Creates a pre-configured Test SAML IdP for local test execution and developer workflows.
 */
export function createTestSamlIdpConfig(
  orgId: OrgId,
  overrides?: Partial<SamlIdpConfig>
): SamlIdpConfig {
  return {
    id: createId('idp'),
    orgId,
    name: 'Acme Enterprise SAML 2.0 IdP',
    entityId: 'http://www.okta.com/exk_acme_saml_test',
    singleSignOnServiceUrl: 'https://identity.acme-enterprise.test/app/saml2/sso',
    singleLogoutServiceUrl: 'https://identity.acme-enterprise.test/app/saml2/slo',
    certificate: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAx4...',
    domains: ['acme.com', 'acme-enterprise.com'],
    status: 'active',
    enforceSso: false,
    allowJitProvisioning: true,
    defaultRole: 'editor',
    attributeMapping: DEFAULT_SAML_ATTRIBUTE_MAPPING,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Builds a valid SAML 2.0 Response XML with an Assertion for testing purposes.
 */
export function buildTestSamlResponseXml(params: {
  idp: SamlIdpConfig;
  sp: SamlSpConfig;
  nameId: string;
  email?: string;
  displayName?: string;
  groups?: string[];
  inResponseTo?: string;
  notOnOrAfterMinutes?: number;
  statusCode?: string;
  overrideIssuer?: string;
  overrideAudience?: string;
}): string {
  const {
    idp,
    sp,
    nameId,
    email = nameId,
    displayName = nameId.split('@')[0],
    groups = ['architects'],
    inResponseTo = `saml_req_${Date.now()}`,
    notOnOrAfterMinutes = 10,
    statusCode = 'urn:oasis:names:tc:SAML:2.0:status:Success',
    overrideIssuer,
    overrideAudience,
  } = params;

  const now = new Date();
  const issueInstant = now.toISOString();
  const notBefore = new Date(now.getTime() - 60 * 1000).toISOString();
  const notOnOrAfter = new Date(now.getTime() + notOnOrAfterMinutes * 60 * 1000).toISOString();

  const issuer = escapeXml(overrideIssuer || idp.entityId);
  const audience = escapeXml(overrideAudience || sp.entityId);

  const groupValuesXml = groups
    .map((g) => `<saml:AttributeValue>${escapeXml(g)}</saml:AttributeValue>`)
    .join('\n        ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
  xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
  ID="saml_resp_${Date.now()}"
  Version="2.0"
  IssueInstant="${issueInstant}"
  Destination="${escapeXml(sp.acsUrl)}"
  InResponseTo="${escapeXml(inResponseTo)}">
  <saml:Issuer>${issuer}</saml:Issuer>
  <samlp:Status>
    <samlp:StatusCode Value="${escapeXml(statusCode)}"/>
  </samlp:Status>
  <saml:Assertion ID="saml_asrt_${Date.now()}" Version="2.0" IssueInstant="${issueInstant}">
    <saml:Issuer>${issuer}</saml:Issuer>
    <saml:Subject>
      <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">${escapeXml(nameId)}</saml:NameID>
      <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
        <saml:SubjectConfirmationData InResponseTo="${escapeXml(inResponseTo)}" NotOnOrAfter="${notOnOrAfter}" Recipient="${escapeXml(sp.acsUrl)}"/>
      </saml:SubjectConfirmation>
    </saml:Subject>
    <saml:Conditions NotBefore="${notBefore}" NotOnOrAfter="${notOnOrAfter}">
      <saml:AudienceRestriction>
        <saml:Audience>${audience}</saml:Audience>
      </saml:AudienceRestriction>
    </saml:Conditions>
    <saml:AttributeStatement>
      <saml:Attribute Name="email">
        <saml:AttributeValue>${escapeXml(email)}</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="displayName">
        <saml:AttributeValue>${escapeXml(displayName || 'User')}</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="memberOf">
        ${groupValuesXml}
      </saml:Attribute>
    </saml:AttributeStatement>
  </saml:Assertion>
</samlp:Response>`.trim();
}

/**
 * Simulates a complete SAML 2.0 login flow in a single invocation.
 */
export function simulateTestSamlLogin(params: {
  email: string;
  name?: string;
  groups?: string[];
  idp?: SamlIdpConfig;
  sp?: SamlSpConfig;
  orgId?: OrgId;
  existingUsers?: Array<{ id: UserId; email: string; role?: MemberRole }>;
}): { request: SamlAuthnRequest; responseXml: string; session: SsoAuthSession } {
  const orgId = params.orgId || createId('org');
  const idp = params.idp || createTestSamlIdpConfig(orgId);
  const sp: SamlSpConfig = params.sp || {
    entityId: 'https://app.diagramhq.com/api/auth/saml/metadata',
    acsUrl: 'https://app.diagramhq.com/api/auth/saml/acs',
  };

  const request = buildSamlAuthnRequest({ idp, sp });

  const responseXml = buildTestSamlResponseXml({
    idp,
    sp,
    nameId: params.email,
    displayName: params.name,
    groups: params.groups,
    inResponseTo: request.id,
  });

  const responseBase64 = base64Encode(responseXml);

  const res = parseAndValidateSamlResponse(
    responseBase64,
    idp,
    {
      expectedInResponseTo: request.id,
      expectedAudience: sp.entityId,
    },
    params.existingUsers
  );

  if (!res.success) {
    throw new Error(`SAML simulation failed: ${res.error} (${res.code})`);
  }

  return { request, responseXml, session: res.session };
}
