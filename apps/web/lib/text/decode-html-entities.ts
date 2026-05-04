export function decodeHtmlEntities(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x2018;/g, '‘')
    .replace(/&#x2019;/g, '’')
    .replace(/&#x201c;/gi, '“')
    .replace(/&#x201d;/gi, '”')
    .replace(/&#x2014;/g, '—')
    .replace(/&#x2013;/g, '–')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}
