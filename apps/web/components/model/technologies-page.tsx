'use client';

import React, { useState, useMemo } from 'react';
import type { CanvasNode, ModelObject } from '@diagramhq/domain';
import { getTechnologyIconPath } from '../../lib/icons';

export interface TechnologyItem {
  id: string;
  name: string;
  description: string;
  website: string;
  access?: 'Public' | 'Private' | 'Internal';
}

export interface TechnologiesPageProps {
  nodes: CanvasNode[];
  allModelObjects?: ModelObject[];
  onSelectObject?: (objectId: string) => void;
}

export const INITIAL_TECHNOLOGIES: TechnologyItem[] = [
  {
    id: 'postgresql',
    name: 'PostgreSQL',
    description: 'Open-source object-relational database system with strong reliability and ACID guarantees',
    website: 'https://www.postgresql.org',
    access: 'Public',
  },
  {
    id: 'react',
    name: 'React',
    description: 'Component-based frontend user interface library for building reactive web applications',
    website: 'https://react.dev',
    access: 'Public',
  },
  {
    id: 'nextjs',
    name: 'Next.js',
    description: 'The React Framework for the Web with hybrid static and server rendering',
    website: 'https://nextjs.org',
    access: 'Public',
  },
  {
    id: 'nodejs',
    name: 'Node.js',
    description: "JavaScript runtime built on Chrome's V8 JavaScript engine for scalable network apps",
    website: 'https://nodejs.org',
    access: 'Public',
  },
  {
    id: 'typescript',
    name: 'TypeScript',
    description: 'Strongly typed programming language that builds on JavaScript for robust architectures',
    website: 'https://www.typescriptlang.org',
    access: 'Public',
  },
  {
    id: 'python',
    name: 'Python',
    description: 'Interpreted high-level general-purpose programming language for backend & AI',
    website: 'https://www.python.org',
    access: 'Public',
  },
  {
    id: 'docker',
    name: 'Docker',
    description: 'Platform designed to help build, run, and share containerized services',
    website: 'https://www.docker.com',
    access: 'Public',
  },
  {
    id: 'azure',
    name: 'Azure',
    description: 'Microsoft cloud computing platform offering IaaS, PaaS, and managed enterprise services',
    website: 'https://azure.microsoft.com',
    access: 'Public',
  },
  {
    id: 'aws',
    name: 'AWS',
    description: 'Amazon Web Services comprehensive on-demand cloud computing infrastructure',
    website: 'https://aws.amazon.com',
    access: 'Public',
  },
  {
    id: 'redis',
    name: 'Redis',
    description: 'In-memory data structure store used as a database, cache, and high-speed message broker',
    website: 'https://redis.io',
    access: 'Public',
  },
  {
    id: 'graphql',
    name: 'GraphQL',
    description: 'Declarative query language for APIs and runtime for executing queries against data',
    website: 'https://graphql.org',
    access: 'Public',
  },
  {
    id: 'kafka',
    name: 'Kafka',
    description: 'Distributed event streaming platform for high-performance data pipelines and analytics',
    website: 'https://kafka.apache.org',
    access: 'Public',
  },
  {
    id: 'go',
    name: 'Go',
    description: 'Open source compiled programming language for simple, fast, and reliable concurrency',
    website: 'https://go.dev',
    access: 'Public',
  },
  {
    id: 'tailwind',
    name: 'Tailwind CSS',
    description: 'A utility-first CSS framework for rapid and consistent user interface composition',
    website: 'https://tailwindcss.com',
    access: 'Public',
  },
  {
    id: 'envoy',
    name: 'Envoy',
    description: 'High-performance cloud-native edge and service reverse proxy with mTLS and tracing',
    website: 'https://www.envoyproxy.io',
    access: 'Public',
  },
];

export function TechnologiesPage({
  nodes,
  allModelObjects = [],
  onSelectObject,
}: TechnologiesPageProps): JSX.Element {
  const [technologies, setTechnologies] = useState<TechnologyItem[]>(INITIAL_TECHNOLOGIES);
  const [searchQuery, setSearchQuery] = useState('');
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [newTechName, setNewTechName] = useState('');
  const [newTechDesc, setNewTechDesc] = useState('');
  const [newTechWebsite, setNewTechWebsite] = useState('');
  const [selectedTechObjects, setSelectedTechObjects] = useState<{
    techName: string;
    objects: Array<{ id: string; name: string; kind: string }>;
  } | null>(null);

  // Scan all nodes and model objects to compute assigned-to count
  const allObjects = useMemo(() => {
    const list: Array<{ id: string; name: string; kind: string; technology?: string }> = [];
    const seen = new Set<string>();

    for (const node of nodes) {
      if (!seen.has(node.id)) {
        seen.add(node.id);
        const name = (node.data?.label as string) || node.id;
        const kind = (node.data?.kind as string) || node.type || 'object';
        const technology = (node.data?.technology as string) || '';
        list.push({ id: node.id, name, kind, technology });
      }
    }

    for (const obj of allModelObjects) {
      if (!seen.has(obj.id)) {
        seen.add(obj.id);
        const tech = (obj.metadata?.technology as string) || '';
        list.push({ id: obj.id, name: obj.name, kind: obj.kind, technology: tech });
      }
    }

    return list;
  }, [nodes, allModelObjects]);

  // Map technology name to assigned objects
  const techAssignmentMap = useMemo(() => {
    const map = new Map<string, Array<{ id: string; name: string; kind: string }>>();

    for (const tech of technologies) {
      const q = tech.name.toLowerCase();
      const matching = allObjects.filter((obj) => {
        if (!obj.technology) return false;
        return obj.technology.toLowerCase().includes(q);
      });
      map.set(tech.id, matching);
    }

    return map;
  }, [technologies, allObjects]);

  const filteredTechnologies = useMemo(() => {
    if (!searchQuery.trim()) return technologies;
    const q = searchQuery.toLowerCase();
    return technologies.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.website.toLowerCase().includes(q),
    );
  }, [technologies, searchQuery]);

  const handleCreateTechnology = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTechName.trim()) return;

    const slug = newTechName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const newTech: TechnologyItem = {
      id: slug,
      name: newTechName.trim(),
      description: newTechDesc.trim() || 'Custom technology component',
      website: newTechWebsite.trim() || 'https://example.com',
      access: 'Public',
    };

    setTechnologies((prev) => [newTech, ...prev]);
    setNewTechName('');
    setNewTechDesc('');
    setNewTechWebsite('');
    setIsManageModalOpen(false);
  };

  return (
    <div
      data-testid="model-page-technologies"
      className="flex-1 flex flex-col h-full bg-[#0b0d0f] text-[#e7e9ea] overflow-hidden"
    >
      {/* Header Bar */}
      <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#15181c]/80 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <span>🛠️</span>
              <span>Technologies</span>
            </h1>
            <span
              data-testid="total-technologies-count"
              className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-[#8b9196] border border-white/[0.08]"
            >
              {`Total technologies: ${technologies.length}`}
            </span>
          </div>
          <p className="text-xs text-[#8b9196] mt-0.5">
            Catalog of approved programming languages, frameworks, cloud services, and databases across the architecture model.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              data-testid="technologies-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search technologies..."
              className="w-64 px-3 py-1.5 pl-8 rounded-lg bg-[#121518] border border-white/[0.1] text-xs text-white placeholder-[#8b9196] focus:outline-none focus:border-[#2BB5E8] transition-colors"
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[#8b9196]">
              🔍
            </span>
          </div>

          {/* Manage Technologies Button */}
          <button
            type="button"
            data-testid="manage-technologies-btn"
            onClick={() => setIsManageModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-[#2BB5E8] hover:bg-[#2294bd] text-slate-950 font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-[#2BB5E8]/20 transition-colors"
          >
            <span>+</span>
            <span>Manage technologies</span>
          </button>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="flex-1 overflow-auto p-6">
        <div className="rounded-xl border border-white/[0.08] bg-[#121518]/90 overflow-hidden shadow-2xl">
          <table data-testid="technologies-table" className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] bg-white/[0.02] text-[#8b9196] font-mono uppercase text-[11px] tracking-wider">
                <th className="py-3 px-4 font-semibold w-64">Name</th>
                <th className="py-3 px-4 font-semibold">Description</th>
                <th className="py-3 px-4 font-semibold w-48">Website</th>
                <th className="py-3 px-4 font-semibold w-36 text-center">Assigned to</th>
                <th className="py-3 px-4 font-semibold w-28 text-center">Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredTechnologies.map((tech) => {
                const assigned = techAssignmentMap.get(tech.id) || [];
                const iconPath = getTechnologyIconPath(tech.name);
                const assignedCount = assigned.length;

                return (
                  <tr
                    key={tech.id}
                    data-testid={`tech-row-${tech.id}`}
                    className="hover:bg-white/[0.03] transition-colors group"
                  >
                    {/* Name + Logo */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-white/[0.06] border border-white/[0.1] flex items-center justify-center overflow-hidden shrink-0">
                          {iconPath ? (
                            <img src={iconPath} alt="" className="w-4 h-4 object-contain" />
                          ) : (
                            <span className="text-[10px] font-mono font-bold text-slate-300">
                              {tech.name.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="font-semibold text-white group-hover:text-[#2BB5E8] transition-colors truncate">
                          {tech.name}
                        </div>
                      </div>
                    </td>

                    {/* Description */}
                    <td className="py-3 px-4 text-[#8b9196] leading-relaxed">
                      {tech.description}
                    </td>

                    {/* Website */}
                    <td className="py-3 px-4 truncate font-mono text-[11px]">
                      <a
                        href={tech.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#2BB5E8] hover:underline flex items-center gap-1.5"
                      >
                        <span className="truncate">{tech.website.replace(/^https?:\/\//, '')}</span>
                        <span className="text-[10px]">↗</span>
                      </a>
                    </td>

                    {/* Assigned to count */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          if (assignedCount > 0) {
                            setSelectedTechObjects({ techName: tech.name, objects: assigned });
                          }
                        }}
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all ${
                          assignedCount > 0
                            ? 'bg-blue-500/10 text-sky-300 border border-blue-500/20 hover:bg-blue-500/20 cursor-pointer'
                            : 'text-[#8b9196] bg-white/[0.02] border border-white/[0.04]'
                        }`}
                        title={assignedCount > 0 ? 'Click to inspect assigned objects' : 'No objects assigned'}
                      >
                        {assignedCount} {assignedCount === 1 ? 'object' : 'objects'}
                      </button>
                    </td>

                    {/* Access (Public) */}
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {tech.access || 'Public'}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {filteredTechnologies.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#8b9196]">
                    <div className="text-2xl mb-2">🔍</div>
                    <div className="font-medium text-slate-300">No technologies found</div>
                    <div className="text-xs mt-1">Try searching for a different keyword or create a new technology.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Assigned Objects Drawer */}
      {selectedTechObjects && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#15181c] border border-white/[0.15] rounded-2xl w-full max-w-md shadow-2xl p-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div>
                <h3 className="font-bold text-white text-sm">
                  Objects using {selectedTechObjects.techName}
                </h3>
                <p className="text-xs text-[#8b9196]">
                  {selectedTechObjects.objects.length} architecture object(s) bound to this technology
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTechObjects(null)}
                className="w-6 h-6 rounded-lg text-[#8b9196] hover:text-white hover:bg-white/[0.08] flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <div className="py-3 max-h-60 overflow-y-auto space-y-1.5">
              {selectedTechObjects.objects.map((obj) => (
                <div
                  key={obj.id}
                  onClick={() => {
                    onSelectObject?.(obj.id);
                    setSelectedTechObjects(null);
                  }}
                  className="px-3 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs">📦</span>
                    <span className="font-medium text-xs text-white">{obj.name}</span>
                  </div>
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/[0.06] text-[#8b9196]">
                    {obj.kind}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-white/[0.08] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedTechObjects(null)}
                className="px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-xs text-white font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Manage / Add Technology */}
      {isManageModalOpen && (
        <div
          data-testid="manage-technologies-modal"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-[#15181c] border border-white/[0.15] rounded-2xl w-full max-w-lg shadow-2xl p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div>
                <h3 className="font-bold text-white text-base">Add Approved Technology</h3>
                <p className="text-xs text-[#8b9196]">
                  Register a new technology stack component into the architecture model catalog
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsManageModalOpen(false)}
                className="w-6 h-6 rounded-lg text-[#8b9196] hover:text-white hover:bg-white/[0.08] flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTechnology} className="py-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Technology Name *
                </label>
                <input
                  type="text"
                  required
                  data-testid="new-tech-name-input"
                  placeholder="e.g. Apache Cassandra, Rust, Kubernetes"
                  value={newTechName}
                  onChange={(e) => setNewTechName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#121518] border border-white/[0.12] text-xs text-white placeholder-[#8b9196] focus:outline-none focus:border-[#2BB5E8]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief summary of technology capabilities and architecture role..."
                  value={newTechDesc}
                  onChange={(e) => setNewTechDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#121518] border border-white/[0.12] text-xs text-white placeholder-[#8b9196] focus:outline-none focus:border-[#2BB5E8] resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Documentation / Website URL
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newTechWebsite}
                  onChange={(e) => setNewTechWebsite(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#121518] border border-white/[0.12] text-xs text-white placeholder-[#8b9196] focus:outline-none focus:border-[#2BB5E8]"
                />
              </div>

              <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsManageModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="save-technology-btn"
                  className="px-4 py-2 rounded-lg bg-[#2BB5E8] hover:bg-[#2294bd] text-slate-950 font-bold text-xs shadow-md shadow-[#2BB5E8]/20"
                >
                  Save Technology
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
