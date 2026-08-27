// Relatorio de abandono por etapa. Uso: node scripts/funnel-report.mjs [dias]
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(__dirname, '..', '.env'), 'utf8').split(/\r?\n/)
    .filter(l => l.includes('='))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()]; })
);

const DAYS = parseInt(process.argv[2] || '7', 10);
const since = new Date(Date.now() - DAYS * 864e5).toISOString();
const H = { apikey: env.SUPABASE_SECRET_KEY, Authorization: 'Bearer ' + env.SUPABASE_SECRET_KEY };

const r = await fetch(
  `${env.SUPABASE_URL}/rest/v1/funnel_events?select=funnel,step,step_name,session&created_at=gte.${since}&limit=50000`,
  { headers: H });

if (!r.ok) {
  console.log('Erro', r.status, (await r.text()).slice(0, 200));
  process.exit(1);
}
const rows = await r.json();
if (!rows.length) { console.log(`Sem eventos nos ultimos ${DAYS} dias.`); process.exit(0); }

// Unique sessions per step (a person revisiting a step counts once)
const byFunnel = {};
for (const e of rows) {
  const f = (byFunnel[e.funnel] ||= {});
  const k = e.step + '|' + (e.step_name || '');
  (f[k] ||= new Set()).add(e.session);
}

console.log(`\nAbandono por etapa — ultimos ${DAYS} dias (${rows.length} eventos)\n`);
for (const [funnel, steps] of Object.entries(byFunnel)) {
  const ordered = Object.entries(steps)
    .map(([k, set]) => ({ step: +k.split('|')[0], name: k.split('|')[1], n: set.size }))
    .sort((a, b) => a.step - b.step);
  const first = ordered[0]?.n || 0;
  console.log(`── ${funnel} ${'─'.repeat(Math.max(2, 44 - funnel.length))}`);
  let prev = null;
  for (const s of ordered) {
    const label = s.step === 99 ? 'submit' : `${s.step}. ${s.name}`;
    const drop  = prev === null ? '' : `  queda ${(100 - s.n / prev * 100).toFixed(0)}%`;
    const total = first ? (s.n / first * 100).toFixed(0) : 0;
    const bar   = '█'.repeat(Math.round((first ? s.n / first : 0) * 24));
    console.log(`  ${label.padEnd(18)} ${String(s.n).padStart(4)}  ${String(total).padStart(3)}%  ${bar}${drop}`);
    prev = s.n;
  }
  console.log('');
}

// ── Reparticao por origem do anuncio (posicionamento / campanha) ───────────
const comOrigem = rows.filter(r => r.origem);
if (comOrigem.length) {
  const porOrigem = {};
  for (const r of comOrigem) {
    const o = porOrigem[r.origem] || (porOrigem[r.origem] = { ses: new Set(), avanc: new Set(), sub: new Set() });
    o.ses.add(r.session);
    if (r.step > 1 && r.step !== 99) o.avanc.add(r.session);
    if (r.step_name === 'submit') o.sub.add(r.session);
  }
  console.log('\nPOR ORIGEM DO ANUNCIO');
  console.log('  ' + 'origem'.padEnd(44) + 'visitas  avancaram   leads');
  const ord = Object.entries(porOrigem).sort((a, b) => b[1].ses.size - a[1].ses.size);
  for (const [o, v] of ord) {
    const pct = v.ses.size ? Math.round(v.avanc.size / v.ses.size * 100) : 0;
    console.log('  ' + o.slice(0, 43).padEnd(44)
      + String(v.ses.size).padStart(6)
      + (v.avanc.size + ' (' + pct + '%)').padStart(11)
      + String(v.sub.size).padStart(8));
  }
} else {
  console.log('\n(sem dados de origem ainda - falta utm_content={{placement}} nos Parametros de URL do Meta)');
}
