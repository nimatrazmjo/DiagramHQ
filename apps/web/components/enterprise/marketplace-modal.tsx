import React, { useState } from 'react';
import {
  BUILTIN_MARKETPLACE_CATALOG,
  installMarketplaceItem,
  queryMarketplaceCatalog,
  uninstallMarketplaceItem,
  type InstallationId,
  type InstallationRecord,
  type MarketplaceItem,
  type MarketplaceItemType,
  type WorkspaceId,
} from '@diagramhq/domain';

export interface MarketplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId?: string;
  initialInstallations?: InstallationRecord[];
}

export function MarketplaceModal({
  isOpen,
  onClose,
  workspaceId = 'ws_production_platform',
  initialInstallations = [],
}: MarketplaceModalProps): JSX.Element | null {
  const [selectedType, setSelectedType] = useState<MarketplaceItemType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [installations, setInstallations] = useState<InstallationRecord[]>(initialInstallations);
  const [activeTab, setActiveTab] = useState<'browse' | 'installed'>('browse');
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  if (!isOpen) return null;

  const catalogItems = queryMarketplaceCatalog({
    type: selectedType === 'all' ? undefined : selectedType,
    query: searchQuery,
  });

  const activeItem = activeItemId
    ? BUILTIN_MARKETPLACE_CATALOG.find((it) => it.id === activeItemId)
    : null;

  const handleInstall = (item: MarketplaceItem) => {
    const result = installMarketplaceItem(workspaceId as WorkspaceId, item, installations);
    if (!result.alreadyInstalled) {
      setInstallations((prev) => [...prev, result.record]);
      setFeedbackToast(`Successfully installed '${item.name}'! ${result.installedAssets.length} assets added to workspace.`);
    } else {
      setFeedbackToast(`'${item.name}' is already installed.`);
    }
  };

  const handleUninstall = (installationId: InstallationId, itemName: string) => {
    const updated = uninstallMarketplaceItem(installationId, installations);
    setInstallations(updated);
    setFeedbackToast(`Uninstalled '${itemName}'.`);
  };

  const categories: Array<{ id: MarketplaceItemType | 'all'; label: string }> = [
    { id: 'all', label: 'All Extensions' },
    { id: 'template', label: 'Templates' },
    { id: 'integration_plugin', label: 'Integrations' },
    { id: 'technology_catalog', label: 'Tech Catalogs' },
    { id: 'ai_agent', label: 'AI Agents' },
    { id: 'rule', label: 'Rules & Guardrails' },
    { id: 'compliance_pack', label: 'Compliance Packs' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="marketplace-modal-title"
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
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 id="marketplace-modal-title" className="text-xl font-bold text-white">
                  Extension Marketplace
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono bg-indigo-950 border border-indigo-500/40 text-indigo-400 rounded">
                  F133 Verified
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Explore, install, and govern architecture blueprints, live integrations, tech catalogs, AI agents, and rules.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setActiveTab('browse')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'browse' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Browse Catalog
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('installed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'installed' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {`Installed (${installations.length})`}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors ml-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search & Category Filter Ribbon */}
        {activeTab === 'browse' && (
          <div className="px-6 py-3 border-b border-slate-800 bg-slate-950/40 flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Category Pills */}
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedType(cat.id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedType === cat.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <input
                type="text"
                placeholder="Search extensions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Feedback Toast */}
        {feedbackToast && (
          <div className="px-6 py-2.5 bg-emerald-950/60 border-b border-emerald-500/50 flex items-center justify-between text-emerald-200 text-xs">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{feedbackToast}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackToast(null)}
              className="text-emerald-400 hover:text-white ml-2 text-xs font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Main Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'browse' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {catalogItems.map((item) => {
                const isInstalled = installations.some((ins) => ins.itemId === item.id);

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-slate-700/60 bg-slate-800/30 hover:border-slate-600 flex flex-col justify-between transition-all"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 border border-slate-700 text-indigo-300">
                          {item.type.replace('_', ' ')}
                        </span>
                        <div className="flex items-center space-x-1 text-amber-400 text-xs">
                          <span>★</span>
                          <span className="font-mono text-[11px] text-slate-300">{item.rating}</span>
                        </div>
                      </div>

                      <h3 className="font-bold text-sm text-white">{item.name}</h3>
                      <p className="text-xs text-slate-400 line-clamp-2">{item.shortDescription}</p>

                      <div className="flex items-center space-x-2 pt-2 text-[11px] text-slate-400">
                        <span>{item.publisher.name}</span>
                        {item.publisher.verified && (
                          <span className="text-emerald-400 font-bold" title="Verified Publisher">
                            ✓
                          </span>
                        )}
                        <span>•</span>
                        <span className="font-mono">{`${item.downloadCount} installs`}</span>
                      </div>

                      {/* Assets Pill Badge */}
                      <div className="pt-2 text-[11px] text-slate-400">
                        <span className="text-indigo-400 font-mono">
                          {`${item.assets.length} Assets Included`}
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-700/60 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveItemId(item.id)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium transition-colors"
                      >
                        Inspect Assets
                      </button>

                      {isInstalled ? (
                        <span className="px-3 py-1.5 bg-emerald-950 border border-emerald-500/40 text-emerald-300 rounded text-xs font-semibold">
                          Installed
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleInstall(item)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold transition-colors"
                        >
                          Install
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: INSTALLED EXTENSIONS */}
          {activeTab === 'installed' && (
            <div className="space-y-4">
              {installations.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-2 border border-slate-800 rounded-xl bg-slate-900/40">
                  <p className="text-sm font-medium">No extensions installed yet in this workspace.</p>
                  <p className="text-xs">Browse the catalog to install templates, plugins, AI agents, and rules.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('browse')}
                    className="mt-3 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
                  >
                    Browse Extensions
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {installations.map((ins) => (
                    <div
                      key={ins.id}
                      className="p-4 bg-slate-800/40 border border-slate-700 rounded-xl flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-bold text-white">{ins.itemName}</h4>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 border border-slate-700 text-indigo-300">
                            {ins.itemType.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">{`v${ins.installedVersion}`}</span>
                        </div>
                        <p className="text-xs text-slate-400">
                          {`${ins.installedAssetIds.length} Assets active in workspace • Installed on ${ins.installedAt.slice(0, 10)}`}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleUninstall(ins.id, ins.itemName)}
                        className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/40 text-rose-300 rounded-lg text-xs font-semibold transition-colors"
                      >
                        Uninstall
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ASSET INSPECTION DRAWER */}
          {activeItem && (
            <div className="p-4 bg-slate-950/80 border border-slate-700 rounded-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white">{activeItem.name}</h3>
                  <p className="text-xs text-slate-400">{activeItem.fullDescription}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveItemId(null)}
                  className="text-slate-400 hover:text-white text-xs font-semibold px-2 py-1 bg-slate-800 rounded"
                >
                  Close Drawer
                </button>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  {`Assets Included in this Pack (${activeItem.assets.length})`}
                </h4>
                <div className="space-y-2">
                  {activeItem.assets.map((ast) => (
                    <div
                      key={ast.id}
                      className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-white">{ast.name}</div>
                        <div className="text-slate-400 text-[11px]">{ast.description}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 border border-slate-700 text-indigo-300">
                        {ast.kind.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>{`DiagramHQ Extension Ecosystem • Workspace: ${workspaceId}`}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
