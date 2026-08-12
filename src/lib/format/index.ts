import type { Money, DeliveryMode, AttendanceMode, EventStatus, RegistrationStatus } from '../api/types';

/**
 * Dates are always formatted in the event's own timezone, never the viewer's.
 * A CPD advertised for 09:00 in Accra must read 09:00 to a participant in
 * Lagos, or people arrive an hour early.
 */
export function eventDate(iso: string, timezone: string, opts: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'full',
    timeZone: timezone,
    ...opts,
  }).format(new Date(iso));
}

export function eventTime(iso: string, timezone: string) {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit', minute: '2-digit', timeZone: timezone, hour12: false,
  }).format(new Date(iso));
}

/** "3–4 September 2026" or "3 September 2026" when it is a single day. */
export function eventDateRange(startIso: string, endIso: string, timezone: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);

  const day = (d: Date) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', timeZone: timezone }).format(d);
  const monthYear = (d: Date) => new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: timezone }).format(d);
  const full = (d: Date) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: timezone }).format(d);

  const sameDay = full(start) === full(end);
  if (sameDay) return full(start);

  if (monthYear(start) === monthYear(end)) return `${day(start)}–${day(end)} ${monthYear(start)}`;
  return `${full(start)} – ${full(end)}`;
}

/** Short label for the timezone so the reader knows whose clock this is. */
export function timezoneLabel(iso: string, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone, timeZoneName: 'short',
  }).formatToParts(new Date(iso));
  return parts.find((p) => p.type === 'timeZoneName')?.value ?? timezone;
}

/**
 * The API already divided by the currency's exponent. This adds grouping and
 * the currency code; it never touches the magnitude.
 */
export function money(m: Money | null | undefined) {
  if (!m) return '-';
  const n = Number(m.formatted);
  if (Number.isNaN(n)) return `${m.currency} ${m.formatted}`;
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency', currency: m.currency, currencyDisplay: 'code',
    }).format(n);
  } catch {
    return `${m.currency} ${m.formatted}`;
  }
}

export function isFree(m: Money | null | undefined) {
  return !!m && m.amountMinor === 0;
}

export function relativeDeadline(iso: string | null) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'expired';
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 48) return `${Math.floor(hours / 24)} days`;
  if (hours >= 1) return `${hours} hour${hours === 1 ? '' : 's'}`;
  return `${Math.max(1, Math.floor(ms / 60_000))} minutes`;
}

export const deliveryLabel: Record<DeliveryMode, string> = {
  ONLINE: 'Online',
  OFFLINE: 'In person',
  HYBRID: 'In person or online',
};

export const attendanceLabel: Record<AttendanceMode, string> = {
  IN_PERSON: 'Attending in person',
  VIRTUAL: 'Attending online',
};

/** Participant-facing wording — never the raw enum. */
export const eventStatusLabel: Partial<Record<EventStatus, string>> = {
  PUBLISHED: 'Registration opens soon',
  REGISTRATION_OPEN: 'Open for registration',
  REGISTRATION_CLOSED: 'Registration closed',
  ONGOING: 'Happening now',
  COMPLETED: 'Finished',
  CANCELLED: 'Cancelled',
};

export const registrationStatusLabel: Record<RegistrationStatus, string> = {
  PENDING_PAYMENT: 'Payment needed',
  CONFIRMED: 'Confirmed',
  WAITLISTED: 'On the waitlist',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
  REQUIRES_REVIEW: 'Being reviewed',
};

export const registrationTone: Record<RegistrationStatus, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  CONFIRMED: 'success',
  PENDING_PAYMENT: 'warning',
  WAITLISTED: 'info',
  REQUIRES_REVIEW: 'warning',
  CANCELLED: 'neutral',
  REFUNDED: 'neutral',
};
