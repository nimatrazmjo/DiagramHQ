import React from 'react';
import Link from 'next/link';
import { projectViewModelToCanvas } from '@diagramhq/domain';
import { InfiniteCanvas } from '../../../components/canvas';

export interface WorkspaceOverviewPageProps {
  params: {
    workspaceId: string;
  };
}

export default function WorkspaceOverviewPage({
  params,
}: WorkspaceOverviewPageProps): JSX.Element {
  const { workspaceId } = params;

  const sampleObjects = [
    {
      id: 'sys-payment',
      name: 'Payment Gateway System',
      kind: 'system',
      description: 'High-level payment processing and settlement boundary',
    },
    {
      id: 'app-auth',
      name: 'Auth Service App',
      kind: 'application',
      description: 'Authentication, token verification, and sessions',
    },
    {
      id: 'store-pg',
      name: 'Postgres Database Store',
      kind: 'store',
      description: 'Relational database for transactions and accounts',
    },
  ];

  const sampleConnections = [
    {
      id: 'conn-auth-payment',
      sourceId: 'app-auth',
      targetId: 'sys-payment',
      kind: 'sync',
      description: 'Verify token before checkout',
    },
    {
      id: 'conn-auth-store',
      sourceId: 'app-auth',
      targetId: 'store-pg',
      kind: 'data',
      description: 'Persist user sessions and credentials',
    },
  ];

  const sampleViewObjects = [
    { objectId: 'sys-payment', x: 80, y: 100 },
    { objectId: 'app-auth', x: 420, y: 100 },
    { objectId: 'store-pg', x: 420, y: 300 },
  ];

  const { nodes: sampleNodes, edges: sampleEdges } = projectViewModelToCanvas({
    objects: sampleObjects,
    connections: sampleConnections,
    viewObjects: sampleViewObjects,
  });

  const stats = [
    {
      label: 'Objects',
      count: '3',
      description: 'Systems, Apps, and Data stores',
      href: `/workspace/${workspaceId}/systems`,
    },
    {
      label: 'Views',
      count: '1',
      description: 'C4 and custom projections',
      href: `/workspace/${workspaceId}/views`,
    },
    {
      label: 'Connections',
      count: '2',
      description: 'Dependencies and data flow relations',
      href: `/workspace/${workspaceId}/flows`,
    },
    {
      label: 'Flows',
      count: '0',
      description: 'End-to-end trace message sequences',
      href: `/workspace/${workspaceId}/flows`,
    },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Workspace Header */}
      <header className="border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">Workspace Overview</h1>
            <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Active Studio
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Architecture model and diagram projections
          </p>
          <details className="mt-1 text-xs text-slate-500" data-testid="dev-workspace-details">
            <summary className="cursor-pointer hover:text-slate-400 select-none">
              Developer info
            </summary>
            <p className="mt-1 font-mono text-[11px] text-slate-400">{`Workspace ID: ${workspaceId}`}</p>
          </details>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/studio"
            className="px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-md transition-colors"
          >
            Open Studio
          </Link>
          <Link
            href="/dashboard"
            className="px-3.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Live Interactive Infinite Canvas */}
      <section aria-labelledby="live-canvas-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h2 id="live-canvas-heading" className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Interactive Canvas
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            React Flow Renderer · Pure Model Projection
          </span>
        </div>

        <div className="h-[480px] w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950/80 shadow-2xl relative">
          <InfiniteCanvas initialNodes={sampleNodes} initialEdges={sampleEdges} />
        </div>
      </section>

      {/* Quick Statistics */}
      <section aria-labelledby="quick-stats-heading" className="space-y-3">
        <h2 id="quick-stats-heading" className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Quick Statistics
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="p-5 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors group"
            >
              <div className="text-xs font-medium text-slate-400 group-hover:text-blue-400 transition-colors">
                {stat.label}
              </div>
              <div className="text-3xl font-bold text-white mt-1">{stat.count}</div>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">{stat.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Navigation Shortcuts */}
      <section className="space-y-3 pt-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Model Sections
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href={`/workspace/${workspaceId}/systems`}
            className="p-4 rounded-lg bg-slate-950/40 border border-slate-800/80 hover:border-slate-700 transition-colors"
          >
            <h4 className="text-sm font-semibold text-slate-200">Systems</h4>
            <p className="text-xs text-slate-400 mt-1">
              High-level boundary systems in this architecture.
            </p>
          </Link>
          <Link
            href={`/workspace/${workspaceId}/apps`}
            className="p-4 rounded-lg bg-slate-950/40 border border-slate-800/80 hover:border-slate-700 transition-colors"
          >
            <h4 className="text-sm font-semibold text-slate-200">Applications</h4>
            <p className="text-xs text-slate-400 mt-1">
              Services, frontends, and backend workers.
            </p>
          </Link>
          <Link
            href={`/workspace/${workspaceId}/data`}
            className="p-4 rounded-lg bg-slate-950/40 border border-slate-800/80 hover:border-slate-700 transition-colors"
          >
            <h4 className="text-sm font-semibold text-slate-200">Data Stores</h4>
            <p className="text-xs text-slate-400 mt-1">
              Databases, message queues, and object storage.
            </p>
          </Link>
          <Link
            href={`/workspace/${workspaceId}/flows`}
            className="p-4 rounded-lg bg-slate-950/40 border border-slate-800/80 hover:border-slate-700 transition-colors"
          >
            <h4 className="text-sm font-semibold text-slate-200">Flows</h4>
            <p className="text-xs text-slate-400 mt-1">
              End-to-end trace and message sequence flows.
            </p>
          </Link>
          <Link
            href={`/workspace/${workspaceId}/views`}
            className="p-4 rounded-lg bg-slate-950/40 border border-slate-800/80 hover:border-slate-700 transition-colors"
          >
            <h4 className="text-sm font-semibold text-slate-200">Views</h4>
            <p className="text-xs text-slate-400 mt-1">
              Context, Container, Component, and Custom projections.
            </p>
          </Link>
          <Link
            href={`/workspace/${workspaceId}/decisions`}
            className="p-4 rounded-lg bg-slate-950/40 border border-slate-800/80 hover:border-slate-700 transition-colors"
          >
            <h4 className="text-sm font-semibold text-slate-200">Decisions</h4>
            <p className="text-xs text-slate-400 mt-1">
              Architecture Decision Records (ADRs).
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
