import type { Registration } from '@/lib/api/types';
import styles from '../../users/users.module.css';

/**
 * Issues the participant's certificate on their behalf. Staff skip the
 * timing, survey and opt-out rules that gate the participant's own download —
 * only a confirmed registration on an event that offers certificates counts.
 */
const link = (primary: boolean) => ({
  display: 'inline-flex', alignItems: 'center', padding: '6px 14px',
  borderRadius: 'var(--radius)', border: '1px solid var(--color-accent)',
  textDecoration: 'none', fontWeight: 600, fontSize: 'var(--text-sm)',
  background: primary ? 'var(--color-accent)' : 'transparent',
  color: primary ? '#fff' : 'var(--color-accent-text)',
}) as const;

export function CertificatePanel({ registration }: { registration: Registration }) {
  const eligibility = registration.adminCertificate;

  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>Certificate</h2>
      {eligibility?.eligible ? (
        <>
          <p className={styles.panelNote}>
            Generates their certificate now, whether or not the programme has ended
            or they completed the survey. Each download is recorded in the audit log.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {/* Plain anchors: these are file downloads from a Route Handler, not pages. */}
            <a href={`/registrations/${registration.reference}/certificate?format=pdf`} style={link(true)}>
              Download PDF
            </a>
            <a href={`/registrations/${registration.reference}/certificate?format=png`} style={link(false)}>
              Download image
            </a>
          </div>
        </>
      ) : (
        <p className={styles.panelNote}>
          {eligibility && 'reason' in eligibility ? eligibility.reason : 'A certificate is not available for this registration.'}
        </p>
      )}
    </section>
  );
}
