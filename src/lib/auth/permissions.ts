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

/**
 * `icon` names one of the glyphs in components/ui/icons.tsx. It lives here as
 * a plain string rather than a component so this module stays free of JSX —
 * it is imported by server code that never renders.
 */
export interface NavItem { href: string; label: string; permission?: string; icon: IconKey }

export type IconKey =
  | 'overview' | 'calendar' | 'clipboard' | 'handshake' | 'shield' | 'users' | 'history';

export const ADMIN_NAV: NavItem[] = [
  { href: '/', label: 'Overview', icon: 'overview' },
  { href: '/cpd', label: 'CPD events', permission: 'cpd.view', icon: 'calendar' },
  { href: '/summit', label: 'Summit events', permission: 'summit.view', icon: 'calendar' },
  { href: '/registrations', label: 'Registrations', permission: 'registration.view', icon: 'clipboard' },
  { href: '/partners', label: 'Partners', permission: 'partners.view', icon: 'handshake' },
  // Staff and participants are different audiences with different fields and
  // different volume (a handful of staff against however many people have
  // registered), so they get separate lists rather than one filtered by kind.
  { href: '/users', label: 'Staff', permission: 'users.view', icon: 'shield' },
  { href: '/participants', label: 'Participants', permission: 'users.view', icon: 'users' },
  { href: '/audit', label: 'Audit log', permission: 'audit.view', icon: 'history' },
];

/**
 * Menu entries filtered to what the user can actually reach. Showing a link
 * that 403s is worse than hiding it — staff learn to distrust the navigation.
 */
export function visibleNav(user: SessionUser | null): NavItem[] {
  return ADMIN_NAV.filter((item) => !item.permission || can(user, item.permission));
}
