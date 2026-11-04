#!/usr/bin/env node
// Ett test per krav: F-68–F-70 (besked till Leo när Claudes gräns är nådd).
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { spawnSync } = require('child_process');
const { resultat, arGransen } = require('./claude-gransen.js');

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
};

let fel = 0;
for (const [namn, t] of Object.entries(tester)) {
  try { t(); console.log('✓ ' + namn); } catch (e) { fel++; console.log('✗ ' + namn + ': ' + e.message); }
}
process.exit(fel ? 1 : 0);
