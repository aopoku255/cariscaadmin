'use server';

import { ApiError } from '@/lib/api/client';
import { apiAsUser } from '@/lib/auth/session';
import type { ScanOutcome } from './scan-types';

/**
 * One scan.
 *
 * Every failure is turned into an outcome the door can act on rather than an
 * exception — staff need "cancelled, send to the desk", not a stack trace.
 */
export async function scanAction(input: {
  qrToken?: string;
  reference?: string;
  sessionId?: number | null;
  deviceInfo?: string;
}): Promise<ScanOutcome> {
  try {
    const { data } = await apiAsUser<{
      result: 'CHECKED_IN' | 'ALREADY_CHECKED_IN';
      participant: { name: string; organization: string | null; reference: string; attendanceMode: string };
      checkedInAt: string;
      warnings: string[];
    }>('/attendance/scan', { method: 'POST', body: input });

    return {
      kind: data.result === 'CHECKED_IN' ? 'admitted' : 'already',
      name: data.participant.name,
      organization: data.participant.organization,
      reference: data.participant.reference,
      checkedInAt: data.checkedInAt,
      warnings: data.warnings ?? [],
    };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 404) {
        return { kind: 'unknown', message: 'This code is not recognised for any registration.' };
      }
      if (err.code === 'NOT_ADMISSIBLE') {
        const d = err.details as { reference?: string; status?: string } | undefined;
        return {
          kind: 'refused',
          message: err.message,
          reference: d?.reference,
          status: d?.status,
        };
      }
      if (err.status === 403) {
        return { kind: 'error', message: 'Your role does not allow marking attendance.' };
      }
      return { kind: 'error', message: err.message };
    }
    // The offline queue retries this — say so rather than implying failure.
    return { kind: 'offline', message: 'No connection. The scan is saved and will sync.' };
  }
}

export async function lookupAction(eventId: string, q: string) {
  try {
    const { data } = await apiAsUser<{
      registrationId: string; reference: string; name: string; email: string;
      organization: string | null; registrationStatus: string; attendanceMode: string;
      checkedIn: boolean; checkedInAt: string | null;
    }[]>('/attendance/lookup', { query: { eventId, q, limit: 25 } });
    return data;
  } catch {
    return [];
  }
}
