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

  // Gera signed URL para um único ficheiro (expira em 1 hora)
  async function signFile(path) {
    const r = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/documentos/${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ expiresIn: 3600 })
    });
    if (!r.ok) return null;
    const data = await r.json();
    if (!data.signedURL) return null;
    return SUPABASE_URL + '/storage/v1' + data.signedURL;
  }

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

  // ── FASE 2: para cada pasta, listar ficheiros e assinar em paralelo ───────
  for (const item of folderItems) {
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

    const nomes = items2
      .filter(f => f.name && f.id !== null)
      .map(f => f.name.split('/').pop())
      .filter(Boolean);

    if (!nomes.length) continue;

    const parts = folderPrefix.split('/').filter(Boolean);
    const pastaName = parts[parts.length - 1];

    // Gerar signed URLs em paralelo para todos os ficheiros desta pasta
    const entries = await Promise.all(
      nomes.map(async nome => {
        const url = await signFile(`${leadId}/${pastaName}/${nome}`);
        return url ? { name: nome, url } : null;
      })
    );

    const valid = entries.filter(Boolean);
    if (valid.length) pastas[pastaName] = valid;
  }

  return res.status(200).json({ success: true, pastas });
}
