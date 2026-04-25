export class HttpError extends Error {
    status;
    body;
    constructor(message, status, body) {
        super(message);
        this.status = status;
        this.body = body;
        this.name = 'HttpError';
    }
}
export function buildUrl(baseUrl, query) {
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
export async function fetchJson(url, init) {
    const response = await fetch(url, init);
    if (!response.ok) {
        const body = await response.text();
        throw new HttpError(`Request failed for ${url}`, response.status, body);
    }
    return (await response.json());
}
