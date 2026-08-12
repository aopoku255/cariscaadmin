/**
 * Shared form-state shape.
 *
 * Kept out of the "use server" modules deliberately: those files may only
 * export async functions, so a plain constant living alongside them breaks
 * the build.
 */
export interface FormState {
  ok: boolean;
  message?: string;
  code?: string;
  fieldErrors?: Record<string, string>;
}

export const emptyState: FormState = { ok: false };
