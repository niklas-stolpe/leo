#!/usr/bin/env node
// Test av inkorgen mot kraven F-53 (filer i Leos mejl) och F-54 (startfilens behörigheter). Googles tjänster är
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

test('F-54: varje Google-tjänst som logiken använder står i startfilen', () => {
  const tjanster = (kod) => new Set(kod.match(/\b[A-Z][A-Za-z]*(App|Service)\b/g) || []);
  const saknas = [...tjanster(logik)].filter((t) => !tjanster(start).has(t));
  assert.deepStrictEqual(saknas, [], 'saknas i inkorg/Kod.gs: ' + saknas.join(', '));
});

test('F-53: bilder och filmer sparas på Drive och länkas i ärendet', () => {
  const { kor, logg } = inkorg({ bilagor: [bilaga('kapp.jpg', 'image/jpeg'), bilaga('kapp.mp4', 'video/mp4')] });
  kor();
  assert.deepStrictEqual(logg.sparade, ['kapp.jpg', 'kapp.mp4']);
  assert.match(logg.issues[0], /kapp\.jpg/);
  assert.match(logg.issues[0], /kapp\.mp4/);
  assert.strictEqual(logg.lasta, 1);
});

test('F-54: nekad Drive stoppar inte körningen, mejlet ligger kvar och Niklas larmas', () => {
  const { kor, logg } = inkorg({ bilagor: [bilaga('kapp.jpg', 'image/jpeg')], driveFel: true });
  assert.throws(kor);
  assert.strictEqual(logg.lasta, 0, 'mejlet ska förbli oläst så att det tas om hand när felet är rättat');
  assert.ok(logg.anrop > 0, 'stegen efter mottagningen ska ändå köras');
  assert.strictEqual(logg.larm.length, 1);
});

test('F-54: nekad Drive upptäcks i varje körning, även utan mejl med bilder', () => {
  const { kor, logg } = inkorg({ driveFel: true });
  assert.throws(kor);
  assert.strictEqual(logg.larm.length, 1);
});
