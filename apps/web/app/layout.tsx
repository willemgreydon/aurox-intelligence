import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import localFont from 'next/font/local';
import { Suspense, type ReactNode } from 'react';
import './globals.css';
import { getMessages } from '../lib/i18n/messages';
import { ThemeProvider } from '../components/layout/theme-provider';
import { Header } from '../components/layout/header';
import { Footer } from '../components/layout/footer';
import { PagePreloader } from '../components/layout/page-preloader';
import { ScrollResetter } from '../components/layout/scroll-resetter';
import { getRequestLocale } from '../server/i18n/locale';

// Self-hosted IBM Plex (OFL) — bundled woff2 in ./fonts. Previously loaded via
// next/font/google, which fetches from Google Fonts at build time and
// intermittently failed the whole Vercel deploy on a network blip. Local files
// make builds deterministic and offline-safe (no behaviour/appearance change:
// same family, weights, and CSS variables).
const sans = localFont({
  variable: '--font-family-sans',
  display: 'swap',
  src: [
    { path: './fonts/ibm-plex-sans-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/ibm-plex-sans-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: './fonts/ibm-plex-sans-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: './fonts/ibm-plex-sans-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
});

const mono = localFont({
  variable: '--font-family-mono',
  display: 'swap',
  src: [
    { path: './fonts/ibm-plex-mono-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/ibm-plex-mono-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: './fonts/ibm-plex-mono-latin-600-normal.woff2', weight: '600', style: 'normal' },
  ],
});

export const metadata: Metadata = {
  title: 'Aurox Intelligence',
  description:
    'Institutional-grade financial intelligence for stock trend prediction, FX analysis, explainable forecasts, and signal-driven decision support.',
  icons: {
    icon: '/aurox.svg',
    shortcut: '/aurox.svg',
  },
};

type ThemeMode = 'light' | 'dark';

const THEME_COOKIE_KEY = 'aurox-theme';

function normalizeTheme(value: string | undefined): ThemeMode {
  return value === 'light' ? 'light' : 'dark';
}

// Thin skeleton shown while the async Header resolves its data.
// Keeps the layout shift minimal — same height placeholder.
function HeaderSkeleton() {
  return <div className="header-skeleton" aria-hidden />;
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const initialTheme = normalizeTheme(cookieStore.get(THEME_COOKIE_KEY)?.value);
  const locale = await getRequestLocale();
  const messages = getMessages(locale);

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      data-theme={initialTheme}
      style={{ colorScheme: initialTheme }}
      className={`${sans.variable} ${mono.variable}`}
    >
      <body suppressHydrationWarning>
        <ThemeProvider initialTheme={initialTheme} cookieKey={THEME_COOKIE_KEY}>
          <ScrollResetter />
          <PagePreloader
            minDurationMs={400}
            labels={{
              loadingStocks: messages.shell.preloader.loadingStocks,
              loadingEtfs: messages.shell.preloader.loadingEtfs,
              loadingCrypto: messages.shell.preloader.loadingCrypto,
            }}
          />
          <div className="app-shell">
            {/*
              Wrap the Header in Suspense so the page body can stream to the
              browser while the header awaits market ticker + portfolio data.
              The HeaderSkeleton keeps layout stable with no content shift.
            */}
            <Suspense fallback={<HeaderSkeleton />}>
              <Header locale={locale} messages={messages} />
            </Suspense>
            <main className="page-main">{children}</main>
            <Footer messages={messages} />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
