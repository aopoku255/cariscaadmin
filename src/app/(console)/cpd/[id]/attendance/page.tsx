import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireStaff, can } from '@/lib/auth/require-staff';
import { apiAsUser } from '@/lib/auth/session';
import { ApiError } from '@/lib/api/client';
import { Card, Callout, Badge } from '@/components/ui';
import { eventDateRange } from '@/lib/format';
import type { AdminCpdEvent } from '../../types';
import { Scanner } from './Scanner';
import { FinaliseButton } from './FinaliseButton';
import styles from './attendance.module.css';
import admin from '../../../admin.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Attendance' };

type Params = Promise<{ id: string }>;

interface Summary {
  expected: number; arrived: number; departed: number;
  notArrived: number; arrivalRate: number;
}

export default async function AttendancePage({ params }: { params: Params }) {
  const { id } = await params;
  const user = await requireStaff(`/cpd/${id}/attendance`);
  if (!can(user, 'attendance.view')) redirect(`/cpd/${id}`);

  let event: AdminCpdEvent;
  try {
    const { data } = await apiAsUser<AdminCpdEvent>(`/cpd/events/${id}`);
    event = data;
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) notFound();
    throw err;
  }

  let summary: Summary | null = null;
  try {
    const { data } = await apiAsUser<Summary>('/attendance/summary', { query: { eventId: id } });
    summary = data;
  } catch { /* the scanner still works without the counts */ }

  const canMark = can(user, 'attendance.mark');

  return (
    <>
      <header className={admin.pageHead}>
        <div>
          <Link href={`/cpd/${id}`} className={styles.back}>← {event.title}</Link>
          <h1 className={admin.pageTitle}>Attendance</h1>
          <p className={admin.pageSub}>
            {eventDateRange(event.startAt, event.endAt, event.timezone)}
            {event.location?.venue ? ` · ${event.location.venue}` : ''}
          </p>
        </div>
        <div className={admin.pageActions}>
          {can(user, 'attendance.export') && (
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL}/attendance/export?eventId=${id}`}
              className={styles.exportLink}
            >
              Export attendance
            </a>
          )}
        </div>
      </header>

      {summary && (
        <div className={admin.stats}>
          <div className={admin.stat}>
            <p className={admin.statLabel}>Arrived</p>
            <p className={admin.statValue}>{summary.arrived}</p>
            <p className={admin.statNote}>of {summary.expected} expected</p>
          </div>
          <div className={admin.stat}>
            <p className={admin.statLabel}>Still to arrive</p>
            <p className={admin.statValue}>{summary.notArrived}</p>
            <p className={admin.statNote}>{summary.arrivalRate}% turnout so far</p>
          </div>
          {summary.departed > 0 && (
            <div className={admin.stat}>
              <p className={admin.statLabel}>Checked out</p>
              <p className={admin.statValue}>{summary.departed}</p>
            </div>
          )}
        </div>
      )}

      {!canMark && (
        <Callout tone="info" title="View only">
          Your role can see the attendance list but not check people in.
        </Callout>
      )}

      <div className={styles.layout}>
        <div>
          {canMark ? (
            <Card>
              <h2 className={styles.cardTitle}>Check people in</h2>
              <Scanner eventId={id} />
            </Card>
          ) : (
            <Card>
              <h2 className={styles.cardTitle}>Door list</h2>
              <p className={styles.muted}>Ask a colleague with check-in access to scan.</p>
            </Card>
          )}
        </div>

        <aside className={styles.side}>
          <Card>
            <h2 className={styles.cardTitle}>On the day</h2>
            <ol className={styles.runbook}>
              <li>Open this page on the phone you will scan with and press <strong>Start scanning</strong>.</li>
              <li>If a QR code will not scan, search by name — it always works.</li>
              <li>Someone who has not paid is <strong>let in</strong> and flagged; send them to the desk.</li>
              <li>If the wifi drops, keep scanning. Scans are saved and sync when it returns.</li>
              <li>After the event, press <strong>Close the register</strong> below.</li>
            </ol>
          </Card>

          {can(user, 'attendance.mark') && (
            <Card>
              <h2 className={styles.cardTitle}>Close the register</h2>
              <p className={styles.muted}>
                Marks everyone who did not arrive as absent. Certificates are only
                issued to people recorded as present, so do this once the event
                has finished.
              </p>
              <FinaliseButton eventId={id} />
            </Card>
          )}

          <Card>
            <h2 className={styles.cardTitle}>Certificate rule</h2>
            <p className={styles.muted}>
              {!event.certificate?.issues
                ? 'This event does not award a certificate.'
                : event.attendance?.rule === 'SESSION_PERCENT'
                  ? `Participants need ${event.attendance.minPercent}% of required sessions.`
                  : event.attendance?.rule === 'CHECK_IN'
                    ? 'Participants need to be checked in at least once.'
                    : 'Attendance is not tracked for this event.'}
            </p>
            {event.certificate?.issues && (
              <p className={styles.muted} style={{ marginTop: 'var(--space-2)' }}>
                <Badge tone={event.certificate.requiresPayment ? 'warning' : 'neutral'}>
                  {event.certificate.requiresPayment ? 'Payment required' : 'No payment required'}
                </Badge>
              </p>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}
