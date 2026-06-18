export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const SUPABASE_URL        = process.env.SUPABASE_URL;
  const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    return res.status(500).json({ success: false, error: 'Missing env vars' });
  }

  const TABLE   = 'rendezvous';
  const base    = `${SUPABASE_URL}/rest/v1/${TABLE}`;
  const headers = {
    'apikey':        SUPABASE_SECRET_KEY,
    'Authorization': `Bearer ${SUPABASE_SECRET_KEY}`,
    'Content-Type':  'application/json'
  };

  const clean = (v) => (v === '' || v === undefined) ? null : v;

  function buildFields(b) {
    const f = {};
    const keys = ['titre','date_rdv','heure_debut','heure_fin','lead_id','lead_nom','lead_produit','notes','statut'];
    keys.forEach((k) => { if (k in b) f[k] = clean(b[k]); });
    return f;
  }

  try {
    // ── CREATE ────────────────────────────────────────────────
    if (req.method === 'POST') {
      const b = req.body || {};
      if (!b.titre || !b.date_rdv) {
        return res.status(400).json({ success: false, error: 'Missing titre or date_rdv' });
      }
      const fields = buildFields(b);
      if (!fields.statut) fields.statut = 'planifie';

      const r = await fetch(base, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify(fields)
      });
      const text = await r.text();
      if (!r.ok) return res.status(500).json({ success: false, error: text });
      const data = JSON.parse(text);
      return res.status(200).json({ success: true, id: data[0]?.id, rdv: data[0] });
    }

    // ── id required for PATCH / DELETE ─────────────────────────
    const id = (req.query && req.query.id) || (req.body && req.body.id);
    if (!id) return res.status(400).json({ success: false, error: 'Missing id' });

    // ── UPDATE ────────────────────────────────────────────────
    if (req.method === 'PATCH') {
      const fields = buildFields(req.body || {});
      const r = await fetch(`${base}?id=eq.${id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify(fields)
      });
      if (!r.ok) { const t = await r.text(); return res.status(500).json({ success: false, error: t }); }
      return res.status(200).json({ success: true });
    }

    // ── DELETE ────────────────────────────────────────────────
    if (req.method === 'DELETE') {
      const r = await fetch(`${base}?id=eq.${id}`, { method: 'DELETE', headers });
      if (!r.ok) { const t = await r.text(); return res.status(500).json({ success: false, error: t }); }
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ success: false, error: String(e) });
  }
}
