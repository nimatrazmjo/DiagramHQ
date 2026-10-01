import { Suspense } from 'react';
import { LoginForm } from './login-form';
import Link from 'next/link';

export const metadata = {
  title: 'Sign In — DiagramHQ',
  description: 'Sign in to access your DiagramHQ architectures and workspaces',
};

export default function LoginPage(): JSX.Element {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-slate-100">
      <div className="w-full max-w-lg bg-slate-900/90 border border-slate-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2 mb-4 hover:opacity-90 transition-opacity">
          <span className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-mono text-base font-bold shadow-md shadow-blue-500/30 text-white">
            ⬡
          </span>
          <span className="text-xl font-bold text-white tracking-tight">DiagramHQ</span>
        </Link>

        <h1 className="text-2xl font-bold text-white mb-1.5 text-center">Welcome Back</h1>
        <p className="text-xs text-slate-400 mb-6 text-center max-w-sm">
          Sign in as Admin to access, track, and manage all your organizations, workspaces, and architectures.
        </p>

        <Suspense fallback={<div className="text-xs text-slate-400 py-6">Loading sign-in form...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
