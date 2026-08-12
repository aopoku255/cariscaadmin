import type { EventStatus } from '@/lib/api/types';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent';

/** Colour carries state so the table reads at a glance, not just as words. */
export function statusTone(status: EventStatus): Tone {
  switch (status) {
    case 'REGISTRATION_OPEN': return 'success';
    case 'ONGOING': return 'success';
    case 'PUBLISHED': return 'accent';
    case 'PENDING_APPROVAL': return 'warning';
    case 'REGISTRATION_CLOSED': return 'warning';
    case 'CANCELLED': return 'danger';
    case 'COMPLETED': return 'info';
    case 'DRAFT':
    case 'ARCHIVED':
    default: return 'neutral';
  }
}

/** Plain-language wording for staff — the enum is for the database. */
export const statusLabel: Record<EventStatus, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Awaiting approval',
  PUBLISHED: 'Published',
  REGISTRATION_OPEN: 'Registration open',
  REGISTRATION_CLOSED: 'Registration closed',
  ONGOING: 'Happening now',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  ARCHIVED: 'Archived',
};
