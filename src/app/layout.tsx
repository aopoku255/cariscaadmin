import type { Metadata } from 'next';
import { Barlow, Arimo } from 'next/font/google';
import '@/styles/globals.css';

const barlow = Barlow({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-barlow',
  display: 'swap',
});

const arimo = Arimo({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-arimo',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'CARISCA Administration', template: '%s · CARISCA Admin' },
  description: 'Internal administration for CARISCA events and programmes.',
  robots: { index: false, follow: false },
};

/**
 * Root layout for the admin application.
 *
 * Deliberately bare: the console's own shell — sidebar, navigation, the staff
 * guard — lives in the (console) route group, so sign-in and error pages can
 * render without it.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${barlow.variable} ${arimo.variable}`}>
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
