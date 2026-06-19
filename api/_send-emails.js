// Shared module: sends transactional emails via Brevo when a lead comes in.
// Web API format (fetch), not Express. Never throws — email failure must not
// block the user response.

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

const PRODUIT_LABELS = {
  'credit': 'Crédit privé',
  'credit-prive': 'Crédit privé',
  'assurance': 'Assurance maladie',
  'assurance-maladie': 'Assurance maladie',
  'pilier': '3ème pilier',
  '3eme-pilier': '3ème pilier',
  'patrimoine': 'Choses & Biens',
  'assurance-nouveau-arrive': 'Assurance maladie (nouvel arrivant)',
  'assurance-prenatale': 'Assurance maladie (prénatale)'
};

function produitLabel(produit) {
  return PRODUIT_LABELS[produit] || produit || '—';
}

// Labels for funnel / product-specific fields shown in the broker email.
const FIELD_LABELS = {
  heure_contact: 'Horaire de contact souhaité',
  // Identité
  date_naissance: 'Date de naissance',
  nationalite: 'Nationalité',
  permis: 'Permis',
  type_permis: 'Type de permis',
  date_entree: "Date d'entrée",
  adresse: 'Adresse',
  npa: 'NPA',
  code_postal: 'Code postal',
  localite: 'Localité',
  canton: 'Canton',
  // Crédit
  montant: 'Montant',
  duree: 'Durée (mois)',
  objet_credit: 'Objet du crédit',
  docs_envoyes: 'Documents envoyés',
  etat_civil: 'État civil',
  salaire_net: 'Salaire net',
  salaire_secondaire: 'Salaire secondaire',
  debut_activite: "Début d'activité",
  logement_type: 'Type de logement',
  loyer: 'Loyer',
  primes_maladie: 'Primes maladie',
  // Assurance
  annee_naissance: 'Année de naissance',
  nombre_personnes: 'Nombre de personnes',
  medecin_famille: 'Médecin de famille',
  notes: 'Commentaire',
  commentaire: 'Commentaire',
  // Prénatale
  date_accouchement: "Date d'accouchement",
  prenom_bebe: 'Prénom du bébé',
  caisse_lamal: 'Caisse LAMal',
  caisse_lca: 'Caisse LCA',
  // Pilier
  situation_professionnelle: 'Situation professionnelle',
  revenu_annuel: 'Revenu annuel',
  pilier_existant: '3ème pilier existant',
  type_pilier_existant: 'Type de pilier existant',
  institution_pilier: 'Institution',
  montant_verse: 'Montant versé',
  periodicite_versement: 'Périodicité du versement',
  objectif: 'Objectif',
  // Patrimoine
  souhaits: 'Souhaits',
  assurances_souhaitees: 'Assurances souhaitées',
  inscrit_commune: 'Inscrit à la commune'
};

function fieldLabel(key) {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  // Fallback: prettify the key (snake_case → "Snake case")
  const pretty = String(key).replace(/_/g, ' ');
  return pretty.charAt(0).toUpperCase() + pretty.slice(1);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Renders a value that may be a primitive, array or object into readable HTML.
function renderValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) {
    if (value.length === 0) return '—';
    return value
      .map((item) => {
        if (item && typeof item === 'object') {
          return Object.entries(item)
            .filter(([, v]) => v !== null && v !== undefined && v !== '')
            .map(([k, v]) => `${escapeHtml(fieldLabel(k))}: ${escapeHtml(v)}`)
            .join(', ');
        }
        return escapeHtml(item);
      })
      .map((line) => `• ${line}`)
      .join('<br>');
  }
  if (typeof value === 'object') {
    return Object.entries(value)
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => `${escapeHtml(fieldLabel(k))}: ${escapeHtml(v)}`)
      .join('<br>') || '—';
  }
  return escapeHtml(value);
}

function leadHtml(lead, produitTraduit) {
  const prenom = escapeHtml(lead.prenom || '');
  const heure = lead.dados && lead.dados.heure_contact;
  const heureBlock = heure
    ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#444;">
         Vous avez indiqué préférer être contacté&nbsp;: <strong style="color:#2B2FD4;">${escapeHtml(heure)}</strong>.
       </p>`
    : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
  <title>Romero Finances</title>
</head>
<body style="margin:0;padding:0;background-color:#F7F8FF;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F8FF;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(26,27,143,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:#1A1B8F;padding:32px 32px;text-align:center;">
              <span style="font-family:'Playfair Display',Georgia,serif;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">Romero Finances</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;font-family:'DM Sans',Arial,sans-serif;">
              <h1 style="margin:0 0 16px;font-size:20px;color:#1A1B8F;font-weight:700;">Bonjour ${prenom},</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#444;">
                Nous confirmons avoir bien reçu votre demande relative à
                <strong style="color:#2B2FD4;">${escapeHtml(produitTraduit)}</strong>.
              </p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#444;">
                Un conseiller va vous contacter dans les <strong style="color:#2B2FD4;">24 heures</strong> (jours ouvrables) afin de vous accompagner.
              </p>
              ${heureBlock}
              <p style="margin:24px 0 4px;font-size:15px;line-height:1.6;color:#444;">Cordialement,</p>
              <p style="margin:0;font-size:15px;line-height:1.6;color:#1A1B8F;font-weight:700;">L'équipe Romero Finances</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;background-color:#F7F8FF;border-top:1px solid #E6E8FF;font-family:'DM Sans',Arial,sans-serif;">
              <p style="margin:0 0 6px;font-size:12px;line-height:1.5;color:#999;">
                Romero Finances · contact@romerofinances.ch · romerofinances.ch
              </p>
              <p style="margin:0;font-size:12px;line-height:1.5;color:#bbb;">
                Ceci est un message automatique, merci de ne pas y répondre.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function brokerHtml(lead, produitTraduit) {
  const prenom = lead.prenom || '';
  const nom = lead.nom || '';
  const email = lead.email || '';
  const telephone = lead.telephone || '';
  const dados = lead.dados && typeof lead.dados === 'object' ? lead.dados : {};
  const recu = new Date().toLocaleString('fr-CH', { timeZone: 'Europe/Zurich' });

  const row = (label, valueHtml) =>
    `<tr>
       <td style="padding:8px 12px;border:1px solid #ddd;background-color:#f5f5f5;font-weight:bold;width:40%;vertical-align:top;">${escapeHtml(label)}</td>
       <td style="padding:8px 12px;border:1px solid #ddd;vertical-align:top;">${valueHtml}</td>
     </tr>`;

  // Identity table
  let identityRows = '';
  identityRows += row('Produit', escapeHtml(produitTraduit));
  identityRows += row('Prénom', escapeHtml(prenom) || '—');
  identityRows += row('Nom', escapeHtml(nom) || '—');
  identityRows += row('Email', email ? `<a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>` : '—');
  identityRows += row('Téléphone', telephone ? `<a href="tel:${escapeHtml(telephone)}">${escapeHtml(telephone)}</a>` : '—');
  if (dados.heure_contact) {
    identityRows += row('Horaire de contact souhaité', escapeHtml(dados.heure_contact));
  }
  identityRows += row('Reçu le', escapeHtml(recu));

  // Details table (everything else in dados, excluding heure_contact)
  const detailEntries = Object.entries(dados).filter(
    ([k, v]) => k !== 'heure_contact' && v !== null && v !== undefined && v !== ''
  );
  let detailsSection = '';
  if (detailEntries.length) {
    const detailRows = detailEntries
      .map(([k, v]) => row(fieldLabel(k), renderValue(v)))
      .join('');
    detailsSection = `
      <h2 style="font-family:Arial,sans-serif;font-size:16px;color:#1A1B8F;margin:24px 0 8px;">Détails de la demande</h2>
      <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;color:#333;">
        ${detailRows}
      </table>`;
  }

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:16px;background-color:#ffffff;font-family:Arial,sans-serif;">
  <div style="max-width:640px;margin:0 auto;">
    <h1 style="font-size:18px;color:#1A1B8F;margin:0 0 16px;">🔔 Nouveau lead — ${escapeHtml(produitTraduit)}</h1>
    <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;color:#333;">
      ${identityRows}
    </table>
    ${detailsSection}
  </div>
</body>
</html>`;
}

async function sendOneEmail(payload, label = 'email') {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('Missing BREVO_API_KEY');

  // [diagnóstico] payload exato enviado ao Brevo (truncado a 500 chars)
  console.log(`Brevo payload (${label}):`, JSON.stringify(payload).slice(0, 500));

  const response = await fetch(BREVO_ENDPOINT, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    // [diagnóstico] resposta completa do Brevo em caso de erro
    const errText = await response.text();
    console.error('Brevo FULL error — status:', response.status, 'body:', errText);
    throw new Error(`Brevo ${response.status}: ${errText}`);
  }
  return true;
}

/**
 * Sends the lead confirmation email and the broker notification email.
 * Never throws — failures are logged and reflected in the return value.
 *
 * @param {Object} lead - { produit, prenom, nom, email, telephone, dados? }
 * @returns {Promise<{ leadEmailSent: boolean, brokerEmailSent: boolean }>}
 */
export async function sendLeadEmails(lead) {
  const result = { leadEmailSent: false, brokerEmailSent: false };

  // [diagnóstico] confirma presença da API key sem revelar a key inteira
  console.log(
    'BREVO_API_KEY present:', !!process.env.BREVO_API_KEY,
    'length:', (process.env.BREVO_API_KEY || '').length,
    'prefix:', (process.env.BREVO_API_KEY || '').slice(0, 8)
  );

  if (!lead || typeof lead !== 'object') {
    console.error('sendLeadEmails: invalid lead');
    return result;
  }

  const produitTraduit = produitLabel(lead.produit);
  const prenom = lead.prenom || '';
  const nom = lead.nom || '';

  // ── Email 1: confirmation to the lead ──────────────────────────────────────
  if (lead.email) {
    try {
      await sendOneEmail({
        sender: { name: 'Romero Finances', email: 'no-reply@romerofinances.ch' },
        to: [{ email: lead.email, name: prenom || undefined }],
        subject: 'Nous avons bien reçu votre demande',
        htmlContent: leadHtml(lead, produitTraduit)
      }, 'lead');
      result.leadEmailSent = true;
    } catch (err) {
      console.error('sendLeadEmails: lead email failed —', err && err.message ? err.message : err);
    }
  } else {
    console.error('sendLeadEmails: no lead email, skipping confirmation');
  }

  // ── Email 2: notification to the broker ────────────────────────────────────
  try {
    await sendOneEmail({
      sender: { name: 'Romero Finances Leads', email: 'no-reply@romerofinances.ch' },
      to: [{ email: 'contact@romerofinances.ch' }],
      subject: `Nouveau lead — ${produitTraduit} — ${prenom} ${nom}`.trim(),
      htmlContent: brokerHtml(lead, produitTraduit)
    }, 'broker');
    result.brokerEmailSent = true;
  } catch (err) {
    console.error('sendLeadEmails: broker email failed —', err && err.message ? err.message : err);
  }

  return result;
}

export default sendLeadEmails;
