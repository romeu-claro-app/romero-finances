export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const SUPABASE_URL        = process.env.SUPABASE_URL;
  const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    return res.status(500).json({ success: false, error: 'Missing env vars' });
  }

  const { leadId } = req.body || {};
  if (!leadId) {
    return res.status(400).json({ success: false, error: 'Missing leadId' });
  }

  const storageBase = `${SUPABASE_URL}/storage/v1/object/list/documentos`;
  const headers = {
    'apikey':        SUPABASE_SECRET_KEY,
    'Authorization': `Bearer ${SUPABASE_SECRET_KEY}`,
    'Content-Type':  'application/json'
  };

  // ── FASE 1: listar pastas sob leadId/ ────────────────────────────────────
  const r1 = await fetch(storageBase, {
    method: 'POST',
    headers,
    body: JSON.stringify({ prefix: `${leadId}/`, limit: 100, delimiter: '/' })
  });

  if (!r1.ok) {
    const text = await r1.text();
    return res.status(500).json({ success: false, error: `Storage list fase 1: ${r1.status} ${text}` });
  }

  const items1 = await r1.json();
  if (!Array.isArray(items1)) {
    return res.status(500).json({ success: false, error: 'Resposta inesperada da Storage API' });
  }

  // Entradas de pasta: têm `prefix` (S3/compatible) ou `id === null` (postgres backend)
  const folderItems = items1.filter(item => item.prefix || item.id === null);

  const pastas = {};

  // ── FASE 2: para cada pasta, listar ficheiros ─────────────────────────────
  for (const item of folderItems) {
    // Determinar o prefix a usar na fase 2
    let folderPrefix = item.prefix;
    if (!folderPrefix) {
      const name = (item.name || '').replace(/\/$/, '');
      if (!name) continue;
      folderPrefix = `${leadId}/${name}/`;
    }

    const r2 = await fetch(storageBase, {
      method: 'POST',
      headers,
      body: JSON.stringify({ prefix: folderPrefix, limit: 100 })
    });

    if (!r2.ok) continue;

    const items2 = await r2.json();
    if (!Array.isArray(items2)) continue;

    const ficheiros = items2
      .filter(f => f.name && f.id !== null)
      .map(f => f.name.split('/').pop())
      .filter(Boolean);

    if (!ficheiros.length) continue;

    // Extrair nome da pasta a partir do prefix (ex: "uuid/bail/" → "bail")
    const parts = folderPrefix.split('/').filter(Boolean);
    const pastaName = parts[parts.length - 1];
    pastas[pastaName] = ficheiros;
  }

  return res.status(200).json({ success: true, pastas });
}
