'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { NavItem } from '@/lib/auth/permissions';
import { Icon } from '@/components/ui/icons';
import styles from './admin.module.css';

/**
 * The console shell: sidebar, top bar, content.
 *
 * Two independent pieces of state, because they are two different behaviours
 * that happen to share a component:
 *
 * - `collapsed` is the desktop rail. It persists, because it is a standing
 *   preference about how someone wants their tools laid out.
 * - `drawerOpen` is the mobile off-canvas menu. It deliberately does not
 *   persist and closes on navigation, because it is a transient act of
 *   "show me the menu", not a preference.
 *
 * The collapsed class is mirrored onto <html> by the inline script in the
 * root layout so the first paint is already correct. This component reads
 * that same attribute on mount rather than defaulting to false and
 * correcting itself, which would flash the sidebar open for one frame.
 */
const STORAGE_KEY = 'carisca.sidebar.collapsed';

export function ConsoleShell({
  nav, user, siteUrl, signOut, children,
}: {
  nav: NavItem[];
  user: { fullName: string; initials: string; roles: string };
  siteUrl: string;
  signOut: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Adopt whatever the pre-paint script decided, so the button's state and
  // the rendered width agree from the first interaction onward.
  useEffect(() => {
    setCollapsed(document.documentElement.dataset.sidebar === 'collapsed');
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      document.documentElement.dataset.sidebar = next ? 'collapsed' : 'expanded';
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        // Private browsing or blocked storage — the toggle still works for
        // this session, it just will not be remembered.
      }
      return next;
    });
  }, []);

  // A drawer left open across a navigation would cover the page someone just
  // asked for.
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawerOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  const current = nav.find((item) => (
    item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
  ));

  return (
    <div className={styles.shell} data-drawer={drawerOpen ? 'open' : 'closed'}>
      {/* Only ever visible on small screens, where the sidebar is an overlay. */}
      <div
        className={styles.scrim}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />

      <aside className={styles.sidebar} id="console-nav">
        <div className={styles.sidebarHead}>
          <Link href="/" className={styles.brand} title="CARISCA Administration">
            <span className={styles.brandBadge} aria-hidden="true">C</span>
            <span className={styles.brandText}>
              <span className={styles.brandMark}>CARISCA</span>
              <span className={styles.brandSub}>Administration</span>
            </span>
          </Link>
        </div>

        <nav className={styles.nav} aria-label="Admin sections">
          {nav.map((item) => {
            // "/" must only match exactly, or it lights up on every page.
            const active = item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? styles.navItemActive : styles.navItem}
                aria-current={active ? 'page' : undefined}
                // Shown by the browser as a tooltip once the labels are
                // hidden, which is the only thing naming a rail icon.
                title={item.label}
              >
                <Icon name={item.icon} className={styles.navIcon} />
                <span className={styles.navLabel}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarFoot}>
          <div className={styles.who}>
            <span className={styles.avatar} aria-hidden="true">{user.initials}</span>
            <span className={styles.whoText}>
              <span className={styles.whoName}>{user.fullName}</span>
              <span className={styles.whoRole}>{user.roles}</span>
            </span>
          </div>

          <div className={styles.footLinks}>
            <a href={siteUrl} target="_blank" rel="noreferrer" title="View the public site">
              <Icon name="external" size={16} />
              <span className={styles.navLabel}>View the public site</span>
            </a>
            {signOut}
          </div>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => setDrawerOpen((v) => !v)}
            aria-expanded={drawerOpen}
            aria-controls="console-nav"
            data-role="drawer-toggle"
          >
            <Icon name={drawerOpen ? 'close' : 'menu'} size={20} />
            <span className="visually-hidden">
              {drawerOpen ? 'Close navigation' : 'Open navigation'}
            </span>
          </button>

          <button
            type="button"
            className={styles.iconButton}
            onClick={toggleCollapsed}
            aria-expanded={!collapsed}
            aria-controls="console-nav"
            data-role="rail-toggle"
          >
            <Icon name="chevronLeft" size={20} className={styles.collapseIcon} />
            <span className="visually-hidden">
              {collapsed ? 'Expand the sidebar' : 'Collapse the sidebar'}
            </span>
          </button>

          {/* Repeats the active section's name. On a narrow screen the
              sidebar is hidden entirely, and this is the only thing saying
              where you are. */}
          <span className={styles.topbarWhere}>{current?.label ?? 'Console'}</span>
        </header>

        <main id="main" className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
