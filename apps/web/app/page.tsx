import Link from 'next/link';
import { auth } from '@/auth';

export default async function HomePage(): Promise<JSX.Element> {
  const session = await auth();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50">
      <div className="max-w-xl text-center bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-3">DiagramHQ</h1>
        <p className="text-gray-600 mb-6">
          Model-first architecture intelligence. The foundation is live; the infinite canvas
          arrives in Phase 02.
        </p>

        <div className="flex gap-4 justify-center">
          {session ? (
            <Link
              href="/dashboard"
              className="py-2 px-5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded shadow transition-colors"
            >
              Go to Workspace
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="py-2 px-5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded shadow transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/dashboard"
                className="py-2 px-5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded border transition-colors"
              >
                Protected Dashboard
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
