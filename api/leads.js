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

  let payload = rest;

  // ── leads_credit ──────────────────────────────────────────────────────────
  if (table === 'leads_credit') {
    payload = {
      prenom:      payload.prenom,
      nom:         payload.nom,
      email:       payload.email,
      telephone:   payload.telephone,
      marketing:   payload.marketing,
      montant:     payload.montant     ? parseInt(payload.montant)  : null,
      duree:       payload.duree       ? parseInt(payload.duree)    : null,
      objet_credit: payload.objet      || null,
      salaire_net: payload.salaire     ? parseInt(payload.salaire)  : null,
      loyer:       payload.loyer       ? parseInt(payload.loyer)    : null
    };
  }

  // ── leads_assurance ───────────────────────────────────────────────────────
  if (table === 'leads_assurance') {
    payload = {
      prenom:           payload.prenom,
      nom:              payload.nom,
      email:            payload.email,
      telephone:        payload.telephone,
      marketing:        payload.marketing,
      annee_naissance:  payload.am_annee   ? parseInt(payload.am_annee) : null,
      canton:           payload.am_canton  || null,
      nombre_personnes: payload.am_nb      ? parseInt(payload.am_nb)    : null,
      medecin_famille:  payload.am_medecin || null,
      commentaire:      payload.am_commentaire || null,
      personnes: (() => {
        const nb = parseInt(payload.am_nb) || 1;
        const personnes = [];
        for (let i = 1; i <= nb; i++) {
          const prefix = `p${i}`;
          personnes.push({
            lamal_caisse:    payload[`${prefix}_lamal_caisse`]    || null,
            lca_caisse:      payload[`${prefix}_lca_caisse`]      || null,
            lamal_prime:     payload[`${prefix}_lamal_prime`]     || null,
            lamal_franchise: payload[`${prefix}_lamal_franchise`] || null,
            assure_depuis:   payload[`${prefix}_assure_depuis`]   || null
          });
        }
        return personnes;
      })()
    };
  }

  // ── leads_assurance_nouveau_arrive ────────────────────────────────────────
  if (table === 'leads_assurance_nouveau_arrive') {
    const nb = parseInt(payload.na_nb) || 1;
    const personnes_supplementaires = [];
    for (let i = 2; i <= nb; i++) {
      personnes_supplementaires.push({
        prenom:         payload[`na_p${i}_prenom`]    || null,
        nom:            payload[`na_p${i}_nom`]        || null,
        date_naissance: payload[`na_p${i}_naissance`]  || null
      });
    }
    payload = {
      prenom:                   payload.prenom,
      nom:                      payload.nom,
      email:                    payload.email,
      telephone:                payload.telephone,
      marketing:                payload.marketing,
      date_naissance:           payload.na_naissance   || null,
      adresse:                  payload.na_adresse     || null,
      npa:                      payload.na_npa         || null,
      localite:                 payload.na_localite    || null,
      inscrit_commune:          payload.na_inscrit     || null,
      permis:                   payload.na_permis      || null,
      date_entree:              payload.na_date_entree || null,
      nombre_personnes:         nb,
      personnes_supplementaires: personnes_supplementaires.length
        ? personnes_supplementaires
        : null
    };
  }

  // ── leads_assurance_prenatale ─────────────────────────────────────────────
  if (table === 'leads_assurance_prenatale') {
    payload = {
      prenom:                 payload.prenom,
      nom:                    payload.nom,
      email:                  payload.email,
      telephone:              payload.telephone,
      marketing:              payload.marketing,
      date_naissance_preneur: payload.pn_naissance    || null,
      date_accouchement:      payload.pn_accouchement || null,
      prenom_bebe:            payload.pn_bebe         || null,
      lamal_caisse:           payload.pn_lamal_caisse || null,
      lca_caisse:             payload.pn_lca_caisse   || null,
      npa:                    payload.pn_npa          || null,
      localite:               payload.pn_localite     || null
    };
  }

  // ── leads_pilier ──────────────────────────────────────────────────────────
  if (table === 'leads_pilier') {
    payload = {
      prenom:                     payload.prenom,
      nom:                        payload.nom,
      email:                      payload.email,
      telephone:                  payload.telephone,
      marketing:                  payload.marketing,
      date_naissance:             payload.p_dob       || null,
      canton:                     payload.p_canton    || null,
      situation_professionnelle:  payload.p_situation || null,
      revenu_annuel:              payload.p_revenu    ? parseInt(payload.p_revenu) : null,
      troisieme_pilier_existant:  payload.p_existant  || null,
      type_pilier_existant:       payload.p_3p_type   || null,
      institution_existante:      payload.p_3p_avec   || null,
      montant_verse:              payload.p_montant   || null,
      objectif:                   payload.p_objectif  || null,
      commentaire:                payload.p_commentaire || null
    };
  }

  // ── leads_patrimoine ──────────────────────────────────────────────────────
  if (table === 'leads_patrimoine') {
    const assurances_actuelles = [];
    for (let i = 1; i <= 5; i++) {
      const type = payload[`deja_type_${i}`];
      const comp = payload[`deja_comp_${i}`];
      if (type || comp) assurances_actuelles.push({ type: type || null, compagnie: comp || null });
    }
    payload = {
      prenom:               payload.prenom,
      nom:                  payload.nom,
      email:                payload.email,
      telephone:            payload.telephone,
      marketing:            payload.marketing,
      date_naissance:       payload.dob        || null,
      npa:                  payload.npa        || null,
      commentaire:          payload.commentaire || null,
      souhait:              payload.souhait    || null,
      besoin:               payload.besoin     || null,
      assurances_actuelles: assurances_actuelles.length ? assurances_actuelles : null
    };
  }

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
