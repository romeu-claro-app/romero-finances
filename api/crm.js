import crypto from 'crypto';

/* Leitura do CRM feita no servidor.
   A chave do Supabase e a password nunca chegam ao browser. */

const TABLES = [
  'leads',
  'leads_credit',
  'leads_assurance',
  'leads_assurance_nouveau_arrive',
  'leads_assurance_prenatale',
  'leads_pilier',
  'leads_patrimoine'
];

function samePassword(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ba = Buffer.from(a), bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const CRM_PASSWORD = process.env.CRM_PASSWORD;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

  if (!CRM_PASSWORD) {
    return res.status(500).json({ ok: false, error: 'CRM_PASSWORD nao esta definida nas variaveis de ambiente' });
  }
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    return res.status(500).json({ ok: false, error: 'Missing Supabase env vars' });
  }

  const { pwd, action, leadId } = req.body || {};

  if (!samePassword(pwd || '', CRM_PASSWORD)) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  const H = {
    apikey: SUPABASE_SECRET_KEY,
    Authorization: `Bearer ${SUPABASE_SECRET_KEY}`
  };
  const get = async (path) => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: H });
    return r.ok ? r.json() : [];
  };

  try {
    if (action === 'login') {
      return res.status(200).json({ ok: true });
    }

    if (action === 'leads') {
      const out = {};
      await Promise.all(TABLES.map(async (t) => {
        out[t] = await get(`${t}?select=*&order=created_at.desc`);
      }));
      return res.status(200).json({ ok: true, tables: out });
    }

    if (action === 'rdvs') {
      return res.status(200).json({ ok: true, rows: await get('rendezvous?select=*&order=date_rdv.asc') });
    }

    if (action === 'leadRdvs') {
      if (!leadId) return res.status(400).json({ ok: false, error: 'leadId em falta' });
      const rows = await get(`rendezvous?select=*&lead_id=eq.${encodeURIComponent(leadId)}&order=date_rdv.asc`);
      return res.status(200).json({ ok: true, rows });
    }

    if (action === 'funnel') {
      return res.status(200).json({ ok: true, rows: await get('funnel_events?select=*&order=created_at.asc') });
    }

    return res.status(400).json({ ok: false, error: 'action desconhecida' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
