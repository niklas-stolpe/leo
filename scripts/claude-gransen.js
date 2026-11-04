#!/usr/bin/env node
// Var det Claude-abonnemangets gräns som stoppade körningen (F-68)? Läser körningens resultatfil.
// Skriver orsaken till loggen (F-70) på stderr och grans=ja på stdout, som går till $GITHUB_OUTPUT.
const fs = require('fs');

function resultat(text) {
  return [].concat(JSON.parse(text)).reverse().find((x) => x.type === 'result') ?? {};
}

function arGransen(r) {
  return r.is_error === true &&
    (r.api_error_status === 429 || /\b(usage|rate|session|weekly|monthly|hit your)\b.*\blimit\b|\blimit (reached|exceeded)\b/i.test(String(r.result ?? '')));
}

if (require.main === module) {
  const r = resultat(fs.readFileSync(process.argv[2], 'utf8'));
  if (r.is_error) console.error('Claudes fel: ' + (r.api_error_status ?? '-') + ' ' + String(r.result ?? '').slice(0, 200));
  if (arGransen(r)) console.log('grans=ja');
}

module.exports = { resultat, arGransen };
