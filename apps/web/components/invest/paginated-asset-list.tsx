'use client';

import { useState, type ReactNode } from 'react';

/**
 * Reusable client-side pagination for an already-rendered list of asset cards /
 * rows. The server builds the nodes; this component only chooses which page to
 * show and renders the shared `.market-pagination` controls. Used by lists that
 * are not server-paginated (e.g. watchlists) so every asset list in the app has
 * consistent pagination.
 */

export type PaginatedAssetItem = { key: string; node: ReactNode };

type Props = {
  items: PaginatedAssetItem[];
  /** Layout class applied to the list wrapper (e.g. 'analytics-two-grid'). */
  className?: string;
  pageSize?: number;
  labels?: Partial<{
    paginationTemplate: string; // "Page {{page}} of {{total}} · {{count}} assets"
    previous: string;
    next: string;
  }>;
};

const DEFAULT_LABELS = {
  paginationTemplate: 'Page {{page}} of {{total}} · {{count}} items',
  previous: 'Previous',
  next: 'Next',
};

export function PaginatedAssetList({ items, className, pageSize = 12, labels }: Props) {
  const t = { ...DEFAULT_LABELS, ...labels };
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = items.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const showPagination = items.length > pageSize;

  return (
    <>
      <div className={className}>
        {paged.map((item) => (
          <div key={item.key}>{item.node}</div>
        ))}
      </div>
      {showPagination && (
        <div className="market-pagination">
          <span className="market-pagination__meta" role="status" aria-live="polite">
            {t.paginationTemplate
              .replace('{{page}}', String(currentPage))
              .replace('{{total}}', String(totalPages))
              .replace('{{count}}', String(items.length))}
          </span>
          <div className="market-pagination__actions">
            <button
              type="button"
              className="button button--secondary"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage <= 1}
              aria-disabled={currentPage <= 1}
            >
              {t.previous}
            </button>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages}
              aria-disabled={currentPage >= totalPages}
            >
              {t.next}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
