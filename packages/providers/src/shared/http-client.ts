type QueryValue = string | number | boolean | undefined | null;

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function buildUrl(baseUrl: string, query?: Record<string, QueryValue>): string {
  const url = new URL(baseUrl);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);

  if (!response.ok) {
    const body = await response.text();
    throw new HttpError(`Request failed for ${url}`, response.status, body);
  }

  return (await response.json()) as T;
}
