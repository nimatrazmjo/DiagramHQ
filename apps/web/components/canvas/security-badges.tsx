import React from 'react';

export interface SecurityBadgesProps {
  securityView?: boolean;
  publicEndpoint?: boolean;
  requiresAuth?: boolean;
  hasSecrets?: boolean;
  encryption?: string;
  compliance?: string[];
}

export function SecurityBadges(props: SecurityBadgesProps): JSX.Element | null {
  if (!props.securityView) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-1.5 border-t border-rose-900/50" data-testid="security-badges">
      {Boolean(props.publicEndpoint) && (
        <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-900" data-testid="badge-public-endpoint">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/><path d="M3.6 9h16.8"/><path d="M3.6 15h16.8"/><path d="M12 3v18"/></svg>
          Public Endpoint
        </span>
      )}
      {Boolean(props.requiresAuth) && (
        <span className="flex items-center gap-1 text-[10px] font-medium text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-900" data-testid="badge-auth">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          Auth
        </span>
      )}
      {Boolean(props.hasSecrets) && (
        <span className="flex items-center gap-1 text-[10px] font-medium text-fuchsia-400 bg-fuchsia-950/60 px-1.5 py-0.5 rounded border border-fuchsia-900" data-testid="badge-secrets">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
          Secrets
        </span>
      )}
      {typeof props.encryption === 'string' && (
        <span className="flex items-center gap-1 text-[10px] font-medium text-indigo-400 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-900" data-testid="badge-encryption">
          Enc: {props.encryption}
        </span>
      )}
      {Array.isArray(props.compliance) && props.compliance.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {props.compliance.map((c: string) => (
            <span key={c} className="text-[9px] font-mono text-emerald-400 bg-emerald-950/60 px-1 py-0.5 rounded border border-emerald-900" data-testid={`badge-compliance-${c.toLowerCase()}`}>
              {c.toUpperCase()}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
