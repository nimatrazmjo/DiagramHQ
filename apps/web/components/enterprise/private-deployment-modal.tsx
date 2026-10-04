'use client';

import React, { useState } from 'react';
import {
  createDefaultPrivateDeploymentConfig,
  generateDockerComposeManifest,
  generateKubernetesHelmValues,
  runPrivateDeploymentSmokeTests,
  type CloudVpcProvider,
  type OrgId,
  type PrivateDeploymentConfig,
  type SmokeTestSuiteReport,
} from '@diagramhq/domain';

export interface PrivateDeploymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId?: string;
  initialConfig?: PrivateDeploymentConfig;
  initialTab?: 'config' | 'manifests' | 'smoke_tests';
}

export function PrivateDeploymentModal({
  isOpen,
  onClose,
  orgId = 'org_vpc_defense',
  initialConfig,
  initialTab = 'config',
}: PrivateDeploymentModalProps): JSX.Element | null {
  const [config, setConfig] = useState<PrivateDeploymentConfig>(() => {
    return initialConfig ?? createDefaultPrivateDeploymentConfig(orgId as OrgId, 'Acme Aerospace');
  });

  const [activeTab, setActiveTab] = useState<'config' | 'manifests' | 'smoke_tests'>(initialTab);
  const [manifestType, setManifestType] = useState<'compose' | 'helm'>('compose');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Smoke test run results
  const [smokeReport, setSmokeReport] = useState<SmokeTestSuiteReport>(() => {
    return runPrivateDeploymentSmokeTests(config, true);
  });

  if (!isOpen) return null;

  const handleRunSmoke = (cleanMode: boolean) => {
    const report = runPrivateDeploymentSmokeTests(config, cleanMode);
    setSmokeReport(report);
  };

  const handleCopyManifest = async () => {
    const manifest =
      manifestType === 'compose'
        ? generateDockerComposeManifest(config)
        : generateKubernetesHelmValues(config);

    try {
      await navigator.clipboard.writeText(manifest);
      setCopyFeedback('Manifest Copied to Clipboard!');
      setTimeout(() => setCopyFeedback(null), 2500);
    } catch {
      setCopyFeedback('Unable to copy automatically');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="private-deployment-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 id="private-deployment-title" className="text-xl font-bold text-white">
                  Private VPC &amp; Air-Gapped Deployment
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono bg-indigo-950 border border-indigo-500/40 text-indigo-400 rounded">
                  F108 Self-Hosted
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Self-hosted customer VPC deployment with zero external internet egress and local AI engine support.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close private deployment modal"
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Executive Deployment Status Ribbon */}
        <div className="px-6 py-4 bg-slate-950/40 border-b border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-3">
            <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
              Environment Cleanliness
            </span>
            <div className="flex items-center space-x-2 mt-1">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  smokeReport.cleanEnvironmentVerified ? 'bg-emerald-400' : 'bg-rose-500'
                }`}
              />
              <span className="text-sm font-bold text-white uppercase tracking-wide">
                {smokeReport.cleanEnvironmentVerified ? 'Verified Clean' : 'Degraded / Dirty'}
              </span>
            </div>
          </div>

          <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-3">
            <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
              Air-Gapped Barrier
            </span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-sm font-bold text-emerald-400 font-mono">
                {smokeReport.airGappedBarrierIntact ? 'ZERO EGRESS (LOCKED)' : 'LEAK DETECTED'}
              </span>
            </div>
          </div>

          <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-3">
            <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
              Smoke Tests Passed
            </span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-xl font-bold text-white font-mono">
                {smokeReport.passedCount}
              </span>
              <span className="text-xs text-slate-400">/ {smokeReport.totalCount} Healthy</span>
            </div>
          </div>

          <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-3">
            <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
              Cloud VPC Provider
            </span>
            <span className="text-sm font-bold text-indigo-400 font-mono mt-1 block uppercase">
              {config.provider.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-950/20">
          {[
            { id: 'config', label: 'VPC & Air-Gapped Setup' },
            { id: 'manifests', label: 'Topology Manifests (Compose / Helm)' },
            { id: 'smoke_tests', label: 'Clean Environment Smoke Tests' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: VPC & Air-Gapped Setup */}
          {activeTab === 'config' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase">Customer Name</label>
                  <input
                    type="text"
                    value={config.customerName}
                    onChange={(e) => setConfig((prev) => ({ ...prev, customerName: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase">Provider / Architecture</label>
                  <select
                    value={config.provider}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, provider: e.target.value as CloudVpcProvider }))
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    <option value="aws_vpc">AWS Customer VPC</option>
                    <option value="gcp_vpc">Google Cloud VPC</option>
                    <option value="azure_vnet">Azure Private VNet</option>
                    <option value="on_premises">On-Premises Bare Metal</option>
                    <option value="air_gapped">Strict Air-Gapped Enclave</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase">VPC CIDR Subnet</label>
                  <input
                    type="text"
                    value={config.vpcCidr}
                    onChange={(e) => setConfig((prev) => ({ ...prev, vpcCidr: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase">
                    Internal Container Registry URL
                  </label>
                  <input
                    type="text"
                    value={config.airGapped.internalRegistryUrl}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        airGapped: { ...prev.airGapped, internalRegistryUrl: e.target.value },
                      }))
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase">
                    Local AI Engine Inference Endpoint (vLLM / Ollama)
                  </label>
                  <input
                    type="text"
                    value={config.airGapped.localAiEndpoint || ''}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        airGapped: { ...prev.airGapped, localAiEndpoint: e.target.value },
                      }))
                    }
                    placeholder="e.g. http://vllm.internal:8000/v1"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase">
                    Offline Cryptographic License Key
                  </label>
                  <input
                    type="text"
                    value={config.airGapped.offlineLicenseKey}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        airGapped: { ...prev.airGapped, offlineLicenseKey: e.target.value },
                      }))
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="p-4 bg-slate-800/40 rounded-lg border border-slate-700/60 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-white">Block All Outbound Internet Egress</h4>
                  <p className="text-xs text-slate-400">
                    Enforces iptables / security group isolation dropping all packets destined for 0.0.0.0/0.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={config.airGapped.blockExternalEgress}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      airGapped: { ...prev.airGapped, blockExternalEgress: e.target.checked },
                    }))
                  }
                  className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 w-5 h-5"
                />
              </div>
            </div>
          )}

          {/* TAB 2: Topology Manifests */}
          {activeTab === 'manifests' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setManifestType('compose')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      manifestType === 'compose'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    docker-compose.yml
                  </button>
                  <button
                    type="button"
                    onClick={() => setManifestType('helm')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      manifestType === 'helm'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Helm values.yaml
                  </button>
                </div>

                <div className="flex items-center space-x-3">
                  {copyFeedback && <span className="text-xs text-emerald-400">{copyFeedback}</span>}
                  <button
                    type="button"
                    onClick={handleCopyManifest}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    Copy Manifest
                  </button>
                </div>
              </div>

              <pre className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto max-h-[420px]">
                {manifestType === 'compose'
                  ? generateDockerComposeManifest(config)
                  : generateKubernetesHelmValues(config)}
              </pre>
            </div>
          )}

          {/* TAB 3: Clean Environment Smoke Tests */}
          {activeTab === 'smoke_tests' && (
            <div className="space-y-6">
              <div className="p-4 bg-slate-800/40 border border-slate-700 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-white">Clean Environment Automated Smoke Suite</h4>
                  <p className="text-xs text-slate-400">
                    Executes end-to-end readiness probes across Web, API, Database, Object Storage, and Egress Barrier.
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => handleRunSmoke(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    Deploy to Clean Env &amp; Smoke Test
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRunSmoke(false)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-rose-400 text-xs font-medium rounded-lg transition-colors"
                  >
                    Simulate Degraded Env
                  </button>
                </div>
              </div>

              {/* Acceptance Criteria Banner */}
              <div
                className={`p-4 rounded-lg border flex items-center space-x-3 ${
                  smokeReport.cleanEnvironmentVerified
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                }`}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1,1 0 00-1.414-1.414L9 10.586 7.707 9.293a1,1 0 00-1.414 1.414l2 2a1,1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="text-xs">
                  <strong>Verification Status:</strong>{' '}
                  {smokeReport.cleanEnvironmentVerified
                    ? 'Deployment to clean environment verified. All smoke test probes passed.'
                    : 'Deployment failed. Smoke tests failed in degraded environment.'}
                </div>
              </div>

              {/* Smoke Probe Results */}
              <div className="space-y-3">
                {smokeReport.results.map((res) => (
                  <div
                    key={res.testId}
                    className="p-4 bg-slate-800/30 border border-slate-800 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs text-slate-400">{res.testId}</span>
                        <span className="text-sm font-medium text-white">{res.name}</span>
                        <span className="font-mono text-[11px] text-indigo-400">
                          ({res.latencyMs}ms)
                        </span>
                      </div>
                      <div className="font-mono text-xs text-slate-400">
                        Endpoint: {res.endpointChecked}
                      </div>
                      <p className="text-xs text-slate-300">{res.details}</p>
                    </div>

                    <div>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded text-xs font-bold font-mono uppercase ${
                          res.status === 'pass'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : res.status === 'warn'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {res.status === 'pass' ? '✓ PASS' : res.status === 'warn' ? '⚠ WARN' : '✕ FAIL'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="text-xs text-slate-400">
            Target CIDR: <span className="font-mono text-indigo-400">{config.vpcCidr}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
