'use client';

import React, { useState } from 'react';
import {
  buildSpMetadataXml,
  createId,
  createScimState,
  createScimUser,
  createTestIdpConfig,
  generateScimBearerToken,
  parseIdpMetadataXml,
  patchScimUser,
  simulateScimProvisioningLifecycle,
  simulateTestIdpLogin,
  simulateTestSamlLogin,
  validateSsoProviderConfig,
  type MemberRole,
  type SamlSpConfig,
  type SsoProviderConfig,
  type SsoProviderType,
} from '@diagramhq/domain';

export interface SsoSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgName?: string;
  initialProviders?: SsoProviderConfig[];
}

const DEFAULT_SP_CONFIG: SamlSpConfig = {
  entityId: 'https://app.diagramhq.com/api/auth/saml/metadata',
  acsUrl: 'https://app.diagramhq.com/api/auth/saml/acs',
  singleLogoutUrl: 'https://app.diagramhq.com/api/auth/saml/slo',
  nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
};

const DEFAULT_PROVIDERS: SsoProviderConfig[] = [
  createTestIdpConfig(createId('org'), {
    id: createId('idp'),
    name: 'Acme Enterprise Okta',
    type: 'oidc',
    issuerUrl: 'https://identity.acme-enterprise.com/oauth2/v1',
    clientId: 'diagramhq-okta-client-id',
    domains: ['acme.com', 'acme-enterprise.com'],
    status: 'active',
    enforceSso: false,
    allowJitProvisioning: true,
    defaultRole: 'editor',
  }),
  createTestIdpConfig(createId('org'), {
    id: createId('idp'),
    name: 'Stark Industries Entra ID',
    type: 'oidc',
    issuerUrl: 'https://login.microsoftonline.com/stark-tenant-id/v2.0',
    clientId: 'diagramhq-entra-client-id',
    domains: ['stark.com', 'stark-industries.com'],
    status: 'active',
    enforceSso: false,
    allowJitProvisioning: true,
    defaultRole: 'admin',
  }),
  createTestIdpConfig(createId('org'), {
    id: createId('idp'),
    name: 'Acme Enterprise SAML 2.0 IdP',
    type: 'saml2',
    issuerUrl: 'https://identity.acme-enterprise.test/app/saml2/sso',
    clientId: 'http://www.okta.com/exk_acme_saml',
    domains: ['acme-enterprise.com'],
    status: 'active',
    enforceSso: false,
    allowJitProvisioning: true,
    defaultRole: 'editor',
  }),
];

export function SsoSettingsModal({
  isOpen,
  onClose,
  orgName = 'DiagramHQ Enterprise',
  initialProviders = DEFAULT_PROVIDERS,
}: SsoSettingsModalProps): JSX.Element | null {
  const [providers, setProviders] = useState<SsoProviderConfig[]>(initialProviders);
  const [selectedProviderId, setSelectedProviderId] = useState<string>(
    initialProviders[0]?.id || ''
  );
  const [activeTab, setActiveTab] = useState<'providers' | 'add' | 'test' | 'saml' | 'scim'>('providers');

  // Form state for adding/editing provider
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<SsoProviderType>('oidc');
  const [newIssuer, setNewIssuer] = useState('');
  const [newClientId, setNewClientId] = useState('');
  const [newDomains, setNewDomains] = useState('');
  const [newEnforce, setNewEnforce] = useState(false);
  const [newJit, setNewJit] = useState(true);
  const [newDefaultRole, setNewDefaultRole] = useState<MemberRole>('editor');
  const [formError, setFormError] = useState<string | null>(null);

  // SAML IdP XML import state
  const [samlXmlInput, setSamlXmlInput] = useState('');
  const [samlImportNotice, setSamlImportNotice] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // SCIM 2.0 state (F103)
  const [scimState, setScimState] = useState(() => {
    const st = createScimState(createId('org'), {
      bearerToken: 'scim_sec_enterprise_key_9988776655',
      endpointUrl: 'https://app.diagramhq.com/api/scim/v2',
    });
    createScimUser(st, {
      userName: 'sarah.connor@cyberdyne.corp',
      displayName: 'Sarah Connor',
      name: { givenName: 'Sarah', familyName: 'Connor' },
      title: 'Principal Systems Architect',
      active: true,
      externalId: 'okta-ext-usr-1001',
    });
    createScimUser(st, {
      userName: 'thomas.anderson@matrix.io',
      displayName: 'Thomas Anderson',
      name: { givenName: 'Thomas', familyName: 'Anderson' },
      title: 'Senior Software Engineer',
      active: false,
      externalId: 'okta-ext-usr-1002',
    });
    return st;
  });
  const [scimTokenCopied, setScimTokenCopied] = useState(false);
  const [scimUrlCopied, setScimUrlCopied] = useState(false);
  const [scimSimResult, setScimSimResult] = useState<{
    success: boolean;
    message: string;
    steps: Record<string, boolean>;
  } | null>(null);

  // Test IdP simulation state
  const [testEmail, setTestEmail] = useState('architect@acme-enterprise.com');
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    details?: Record<string, unknown>;
  } | null>(null);

  if (!isOpen) return null;

  const currentProvider = providers.find((p) => p.id === selectedProviderId) || providers[0];
  const spMetadataXml = buildSpMetadataXml(DEFAULT_SP_CONFIG);

  const handleCopySpMetadata = async () => {
    try {
      await navigator.clipboard.writeText(spMetadataXml);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleImportSamlXml = () => {
    setSamlImportNotice(null);
    try {
      if (!samlXmlInput.trim()) {
        setSamlImportNotice('Please paste XML metadata first');
        return;
      }
      const parsed = parseIdpMetadataXml(samlXmlInput);
      setNewName('Imported SAML IdP');
      setNewType('saml2');
      setNewIssuer(parsed.singleSignOnServiceUrl);
      setNewClientId(parsed.entityId);
      setActiveTab('add');
      setSamlImportNotice(`Successfully parsed entityID "${parsed.entityId}"! Pre-filled provider form.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'XML parse failed';
      setSamlImportNotice(`Import failed: ${msg}`);
    }
  };

  const handleCopyScimUrl = async () => {
    try {
      await navigator.clipboard.writeText(scimState.config.endpointUrl);
      setScimUrlCopied(true);
      setTimeout(() => setScimUrlCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleCopyScimToken = async () => {
    try {
      await navigator.clipboard.writeText(scimState.config.bearerToken);
      setScimTokenCopied(true);
      setTimeout(() => setScimTokenCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleRegenerateScimToken = () => {
    const newToken = generateScimBearerToken();
    scimState.config.bearerToken = newToken;
    setScimState({ ...scimState, config: { ...scimState.config, bearerToken: newToken } });
  };

  const handleToggleScimUser = (userId: string) => {
    const existing = scimState.users.get(userId);
    if (!existing) return;
    const nextActive = !existing.active;
    patchScimUser(scimState, userId, {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
      Operations: [{ op: 'replace', path: 'active', value: nextActive }],
    });
    setScimState({ ...scimState, users: new Map(scimState.users) });
  };

  const handleRunScimSimulation = () => {
    try {
      const res = simulateScimProvisioningLifecycle({
        userName: 'dev.engineer@enterprise.acme.corp',
        displayName: 'Dev Engineer',
      });
      setScimSimResult({
        success: res.success,
        message: 'SCIM 2.0 full provisioning, modification, and deprovisioning lifecycle verified!',
        steps: res.steps,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Simulation failed';
      setScimSimResult({
        success: false,
        message: `SCIM simulation failed: ${msg}`,
        steps: {},
      });
    }
  };

  const handleToggleStatus = (id: string) => {
    setProviders((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const nextStatus = p.status === 'active' ? 'inactive' : 'active';
        return { ...p, status: nextStatus };
      })
    );
  };

  const handleToggleEnforce = (id: string) => {
    setProviders((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        return { ...p, enforceSso: !p.enforceSso };
      })
    );
  };

  const handleAddProvider = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const domainsArray = newDomains
      .split(',')
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean);

    const draft = createTestIdpConfig(createId('org'), {
      id: createId('idp'),
      name: newName.trim(),
      type: newType,
      issuerUrl: newIssuer.trim(),
      clientId: newClientId.trim(),
      domains: domainsArray,
      enforceSso: newEnforce,
      allowJitProvisioning: newJit,
      defaultRole: newDefaultRole,
      status: 'active',
    });

    const validation = validateSsoProviderConfig(draft);
    if (!validation.valid) {
      setFormError(validation.errors.join('. '));
      return;
    }

    setProviders((prev) => [...prev, draft]);
    setSelectedProviderId(draft.id);
    setActiveTab('providers');

    // Reset form
    setNewName('');
    setNewIssuer('');
    setNewClientId('');
    setNewDomains('');
  };

  const handleRunTestSimulation = (isSaml = false) => {
    setTestResult(null);
    try {
      if (isSaml) {
        const sim = simulateTestSamlLogin({
          email: testEmail.trim(),
          name: testEmail.split('@')[0]?.replace(/[-_.]/g, ' '),
          groups: ['DiagramHQ-Architects'],
        });

        setTestResult({
          success: true,
          message: 'Successfully authenticated via SAML 2.0 Test IdP!',
          details: {
            protocol: 'SAML 2.0 Web Browser SSO (HTTP-POST)',
            sessionId: sim.session.sessionId,
            userEmail: sim.session.user.email,
            assignedRole: sim.session.user.role,
            jitProvisioned: sim.session.user.isNewUser,
            requestId: sim.request.id,
            issuedAt: sim.session.issuedAt.toISOString(),
            expiresAt: sim.session.expiresAt.toISOString(),
          },
        });
      } else {
        const providerToTest = currentProvider || createTestIdpConfig(createId('org'));
        const sim = simulateTestIdpLogin({
          email: testEmail.trim(),
          name: testEmail.split('@')[0]?.replace(/[-_.]/g, ' '),
          provider: providerToTest,
          groups: ['architects', 'engineers'],
        });

        setTestResult({
          success: true,
          message: `Successfully authenticated via ${providerToTest.name}!`,
          details: {
            protocol: 'OpenID Connect (OIDC Authorization Code)',
            sessionId: sim.session.sessionId,
            userEmail: sim.session.user.email,
            assignedRole: sim.session.user.role,
            jitProvisioned: sim.session.user.isNewUser,
            authUrl: sim.challenge.authorizationUrl,
            issuedAt: sim.session.issuedAt.toISOString(),
            expiresAt: sim.session.expiresAt.toISOString(),
          },
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Simulation failed';
      setTestResult({
        success: false,
        message: `SSO Test Failed: ${msg}`,
      });
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sso-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div>
              <h2 id="sso-modal-title" className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <span>Enterprise Single Sign-On (SSO / SAML / SCIM)</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                  F101 / F102 / F103
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage OIDC, SAML 2.0, and corporate identity provider integrations for {orgName}.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 px-5 bg-slate-950/40">
          <button
            type="button"
            onClick={() => setActiveTab('providers')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'providers'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <span>Configured IdPs</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300">
              {providers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('saml')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'saml'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <span>SAML 2.0 SP Config</span>
            <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-[10px] font-mono text-purple-400 border border-purple-500/20">
              F102
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('scim')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'scim'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <span>SCIM 2.0 Provisioning</span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-[10px] font-mono text-emerald-400 border border-emerald-500/20">
              F103
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('test')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'test'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <span>⚡ Test Simulation</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('add')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'add'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <span>+ Add Provider</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          {activeTab === 'providers' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                {providers.map((p) => {
                  const isSelected = p.id === currentProvider?.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedProviderId(p.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 border-indigo-500/50 shadow-md shadow-indigo-500/5'
                          : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-indigo-950/80 border border-indigo-700/40 flex items-center justify-center text-xs font-semibold text-indigo-300 shrink-0">
                            {p.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-semibold text-slate-100 truncate">{p.name}</h3>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                                  p.status === 'active'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                    : 'bg-slate-800 text-slate-400 border-slate-700'
                                }`}
                              >
                                {p.status}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono uppercase">
                                {p.type}
                              </span>
                              {p.enforceSso && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-medium">
                                  Enforced
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">
                              Domains: {p.domains.map((d) => `@${d}`).join(', ')}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleEnforce(p.id);
                            }}
                            className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                              p.enforceSso
                                ? 'bg-amber-950/50 border-amber-700 text-amber-300 hover:bg-amber-900/50'
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {p.enforceSso ? 'SSO Enforced' : 'Enforce SSO'}
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStatus(p.id);
                            }}
                            className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                              p.status === 'active'
                                ? 'bg-rose-950/40 border-rose-800 text-rose-300 hover:bg-rose-900/40'
                                : 'bg-emerald-950/40 border-emerald-800 text-emerald-300 hover:bg-emerald-900/40'
                            }`}
                          >
                            {p.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div>
                            <span className="text-slate-500 block">Type</span>
                            <span className="text-slate-300 font-mono uppercase">{p.type}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Default Role</span>
                            <span className="text-slate-300 capitalize">{p.defaultRole}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">JIT Provisioning</span>
                            <span className="text-slate-300">{p.allowJitProvisioning ? 'Enabled' : 'Disabled'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Endpoint / Issuer</span>
                            <span className="text-slate-300 font-mono truncate block" title={p.issuerUrl}>
                              {p.issuerUrl}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'saml' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/20 text-xs text-purple-300 space-y-1">
                <span className="font-semibold block">SAML 2.0 Service Provider (SP) Endpoints</span>
                <p className="text-slate-400">
                  Configure these endpoints in your corporate Identity Provider (Okta, Microsoft Entra ID, PingIdentity, OneLogin) to enable SAML 2.0 Web Browser SSO.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-slate-400 block font-semibold">Service Provider Entity ID (Audience):</span>
                  <div className="font-mono text-slate-200 select-all">{DEFAULT_SP_CONFIG.entityId}</div>
                </div>

                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-slate-400 block font-semibold">Assertion Consumer Service (ACS) URL:</span>
                  <div className="font-mono text-slate-200 select-all">{DEFAULT_SP_CONFIG.acsUrl}</div>
                </div>

                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-slate-400 block font-semibold">Single Logout (SLO) URL:</span>
                  <div className="font-mono text-slate-200 select-all">{DEFAULT_SP_CONFIG.singleLogoutUrl}</div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={handleCopySpMetadata}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-semibold shadow-md transition-all flex items-center gap-2"
                  >
                    <span>{copyFeedback ? '✓ Copied SP Metadata' : 'Copy SP Metadata XML'}</span>
                  </button>
                </div>
              </div>

              {/* IdP Metadata Import Box */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <h4 className="text-xs font-semibold text-slate-200">Import Corporate IdP Metadata XML:</h4>
                <textarea
                  rows={4}
                  value={samlXmlInput}
                  onChange={(e) => setSamlXmlInput(e.target.value)}
                  placeholder="Paste &lt;EntityDescriptor xmlns=&quot;urn:oasis:names:tc:SAML:2.0:metadata&quot; ...&gt; here"
                  className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl font-mono text-[11px] text-slate-200 focus:outline-none focus:border-purple-500"
                />

                {samlImportNotice && (
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-purple-500/40 text-xs text-purple-300">
                    {samlImportNotice}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleImportSamlXml}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
                >
                  Parse & Pre-fill SAML IdP
                </button>
              </div>
            </div>
          )}

          {activeTab === 'scim' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-300 space-y-1">
                <span className="font-semibold block flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  SCIM 2.0 Provisioning &amp; Deprovisioning Service (RFC 7643 / RFC 7644)
                </span>
                <p className="text-slate-400">
                  Automate user onboarding, attribute synchronization, and immediate deprovisioning
                  directly from Okta, Entra ID (Azure AD), OneLogin, or PingFederate.
                </p>
              </div>

              {/* Endpoint & Bearer Token Credentials */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-200">SCIM 2.0 Connection Settings:</h4>

                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">SCIM 2.0 Base URL:</span>
                    <button
                      type="button"
                      onClick={handleCopyScimUrl}
                      className="text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
                    >
                      {scimUrlCopied ? '✓ Copied URL' : 'Copy URL'}
                    </button>
                  </div>
                  <div className="font-mono text-xs text-slate-200 select-all break-all">
                    {scimState.config.endpointUrl}
                  </div>
                </div>

                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">SCIM Secret Bearer Token:</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleRegenerateScimToken}
                        className="text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg border border-slate-700 transition-colors"
                      >
                        Regenerate Token
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyScimToken}
                        className="text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
                      >
                        {scimTokenCopied ? '✓ Copied Token' : 'Copy Token'}
                      </button>
                    </div>
                  </div>
                  <div className="font-mono text-xs text-slate-300 select-all break-all">
                    {scimState.config.bearerToken}
                  </div>
                </div>
              </div>

              {/* End-to-end Lifecycle Test Button & Results */}
              <div className="pt-2 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-200">Provisioning &amp; Deprovisioning Verification:</h4>
                    <p className="text-[11px] text-slate-400">
                      Tests user creation (provisioning), attribute PATCH, deactivation (deprovisioning), reactivation, and cleanup.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRunScimSimulation}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all whitespace-nowrap"
                  >
                    Test SCIM Lifecycle
                  </button>
                </div>

                {scimSimResult && (
                  <div className={`p-4 rounded-xl border text-xs space-y-2.5 ${
                    scimSimResult.success
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                      : 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                  }`}>
                    <div className="flex items-center gap-2 font-semibold">
                      <span>{scimSimResult.success ? '✓' : '✗'}</span>
                      <span>{scimSimResult.message}</span>
                    </div>
                    {Object.keys(scimSimResult.steps).length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                        {Object.entries(scimSimResult.steps).map(([stepKey, passed]) => (
                          <div key={stepKey} className="flex items-center gap-1.5 p-1.5 rounded bg-slate-900/60 border border-slate-800">
                            <span className={passed ? 'text-emerald-400' : 'text-rose-400'}>
                              {passed ? '✓' : '✗'}
                            </span>
                            <span className="text-slate-300 capitalize">{stepKey}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Provisioned Directory */}
              <div className="pt-2 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-200">Provisioned Users Directory:</h4>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {Array.from(scimState.users.values()).filter((u) => u.active).length} Active / {scimState.users.size} Total
                  </span>
                </div>

                <div className="space-y-2">
                  {Array.from(scimState.users.values()).map((u) => (
                    <div
                      key={u.id}
                      className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-200 truncate">{u.displayName || u.userName}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                              u.active
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            }`}
                          >
                            {u.active ? 'Active (Provisioned)' : 'Deactivated (Deprovisioned)'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono truncate">
                          {u.userName} &bull; {u.title || 'Team Member'} &bull; External ID: {u.externalId || 'n/a'}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleScimUser(u.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                          u.active
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                        }`}
                      >
                        {u.active ? 'Deactivate User' : 'Reactivate User'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'test' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-xs text-indigo-300 space-y-1">
                <span className="font-semibold block">⚡ Enterprise Identity Simulation Engine (OIDC / SAML 2.0)</span>
                <p className="text-slate-400">
                  Simulates complete enterprise SSO exchanges without third-party network dependencies.
                  Verifies claims, time conditions, role assignment, and user session issuance.
                </p>
              </div>

              <div className="space-y-3">
                <label htmlFor="test-sso-email" className="text-xs font-semibold text-slate-300 block">
                  Test User Email Address:
                </label>
                <div className="flex gap-2">
                  <input
                    id="test-sso-email"
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="user@acme-enterprise.com"
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleRunTestSimulation(false)}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all"
                  >
                    Test OIDC SSO
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRunTestSimulation(true)}
                    className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-600/25 transition-all"
                  >
                    Test SAML 2.0
                  </button>
                </div>
              </div>

              {testResult && (
                <div
                  className={`p-4 rounded-xl border text-xs space-y-3 ${
                    testResult.success
                      ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                      : 'bg-rose-950/30 border-rose-500/30 text-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold">
                    <span>{testResult.success ? '✅' : '❌'}</span>
                    <span>{testResult.message}</span>
                  </div>

                  {testResult.details && (
                    <div className="bg-black/50 p-3 rounded-lg font-mono text-[11px] text-slate-300 space-y-1 overflow-x-auto">
                      <div>Protocol: {String(testResult.details.protocol)}</div>
                      <div>Session ID: {String(testResult.details.sessionId)}</div>
                      <div>User: {String(testResult.details.userEmail)}</div>
                      <div>Assigned Role: {String(testResult.details.assignedRole)}</div>
                      <div>JIT Provisioned: {String(testResult.details.jitProvisioned)}</div>
                      {Boolean(testResult.details.requestId) && (
                        <div>SAML Request ID: {String(testResult.details.requestId)}</div>
                      )}
                      <div>Issued At: {String(testResult.details.issuedAt)}</div>
                      <div>Expires At: {String(testResult.details.expiresAt)}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'add' && (
            <form onSubmit={handleAddProvider} className="space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-medium">Provider Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Okta or Corp SAML IdP"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-medium">Provider Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as SsoProviderType)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="oidc">OpenID Connect (OIDC)</option>
                    <option value="saml2">SAML 2.0 Web Browser SSO</option>
                    <option value="oauth2">OAuth 2.0</option>
                    <option value="mock_idp">Deterministic Test IdP</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-medium">SSO Service URL / Issuer</label>
                <input
                  type="url"
                  required
                  placeholder="https://identity.company.com/sso"
                  value={newIssuer}
                  onChange={(e) => setNewIssuer(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-medium">Client ID / Entity ID</label>
                  <input
                    type="text"
                    required
                    placeholder="diagramhq-sso-client-id or http://okta.com/exk123"
                    value={newClientId}
                    onChange={(e) => setNewClientId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-medium">Corporate Email Domains</label>
                  <input
                    type="text"
                    required
                    placeholder="company.com, subsidiary.org"
                    value={newDomains}
                    onChange={(e) => setNewDomains(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-medium">Default Assigned Role</label>
                  <select
                    value={newDefaultRole}
                    onChange={(e) => setNewDefaultRole(e.target.value as MemberRole)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="editor">Editor (Architect)</option>
                    <option value="viewer">Viewer (Read Only)</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <label className="flex items-center gap-2.5 pt-5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newJit}
                    onChange={(e) => setNewJit(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
                  />
                  <span className="text-slate-300">Allow JIT Provisioning</span>
                </label>

                <label className="flex items-center gap-2.5 pt-5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newEnforce}
                    onChange={(e) => setNewEnforce(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
                  />
                  <span className="text-slate-300">Enforce SSO Only</span>
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('providers')}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors"
                >
                  Save Provider
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
            <span>SAML 2.0 &amp; OIDC Gateway Active</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
