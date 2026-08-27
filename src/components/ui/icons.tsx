/**
 * The console's icon set, inline.
 *
 * Hand-written rather than pulled from an icon package: seven navigation
 * glyphs and a handful of controls is not worth a dependency, and inlining
 * them means they inherit `currentColor` and never arrive a frame late.
 *
 * All are 24×24 stroke icons on the same grid, so they sit together evenly.
 */
export type IconName =
  | 'overview' | 'calendar' | 'clipboard' | 'handshake' | 'shield'
  | 'users' | 'history' | 'award' | 'chevronLeft' | 'menu' | 'close' | 'logout' | 'external';

const PATHS: Record<IconName, React.ReactNode> = {
  overview: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  clipboard: (
    <>
      <path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1Z" />
      <path d="M8 6H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-2" />
      <path d="M9 12h6M9 16h4" />
    </>
  ),
  handshake: (
    <>
      <path d="m11 17 2 2a1 1 0 0 0 1.4 0l2.6-2.6" />
      <path d="M3 11 8 6l3 3 2-2 3 3 5-5" />
      <path d="M3 11v4a2 2 0 0 0 .6 1.4L7 20" />
      <path d="M21 5v6a2 2 0 0 1-.6 1.4L17 16" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 6v5c0 4.4 3 8.3 7 10 4-1.7 7-5.6 7-10V6l-7-3Z" />
      <circle cx="12" cy="11" r="2.2" />
      <path d="M8.6 16.5a4 4 0 0 1 6.8 0" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <path d="M16.5 5.3a3.2 3.2 0 0 1 0 5.4M18 14.2a6 6 0 0 1 3 5.8" />
    </>
  ),
  history: (
    <>
      <path d="M3.5 10a8.5 8.5 0 1 1 1.2 6" />
      <path d="M3 20v-5h5" />
      <path d="M12 7.5V12l3 1.8" />
    </>
  ),
  award: (
    <>
      <circle cx="12" cy="8" r="5.2" />
      <path d="M8.5 12.5 7 21l5-2.6L17 21l-1.5-8.5" />
    </>
  ),
  chevronLeft: <path d="m15 5-7 7 7 7" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  logout: (
    <>
      <path d="M14 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M10 8 6 12l4 4M6 12h9" />
    </>
  ),
  external: (
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4 11 13" />
      <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
    </>
  ),
};

export function Icon({
  name, size = 18, className,
}: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
