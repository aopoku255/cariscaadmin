import type { SessionUser } from '@/lib/api/types';

/**
 * Pure permission helpers, usable from both server and client components.
 *
 * Deliberately separate from require-staff.ts, which is server-only: importing
 * a "server-only" module from a client component fails the build, and these
 * are needed in both places.
 *
 * None of this is a security boundary. It decides what to render; the API
 * refuses every action independently.
 */
export function can(user: SessionUser | null, permission: string): boolean {
  return !!user?.permissions?.includes(permission);
}

export function canAny(user: SessionUser | null, ...permissions: string[]): boolean {
  return permissions.some((p) => can(user, p));
}

export interface NavItem { href: string; label: string; permission?: string }

export const ADMIN_NAV: NavItem[] = [
  { href: '/', label: 'Overview' },
  { href: '/cpd', label: 'CPD events', permission: 'cpd.view' },
  { href: '/registrations', label: 'Registrations', permission: 'cpd.registration.view' },
  { href: '/partners', label: 'Partners', permission: 'partners.view' },
  { href: '/users', label: 'Users', permission: 'users.view' },
  { href: '/audit', label: 'Audit log', permission: 'audit.view' },
];

/**
 * Menu entries filtered to what the user can actually reach. Showing a link
 * that 403s is worse than hiding it — staff learn to distrust the navigation.
 */
export function visibleNav(user: SessionUser | null): NavItem[] {
  return ADMIN_NAV.filter((item) => !item.permission || can(user, item.permission));
}
