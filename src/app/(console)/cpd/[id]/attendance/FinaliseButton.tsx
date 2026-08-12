'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Callout } from '@/components/ui';
import { finaliseAction } from './finalise-action';
import styles from './attendance.module.css';

/**
 * Closing the register is irreversible in effect — everyone unmarked becomes
 * absent, and absent people do not get certificates. So it confirms first and
 * says plainly what will happen.
 */
export function FinaliseButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [state, setState] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className={styles.finalise}>
      {state && (
        <Callout tone={state.ok ? 'success' : 'danger'}>{state.message}</Callout>
      )}
      <Button
        variant="secondary"
        disabled={busy}
        onClick={async () => {
          const confirmed = window.confirm(
            'Close the register? Everyone not checked in will be marked absent, '
            + 'and absent participants do not receive a certificate.',
          );
          if (!confirmed) return;

          setBusy(true);
          setState(await finaliseAction(eventId));
          setBusy(false);
          router.refresh();
        }}
      >
        {busy ? 'Closing…' : 'Close the register'}
      </Button>
    </div>
  );
}
