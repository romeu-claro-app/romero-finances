export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    return res.status(500).json({ success: false, error: 'Missing env vars' });
  }

  const TABLE_MAP = {
    'credit': 'leads_credit',
    'assurance': 'leads_assurance',
    'assurance-nouveau-arrive': 'leads_assurance_nouveau_arrive',
    'assurance-prenatale': 'leads_assurance_prenatale',
    'pilier': 'leads_pilier',
    'patrimoine': 'leads_patrimoine'
  };

  const { produit, ...rest } = req.body;

  if (!produit || !rest.email) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  const table = TABLE_MAP[produit];
  if (!table) {
    return res.status(400).json({ success: false, error: 'Unknown produit: ' + produit });
  }

  const payload = rest;
  console.log('INSERTING INTO:', table, JSON.stringify(payload));

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SECRET_KEY,
      'Authorization': `Bearer ${SUPABASE_SECRET_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(payload)
  });

  const responseText = await response.text();
  console.log('SUPABASE STATUS:', response.status);
  console.log('SUPABASE RESPONSE:', responseText);

  const data = JSON.parse(responseText);

  if (!response.ok) {
    return res.status(500).json({ success: false, error: data });
  }

  return res.status(200).json({ success: true, id: data[0]?.id });
}
