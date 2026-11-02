'use client';

import React from 'react';

export type ModelSection =
  | 'home'
  | 'domains'
  | 'objects'
  | 'flows'
  | 'connections'
  | 'dependencies'
  | 'teams'
  | 'technologies'
  | 'history';

export interface ModelNavRailProps {
  activeSection: ModelSection;
  onSelectSection: (section: ModelSection) => void;
  counts?: Partial<Record<ModelSection, number>>;
}

interface NavItem {
  id: ModelSection;
  label: string;
  icon: string;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: '🏠', description: 'Model overview and architecture summary' },
  { id: 'domains', label: 'Domains', icon: '🌐', description: 'DDD Domains and bounded contexts' },
  { id: 'objects', label: 'Objects', icon: '📦', description: 'All model objects across diagrams' },
  { id: 'flows', label: 'Flows', icon: '⚡', description: 'Architecture execution flows and scenarios' },
  { id: 'connections', label: 'Connections', icon: '🔗', description: 'First-class connections catalog' },
  { id: 'dependencies', label: 'Dependencies', icon: '🔀', description: 'Interactive incoming / focus / outgoing dependencies' },
  { id: 'teams', label: 'Teams', icon: '👥', description: 'Ownership teams and assigned systems' },
  { id: 'technologies', label: 'Technologies', icon: '🛠️', description: 'Technologies catalog and usage' },
  { id: 'history', label: 'History', icon: '📜', description: 'Model audit trail and change history' },
];

export function ModelNavRail({
  activeSection,
  onSelectSection,
  counts = {},
}: ModelNavRailProps): JSX.Element {
  return (
    <aside
      data-testid="model-nav-rail"
      className="w-16 bg-[#121518] border-r border-white/[0.08] flex flex-col items-center py-3 gap-1 z-20 select-none shrink-0"
    >
      <div className="text-[10px] uppercase font-mono tracking-wider text-[#8b9196] mb-1 font-semibold">
        Model
      </div>

      <nav className="flex flex-col items-center gap-1 w-full px-1.5">
        {NAV_ITEMS.map((item) => {
          const isActive = activeSection === item.id;
          const count = counts[item.id];
          return (
            <button
              key={item.id}
              type="button"
              data-testid={`model-nav-${item.id}`}
              onClick={() => onSelectSection(item.id)}
              className={`w-full py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all text-center group relative ${
                isActive
                  ? 'bg-[#2BB5E8]/15 text-[#2BB5E8] border border-[#2BB5E8]/40 shadow-sm'
                  : 'text-[#8b9196] hover:text-[#e7e9ea] hover:bg-white/[0.06] border border-transparent'
              }`}
              title={`${item.label} — ${item.description}`}
            >
              <span className="text-base leading-none group-hover:scale-110 transition-transform">
                {item.icon}
              </span>
              <span className="text-[10px] font-medium tracking-tight truncate max-w-full">
                {item.label}
              </span>
              {typeof count === 'number' && count > 0 && (
                <span className="text-[9px] px-1 rounded-full bg-white/[0.08] text-[#8b9196] font-mono leading-none mt-0.5">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
