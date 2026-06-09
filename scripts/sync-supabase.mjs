// sync-supabase.mjs — syncs Supabase table columns with API field definitions
import https from 'https';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env
const envPath = join(__dirname, '..', '.env');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8').split('\n')
    .filter(l => l.includes('='))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()]; })
);

const SUPABASE_URL = env.SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SECRET_KEY;
const PUB_KEY = env.SUPABASE_PUBLISHABLE_KEY;

// Expected fields per table (derived from api/leads.js payload mappings)
const EXPECTED = {
  leads_pilier: [
    'prenom', 'nom', 'email', 'telephone', 'marketing',
    'date_naissance', 'canton', 'situation_professionnelle', 'revenu_annuel',
    'pilier_existant', 'type_pilier_existant', 'institution_pilier',
    'montant_verse', 'objectif', 'commentaire'
  ],
  leads_assurance: [
    'prenom', 'nom', 'email', 'telephone', 'marketing',
    'annee_naissance', 'canton', 'nombre_personnes', 'medecin_famille',
    'commentaire', 'personnes'
  ],
  leads_assurance_nouveau_arrive: [
    'prenom', 'nom', 'email', 'telephone', 'marketing',
    'date_naissance', 'adresse', 'npa', 'localite',
    'inscrit_commune', 'permis', 'date_entree', 'nombre_personnes',
    'personnes_supplementaires'
  ],
  leads_assurance_prenatale: [
    'prenom', 'nom', 'email', 'telephone', 'marketing',
    'date_naissance_preneur', 'date_accouchement', 'prenom_bebe',
    'lamal_caisse', 'lca_caisse', 'npa', 'localite'
  ],
  leads_patrimoine: [
    'prenom', 'nom', 'email', 'telephone', 'marketing',
    'date_naissance', 'npa', 'commentaire', 'souhait', 'besoin',
    'assurances_actuelles'
  ]
};

// Type mapping for column types
const COLUMN_TYPE = {
  revenu_annuel: 'INTEGER',
  annee_naissance: 'INTEGER',
  nombre_personnes: 'INTEGER',
  marketing: 'BOOLEAN',
  personnes: 'JSONB',
  personnes_supplementaires: 'JSONB',
  souhait: 'JSONB',
  besoin: 'JSONB',
  assurances_actuelles: 'JSONB',
  date_naissance: 'DATE',
  date_naissance_preneur: 'DATE',
  date_accouchement: 'DATE',
  date_entree: 'DATE',
  revenu_annuel: 'INTEGER',
  montant_verse: 'TEXT',
};
const defaultType = col => COLUMN_TYPE[col] || 'TEXT';

const BASE_HEADERS = {
  'User-Agent': 'node-sync-script/1.0',
  'Accept': 'application/json'
};

function httpGet(url, headers) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { ...BASE_HEADERS, ...headers } }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
  });
}

function httpPost(url, headers, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: { ...headers, 'Content-Length': Buffer.byteLength(data) }
    };
    const req = https.request(options, res => {
      let respData = '';
      res.on('data', d => respData += d);
      res.on('end', () => resolve({ status: res.statusCode, body: respData }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function getTableColumns(tableName) {
  // Use OpenAPI spec to get columns
  const res = await httpGet(`${SUPABASE_URL}/rest/v1/`, {
    'apikey': PUB_KEY,
    'Authorization': `Bearer ${PUB_KEY}`,
    'Accept': 'application/json'
  });
  if (res.status !== 200) throw new Error(`OpenAPI spec failed: ${res.status} ${res.body}`);
  const spec = JSON.parse(res.body);
  if (!spec.definitions || !spec.definitions[tableName]) {
    return null; // table not found
  }
  return Object.keys(spec.definitions[tableName].properties || {});
}

async function execSQL(sql) {
  // Use Supabase REST API SQL execution endpoint
  const res = await httpPost(
    `${SUPABASE_URL}/rest/v1/sql`,
    {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    },
    { query: sql }
  );
  return res;
}

async function main() {
  console.log('=== Syncing Supabase tables ===\n');

  // Get columns from OpenAPI spec (secret key required)
  const res = await httpGet(`${SUPABASE_URL}/rest/v1/`, {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`
  });
  if (res.status !== 200) {
    console.error('Failed to get OpenAPI spec:', res.status, res.body.substring(0, 200));
    process.exit(1);
  }
  const spec = JSON.parse(res.body);

  for (const [table, expectedCols] of Object.entries(EXPECTED)) {
    console.log(`\n--- ${table} ---`);

    const existing = spec.definitions?.[table]
      ? Object.keys(spec.definitions[table].properties || {})
      : null;

    if (!existing) {
      console.log(`  TABLE NOT FOUND in schema. Creating...`);
      // Build CREATE TABLE
      const colDefs = ['id UUID DEFAULT gen_random_uuid() PRIMARY KEY',
        'created_at TIMESTAMPTZ DEFAULT now()',
        'statut TEXT DEFAULT \'Nouveau\'',
        ...expectedCols.map(c => `${c} ${defaultType(c)}`)
      ].join(',\n  ');
      const createSQL = `CREATE TABLE IF NOT EXISTS public.${table} (\n  ${colDefs}\n);`;
      console.log('  SQL:', createSQL.substring(0, 80) + '...');
      const r = await execSQL(createSQL);
      console.log('  Result:', r.status, r.body.substring(0, 100));
      continue;
    }

    console.log(`  Existing columns: ${existing.join(', ')}`);

    const missing = expectedCols.filter(c => !existing.includes(c));

    if (missing.length === 0) {
      console.log('  ✓ All columns present');
    } else {
      console.log(`  Missing: ${missing.join(', ')}`);
      for (const col of missing) {
        const colType = defaultType(col);
        const sql = `ALTER TABLE public.${table} ADD COLUMN IF NOT EXISTS ${col} ${colType};`;
        console.log(`  Executing: ${sql}`);
        const r = await execSQL(sql);
        if (r.status >= 200 && r.status < 300) {
          console.log(`  ✓ Added column ${col}`);
        } else {
          console.log(`  ✗ Failed: ${r.status} ${r.body.substring(0, 150)}`);
        }
      }
    }
  }

  console.log('\n=== Done ===');
}

main().catch(console.error);
