/**
 * Types mirroring the API's response envelope and serialisers.
 *
 * Hand-written for now. Once the OpenAPI document is assembled in the API repo
 * these are generated from it and this file becomes the generator's output —
 * that generation step is what keeps two separate repos from drifting.
 */

export interface ApiEnvelope<T> {
  success: boolean;
  message: string | null;
  data: T;
  meta?: PageMeta;
}

export interface ApiErrorBody {
  success: false;
  message: string;
  error: {
    code: string;
    details?: unknown;
  };
  requestId?: string;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface Money {
  amountMinor: number;
  currency: string;
  /** Already divided by the currency's own exponent. Never re-divide. */
  formatted: string;
}

export type DeliveryMode = 'ONLINE' | 'OFFLINE' | 'HYBRID';
export type AttendanceMode = 'IN_PERSON' | 'VIRTUAL';

export type EventStatus =
  | 'DRAFT' | 'PENDING_APPROVAL' | 'PUBLISHED' | 'REGISTRATION_OPEN'
  | 'REGISTRATION_CLOSED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED' | 'ARCHIVED';

export type RegistrationStatus =
  | 'PENDING_PAYMENT' | 'CONFIRMED' | 'WAITLISTED'
  | 'CANCELLED' | 'REFUNDED' | 'REQUIRES_REVIEW';

export type QuestionType =
  | 'TEXT' | 'LONGTEXT' | 'NUMBER' | 'EMAIL' | 'PHONE'
  | 'SELECT' | 'MULTISELECT' | 'RADIO' | 'CHECKBOX' | 'DATE' | 'FILE';

export interface QuestionOption { value: string; label: string }

export interface RegistrationQuestion {
  id: string;
  label: string;
  helpText: string | null;
  type: QuestionType;
  options: QuestionOption[] | null;
  required: boolean;
  sortOrder: number;
}

export interface EventPrice {
  id: string;
  tier: string;
  label: string;
  attendanceMode: 'ANY' | AttendanceMode;
  audience: 'ANY' | 'HOST_COUNTRY' | 'AFRICA' | 'INTERNATIONAL';
  money: Money;
  availableFrom: string | null;
  availableUntil: string | null;
}

export interface EventSession {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  location: string | null;
  requiredForAttendance: boolean;
}

export interface EventSpeaker {
  id: string;
  name: string;
  title: string | null;
  organization: string | null;
  bio: string | null;
  role: 'SPEAKER' | 'FACILITATOR' | 'MODERATOR' | 'PANELLIST';
}

export interface CpdDetail {
  credits: number | null;
  accreditingBody: string | null;
  learningObjectives: string[];
  targetAudience: string[];
  requirements: string | null;
}

export interface PublicEvent {
  id: string;
  slug: string;
  type?: { key: string; name: string };
  title: string;
  shortDescription: string | null;
  description: string | null;
  startAt: string;
  endAt: string;
  timezone: string;
  deliveryMode: DeliveryMode;
  location: {
    countryCode: string | null;
    country: string | null;
    city: string | null;
    venue: string | null;
  };
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
  status: EventStatus;
  issuesCertificate: boolean;
  banner: {
    id: string;
    url: string;
    mimeType: string;
    sizeBytes: number;
    originalName: string;
  } | null;
  attendance?: {
    rule: 'NONE' | 'CHECK_IN' | 'SESSION_PERCENT';
    minPercent: number | null;
  };
  prices?: EventPrice[];
  questions?: RegistrationQuestion[];
  sessions?: EventSession[];
  speakers?: EventSpeaker[];
  cpd?: CpdDetail;
  availability?: {
    inPerson: { isFull: boolean } | null;
    virtual: { isFull: boolean } | null;
  };
  contact: { email: string | null; phone: string | null };
}

export interface Registration {
  id: string;
  reference: string;
  status: RegistrationStatus;
  attendanceMode: AttendanceMode;
  holdExpiresAt: string | null;
  amount: Money | null;
  priceTier: string | null;
  wantsCertificate: boolean | null;
  isPreviousAttendee: boolean | null;
  mediaConsentGiven: boolean;
  comments: string | null;
  specialRequirements: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
  event?: {
    id: string;
    slug: string;
    title: string;
    startAt: string;
    endAt: string;
    timezone: string;
    status: EventStatus;
    onlineUrl: string | null;
  };
  answers?: { questionId: string; label: string | null; type: QuestionType | null; value: string }[];
  /** Present only on admin listings — the serialiser omits it otherwise. */
  participant?: {
    id: string;
    name: string;
    email: string;
    organization: string | null;
    countryCode: string | null;
  };
}

export interface Quote {
  eventId: string;
  attendanceMode: AttendanceMode;
  amount: Money;
  tier: string;
  label: string;
  audience: string | null;
  isFree: boolean;
  isFull: boolean;
  waitlistAvailable: boolean;
}

export interface ReferenceData {
  countries: { code: string; name: string; phoneCode: string; region: string | null; defaultCurrency: string | null }[];
  positions: { key: string; label: string; requiresStudentId: boolean }[];
  sectors: { key: string; label: string }[];
  currencies: { code: string; name: string; symbol: string; exponent: number }[];
  genders: string[];
  prefixes: string[];
  suffixes: string[];
}

export interface SessionUser {
  id: string;
  email: string;
  prefix: string | null;
  firstName: string;
  middleName: string | null;
  lastName: string;
  suffix: string | null;
  fullName: string;
  displayName: string;
  gender: string | null;
  phone: string | null;
  countryCode: string | null;
  city: string | null;
  stateProvince: string | null;
  organization: string | null;
  jobTitle: string | null;
  emailOptOut: boolean;
  status: string;
  isStaff?: boolean;
  emailVerified?: boolean;
  roles?: { key: string; name: string }[];
  permissions?: string[];
}
