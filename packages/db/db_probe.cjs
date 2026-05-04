const postgres = require('postgres');
const url = process.env.DATABASE_URL;
(async () => {
  if (!url) { console.log('missing DATABASE_URL'); return; }
  const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 10, idle_timeout: 5 });
  try {
    const r = await sql.unsafe('select now() as now, 1 as ok');
    console.log('db_ok', r);
    const t = await sql.unsafe("select table_name from information_schema.tables where table_schema='app' order by table_name limit 20");
    console.log('app_tables', t.map((x) => x.table_name));
  } catch (e) {
    console.error('db_error', e && e.message ? e.message : e);
  } finally {
    await sql.end({ timeout: 5 });
  }
})();
