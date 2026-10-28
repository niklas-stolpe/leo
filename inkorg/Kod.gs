/**
 * Leos inkorg – STARTFIL. Klistras in i Apps Script en gång och behöver sedan aldrig ändras.
 *
 * Var 5:e minut hämtar den logiken från repot (inkorg/logik.js på main) och kör den – men bara om
 * signaturen i inkorg/logik.sig stämmer med nyckeln i Skriptegenskapen KOD_NYCKEL. Nyckeln finns bara här
 * och hos Admin (scripts/signera-inkorg.sh), aldrig på GitHub. Ändrar någon logiken utan att kunna signera
 * – till exempel Claude på GitHub, lurad av ett mejl – körs den inte, och Niklas får ett mejl.
 *
 * Skriptegenskaper: GITHUB_TOKEN, TILLATNA (se inkorg/README.md) och KOD_NYCKEL.
 */

const KALLA = 'https://raw.githubusercontent.com/niklas-stolpe/leo/main/inkorg/';

/** Körs av utlösaren var 5:e minut. */
function korInkorg() {
  const las = LockService.getScriptLock();
  if (!las.tryLock(10000)) return;
  try {
    const kod = logik();
    if (kod) new Function(kod + '\n;return inkorgen;')()();
  } finally {
    las.releaseLock();
  }
}

/** Hämtar och kontrollerar logiken. Godkänd kod sparas 10 minuter, så att repot inte frågas varje gång. */
function logik() {
  const cache = CacheService.getScriptCache();
  const sparad = cache.get('logik');
  if (sparad) return sparad;
  const hamta = (fil) => UrlFetchApp.fetch(KALLA + fil + '?t=' + Date.now(), { muteHttpExceptions: true });
  const kodSvar = hamta('logik.js');
  const sigSvar = hamta('logik.sig');
  if (kodSvar.getResponseCode() !== 200 || sigSvar.getResponseCode() !== 200) {
    return larma(`logiken kunde inte hämtas från GitHub (${kodSvar.getResponseCode()}/${sigSvar.getResponseCode()}).`);
  }
  const kod = kodSvar.getContentText('UTF-8');
  const nyckel = PropertiesService.getScriptProperties().getProperty('KOD_NYCKEL');
  if (!nyckel) return larma('Skriptegenskapen KOD_NYCKEL saknas.');
  const sig = Utilities.computeHmacSha256Signature(kod, nyckel, Utilities.Charset.UTF_8)
    .map((b) => ((b + 256) % 256).toString(16).padStart(2, '0'))
    .join('');
  if (sig !== sigSvar.getContentText().trim()) {
    return larma('signaturen för inkorg/logik.js stämmer inte – den nya koden körs inte. Har den signerats med scripts/signera-inkorg.sh?');
  }
  cache.put('logik', kod, 600);
  return kod;
}

/** Inkorgen står still: mejla Niklas (högst var 6:e timme). */
function larma(varfor) {
  const cache = CacheService.getScriptCache();
  if (!cache.get('larm')) {
    cache.put('larm', '1', 6 * 3600);
    const tillatna = String(PropertiesService.getScriptProperties().getProperty('TILLATNA') || '');
    const niklas = (tillatna.split(',').find((x) => /=\s*Niklas\s*$/.test(x)) || '').split('=')[0].trim();
    if (niklas) GmailApp.sendEmail(niklas, 'Leos inkorg står still', `Inkorgen kör inte: ${varfor}\n\nMejl till och från Leo väntar tills det är rättat.`);
  }
  Logger.log('Inkorgen kör inte: ' + varfor);
  return null;
}

/** Körs en gång för hand: skapar utlösaren och etiketten "Hanterad". */
function installera() {
  ScriptApp.getProjectTriggers().forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('korInkorg').timeBased().everyMinutes(5).create();
  GmailApp.createLabel('Hanterad');
  Logger.log('Klart: inkorgen läses var 5:e minut.');
}
