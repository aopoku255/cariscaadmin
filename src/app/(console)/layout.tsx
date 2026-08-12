import Link from 'next/link';
import { requireStaff, visibleNav } from '@/lib/auth/require-staff';
import { logoutAction } from '@/lib/auth/actions';
import { AdminNav } from './AdminNav';
import styles from './admin.module.css';

export const dynamic = 'force-dynamic';

/**
 * The console shell.
 *
 * Guards everything beneath it: anyone who is not signed-in staff is sent
 * away before a page renders. This is convenience, not security — the API
 * refuses every action independently on its own permission check.
 */
export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  const nav = visibleNav(user);

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHead}>
          <Link href="/" className={styles.brand}>
            <span className={styles.brandMark}>CARISCA</span>
            <span className={styles.brandSub}>Administration</span>
          </Link>
        </div>

        <AdminNav items={nav} />

        <div className={styles.sidebarFoot}>
          <p className={styles.who}>{user.fullName}</p>
          <p className={styles.role}>
            {user.roles?.map((r) => r.name).join(', ') || 'Staff'}
          </p>
          <div className={styles.footLinks}>
            <a
              href={process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}
              target="_blank"
              rel="noreferrer"
            >
              View the public site
            </a>
            <form action={logoutAction}>
              <button type="submit" className={styles.signOut}>Sign out</button>
            </form>
          </div>
        </div>
      </aside>

      <main id="main" className={styles.content}>{children}</main>
    </div>
  );
}
