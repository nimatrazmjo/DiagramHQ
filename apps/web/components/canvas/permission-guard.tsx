'use client';

import React from 'react';
import type { MemberRole, PermissionAction, PermissionContext } from '@diagramhq/domain';
import { canPerform } from '@diagramhq/domain';

export interface RoleBadgeProps {
  role: MemberRole;
  size?: 'sm' | 'md';
  className?: string;
}

const ROLE_LABELS: Record<MemberRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer',
  guest: 'Guest',
};

const ROLE_CLASSES: Record<MemberRole, string> = {
  owner: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  admin: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40',
  editor: 'bg-blue-500/15 text-blue-300 border-blue-500/40',
  viewer: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  guest: 'bg-slate-500/15 text-slate-300 border-slate-500/40',
};

export function RoleBadge({
  role,
  size = 'md',
  className = '',
}: RoleBadgeProps): JSX.Element {
  const label = ROLE_LABELS[role] ?? role;
  const colorClass = ROLE_CLASSES[role] ?? 'bg-slate-500/15 text-slate-300 border-slate-500/40';
  const sizeClass = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs';

  return (
    <span
      data-testid="role-badge"
      data-role={role}
      className={`inline-flex items-center gap-1 font-medium border rounded-full ${colorClass} ${sizeClass} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      <span>{label}</span>
    </span>
  );
}

export interface PermissionGuardProps {
  context: PermissionContext;
  action: PermissionAction;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGuard({
  context,
  action,
  children,
  fallback = null,
}: PermissionGuardProps): JSX.Element | null {
  const allowed = canPerform(context, action);

  if (!allowed) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}
