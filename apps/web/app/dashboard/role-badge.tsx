import React from 'react';

export interface RoleBadgeProps {
  role: string;
  className?: string;
}

export function canRoleWrite(role?: string | null): boolean {
  if (!role) {
    return false;
  }
  return ['owner', 'admin', 'editor'].includes(role.toLowerCase());
}

const ROLE_STYLES: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-800 border-purple-200',
  admin: 'bg-blue-100 text-blue-800 border-blue-200',
  editor: 'bg-green-100 text-green-800 border-green-200',
  viewer: 'bg-gray-100 text-gray-700 border-gray-200',
};

export function RoleBadge({ role, className = '' }: RoleBadgeProps): JSX.Element {
  const normalized = (role || '').toLowerCase();
  const colorClasses = ROLE_STYLES[normalized] || 'bg-gray-100 text-gray-700 border-gray-200';

  return (
    <span
      className={`inline-block text-xs font-medium px-2.5 py-1 rounded border uppercase tracking-wide ${colorClasses} ${className}`.trim()}
    >
      {role}
    </span>
  );
}

export default RoleBadge;
