import Link from 'next/link';
import { logoutAction } from '@/lib/auth/actions';
import styles from '../login/login.module.css';

export const metadata = { title: 'No access' };

/**
 * Reached when a signed-in participant lands on the console. Says what is
 * wrong and offers the way out, rather than bouncing them in a redirect loop.
 */
export default function NotStaffPage() {
  return (
    <div className={styles.page}>
      <div className={styles.panel}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>CARISCA</span>
          <span className={styles.brandSub}>Administration</span>
        </div>

        <h1 className={styles.title}>This account has no staff access</h1>
        <p className={styles.lede}>
          You are signed in, but this area is for CARISCA staff. Your
          registrations and certificates are on the public site.
        </p>

        <Link
          href={process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}
          className={styles.lede}
          style={{ fontWeight: 600 }}
        >
          Go to the public site →
        </Link>

        <form action={logoutAction}>
          <button type="submit" style={{
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            color: 'var(--color-text-subtle)', textDecoration: 'underline',
            fontFamily: 'inherit', fontSize: 'var(--text-base)',
          }}>
            Sign in as someone else
          </button>
        </form>
      </div>
    </div>
  );
}
