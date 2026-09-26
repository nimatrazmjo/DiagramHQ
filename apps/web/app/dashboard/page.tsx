import { auth, signOut } from '@/auth';
import Link from 'next/link';
import { CreateOrgForm } from './create-org-form';
import { fetchUserOrganizations } from './actions';
import { fetchOrgWorkspaces } from './workspace-actions';
import { WorkspaceList } from './workspace-list';
import { CreateWorkspaceForm } from './create-workspace-form';

export const metadata = {
  title: 'Dashboard — DiagramHQ',
};

export default async function DashboardPage(): Promise<JSX.Element> {
  const session = await auth();
  const organizations = await fetchUserOrganizations();

  const orgsWithWorkspaces = await Promise.all(
    organizations.map(async (org) => {
      const workspaces = await fetchOrgWorkspaces(org.id);
      return {
        ...org,
        workspaces,
      };
    }),
  );

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow space-y-8">
        <div className="flex justify-between items-center border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Architecture OS</h1>
            <p className="text-sm text-gray-500">Multi-tenant architecture intelligence platform</p>
          </div>
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/login' });
            }}
          >
            <button
              type="submit"
              className="py-1.5 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded font-medium text-sm transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded p-4">
          <h2 className="text-sm font-semibold text-blue-900 mb-1">Authenticated Session</h2>
          <p className="text-sm text-blue-800">
            Signed in as <strong>{session?.user?.name || session?.user?.email}</strong>
          </p>
          <p className="text-xs text-blue-600 mt-1">User ID: {session?.user?.id}</p>
        </div>

        <section aria-labelledby="organizations-heading" className="border-t pt-6">
          <h2 id="organizations-heading" className="text-xl font-bold text-gray-900 mb-4">
            Your Organizations
          </h2>

          {orgsWithWorkspaces.length === 0 ? (
            <div className="p-4 bg-gray-50 rounded border border-gray-200 text-sm text-gray-600 mb-6">
              You are not a member of any organization yet. Create one below to get started.
            </div>
          ) : (
            <div className="space-y-6 mb-6">
              {orgsWithWorkspaces.map((org) => (
                <div
                  key={org.id}
                  className="p-5 border rounded-lg bg-gray-50 shadow-sm space-y-4"
                >
                  <div className="flex items-center justify-between border-b pb-3">
                    <div>
                      <h3 className="font-bold text-base text-gray-900">{org.name}</h3>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                        <span>slug: <code className="text-gray-700">{org.slug}</code></span>
                        <span>ID: <code className="text-gray-400">{org.id}</code></span>
                      </div>
                    </div>
                    <span className="text-xs font-medium px-2.5 py-1 rounded bg-blue-100 text-blue-800 uppercase tracking-wide">
                      {org.role}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                      Workspaces
                    </h4>
                    <WorkspaceList workspaces={org.workspaces} />
                  </div>

                  <details className="pt-2 border-t border-gray-200">
                    <summary className="cursor-pointer text-xs font-medium text-blue-600 hover:text-blue-800 select-none">
                      + Create Workspace
                    </summary>
                    <div className="mt-3 p-3 bg-white border rounded">
                      <CreateWorkspaceForm orgId={org.id} />
                    </div>
                  </details>
                </div>
              ))}
            </div>
          )}

          <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Create New Organization</h3>
            <CreateOrgForm />
          </div>
        </section>

        <div className="border-t pt-4">
          <Link href="/" className="text-blue-600 hover:underline text-sm">
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
