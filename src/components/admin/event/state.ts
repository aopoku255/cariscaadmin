/** Kept out of actions.ts: a "use server" file may only export async functions. */
export interface AdminActionState {
  ok: boolean;
  message?: string;
  /** Publish validation returns a list of what is missing, not field errors. */
  problems?: string[];
  fieldErrors?: Record<string, string>;
}

export const emptyAdminState: AdminActionState = { ok: false };

/** An action prop every editor takes — its own server action, module-specific. */
export type AdminAction = (prev: AdminActionState, formData: FormData) => Promise<AdminActionState>;
