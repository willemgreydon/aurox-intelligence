import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import { Suspense, type ReactNode } from 'react';
import './globals.css';
import { getMessages } from '../lib/i18n/messages';
import { ThemeProvider } from '../components/layout/theme-provider';
import { Header } from '../components/layout/header';
import { Footer } from '../components/layout/footer';
import { PagePreloader } from '../components/layout/page-preloader';
import { ScrollResetter } from '../components/layout/scroll-resetter';
import { getRequestLocale } from '../server/i18n/locale';

const sans = IBM_Plex_Sans({
  subsets: ['latin'],
  variable: '--font-family-sans',
  weight: ['400', '500', '600', '700'],
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-family-mono',
  weight: ['400', '500', '600'],
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
