import type { ReactNode, ButtonHTMLAttributes, AnchorHTMLAttributes } from 'react';
import Link from 'next/link';
import styles from './ui.module.css';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent';

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`${styles.badge} ${styles[`tone-${tone}`]}`}>{children}</span>;
}

type ButtonProps = {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  children: ReactNode;
};

export function Button({
  variant = 'primary', size = 'md', fullWidth, children, className = '', ...rest
}: ButtonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={[styles.button, styles[`v-${variant}`], styles[`s-${size}`],
        fullWidth ? styles.full : '', className].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  href, variant = 'primary', size = 'md', fullWidth, children, ...rest
}: ButtonProps & { href: string } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <Link
      href={href}
      className={[styles.button, styles[`v-${variant}`], styles[`s-${size}`],
        fullWidth ? styles.full : ''].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </Link>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`${styles.card} ${className}`}>{children}</div>;
}

export function Callout({
  tone = 'info', title, children,
}: { tone?: Tone; title?: string; children: ReactNode }) {
  return (
    <div className={`${styles.callout} ${styles[`tone-${tone}`]}`} role={tone === 'danger' ? 'alert' : undefined}>
      {title && <strong className={styles.calloutTitle}>{title}</strong>}
      <div>{children}</div>
    </div>
  );
}

/**
 * An empty state should say what to do next, not just report absence.
 */
export function EmptyState({
  title, description, action,
}: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className={styles.empty}>
      <h3 className={styles.emptyTitle}>{title}</h3>
      <p className={styles.emptyText}>{description}</p>
      {action && <div className={styles.emptyAction}>{action}</div>}
    </div>
  );
}

export function Field({
  label, htmlFor, hint, error, required, children,
}: {
  label: string; htmlFor: string; hint?: string | null;
  error?: string; required?: boolean; children: ReactNode;
}) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={htmlFor}>
        {label}
        {required && <span className={styles.required} aria-hidden="true"> *</span>}
        {required && <span className="visually-hidden"> (required)</span>}
      </label>
      {hint && <p className={styles.hint} id={hintId}>{hint}</p>}
      <div aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}>
        {children}
      </div>
      {error && <p className={styles.error} id={errorId} role="alert">{error}</p>}
    </div>
  );
}

export const inputClass = styles.input;
export const selectClass = styles.input;
export const textareaClass = `${styles.input} ${styles.textarea}`;
export const checkRowClass = styles.checkRow;

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <span className={styles.spinner} role="status">
      <span className="visually-hidden">{label}</span>
    </span>
  );
}
