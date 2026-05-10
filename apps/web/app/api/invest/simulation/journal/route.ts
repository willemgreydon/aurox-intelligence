import { NextRequest, NextResponse } from 'next/server';
import { getOptionalCurrentSession } from '../../../../../server/auth/session';
import { getSimulationJournalRowsForCurrentUser, toCsv } from '../../../../../server/services/simulation-journal-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getOptionalCurrentSession();
  if (!session) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const side = searchParams.get('side') ?? 'all';
  const source = searchParams.get('source') ?? 'all';
  const symbol = searchParams.get('symbol') ?? '';

  const rows = await getSimulationJournalRowsForCurrentUser(500);

  const filtered = rows.filter((row) => {
    if (side !== 'all' && row.side !== side) return false;
    if (source !== 'all' && row.source !== source) return false;
    if (symbol.trim().length > 0) {
      const q = symbol.trim().toUpperCase();
      if (!row.symbol.toUpperCase().includes(q)) return false;
    }
    return true;
  });

  const csv = toCsv(filtered);
  const date = new Date().toISOString().slice(0, 10);
  const filterSuffix = [
    side !== 'all' ? side.toLowerCase() : '',
    source !== 'all' ? source.replace(/[^a-z0-9]/gi, '-').toLowerCase() : '',
    symbol.trim().length > 0 ? symbol.trim().toUpperCase() : '',
  ].filter(Boolean).join('-');
  const filename = filterSuffix
    ? `aurox-simulation-journal-${date}-${filterSuffix}.csv`
    : `aurox-simulation-journal-${date}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
    },
  });
}
