#!/usr/bin/env node
// Ett test per krav: F-68–F-70, F-72–F-74, F-76 (Claudes gräns: besked och nytt försök; F-75 i inkorg-test.js).
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { spawnSync } = require('child_process');
const { resultat, arGransen, aterstalls } = require('./claude-gransen.js');

const rot = path.join(__dirname, '..');
const las = (f) => fs.readFileSync(path.join(rot, f), 'utf8');
const lib = las('scripts/lib.sh');
const yml = las('.github/workflows/claude.yml');
const start = lib.indexOf('grans_till_leo()');
const beskedet = start < 0 ? '' : lib.slice(start, lib.indexOf('git_nat()'));

const tester = {
  'F-68 gränsen känns igen och ger ett eget besked': () => {
    for (const r of [
      { is_error: true, result: "You've hit your usage limit" },
      { is_error: true, result: 'Claude usage limit reached' },
      { is_error: true, api_error_status: 429, result: '' },
    ]) assert.ok(arGransen(r), JSON.stringify(r));
    for (const r of [
      { is_error: false, result: 'Claude usage limit reached' },
      { is_error: true, result: 'Internal server error' },
    ]) assert.ok(!arGransen(r), JSON.stringify(r));
    assert.ok(/gräns/.test(beskedet), 'beskedet nämner inte gränsen');
    assert.ok(/outputs\.grans == 'ja'[\s\S]*grans_till_leo/.test(yml), 'claude.yml skickar inte beskedet');
    assert.ok(/outputs\.grans != 'ja'[\s\S]*stopp_till_leo/.test(yml), 'det vanliga beskedet går också ut');
  },
  'F-69 beskedet säger när Leo kan försöka igen': () => {
    assert.ok(/inom några timmar/.test(beskedet), 'tiden saknas');
    assert.ok(/försök igen/.test(beskedet), '"försök igen" saknas');
    assert.ok(!/direkt/.test(beskedet), 'beskedet lovar ett nytt försök direkt');
  },
  'F-70 felorsaken syns i loggen': () => {
    const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'grans-')), 'r.json');
    fs.writeFileSync(f, JSON.stringify([{ type: 'system' }, { type: 'result', is_error: true, result: 'Claude usage limit reached' }]));
    assert.strictEqual(resultat(fs.readFileSync(f, 'utf8')).result, 'Claude usage limit reached');
    const k = spawnSync(process.execPath, [path.join(__dirname, 'claude-gransen.js'), f], { encoding: 'utf8' });
    assert.ok(k.stderr.includes('Claude usage limit reached'), 'orsaken saknas i loggen');
    assert.strictEqual(k.stdout.trim(), 'grans=ja');
    assert.ok(/node scripts\/claude-gransen\.js/.test(yml), 'claude.yml kör inte skriptet');
  },
  'F-72 tiden när gränsen släpper läses ur felet': () => {
    const nu = Date.parse('2026-11-06T19:52:43Z');
    assert.strictEqual(aterstalls("You've hit your 5-hour limit · resets 9pm (UTC)", nu), '2026-11-06T21:00:00Z');
    assert.strictEqual(aterstalls('limit · resets 9pm (UTC)', Date.parse('2026-11-06T21:30:00Z')), '2026-11-07T21:00:00Z');
    assert.strictEqual(aterstalls('limit · resets 9:30pm (Europe/Stockholm)', nu), '2026-11-06T20:30:00Z');
    assert.strictEqual(aterstalls('weekly limit · resets Nov 11, 5am (Europe/Stockholm)', nu), '2026-11-11T04:00:00Z');
    assert.strictEqual(aterstalls('limit · resets 12am (UTC)', nu), '2026-11-07T00:00:00Z');
    assert.strictEqual(aterstalls('Internal server error', nu), null);
    assert.strictEqual(aterstalls('resets 9pm (Mars/Olympus)', nu), null);
    assert.ok(/outputs\.aterstalls/.test(yml), 'claude.yml tar inte vidare tiden');
  },
  'F-73 när gränsen har släppt försöker processen igen': () => {
    const k = bash(`gh() { if [ "$1 $2" = "variable list" ]; then printf '%s\\n' "LEO_IGEN_112 2026-11-06T21:00:00Z 42283355337" "LEO_IGEN_113 2099-01-01T00:00:00Z 5" "LEO_IGEN_114 ; rm -rf / 6"; else echo "$*" >> "$UT"; fi; }
      export -f gh; bash scripts/grans-igen.sh`);
    assert.ok(k.ut.includes('run rerun 42283355337 --failed'), 'inget nytt försök: ' + k.ut + k.fel);
    assert.ok(k.ut.includes('variable delete LEO_IGEN_112'), 'tiden tas inte bort');
    assert.ok(!/rerun 5\b/.test(k.ut), 'försöker innan tiden har passerat');
    assert.ok(!/rerun 6\b/.test(k.ut) && k.ut.includes('variable delete LEO_IGEN_114'), 'ett trasigt värde körs');
    const igen = las('.github/workflows/gransen-igen.yml');
    assert.ok(/cron:/.test(igen) && /bash scripts\/grans-igen\.sh/.test(igen), 'gransen-igen.yml kör inte skriptet');
    assert.ok(/gh variable set "LEO_IGEN_\$ARENDE"/.test(yml), 'claude.yml planerar inget försök');
  },
  'F-74 beskedet säger vilken tid det nya försöket görs': () => {
    const k = bash('gh() { echo "$*" >> "$UT"; }; source scripts/lib.sh; grans_till_leo 112 "gränsen" 2026-11-06T21:00:00Z');
    assert.ok(k.ut.includes('Jag försöker igen själv den 6 november kl 22:05'), 'klockslaget saknas: ' + k.ut + k.fel);
    assert.ok(k.ut.includes('nytt-forsok: 2026-11-06T21:00:00Z'), 'raden till vakten saknas');
    const om = new Date(Date.now() + 36e5);
    const k2 = bash(`gh() { echo "$*" >> "$UT"; }; source scripts/lib.sh; grans_till_leo 112 x ${om.toISOString().replace(/\.\d+Z$/, 'Z')}`);
    const hm = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm', hour: '2-digit', minute: '2-digit' }).format(new Date(om.getTime() + 3e5));
    const sammaDag = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm' }).format(new Date(om.getTime() + 3e5)) ===
      new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm' }).format(new Date());
    if (sammaDag) assert.ok(k2.ut.includes('Jag försöker igen själv kl ' + hm + '.'), 'samma dag: ' + k2.ut);
    const k3 = bash('gh() { echo "$*" >> "$UT"; }; source scripts/lib.sh; grans_till_leo 112 x ""');
    assert.ok(k3.ut.includes('inom några timmar') && !k3.ut.includes('nytt-forsok'), 'utan tid: ' + k3.ut);
  },
  'F-76 har Claude svarat görs inget planerat försök': () => {
    assert.ok(/needs\.claude\.result == 'success'[^\n]*\n\s*run: gh variable delete "LEO_IGEN_\$ARENDE"/.test(yml), 'det planerade försöket tas inte bort');
  },
};

function bash(skript) {
  const ut = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'grans-')), 'ut.txt');
  fs.writeFileSync(ut, '');
  const k = spawnSync('bash', ['-c', skript], { cwd: rot, encoding: 'utf8', env: { ...process.env, UT: ut.replace(/\\/g, '/') } });
  return { ut: fs.readFileSync(ut, 'utf8'), fel: k.stderr };
}

let fel = 0;
for (const [namn, t] of Object.entries(tester)) {
  try { t(); console.log('✓ ' + namn); } catch (e) { fel++; console.log('✗ ' + namn + ': ' + e.message); }
}
process.exit(fel ? 1 : 0);
