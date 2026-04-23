type RunJobContext = {
  startedAt: string;
  durationMs: number;
};

export async function runJob<T>(name: string, execute: () => Promise<T>): Promise<T> {
  const startedAt = new Date().toISOString();
  const started = Date.now();

  console.info('[worker] job started', {
    job: name,
    startedAt,
  });

  try {
    const result = await execute();

    const context: RunJobContext = {
      startedAt,
      durationMs: Date.now() - started,
    };

    console.info('[worker] job completed', {
      job: name,
      ...context,
    });

    return result;
  } catch (error) {
    const context: RunJobContext = {
      startedAt,
      durationMs: Date.now() - started,
    };

    console.error('[worker] job failed', {
      job: name,
      ...context,
      error: error instanceof Error ? error.message : 'Unknown worker job error',
    });

    throw error;
  }
}