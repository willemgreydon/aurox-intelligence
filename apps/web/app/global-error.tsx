'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main className="page-main" aria-live="assertive">
          <section className="section section--hero">
            <div className="shell-container">
              <section className="state-panel state-panel--danger">
                <div className="state-panel__body">
                  <div className="state-panel__eyebrow">Global system state</div>
                  <h2 className="state-panel__title">A critical error occurred</h2>
                  <p className="state-panel__description">
                    {error.digest
                      ? `The application hit a critical rendering error. (${error.digest})`
                      : 'The application hit a critical rendering error.'}
                  </p>
                </div>

                <div className="state-panel__actions">
                  <button type="button" onClick={reset} className="button button--primary">
                    Retry
                  </button>
                  <a href="/dashboard" className="button button--secondary">
                    Dashboard
                  </a>
                </div>
              </section>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}