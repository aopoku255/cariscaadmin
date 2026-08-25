import { requireStaff, visibleNav } from '@/lib/auth/require-staff';
import { logoutAction } from '@/lib/auth/actions';
import { Icon } from '@/components/ui/icons';
import { ConsoleShell } from './ConsoleShell';
import styles from './admin.module.css';

export const dynamic = 'force-dynamic';

/** "Ama Serwaa Boateng" → "AB". Falls back to one letter, or none. */
function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '';
  return (first + last).toUpperCase();
}

/**
 * The console shell.
 *
 * Guards everything beneath it: anyone who is not signed-in staff is sent
 * away before a page renders. This is convenience, not security — the API
 * refuses every action independently on its own permission check.
 *
 * The chrome itself lives in ConsoleShell, a client component, because the
 * sidebar collapses and that state belongs in the browser. Everything the
 * shell needs about the viewer is resolved here and handed down, so the
 * client half never fetches or re-derives it.
 */
export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  const nav = visibleNav(user);

  const signOut = (
    <form action={logoutAction}>
      <button type="submit" className={styles.signOut} title="Sign out">
        <Icon name="logout" size={16} />
        <span className={styles.navLabel}>Sign out</span>
      </button>
    </form>
  );

  return (
    <ConsoleShell
      nav={nav}
      user={{
        fullName: user.fullName,
        initials: initialsOf(user.fullName || user.email || ''),
        roles: user.roles?.map((r) => r.name).join(', ') || 'Staff',
      }}
      siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}
      signOut={signOut}
    >
      {children}
    </ConsoleShell>
  );
}
