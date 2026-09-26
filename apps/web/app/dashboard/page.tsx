import { auth, signOut } from '@/auth';
import Link from 'next/link';

export const metadata = {
  title: 'Dashboard — DiagramHQ',
};

export default async function DashboardPage(): Promise<JSX.Element> {
  const session = await auth();

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center border-b pb-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Architecture Workspace</h1>
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

        <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-1">Authenticated Session</h2>
          <p className="text-sm text-blue-800">
            Welcome, <strong>{session?.user?.name || session?.user?.email}</strong>!
          </p>
          <p className="text-xs text-blue-600 mt-1">User ID: {session?.user?.id}</p>
          <p className="text-xs text-blue-600">Email: {session?.user?.email}</p>
        </div>

        <div>
          <Link href="/" className="text-blue-600 hover:underline text-sm">
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
