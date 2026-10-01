'use client';

import { useState, useTransition } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const DEMO_ACCOUNTS = [
  {
    role: 'Admin / Owner',
    email: 'admin@diagramhq.com',
    password: 'adminpassword',
    description: 'Full superuser access to all organizations, workspaces, and architectures',
    badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  },
  {
    role: 'Lead Architect',
    email: 'lead@diagramhq.com',
    password: 'leadpassword',
    description: 'Admin role with workspace creation and member management',
    badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  },
  {
    role: 'Architect',
    email: 'architect@diagramhq.com',
    password: 'strongpassword',
    description: 'Editor role with full diagram editing and version control',
    badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  },
  {
    role: 'Developer',
    email: 'developer@diagramhq.com',
    password: 'password123',
    description: 'Standard team member with diagram viewing and commenting',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  },
];

export function LoginForm(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSignIn = (targetEmail: string, targetPass: string) => {
    setError(null);
    startTransition(async () => {
      try {
        let cleanEmail = targetEmail.trim();
        if (cleanEmail.toLowerCase() === 'admin') {
          cleanEmail = 'admin@diagramhq.com';
        }

        const res = await signIn('credentials', {
          email: cleanEmail,
          password: targetPass.trim(),
          redirect: false,
        });

        if (res?.error) {
          setError('Invalid credentials. Tip: Click "1-Click Admin Sign In" below.');
        } else {
          router.push(callbackUrl);
          router.refresh();
        }
      } catch {
        // Fallback redirection if signIn triggers redirect exception
        window.location.href = callbackUrl;
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    handleSignIn(email, password);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-md">
      {/* 1-Click Superuser Admin Login Banner */}
      <button
        type="button"
        disabled={isPending}
        onClick={() => handleSignIn('admin@diagramhq.com', 'adminpassword')}
        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2.5 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
      >
        <span className="text-base">⚡</span>
        <span>{isPending ? 'Signing in as Admin...' : '1-Click Sign In as Admin (Full Access)'}</span>
      </button>

      <div className="relative flex items-center justify-center">
        <div className="border-t border-slate-700/80 w-full" />
        <span className="bg-slate-900 px-3 text-xs text-slate-400 uppercase tracking-wider font-mono absolute">
          Or Enter Credentials
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full" noValidate={false}>
        {error && (
          <div role="alert" className="p-3 text-xs text-rose-300 bg-rose-950/50 rounded-xl border border-rose-800">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-xs font-medium text-slate-300">
            Email or Username
          </label>
          <input
            id="email"
            name="email"
            type="text"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@diagramhq.com or admin"
            className="px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 shadow-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-xs font-medium text-slate-300">
              Password
            </label>
            <span className="text-[11px] text-slate-500 font-mono">adminpassword</span>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 shadow-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm rounded-xl shadow-md shadow-blue-600/30 transition-all disabled:opacity-50"
        >
          {isPending ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      {/* Quick Role Fillers */}
      <div className="space-y-2 pt-2 border-t border-slate-800/80">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
          Demo Accounts (Click to Fill & Sign In):
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.email}
              type="button"
              onClick={() => {
                setEmail(acc.email);
                setPassword(acc.password);
                handleSignIn(acc.email, acc.password);
              }}
              className="text-left p-2.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 hover:border-slate-700 transition-all group"
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-xs font-semibold text-slate-200 group-hover:text-white">
                  {acc.role}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${acc.badgeClass}`}>
                  Fill
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 truncate">{acc.email}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Guest Mode Studio bypass */}
      <div className="text-center pt-2">
        <Link
          href="/studio"
          className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          <span>Draw diagrams without sign-in?</span>
          <span className="font-semibold underline">Open Phase 0 Studio →</span>
        </Link>
      </div>
    </div>
  );
}
