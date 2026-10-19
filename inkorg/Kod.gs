/**
 * Leos inkorg (F-46) – Google Apps Script som körs i inkorgens eget Gmail-konto.
 *
 * Var 5:e minut:
 *  1. Nya mejl från tillåtna avsändare (TILLATNA, och bara om Gmail bekräftat avsändaren med DMARC)
 *     blir ett issue i niklas-stolpe/leo med etiketten "mejl" – eller en kommentar på samma issue om
 *     mejlet är ett svar i samma tråd. Texten börjar med "@claude", så Claude på GitHub tar över.
 *     Bilder sparas i inkorgens Google Drive (läsbara via länk) och länkas i issuet.
 *  2. Kommentarer på de issuena med text mellan <!-- till-leo --> och <!-- /till-leo --> skickas som
 *     mejlsvar i samma tråd. Allt annat på GitHub (loggar, länkar, teknik) når aldrig Leo.
 *
 * Inställningar: Projektinställningar → Skriptegenskaper (inte i koden – adresserna är personuppgifter):
 *   GITHUB_TOKEN  fine-grained token med Issues: Read and write på niklas-stolpe/leo
 *   TILLATNA      vem som får mejla, med namn: lowejkoleo@gmail.com=Leo,niklasstolpe@gmail.com=Niklas
 * Uppsättning: inkorg/README.md.
 * Koden ändras i repot och klistras in här igen – den här kopian är inte källan.
 */

const REPO = 'niklas-stolpe/leo';
const VERSIONSSIDAN = 'https://leo-versioner.niklasstolpe.workers.dev';
const START = '<!-- till-leo -->';
const SLUT = '<!-- /till-leo -->';
const MAX_PER_KORNING = 5;

/** Tillåtna avsändare: normaliserad adress → namn (Skriptegenskapen TILLATNA). */
function tillatna() {
  const lista = {};
  String(PropertiesService.getScriptProperties().getProperty('TILLATNA') || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .forEach((x) => {
      const [adr, namn] = x.split('=');
      lista[normal(adr)] = (namn || adr).trim();
    });
  return lista;
}

/** Körs av utlösaren var 5:e minut. */
function korInkorg() {
  const las = LockService.getScriptLock();
  if (!las.tryLock(10000)) return;
  try {
    hamtaNyaMejl();
    skickaSvar();
  } finally {
    las.releaseLock();
  }
}

/** Körs en gång för hand: skapar utlösaren och etiketten "Hanterad". */
function installera() {
  ScriptApp.getProjectTriggers().forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('korInkorg').timeBased().everyMinutes(5).create();
  GmailApp.createLabel('Hanterad');
  Logger.log('Klart: inkorgen läses var 5:e minut.');
}

// ---------- in: mejl → GitHub ----------

function hamtaNyaMejl() {
  const egenskaper = PropertiesService.getScriptProperties();
  const hanterad = GmailApp.getUserLabelByName('Hanterad') || GmailApp.createLabel('Hanterad');
  const vilka = tillatna();
  let antal = 0;
  for (const trad of GmailApp.search('in:inbox is:unread', 0, 20)) {
    for (const m of trad.getMessages()) {
      if (!m.isUnread() || antal >= MAX_PER_KORNING) continue;
      antal++;
      const fran = adress(m.getFrom());
      const namn = vilka[normal(fran)];
      if (!namn || !dmarcOk(m, fran)) {
        m.markRead(); // Okänd eller oäkta avsändare – ignoreras tyst.
        continue;
      }
      const text = rensa(m.getPlainBody());
      const bilder = m.getAttachments({ includeInlineImages: true })
        .filter((a) => /^image\//.test(a.getContentType()))
        .map(sparaBild);
      const bildText = bilder.length
        ? '\n\n**Bilder:**\n' + bilder.map((b, i) => `- Bild ${i + 1}: ${b.ladda} (${b.namn})`).join('\n')
        : '';
      const nyckel = 'trad:' + trad.getId();
      const issue = egenskaper.getProperty(nyckel);
      if (issue) {
        github('POST', `/repos/${REPO}/issues/${issue}/comments`, {
          body: `@claude\n\n**Svar från ${namn} via mejl:**\n\n${text}${bildText}`,
        });
      } else {
        const ny = github('POST', `/repos/${REPO}/issues`, {
          title: (m.getSubject() || 'Önskemål från Leo').slice(0, 120),
          labels: ['mejl', 'önskemål'],
          body: `@claude\n\n**Mejl från ${namn}** (${m.getDate().toISOString().slice(0, 10)}):\n\n${text}${bildText}\n\n<!-- mejl-trad: ${trad.getId()} -->`,
        });
        egenskaper.setProperty(nyckel, String(ny.number));
        egenskaper.setProperty('issue:' + ny.number, trad.getId());
      }
      m.markRead();
      trad.addLabel(hanterad);
    }
  }
}

function sparaBild(bilaga) {
  const mapp = mappFor('Leo inkorg – bilder');
  const fil = mapp.createFile(bilaga.copyBlob().setName(bilaga.getName() || 'bild.jpg'));
  fil.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return { namn: fil.getName(), ladda: `https://drive.google.com/uc?export=download&id=${fil.getId()}` };
}

function mappFor(namn) {
  const finns = DriveApp.getFoldersByName(namn);
  return finns.hasNext() ? finns.next() : DriveApp.createFolder(namn);
}

/**
 * Gmail har kontrollerat att avsändaren är äkta (DMARC). Bara Gmails egen rad räknas – den som börjar
 * med "mx.google.com;" – och den måste gälla avsändarens domän. En rad som avsändaren själv lagt in i
 * mejlet saknar mx.google.com och ignoreras (annars kunde vem som helst förfalska Leos adress).
 */
function dmarcOk(m, fran) {
  const huvud = m.getRawContent().split(/\r?\n\r?\n/)[0].replace(/\r?\n[ \t]+/g, ' ');
  const doman = fran.split('@')[1].toLowerCase();
  return huvud
    .split(/\r?\n/)
    .filter((rad) => /^Authentication-Results:\s*mx\.google\.com;/i.test(rad))
    .some((rad) => /dmarc=pass\b/i.test(rad) && rad.toLowerCase().includes('header.from=' + doman));
}

/** Tar bort citerade tidigare mejl och signaturer, så att bara det nya kommer med. */
function rensa(text) {
  const rader = [];
  for (const rad of text.split(/\r?\n/)) {
    if (/^(Den|On) .+(skrev|wrote):\s*$/.test(rad) || /^-{2,}\s*(Ursprungligt|Original) /i.test(rad)) break;
    if (/^>/.test(rad)) continue;
    if (/^Skickat från min /i.test(rad)) continue;
    rader.push(rad);
  }
  return rader.join('\n').trim() || '(tomt mejl)';
}

// ---------- ut: GitHub → mejl ----------

function skickaSvar() {
  const egenskaper = PropertiesService.getScriptProperties();
  const alla = egenskaper.getProperties();
  for (const nyckel of Object.keys(alla).filter((k) => k.startsWith('issue:'))) {
    const issue = nyckel.slice('issue:'.length);
    const trad = GmailApp.getThreadById(alla[nyckel]);
    if (!trad) continue;
    const kommentarer = github('GET', `/repos/${REPO}/issues/${issue}/comments?per_page=100`);
    for (const k of kommentarer) {
      const text = tillLeo(k.body || '');
      if (!text) continue;
      const hash = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, text));
      if (egenskaper.getProperty('skickat:' + k.id) === hash) continue;
      // Svara på Leos senaste mejl i tråden – inte på vårt eget.
      const vilka = tillatna();
      const fran = trad.getMessages().filter((m) => vilka[normal(adress(m.getFrom()))]).pop();
      if (fran) fran.reply(text + `\n\n—\nAlla versioner: ${VERSIONSSIDAN}`);
      egenskaper.setProperty('skickat:' + k.id, hash);
    }
    // Stängt sedan länge → sluta bevaka.
    const info = github('GET', `/repos/${REPO}/issues/${issue}`);
    if (info.state === 'closed' && Date.now() - Date.parse(info.closed_at) > 7 * 864e5) egenskaper.deleteProperty(nyckel);
  }
}

function tillLeo(body) {
  const a = body.indexOf(START);
  const b = body.indexOf(SLUT, a + START.length);
  if (a < 0 || b < 0) return '';
  return body
    .slice(a + START.length, b)
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .trim();
}

// ---------- hjälpare ----------

function github(metod, vag, data) {
  const svar = UrlFetchApp.fetch('https://api.github.com' + vag, {
    method: metod,
    contentType: 'application/json',
    payload: data ? JSON.stringify(data) : undefined,
    headers: {
      Authorization: 'Bearer ' + PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN'),
      Accept: 'application/vnd.github+json',
    },
    muteHttpExceptions: true,
  });
  if (svar.getResponseCode() >= 300) throw new Error(`GitHub ${metod} ${vag}: ${svar.getResponseCode()} ${svar.getContentText().slice(0, 200)}`);
  return JSON.parse(svar.getContentText());
}

function adress(fran) {
  const m = String(fran).match(/<([^>]+)>/);
  return (m ? m[1] : String(fran)).trim();
}

// Gmail bryr sig inte om punkter eller versaler i adressens första del.
function normal(e) {
  const [namn, doman = ''] = e.trim().toLowerCase().split('@');
  return (doman === 'gmail.com' || doman === 'googlemail.com' ? namn.replace(/\./g, '') : namn) + '@' + doman.replace('googlemail.com', 'gmail.com');
}
