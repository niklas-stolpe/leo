#!/usr/bin/env node
// Test av inkorgen mot kraven F-53–F-59. Googles tjänster är
// låtsade, så testet kör bara logiken; den riktiga behörigheten kontrolleras av kollaBehorigheter() i varje körning.
//   node scripts/inkorg-test.js [ref]   (utan ref: filerna som de ligger på disk)
const { execFileSync } = require('child_process');
const { readFileSync } = require('fs');
const assert = require('assert');
const vm = require('vm');

const ref = process.argv[2];
const las = (fil) => (ref ? execFileSync('git', ['show', `${ref}:${fil}`], { encoding: 'utf8' }) : readFileSync(fil, 'utf8'));
const logik = las('inkorg/logik.js');
const start = las('inkorg/Kod.gs');

const bilaga = (namn, typ) => ({ getName: () => namn, getContentType: () => typ, copyBlob: () => ({ setName: () => ({ namn }) }) });

function inkorg({ bilagor = [], driveFel = false }) {
  const logg = { sparade: [], issues: [], lasta: 0, larm: [], anrop: 0 };
  const stoppa = () => { if (driveFel) throw new Error('Specified permissions are not sufficient to call DriveApp'); };
  const mapp = {
    createFile: (blob) => {
      logg.sparade.push(blob.namn);
      return { getName: () => blob.namn, getId: () => 'id' + logg.sparade.length, setSharing() {} };
    },
  };
  const mejl = {
    isUnread: () => true,
    markRead: () => { logg.lasta++; },
    getFrom: () => 'Leo <leo@exempel.se>',
    getSubject: () => 'Käpp',
    getDate: () => new Date('2026-11-04'),
    getPlainBody: () => 'Hej',
    getAttachments: () => bilagor,
    getRawContent: () => 'Authentication-Results: mx.google.com; dmarc=pass header.from=exempel.se\n\nHej',
  };
  const trad = { getId: () => 't1', getMessages: () => [mejl], addLabel() {} };
  const miljo = {
    console, Date, Error, Object, String, Number, JSON, RegExp, Math,
    larma: (varfor) => logg.larm.push(varfor),
    DriveApp: {
      Access: {},
      Permission: {},
      getFoldersByName: () => { stoppa(); return { hasNext: () => true, next: () => mapp }; },
      createFolder: () => mapp,
    },
    GmailApp: { getUserLabelByName: () => ({}), createLabel: () => ({}), search: () => (bilagor.length ? [trad] : []) },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => (k === 'TILLATNA' ? 'leo@exempel.se=Leo' : null),
        setProperty() {},
        deleteProperty() {},
        getProperties: () => ({}),
      }),
    },
    UrlFetchApp: {
      fetch: (url, val) => {
        logg.anrop++;
        if (val.method === 'POST') logg.issues.push(JSON.parse(val.payload).body);
        return { getResponseCode: () => 200, getContentText: () => (val.method === 'POST' ? '{"number":200}' : '[]') };
      },
    },
  };
  vm.createContext(miljo);
  vm.runInContext(logik, miljo);
  return { kor: () => vm.runInContext('inkorgen()', miljo), logg };
}

const test = (namn, f) => { f(); console.log('✓ ' + namn); };

test('F-56: varje Google-tjänst som logiken använder står i startfilen', () => {
  const tjanster = (kod) => new Set(kod.match(/\b[A-Z][A-Za-z]*(App|Service)\b/g) || []);
  const saknas = [...tjanster(logik)].filter((t) => !tjanster(start).has(t));
  assert.deepStrictEqual(saknas, [], 'saknas i inkorg/Kod.gs: ' + saknas.join(', '));
});

const bild = bilaga('kapp.jpg', 'image/jpeg');
const film = bilaga('kapp.mp4', 'video/mp4');

test('F-53: en bild sparas på Drive', () => {
  const { kor, logg } = inkorg({ bilagor: [bild] });
  kor();
  assert.deepStrictEqual(logg.sparade, ['kapp.jpg']);
});

test('F-54: en film sparas på Drive', () => {
  const { kor, logg } = inkorg({ bilagor: [film] });
  kor();
  assert.deepStrictEqual(logg.sparade, ['kapp.mp4']);
});

test('F-55: varje sparad fil har en länk i ärendet', () => {
  const { kor, logg } = inkorg({ bilagor: [bild, film] });
  kor();
  assert.match(logg.issues[0], /id=id1\b.*kapp\.jpg/);
  assert.match(logg.issues[0], /id=id2\b.*kapp\.mp4/);
});

test('F-57: nekad Drive larmar Niklas även utan mejl från Leo', () => {
  const { kor, logg } = inkorg({ driveFel: true });
  assert.throws(kor);
  assert.strictEqual(logg.larm.length, 1);
});

test('F-58: nekad Drive stoppar inte det som ska ut till Leo', () => {
  const { kor, logg } = inkorg({ bilagor: [bild], driveFel: true });
  assert.throws(kor);
  assert.ok(logg.anrop > 0, 'stegen efter mottagningen ska ändå köras');
});

test('F-59: ett mejl som inte gick att ta emot ligger kvar oläst', () => {
  const { kor, logg } = inkorg({ bilagor: [bild], driveFel: true });
  assert.throws(kor);
  assert.strictEqual(logg.lasta, 0);
});

// Vakten (vakta) mot ett ärende där gränsen har stoppat Claude: Leos mejl, Claudes felkommentar och beskedet om gränsen.
function vakt(kommentarer, nu) {
  const logg = { larm: [], mejl: [] };
  const miljo = {
    console, Error, Object, String, Number, JSON, RegExp, Math, isNaN,
    Date: class extends Date { constructor(...a) { super(...(a.length ? a : [nu])); } static now() { return nu; } },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => (k === 'TILLATNA' ? 'niklas@exempel.se=Niklas' : null),
        setProperty() {},
        getProperties: () => ({ 'issue:112': 't1' }),
      }),
    },
    GmailApp: { sendEmail: (till, amne) => logg.mejl.push(amne) },
    UrlFetchApp: {
      fetch: (url, val) => {
        if (val.method === 'POST') logg.larm.push(JSON.parse(val.payload).body);
        const svar = /comments/.test(url) ? kommentarer : { state: 'closed', created_at: '2026-11-01T00:00:00Z' };
        return { getResponseCode: () => 200, getContentText: () => JSON.stringify(svar) };
      },
    },
  };
  vm.createContext(miljo);
  vm.runInContext(logik, miljo);
  vm.runInContext('vakta()', miljo);
  return logg;
}

test('F-75: vakten larmar inte innan det nya försöket efter gränsen har gjorts', () => {
  const k = (id, login, created_at, body) => ({ id, user: { login }, created_at, body });
  const kommentarer = [
    k(1, 'nstolpeflir', '2026-11-06T19:51:48Z', '@claude\n\n**Svar från Leo via mejl:**\n\nTa bort kontakt'),
    k(2, 'claude[bot]', '2026-11-06T19:52:25Z', '**Claude encountered an error after 0s**'),
    k(3, 'nstolpeflir', '2026-11-06T19:52:54Z', 'Admin: gränsen\nnytt-forsok: 2026-11-06T21:00:00Z\n\n[[till-leo]]\nHej Leo! Jag försöker igen själv kl 22:05. Du får ett mejl när jag har gjort det.\n[[/till-leo]]'),
  ];
  // 70 minuter efter Leos mejl men före försöket: tyst.
  assert.deepStrictEqual(vakt(kommentarer, Date.parse('2026-11-06T21:01:00Z')).larm, []);
  // En timme efter den planerade tiden utan svar: larm.
  assert.strictEqual(vakt(kommentarer, Date.parse('2026-11-06T22:01:00Z')).larm.length, 1);
  // Utan planerat försök larmar vakten som förut efter 30 minuter.
  assert.strictEqual(vakt(kommentarer.slice(0, 2), Date.parse('2026-11-06T20:25:00Z')).larm.length, 1);
});
