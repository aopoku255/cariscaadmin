import type { EvaluationQuestion, PublicEvent } from '@/lib/api/types';

/** What /cpd/events/:id returns — the public shape plus operational fields. */
export interface AdminCpdEvent extends PublicEvent {
  onlineUrl: string | null;
  evaluationQuestions?: EvaluationQuestion[];
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
