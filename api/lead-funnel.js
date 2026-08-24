import { sendLeadEmails } from './_send-emails.js';

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

  const { produit, prenom, nom, email, telephone, dados } = req.body || {};

  const ALLOWED = ['credit', 'assurance', 'pilier', 'assurance-nouveau-arrive'];
  if (!produit || !ALLOWED.includes(produit)) {
    return res.status(400).json({ success: false, error: 'Invalid produit' });
  }
  if (!email) {
    return res.status(400).json({ success: false, error: 'Missing email' });
  }

  const payload = {
    produit:   produit,
    prenom:    prenom    || null,
    nom:       nom       || null,
    email:     email,
    telephone: telephone || null,
    statut:    'nouveau',
    dados:     dados     || {}
  };

  const response = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
    method: 'POST',
    headers: {
      'apikey':        SUPABASE_SECRET_KEY,
      'Authorization': `Bearer ${SUPABASE_SECRET_KEY}`,
      'Content-Type':  'application/json',
      'Prefer':        'return=representation'
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  if (!response.ok) {
    return res.status(500).json({ success: false, error: text });
  }

  const data = JSON.parse(text);

  // Fire confirmation + broker emails. Never let an email error break the lead.
  try {
    await sendLeadEmails({ produit, prenom, nom, email, telephone, dados: dados || {} });
  } catch (err) {
    console.error('sendLeadEmails (lead-funnel.js) failed:', err && err.message ? err.message : err);
  }

  return res.status(200).json({ success: true, id: data[0]?.id });
}
