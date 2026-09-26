import type { WorkspaceItem } from './workspace-actions';

export interface WorkspaceListProps {
  workspaces: WorkspaceItem[];
}

export function WorkspaceList({ workspaces }: WorkspaceListProps): JSX.Element {
  if (!workspaces || workspaces.length === 0) {
    return (
      <div className="p-3 bg-gray-50 rounded border border-dashed border-gray-300 text-xs text-gray-500">
        No workspaces in this organization yet.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {workspaces.map((ws) => (
        <li
          key={ws.id}
          className="p-3 border rounded bg-white hover:bg-gray-50 transition-colors shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm text-gray-900">{ws.name}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 font-medium">
              {ws._count?.architectures ?? 0} {(ws._count?.architectures ?? 0) === 1 ? 'architecture' : 'architectures'}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
            <span>
              slug: <code className="text-gray-700">{ws.slug}</code>
            </span>
            <span>
              ID: <code className="text-gray-400">{ws.id}</code>
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default WorkspaceList;
