/** Kept out of the "use server" module, which may only export async functions. */

interface Admitted {
  name: string;
  organization: string | null;
  reference: string;
  checkedInAt: string;
  warnings: string[];
}

/**
 * Each member carries a single literal `kind`.
 *
 * A member typed `kind: 'admitted' | 'already'` looks tidier but cannot be
 * discriminated: TypeScript needs a literal tag per member to narrow, and
 * without it every access to `.message` on the failure members is an error.
 */
export type ScanOutcome =
  | ({ kind: 'admitted' } & Admitted)
  | ({ kind: 'already' } & Admitted)
  | { kind: 'refused'; message: string; reference?: string; status?: string }
  | { kind: 'unknown'; message: string }
  | { kind: 'error'; message: string }
  | { kind: 'offline'; message: string };

/** A scan waiting to be sent, held in localStorage while the device is offline. */
export interface QueuedScan {
  id: string;
  qrToken?: string;
  reference?: string;
  sessionId: number | null;
  scannedAt: string;
}
