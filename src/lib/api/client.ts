import type { ApiEnvelope, ApiErrorBody, PageMeta } from './types';

/**
 * The single place the browser and the server talk to the API.
 *
 * Server components use API_URL (which may be an internal address); the
 * browser uses NEXT_PUBLIC_API_URL. Nothing else in the app constructs a URL.
 */

const SERVER_BASE = process.env.API_URL ?? 'http://localhost:4000/api/v1';
const BROWSER_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

const isServer = typeof window === 'undefined';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;
  readonly requestId?: string;

  constructor(status: number, body: Partial<ApiErrorBody> & { message?: string }) {
    super(body.message || 'Something went wrong.');
    this.name = 'ApiError';
    this.status = status;
    this.code = body.error?.code ?? 'UNKNOWN';
    this.details = body.error?.details;
    this.requestId = body.requestId;
  }

  /**
   * Field-level messages from a 422, keyed by field, for rendering next to the
   * input that caused them rather than as one lump at the top of the form.
   */
  get fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    if (Array.isArray(this.details)) {
      for (const d of this.details as { field?: string; message?: string }[]) {
        if (d?.field && d?.message) out[d.field] = d.message;
      }
    }
    return out;
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  token?: string | null;
  /** Seconds. Server-side only; omit for no caching. */
  revalidate?: number;
  query?: Record<string, string | number | boolean | undefined | null>;
}

function buildUrl(path: string, query?: RequestOptions['query']) {
  const base = isServer ? SERVER_BASE : BROWSER_BASE;
  const url = new URL(`${base}${path.startsWith('/') ? path : `/${path}`}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

export async function apiRequest<T>(
  path: string,
  { body, token, revalidate, query, headers, ...init }: RequestOptions = {},
): Promise<{ data: T; meta?: PageMeta; message: string | null }> {
  const url = buildUrl(path, query);

  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    ...(isServer && revalidate !== undefined
      ? { next: { revalidate } }
      : isServer
        ? { cache: 'no-store' as RequestCache }
        : {}),
  });

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try { parsed = JSON.parse(text); } catch { /* non-JSON error page */ }
  }

  if (!response.ok) {
    throw new ApiError(response.status, (parsed as ApiErrorBody) ?? {
      message: `Request failed (${response.status}).`,
    });
  }

  const envelope = parsed as ApiEnvelope<T>;
  return { data: envelope?.data as T, meta: envelope?.meta, message: envelope?.message ?? null };
}

/** Returns null on 404 instead of throwing, for pages that render notFound(). */
export async function apiRequestOrNull<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T | null> {
  try {
    const { data } = await apiRequest<T>(path, options);
    return data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}
