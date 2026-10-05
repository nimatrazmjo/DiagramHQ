import Link from 'next/link';
import { auth } from '@/auth';

export default async function HomePage(): Promise<JSX.Element> {
  const session = await auth();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50">
      <div className="max-w-xl text-center bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-3">DiagramHQ</h1>
        <p className="text-gray-600 mb-6">
          Model-first architecture intelligence. Build, visualize, and evolve system architectures
          with an interactive infinite canvas, C4 modeling, and multi-view projections.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/studio"
            className="py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <span>🎨</span>
            <span>Open DiagramHQ Studio</span>
          </Link>
          {session ? (
            <Link
              href="/dashboard"
              className="py-2.5 px-5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg shadow transition-colors flex items-center justify-center"
            >
              Go to Workspace
            </Link>
          ) : (
            <Link
              href="/login"
              className="py-2.5 px-5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-lg border transition-colors flex items-center justify-center"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
