#!/usr/bin/env node
// Var det Claude-abonnemangets gräns som stoppade körningen (F-68)? Läser körningens resultatfil.
// Skriver orsaken till loggen (F-70) på stderr, och på stdout (till $GITHUB_OUTPUT) grans=ja samt
// aterstalls=<UTC-tid> när felet säger när gränsen släpper (F-72).
const fs = require('fs');

function resultat(text) {
  return [].concat(JSON.parse(text)).reverse().find((x) => x.type === 'result') ?? {};
}

function arGransen(r) {
  return r.is_error === true &&
    (r.api_error_status === 429 || /\b(usage|rate|session|weekly|monthly|hit your)\b.*\blimit\b|\blimit (reached|exceeded)\b/i.test(String(r.result ?? '')));
}

const MANADER = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// Hur många ms tidszonen ligger före UTC vid tiden t.
function forskjutning(t, zon) {
  const d = {};
  for (const { type, value } of new Intl.DateTimeFormat('en-US', {
    timeZone: zon, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
  }).formatToParts(new Date(t))) d[type] = Number(value);
  return Date.UTC(d.year, d.month - 1, d.day, d.hour, d.minute, d.second) - Math.floor(t / 1000) * 1000;
}

// "resets 9pm (UTC)", "resets 9:30pm (Europe/Stockholm)", "resets Nov 8, 5am (UTC)" → nästa sådan tid efter nu, i UTC.
function aterstalls(text, nu = Date.now()) {
  const m = String(text ?? '').match(/resets\s+(?:([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(?:at\s+)?)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*\(([^)]+)\)/i);
  if (!m) return null;
  const [, man, dag, tim, min, ampm, zon] = m;
  try {
    const timme = (Number(tim) % 12) + (ampm.toLowerCase() === 'pm' ? 12 : 0);
    const minut = Number(min || 0);
    const idag = new Date(nu + forskjutning(nu, zon));
    const tid = (ar, manad, d) => {
      const lokal = Date.UTC(ar, manad, d, timme, minut);
      const t = lokal - forskjutning(lokal, zon);
      return t - (forskjutning(t, zon) - forskjutning(lokal, zon));
    };
    let t;
    if (man) {
      const manad = MANADER.indexOf(man.toLowerCase());
      if (manad < 0) return null;
      t = tid(idag.getUTCFullYear(), manad, Number(dag));
      if (t < nu - 864e5) t = tid(idag.getUTCFullYear() + 1, manad, Number(dag));
    } else {
      t = tid(idag.getUTCFullYear(), idag.getUTCMonth(), idag.getUTCDate());
      if (t <= nu) t = tid(idag.getUTCFullYear(), idag.getUTCMonth(), idag.getUTCDate() + 1);
    }
    return Number.isFinite(t) ? new Date(t).toISOString().replace(/\.\d{3}Z$/, 'Z') : null;
  } catch {
    return null; // okänd tidszon
  }
}

// Tiden för det nya försöket i Leos besked (F-74), svensk tid och fem minuters marginal.
function svenskTid(iso, nu = Date.now()) {
  const t = Date.parse(iso);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(String(iso)) || isNaN(t)) return null;
  const sv = (opt, d) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm', ...opt }).format(new Date(d));
  const nar = t + 5 * 60e3;
  const kl = 'kl ' + sv({ hour: '2-digit', minute: '2-digit' }, nar);
  return sv({}, nar) === sv({}, nu) ? kl : 'den ' + sv({ day: 'numeric', month: 'long' }, nar) + ' ' + kl;
}

if (require.main === module && process.argv[2] === '--svensk-tid') {
  const t = svenskTid(process.argv[3]);
  if (!t) process.exit(1);
  console.log(t);
} else if (require.main === module) {
  const r = resultat(fs.readFileSync(process.argv[2], 'utf8'));
  if (r.is_error) console.error('Claudes fel: ' + (r.api_error_status ?? '-') + ' ' + String(r.result ?? '').slice(0, 200));
  if (arGransen(r)) {
    console.log('grans=ja');
    const t = aterstalls(r.result);
    if (t) console.log('aterstalls=' + t);
  }
}

module.exports = { resultat, arGransen, aterstalls, svenskTid };
