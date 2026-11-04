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
