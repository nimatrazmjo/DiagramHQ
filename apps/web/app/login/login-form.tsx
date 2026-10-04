'use client';

import React, { useState, useTransition } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { SsoSettingsModal } from '@/components/enterprise/sso-settings-modal';

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

const SSO_DEMO_ACCOUNTS = [
  {
    provider: 'Acme Enterprise Okta',
    role: 'Lead Architect',
    email: 'alex@acme-enterprise.com',
    badgeClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
  },
  {
    provider: 'Stark Industries Entra ID',
    role: 'Admin / Lead',
    email: 'tony@stark-industries.com',
    badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  },
];

export function LoginForm(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  const [authMode, setAuthMode] = useState<'credentials' | 'sso'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ssoEmail, setSsoEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSsoModalOpen, setIsSsoModalOpen] = useState(false);

  // Detect domain for SSO auto-routing display
  const getDetectedIdp = (addr: string) => {
    const domain = addr.split('@')[1]?.toLowerCase().trim();
    if (!domain) return null;
    if (domain.includes('acme')) return { name: 'Acme Enterprise Okta', type: 'OIDC' };
    if (domain.includes('stark')) return { name: 'Stark Industries Entra ID', type: 'OIDC' };
    if (domain.includes('strictcorp')) return { name: 'Strict Corp IdP (SSO Enforced)', type: 'OIDC' };
    return { name: 'Corporate IdP (Test IdP)', type: 'OIDC' };
  };

  const detectedIdp = getDetectedIdp(ssoEmail);

  const handleSignIn = (targetEmail: string, targetPass: string, isSso = false, isSaml = false) => {
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
          isSso: isSso ? 'true' : 'false',
          isSaml: isSaml ? 'true' : 'false',
          redirect: false,
        });

        if (res?.error) {
          if (cleanEmail.includes('strictcorp') && !isSso) {
            setError('SSO is strictly enforced for your organization domain. Please sign in via Enterprise SSO.');
          } else {
            setError('Invalid credentials. Tip: Click "1-Click Admin Sign In" or "Test IdP SSO" below.');
          }
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

  const handleCredentialsSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    handleSignIn(email, password, false);
  };

  const handleSsoSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!ssoEmail.includes('@')) {
      setError('Please enter a valid corporate email address.');
      return;
    }
    handleSignIn(ssoEmail, 'sso-login', true);
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

      {/* Auth Mode Tabs: Credentials vs Enterprise SSO */}
      <div className="flex p-1 bg-slate-900/90 border border-slate-800 rounded-xl">
        <button
          type="button"
          onClick={() => {
            setAuthMode('credentials');
            setError(null);
          }}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            authMode === 'credentials'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Password
        </button>
        <button
          type="button"
          onClick={() => {
            setAuthMode('sso');
            setError(null);
          }}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            authMode === 'sso'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Enterprise SSO</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_#34d399]" />
        </button>
      </div>

      {error && (
        <div role="alert" className="p-3 text-xs text-rose-300 bg-rose-950/50 rounded-xl border border-rose-800">
          {error}
        </div>
      )}

      {/* Credentials Tab */}
      {authMode === 'credentials' && (
        <form onSubmit={handleCredentialsSubmit} className="flex flex-col gap-4 w-full" noValidate={false}>
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
      )}

      {/* Enterprise SSO Tab */}
      {authMode === 'sso' && (
        <form onSubmit={handleSsoSubmit} className="flex flex-col gap-4 w-full">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="sso-email" className="text-xs font-medium text-slate-300">
              Work / Corporate Email
            </label>
            <input
              id="sso-email"
              name="ssoEmail"
              type="email"
              required
              value={ssoEmail}
              onChange={(e) => setSsoEmail(e.target.value)}
              placeholder="alex@acme-enterprise.com"
              className="px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 shadow-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>

          {detectedIdp && (
            <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-slate-300">Target IdP:</span>
                <span className="font-semibold text-indigo-300">{detectedIdp.name}</span>
              </div>
              <span className="font-mono text-[10px] text-slate-400">{detectedIdp.type}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span>{isPending ? 'Connecting to IdP...' : 'Continue with Single Sign-On'}</span>
            <span>→</span>
          </button>

          {/* 1-Click Test IdP Button */}
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleSignIn('alex@acme-enterprise.com', 'sso-login', true)}
            className="w-full py-2 px-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs text-indigo-300 font-semibold flex items-center justify-center gap-2 transition-all"
          >
            <span>⚡ 1-Click Sign In with Test IdP (OIDC)</span>
          </button>

          {/* 1-Click SAML 2.0 IdP Button */}
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              setSsoEmail('architect@acme-enterprise.com');
              handleSignIn('architect@acme-enterprise.com', 'saml-login', false, true);
            }}
            className="w-full py-2 px-3 bg-slate-800/80 hover:bg-slate-800 border border-purple-500/30 rounded-xl text-xs text-purple-300 font-semibold flex items-center justify-center gap-2 transition-all"
          >
            <span>⚡ 1-Click Sign In with SAML 2.0 (Acme IdP)</span>
          </button>

          {/* Quick SSO Accounts */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">
              Sample Enterprise SSO Profiles:
            </span>
            <div className="grid grid-cols-1 gap-2">
              {SSO_DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => {
                    setSsoEmail(acc.email);
                    handleSignIn(acc.email, 'sso-login', true);
                  }}
                  className="text-left p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/80 transition-all flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-slate-200 block truncate">{acc.provider}</span>
                    <span className="text-[11px] text-slate-400 font-mono truncate block">{acc.email}</span>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono shrink-0 ${acc.badgeClass}`}>
                    {acc.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </form>
      )}

      {/* Quick Role Fillers (For Password Tab) */}
      {authMode === 'credentials' && (
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
      )}

      {/* Enterprise SSO Settings Launcher & Guest Mode */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
        <button
          type="button"
          onClick={() => setIsSsoModalOpen(true)}
          className="text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
        >
          <span>⚙ Enterprise SSO Settings</span>
        </button>

        <Link
          href="/studio"
          className="text-blue-400 hover:text-blue-300 transition-colors underline"
        >
          Open Studio →
        </Link>
      </div>

      {/* SSO Settings Modal */}
      <SsoSettingsModal
        isOpen={isSsoModalOpen}
        onClose={() => setIsSsoModalOpen(false)}
      />
    </div>
  );
}
