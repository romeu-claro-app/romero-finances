export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) return res.status(204).end();

  // sendBeacon delivers a Blob; body may arrive as a string.
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = null; } }
  if (!b) return res.status(204).end();

  const FUNNELS = ['assurance', 'credit', 'pilier', 'assurance-nouveau-arrive'];
  if (!FUNNELS.includes(b.funnel)) return res.status(204).end();

  const step = parseInt(b.step, 10);
  if (!Number.isInteger(step)) return res.status(204).end();

  // Deliberately anonymous: no IP, no user agent, no personal data.
  // `session` is a random per-page-load id, never stored in a cookie.
  const payload = {
    funnel:    b.funnel,
    step:      step,
    step_name: String(b.step_name || '').slice(0, 40),
    session:   String(b.session || '').slice(0, 40)
  };

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/funnel_events`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SECRET_KEY,
        'Authorization': `Bearer ${SUPABASE_SECRET_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error('funnel-step insert failed:', err && err.message);
  }

  // Analytics must never affect the visitor's experience.
  return res.status(204).end();
}
