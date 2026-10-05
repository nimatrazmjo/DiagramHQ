'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

export interface PaletteObjectItem {
  id: string;
  name: string;
  kind: string;
  technology?: string;
  description?: string;
  tags?: string[];
  c4Level?: number;
}

export interface PaletteActionItem {
  id: string;
  title: string;
  description?: string;
  category: 'create' | 'action' | 'view' | 'navigation';
  icon?: string;
  shortcut?: string;
  onExecute: () => void;
}

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  objects: PaletteObjectItem[];
  onSelectObject: (objectId: string) => void;
  actions?: PaletteActionItem[];
}

interface PaletteEntry {
  id: string;
  type: 'object' | 'action';
  title: string;
  subtitle?: string;
  category: string;
  icon: string;
  shortcut?: string;
  score: number;
  onSelect: () => void;
}

function getObjectIcon(kind: string): string {
  const k = kind.toLowerCase();
  if (k === 'system' || k.includes('context')) return '🌐';
  if (k === 'database' || k === 'store' || k.includes('db')) return '🗄️';
  if (k === 'queue' || k.includes('kafka') || k.includes('rabbit')) return '📨';
  if (k === 'component') return '🧩';
  if (k === 'person' || k === 'actor' || k === 'user') return '👤';
  return '📦';
}

/**
 * Fuzzy scoring function: checks if all query chars appear in target in order,
 * with bonus points for exact prefix match, word boundaries, and consecutive matches.
 */
function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  if (t === q) return 1000;
  if (t.startsWith(q)) return 500 + (q.length / t.length) * 100;
  if (t.includes(q)) return 300 + (q.length / t.length) * 100;

  let score = 0;
  let tIdx = 0;
  let consecutive = 0;

  for (let qIdx = 0; qIdx < q.length; qIdx++) {
    const qChar = q[qIdx]!;
    let found = false;

    while (tIdx < t.length) {
      if (t[tIdx] === qChar) {
        found = true;
        // Word boundary bonus
        if (tIdx === 0 || t[tIdx - 1] === ' ' || t[tIdx - 1] === '-' || t[tIdx - 1] === '_') {
          score += 20;
        }
        score += 10 + consecutive * 5;
        consecutive++;
        tIdx++;
        break;
      }
      consecutive = 0;
      tIdx++;
    }

    if (!found) return 0;
  }

  return score;
}

export function CommandPalette({
  isOpen,
  onClose,
  objects,
  onSelectObject,
  actions = [],
}: CommandPaletteProps): JSX.Element | null {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 30);
    }
  }, [isOpen]);

  // Transform objects and actions into searchable entries
  const allEntries: PaletteEntry[] = useMemo(() => {
    const objectEntries: PaletteEntry[] = objects.map((obj) => {
      const subparts = [obj.kind];
      if (obj.technology) subparts.push(obj.technology);
      if (obj.tags && obj.tags.length > 0) subparts.push(obj.tags.map((t) => `#${t}`).join(' '));
      if (obj.description) subparts.push(obj.description);
      if (obj.c4Level) subparts.push(`L${obj.c4Level}`);

      return {
        id: `obj-${obj.id}`,
        type: 'object',
        title: obj.name,
        subtitle: subparts.join(' • '),
        category: 'Architecture Objects',
        icon: getObjectIcon(obj.kind),
        shortcut: obj.c4Level ? `L${obj.c4Level}` : undefined,
        score: 0,
        onSelect: () => {
          onSelectObject(obj.id);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('canvas:center-node', {
                detail: { nodeId: obj.id },
              }),
            );
          }
          onClose();
        },
      };
    });

    const actionEntries: PaletteEntry[] = actions.map((act) => ({
      id: `act-${act.id}`,
      type: 'action',
      title: act.title,
      subtitle: act.description,
      category:
        act.category === 'create'
          ? 'Add Architecture Element'
          : act.category === 'view'
            ? 'Views & Levels'
            : 'Commands & Actions',
      icon: act.icon || '⚡',
      shortcut: act.shortcut,
      score: 0,
      onSelect: () => {
        act.onExecute();
        onClose();
      },
    }));

    return [...objectEntries, ...actionEntries];
  }, [objects, actions, onSelectObject, onClose]);

  // Filter and rank entries based on query
  const filteredEntries = useMemo(() => {
    const q = query.trim();
    if (!q) {
      return allEntries;
    }

    const scored = allEntries
      .map((entry) => {
        const titleScore = fuzzyScore(q, entry.title);
        const subScore = entry.subtitle ? fuzzyScore(q, entry.subtitle) * 0.6 : 0;
        const catScore = fuzzyScore(q, entry.category) * 0.4;
        const totalScore = Math.max(titleScore, subScore, catScore);
        return { ...entry, score: totalScore };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score);

    return scored;
  }, [allEntries, query]);

  // Reset selected index when list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredEntries.length, query]);

  // Keep selected item scrolled into view
  useEffect(() => {
    if (!listRef.current) return;
    const selectedEl = listRef.current.querySelector<HTMLElement>(
      `[data-index="${selectedIndex}"]`,
    );
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Keyboard navigation within the palette
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          filteredEntries.length > 0 ? (prev + 1) % filteredEntries.length : 0,
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          filteredEntries.length > 0
            ? (prev - 1 + filteredEntries.length) % filteredEntries.length
            : 0,
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = filteredEntries[selectedIndex];
        if (item) {
          item.onSelect();
        }
      }
    },
    [filteredEntries, selectedIndex, onClose],
  );

  if (!isOpen) return null;

  return (
    <div
      data-testid="command-palette-modal"
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh] animate-in zoom-in-95 duration-150"
        onKeyDown={handleKeyDown}
      >
        {/* Palette Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800 bg-slate-900/90">
          <svg
            className="w-5 h-5 text-blue-400 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            data-testid="command-palette-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, search objects, tags, tech... (⌘K or /)"
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-0"
            autoComplete="off"
            spellCheck="false"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-xs text-slate-400 hover:text-slate-200 px-1.5 py-0.5 rounded bg-slate-800"
            >
              Clear
            </button>
          )}
          <div className="hidden sm:flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700 rounded-md">
              ⌘K
            </kbd>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700 rounded-md">
              /
            </kbd>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700 rounded-md">
              ESC
            </kbd>
          </div>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          data-testid="command-palette-results"
          className="flex-1 overflow-y-auto p-2"
        >
          {filteredEntries.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              <span className="text-2xl mb-2 block">🔍</span>
              No objects or actions found matching &quot;{query}&quot;
            </div>
          ) : (
            filteredEntries.map((item, index) => {
              const isSelected = index === selectedIndex;
              const isFirstInCategory =
                index === 0 || filteredEntries[index - 1]?.category !== item.category;

              return (
                <React.Fragment key={item.id}>
                  {isFirstInCategory && (
                    <div
                      data-testid={`command-category-${item.category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                      className="px-3 pt-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400/90"
                    >
                      {item.category}
                    </div>
                  )}
                  <div
                    data-index={index}
                    data-testid={`command-item-${item.id}`}
                    data-category={item.category}
                    onClick={item.onSelect}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-600/20 text-white border border-blue-500/30'
                        : 'hover:bg-slate-800/60 text-slate-200 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl shrink-0">{item.icon}</span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate flex items-center gap-2">
                          <span>{item.title}</span>
                          {item.type === 'object' && (
                            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-800 text-blue-300 border border-slate-700">
                              Object
                            </span>
                          )}
                        </div>
                        {item.subtitle && (
                          <div className="text-xs text-slate-400 truncate">{item.subtitle}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      {item.shortcut && (
                        <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800/90 border border-slate-700 rounded">
                          {item.shortcut}
                        </kbd>
                      )}
                      {isSelected && (
                        <span className="text-xs text-blue-400 flex items-center gap-1 font-mono">
                          ↵ Select
                        </span>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-slate-800 bg-slate-900/60 text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px]">
                ↑
              </kbd>{' '}
              <kbd className="px-1 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px]">
                ↓
              </kbd>{' '}
              Navigate
            </span>
            <span>
              <kbd className="px-1 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px]">
                ↵
              </kbd>{' '}
              Execute
            </span>
          </div>
          <span>{filteredEntries.length} results</span>
        </div>
      </div>
    </div>
  );
}
