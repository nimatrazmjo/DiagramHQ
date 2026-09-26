import Link from 'next/link';

export interface WorkspaceOverviewPageProps {
  params: {
    workspaceId: string;
  };
}

export default function WorkspaceOverviewPage({
  params,
}: WorkspaceOverviewPageProps): JSX.Element {
  const { workspaceId } = params;

  const stats = [
    {
      label: 'Objects',
      count: '0',
      description: 'Systems, Apps, and Data stores',
      href: `/workspace/${workspaceId}/systems`,
    },
    {
      label: 'Views',
      count: '0',
      description: 'C4 and custom projections',
      href: `/workspace/${workspaceId}/views`,
    },
    {
      label: 'Connections',
      count: '0',
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
            Workspace ID: <code className="text-slate-300 font-mono text-xs">{workspaceId}</code>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="px-3.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </header>

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

      {/* Open Canvas Callout */}
      <section
        aria-labelledby="canvas-callout-heading"
        className="p-6 rounded-lg bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/40 border border-blue-900/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
      >
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <h3 id="canvas-callout-heading" className="text-base font-semibold text-white">
              Infinite Canvas — Visual Architecture Modeler
            </h3>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            Interactive, zoomable infinite canvas with high-performance WebGL / SVG node graph rendering, drag-and-drop model positioning, and bidirectional live synchronization is coming in Phase 02 (F009 / F010).
          </p>
        </div>
        <div className="flex-shrink-0">
          <button
            type="button"
            disabled
            className="px-4 py-2 text-xs font-semibold rounded-md bg-blue-600/30 text-blue-300 border border-blue-500/40 cursor-not-allowed inline-flex items-center gap-2 shadow-sm"
            title="Scheduled for Phase 02"
          >
            <span>Open Canvas (Phase 02)</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">
              Coming Soon
            </span>
          </button>
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
