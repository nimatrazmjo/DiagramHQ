'use client';

import React, { useState, useMemo } from 'react';
import { ICONS_REGISTRY } from '../../lib/icons';

export interface IconPickerModalProps {
  isOpen: boolean;
  currentIcon?: string | null;
  onSelectIcon: (iconPath: string | null) => void;
  onClose: () => void;
}

export function IconPickerModal({
  isOpen,
  currentIcon,
  onSelectIcon,
  onClose,
}: IconPickerModalProps): JSX.Element | null {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'clouds' | 'databases' | 'languages'>('all');

  const allIcons = useMemo(() => Object.values(ICONS_REGISTRY), []);

  const filteredIcons = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allIcons.filter((icon) => {
      const matchesCat = activeCategory === 'all' || icon.category === activeCategory;
      if (!matchesCat) return false;
      if (!q) return true;
      return (
        icon.name.toLowerCase().includes(q) ||
        icon.id.toLowerCase().includes(q) ||
        icon.keywords.some((k) => k.toLowerCase().includes(q))
      );
    });
  }, [allIcons, search, activeCategory]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-base">
              🎨
            </span>
            <div>
              <h2 className="text-base font-semibold text-white">Select Object Icon</h2>
              <p className="text-xs text-slate-400">
                Choose an official brand icon (Azure, AWS, Postgres, Claude, Python, etc.)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Search Bar & Category Filter */}
        <div className="p-4 border-b border-slate-800 flex flex-col gap-3 bg-slate-950/40">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Search icons (e.g. azure, postgres, claude, python)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-0.5">
            {[
              { id: 'all', label: 'All Icons' },
              { id: 'clouds', label: '☁️ Clouds & AI' },
              { id: 'databases', label: '🗄️ Databases' },
              { id: 'languages', label: '⚡ Languages' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id as typeof activeCategory)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  activeCategory === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Icon Grid */}
        <div className="p-4 overflow-y-auto flex-1 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
          {/* None / Reset option */}
          <button
            type="button"
            onClick={() => {
              onSelectIcon(null);
              onClose();
            }}
            className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center gap-2 group ${
              !currentIcon
                ? 'border-blue-500/60 bg-blue-950/30'
                : 'border-slate-800 hover:border-slate-700 bg-slate-900/60 hover:bg-slate-800/50'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 group-hover:scale-105 transition-transform border border-slate-700">
              <span className="text-base">🚫</span>
            </div>
            <span className="text-[11px] font-medium text-slate-400 group-hover:text-slate-200">
              Default Icon
            </span>
          </button>

          {filteredIcons.map((icon) => {
            const isSelected = currentIcon === icon.path || currentIcon === icon.id;
            return (
              <button
                key={icon.id}
                type="button"
                onClick={() => {
                  onSelectIcon(icon.path);
                  onClose();
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center gap-2 group ${
                  isSelected
                    ? 'border-blue-500 bg-blue-950/40 ring-1 ring-blue-500 shadow-md shadow-blue-500/10'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-900/60 hover:bg-slate-800/50'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-slate-800/90 flex items-center justify-center p-2 border border-slate-700/80 group-hover:scale-110 transition-transform">
                  <img
                    src={icon.path}
                    alt={icon.name}
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                </div>
                <span className="text-[11px] font-medium text-slate-300 group-hover:text-white truncate max-w-full">
                  {icon.name}
                </span>
              </button>
            );
          })}

          {filteredIcons.length === 0 && (
            <div className="col-span-full py-8 text-center text-slate-500 text-xs">
              No icons found matching &quot;{search}&quot;. Try searching for &quot;azure&quot;, &quot;postgres&quot;, &quot;claude&quot;, or &quot;python&quot;.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 bg-slate-950/60">
          <span>{allIcons.length} official tech & cloud icons available locally</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
