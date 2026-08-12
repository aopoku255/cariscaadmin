'use client';

import { useFormStatus } from 'react-dom';
import { Button, Spinner } from '@/components/ui';

/**
 * Disables itself while the enclosing form action is running, which is what
 * stops a double-click from creating two registrations. The server is
 * idempotent regardless, but the user should also see that something happened.
 */
export function SubmitButton({
  children, pendingLabel, variant = 'primary', size = 'md', fullWidth,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} variant={variant} size={size} fullWidth={fullWidth}>
      {pending && <Spinner />}
      {pending ? (pendingLabel ?? 'Working…') : children}
    </Button>
  );
}
