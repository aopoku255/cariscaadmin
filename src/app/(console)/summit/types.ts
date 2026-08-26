import type { PublicEvent } from '@/lib/api/types';

/**
 * What /summit/events/:id returns — the public shape plus operational
 * fields. Identical in shape to CPD's equivalent (`AdminCpdEvent`):
 * certificate, attendance and occupancy are all generic core-event
 * concepts, not CPD-specific ones. Kept as its own named type rather than
 * imported from `cpd/types.ts` so each module's admin tree stays free to
 * diverge later without one quietly depending on the other's file.
 */
export interface AdminSummitEvent extends PublicEvent {
  onlineUrl: string | null;
  capacity: number | null;
  virtualCapacity: number | null;
  allowWaitlist: boolean;
  paymentHoldHours: number | null;
  cancelledReason: string | null;
  certificate: {
    issues: boolean;
    templateId: string | null;
    requiresPayment: boolean;
    requiresEvaluation: boolean;
  };
  organizerDepartmentId: string | null;
  createdBy: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  occupancy?: {
    inPerson: CapacityStatus;
    virtual: CapacityStatus;
  };
}

export interface CapacityStatus {
  capacity: number | null;
  taken: number | null;
  remaining: number | null;
  isFull: boolean;
}

export interface EventSummary {
  eventId: string;
  totals: {
    all: number;
    confirmed: number;
    pendingPayment: number;
    waitlisted: number;
    cancelled: number;
  };
  byStatus: Record<string, number>;
  byAttendanceMode: Record<string, number>;
  capacity: { inPerson: CapacityStatus; virtual: CapacityStatus };
  topCountries: { name: string; count: number }[];
  topOrganizations: { name: string; count: number }[];
  bySector: { name: string; count: number }[];
  registrationsPerDay: { day: string; count: number }[];
  distinctCountries: number;
  distinctOrganizations: number;
}

export interface AbstractSubmission {
  id: string;
  reference: string;
  title: string;
  abstractText: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
  coAuthors: { name: string; affiliation?: string; email?: string }[];
  submittedAt: string;
  decidedAt: string | null;
  track: { id: string; name: string } | null;
  paper: { id: string; url: string; originalName: string } | null;
  event?: { id: string; title: string; slug: string };
  author?: { id: string; name: string; email: string };
  /** Staff-only — never present on the participant-facing "mine" view. */
  reviewNotes?: string | null;
  decidedBy?: { id: string; name: string } | null;
}
