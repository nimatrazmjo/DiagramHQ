import { auth, signOut } from '@/auth';
import Link from 'next/link';
import { CreateOrgForm } from './create-org-form';
import { fetchUserOrganizations } from './actions';

export const metadata = {
  title: 'Dashboard — DiagramHQ',
};

export default async function DashboardPage(): Promise<JSX.Element> {
  const session = await auth();
  const organizations = await fetchUserOrganizations();

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

          {organizations.length === 0 ? (
            <div className="p-4 bg-gray-50 rounded border border-gray-200 text-sm text-gray-600 mb-6">
              You are not a member of any organization yet. Create one below to get started.
            </div>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {organizations.map((org) => (
                <li
                  key={org.id}
                  className="p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900">{org.name}</span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-100 text-blue-800 uppercase">
                      {org.role}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">slug: {org.slug}</p>
                  <p className="text-xs text-gray-400 mt-0.5">ID: {org.id}</p>
                </li>
              ))}
            </ul>
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
