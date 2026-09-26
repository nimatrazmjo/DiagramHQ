import Link from 'next/link';

export interface SystemsPageProps {
  params: {
    workspaceId: string;
  };
}

export default function SystemsPage({ params }: SystemsPageProps): JSX.Element {
  const { workspaceId } = params;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="border-b border-slate-800 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href={`/workspace/${workspaceId}`} className="hover:text-slate-200">
              Workspace
            </Link>
            <span>/</span>
            <span className="text-slate-200 font-medium">Systems</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Systems</h1>
          <p className="text-sm text-slate-400 mt-1">
            Systems — High-level boundary systems in this architecture
          </p>
        </div>

        <button
          type="button"
          disabled
          className="px-3.5 py-2 text-xs font-semibold rounded-md bg-blue-600/30 text-blue-300 border border-blue-500/30 cursor-not-allowed inline-flex items-center gap-2 self-start sm:self-auto"
        >
          <span>+ Define System</span>
          <span className="text-[10px] px-1 py-0.2 rounded bg-blue-500/20 text-blue-300 font-mono">
            Model
          </span>
        </button>
      </div>

      <div className="p-12 rounded-lg border border-dashed border-slate-800 bg-slate-950/40 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center mx-auto text-xl">
          🏛️
        </div>
        <h3 className="text-base font-semibold text-slate-200">
          No systems defined yet
        </h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
          High-level boundary systems partition major functional domains (e.g. Core Banking, Payments Gateway, Identity Provider).
        </p>
      </div>
    </div>
  );
}
