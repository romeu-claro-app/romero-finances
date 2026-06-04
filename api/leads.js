const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return res.status(204).set(CORS).end();
  }

  // Apenas POST
  if (req.method !== 'POST') {
    return res.status(405).set(CORS).json({ success: false, error: 'Method not allowed' });
  }

  // Variáveis de ambiente obrigatórias
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).set(CORS).json({ success: false, error: 'Server misconfiguration: missing env vars' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).set(CORS).json({ success: false, error: 'Invalid JSON body' });
  }

  if (!body || !body.email || !body.produit) {
    return res.status(400).set(CORS).json({ success: false, error: 'Champs obligatoires manquants: email, produit' });
  }

  // Extraire les colonnes connues, le reste va dans dados (jsonb)
  const { produit, prenom, nom, email, telephone, marketing, ...rest } = body;

  const record = {
    produit: produit ?? null,
    prenom:  prenom  ?? null,
    nom:     nom     ?? null,
    email:   email,
    telephone: telephone ?? null,
    marketing: marketing === true || marketing === 'true' || marketing === 1,
    dados: Object.keys(rest).length > 0 ? rest : null,
  };

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
      method: 'POST',
      headers: {
        'apikey':        SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type':  'application/json',
        'Prefer':        'return=representation',
      },
      body: JSON.stringify(record),
    });

    const data = await response.json();

    if (!response.ok) {
      const message = data?.message || data?.error || `Supabase error ${response.status}`;
      return res.status(response.status).set(CORS).json({ success: false, error: message });
    }

    const inserted = Array.isArray(data) ? data[0] : data;
    return res.status(201).set(CORS).json({ success: true, id: inserted?.id ?? null });

  } catch (err) {
    return res.status(500).set(CORS).json({ success: false, error: err.message ?? 'Internal server error' });
  }
}
