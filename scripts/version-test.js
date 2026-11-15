#!/usr/bin/env node
// Ett test per krav: F-79–F-82 (versionssidan och Klart-mejlet till Leo).
// Kör skripten med gh och curl utbytta mot bash-funktioner, utan nät.
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { spawnSync } = require('child_process');

const rot = path.join(__dirname, '..');
const yml = fs.readFileSync(path.join(rot, '.github/workflows/mejl-version.yml'), 'utf8');

function bash(skript, env = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'version-'));
  const ut = path.join(dir, 'ut.txt').replace(/\\/g, '/');
  fs.writeFileSync(ut, '');
  const k = spawnSync('bash', ['-c', skript], {
    cwd: rot, encoding: 'utf8',
    env: { ...process.env, UT: ut, RAKNARE: path.join(dir, 'n').replace(/\\/g, '/'), ...env },
  });
  return { ut: fs.readFileSync(ut, 'utf8'), kod: k.status, fel: k.stderr, std: k.stdout };
}

// Klart-mejlet med en sida som visar/inte visar versionen och en länk som svarar/inte svarar.
function klart(sidanVisar, lankenSvarar) {
  return bash(`
    curl() { local url="\${@: -1}"
      case "$url" in
        *leo-versioner*) ${sidanVisar ? 'echo "<h2>Version 56 – ny text</h2>"' : 'echo "<h2>Version 55 – gammal</h2>"'} ;;
        *) ${lankenSvarar ? 'echo ok' : 'return 22'} ;;
      esac; }
    gh() { printf '%s\\n---\\n' "$*" >> "$UT"; }
    export -f curl gh
    bash scripts/klart-till-leo.sh 132 "Version 56 – ny text" "https://df294cfa-leo.niklasstolpe.workers.dev"`,
  { KLART_FORSOK: '2', KLART_PAUS: '0' });
}

const tester = {
  'F-79 versionssidan väntar på den nya versionen i GitHubs lista': () => {
    const lista = (med) => `gh() { n=$(cat "$RAKNARE" 2>/dev/null || echo 0); n=$((n+1)); echo $n > "$RAKNARE";
      echo '{"tag_name":"v55","name":"Version 55","body":""}'; ${med} true; }; export -f gh;`;
    const k = bash(lista('[ "$n" -ge 3 ] && echo \'{"tag_name":"v56","name":"Version 56","body":""}\';') + ' bash scripts/versioner.sh v56',
      { VERSIONER_BARA_LISTA: '1', VERSIONER_PAUS: '0', VERSIONER_FORSOK: '5' });
    assert.strictEqual(k.kod, 0, k.fel);
    assert.ok(k.std.includes('"v56"'), 'v56 kom inte med');
    const aldrig = bash(lista('') + ' bash scripts/versioner.sh v56', { VERSIONER_BARA_LISTA: '1', VERSIONER_PAUS: '0', VERSIONER_FORSOK: '3' });
    assert.notStrictEqual(aldrig.kod, 0, 'byggdes utan v56');
    assert.ok(/v56 finns inte/.test(aldrig.fel), aldrig.fel);
    assert.ok(/versioner\.sh" \$\{n:\+"v\$n"\}/.test(fs.readFileSync(path.join(rot, 'scripts/version-release.sh'), 'utf8')), 'version-release.sh skickar inte med versionen');
  },
  'F-80 Leo får mejlet först när versionen syns på versionssidan': () => {
    const k = klart(false, true);
    assert.strictEqual(k.kod, 0, k.fel);
    const tillLeo = k.ut.split('---')[0];
    assert.ok(/syns inte på versionssidan än/.test(tillLeo), tillLeo);
    assert.ok(!tillLeo.includes('df294cfa'), 'länken skickades ändå');
    assert.ok(/klart-till-leo\.sh/.test(yml), 'mejl-version.yml använder inte kontrollen');
  },
  'F-81 länken i Klart-mejlet fungerar': () => {
    const bra = klart(true, true).ut.split('---')[0];
    assert.ok(bra.includes('Titta här: https://df294cfa-leo.niklasstolpe.workers.dev'), bra);
    const trasig = klart(true, false).ut.split('---')[0];
    assert.ok(!trasig.includes('df294cfa'), 'en trasig länk skickades');
    assert.ok(/fungerar inte just nu/.test(trasig), trasig);
  },
  'F-82 Niklas får ett mejl när versionen inte syns eller länken inte fungerar': () => {
    for (const [sida, lank] of [[false, true], [true, false]]) {
      const k = klart(sida, lank);
      assert.ok(/issue create .*--label mejl-ut/.test(k.ut) && /Till: Niklas/.test(k.ut), `inget mejl till Niklas (sida ${sida}, länk ${lank})`);
    }
    assert.ok(!/issue create/.test(klart(true, true).ut), 'Niklas fick mejl fast allt fungerade');
  },
};

let fel = 0;
for (const [namn, t] of Object.entries(tester)) {
  try { t(); console.log('✓ ' + namn); } catch (e) { fel++; console.log('✗ ' + namn + ': ' + e.message); }
}
process.exit(fel ? 1 : 0);
