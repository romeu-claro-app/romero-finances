export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    return res.status(500).json({ ok: false, error: 'Missing env vars' });
  }

  // Whitelist — must match exactly the tables read by loadFromSupabase() in dashboard.html
  const ALLOWED_TABLES = new Set([
    'leads_credit',
    'leads_assurance',
    'leads_assurance_nouveau_arrive',
    'leads_assurance_prenatale',
    'leads_pilier',
    'leads_patrimoine',
    'leads'
  ]);

  const { table, id } = req.body || {};

  if (!table || id === undefined || id === null || id === '') {
    return res.status(400).json({ ok: false, error: 'Missing table or id' });
  }

  if (!ALLOWED_TABLES.has(table)) {
    return res.status(400).json({ ok: false, error: 'Table not allowed: ' + table });
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_SECRET_KEY,
        'Authorization': `Bearer ${SUPABASE_SECRET_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    }
  );

  const responseText = await response.text();

  if (!response.ok) {
    let error;
    try { error = JSON.parse(responseText); } catch (e) { error = responseText; }
    return res.status(response.status).json({ ok: false, error });
  }

  return res.status(200).json({ ok: true });
}
