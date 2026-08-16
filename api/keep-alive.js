export default async function handler(req) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing Supabase env vars' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/leads_credit?select=id&limit=1`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_SECRET_KEY,
        'Authorization': `Bearer ${SUPABASE_SECRET_KEY}`
      }
    });
    return new Response(JSON.stringify({ ok: r.ok, status: r.status, ts: new Date().toISOString() }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}
