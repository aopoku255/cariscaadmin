import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { LoginForm } from './LoginForm';
import styles from './login.module.css';

export const metadata = { title: 'Sign in' };
export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ next?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  const user = await getSession();
  if (user?.isStaff) {
    redirect(params.next && params.next.startsWith('/') ? params.next : '/');
  }

  return (
    <div className={styles.page}>
      <div className={styles.panel}>
        <div className={styles.brand}>
          <span className={styles.brandBadge} aria-hidden="true">C</span>
          <span>
            <span className={styles.brandMark}>CARISCA</span>
            <span className={styles.brandSub}>Administration</span>
          </span>
        </div>

        <h1 className={styles.title}>Staff sign in</h1>
        <p className={styles.lede}>
          For CARISCA staff. Participants should use the public site to manage
          their registrations.
        </p>

        <LoginForm next={params.next ?? '/'} />
      </div>
    </div>
  );
}
