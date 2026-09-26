// Bygger versionssidan (F-40) från GitHub Releases – körs av scripts/versioner.sh.
//   node versioner/generera.mjs <releases.json> <prod-version-id> <fontkatalog>
// Ingen byggkedja: en statisk HTML-fil + typsnitten, publicerad som Workern leo-versioner.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';

const [releasesFil, prodId = '', fontKatalog] = process.argv.slice(2);
const REPO = 'niklas-stolpe/leo';
const PROD = 'https://leo.niklasstolpe.workers.dev';
const STAGE = 'https://stage-leo.niklasstolpe.workers.dev';
const url = (id) => `https://${id.slice(0, 8)}-leo.niklasstolpe.workers.dev`;
const versal = (s) => s.charAt(0).toLocaleUpperCase('sv') + s.slice(1);
const MANAD = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'];
const datum = (d) => {
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${Number(m[3])} ${MANAD[Number(m[2]) - 1]} ${m[1]}` : d;
};
// Länkar i PR-texten pekar på stage – på versionssidan leder Titta rätt, så de tas bort.
const utanLankar = (l) => l.replace(/:?\s*https:\/\/\S+/g, '').replace(/\s+$/, '');
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// Enkel markdown för Claudes punktlistor: **fet**, `kod` och länkar räcker.
const inline = (s) =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/(https:\/\/[^\s<)]+)/g, '<a href="$1">$1</a>');

const versioner = JSON.parse(readFileSync(releasesFil, 'utf8'))
  .filter((r) => /^v\d+$/.test(r.tag_name))
  .map((r) => {
    const rader = (r.body ?? '').split(/\r?\n/);
    const cf = rader.flatMap((l) => l.match(/^Cloudflare-version: ([0-9a-f-]{36})/)?.[1] ?? []);
    const publicerad = rader.find((l) => l.startsWith('Publicerad:'))?.replace('Publicerad:', '').trim() ?? '';
    const beskrivning = rader.filter((l) => l.trim() && !/^(Publicerad|Cloudflare-version):/.test(l)).map(utanLankar);
    return {
      nr: Number(r.tag_name.slice(1)),
      namn: versal(r.name.replace(/^Version \d+\s*[–-]\s*/, '')),
      publicerad,
      beskrivning,
      cf,
      paProd: cf.includes(prodId),
    };
  })
  .sort((a, b) => b.nr - a.nr);

const paProd = versioner.find((v) => v.paProd);
const publiceraLank = (nr) =>
  `https://github.com/${REPO}/issues/new?` +
  new URLSearchParams({
    title: `Publicera version ${nr} på prod`,
    body: `@claude publicera version ${nr} på prod`,
    labels: 'önskemål',
  });

const lista = (rader) => {
  const punkter = rader.filter((l) => /^\s*[-*] /.test(l)).map((l) => `<li>${inline(l.replace(/^\s*[-*] /, ''))}</li>`);
  const ovrigt = rader.filter((l) => !/^\s*[-*] /.test(l)).map((l) => `<p>${inline(l)}</p>`);
  return ovrigt.join('') + (punkter.length ? `<ul>${punkter.join('')}</ul>` : '');
};

const kort = versioner
  .map(
    (v) => `
    <li class="version${v.paProd ? ' prod' : ''}">
      <div class="huvud">
        <span class="nr">Version ${v.nr}</span>
        ${v.paProd ? '<span class="markning">På prod nu</span>' : ''}
      </div>
      <h2>${esc(v.namn)}</h2>
      ${v.publicerad ? `<p class="datum">${esc(datum(v.publicerad))}</p>` : ''}
      <div class="text">${lista(v.beskrivning)}</div>
      <div class="knappar">
        ${v.cf.length ? `<a class="knapp" href="${url(v.cf[0])}">Titta</a>` : ''}
        ${v.paProd ? '' : `<a class="knapp stilla" href="${publiceraLank(v.nr)}">Publicera på prod</a>`}
      </div>
    </li>`,
  )
  .join('');

const html = `<!doctype html>
<html lang="sv">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<meta name="theme-color" content="#17150f" />
<title>Leos versioner</title>
<style>
@font-face { font-family: 'Cormorant Garamond'; font-weight: 400; src: url(/typsnitt/400.woff2) format('woff2'); font-display: swap; }
@font-face { font-family: 'Cormorant Garamond'; font-weight: 400; font-style: italic; src: url(/typsnitt/400-italic.woff2) format('woff2'); font-display: swap; }
@font-face { font-family: 'Cormorant Garamond'; font-weight: 600; src: url(/typsnitt/600.woff2) format('woff2'); font-display: swap; }
:root { color-scheme: dark; --svart: #0e0d0b; --yta: #17150f; --elfenben: #ece4d4; --dampad: #a39985; --massing: #b8955a; --massing-ljus: #d4b27a; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--svart); color: var(--elfenben); font-family: 'Cormorant Garamond', Georgia, serif; font-size: 1.2rem; line-height: 1.55; }
main { max-width: 44rem; margin: 0 auto; padding: 3rem 1rem 4rem; }
.overrad { text-transform: uppercase; letter-spacing: 0.3em; font-size: 0.8rem; font-weight: 600; color: var(--massing); margin: 0 0 0.5rem; }
h1 { font-weight: 400; font-style: italic; font-size: clamp(3rem, 12vw, 4.5rem); line-height: 1; margin: 0 0 1.5rem; }
.adresser { display: flex; flex-wrap: wrap; gap: 0.75rem; margin: 0 0 2rem; }
.adresser a { color: var(--dampad); text-decoration: none; border: 1px solid rgb(184 149 90 / 0.35); padding: 0.55rem 1rem; min-height: 44px; display: inline-flex; align-items: center; }
.adresser a:hover { color: var(--elfenben); border-color: var(--massing); }
.ingress { color: var(--dampad); font-style: italic; margin: 0 0 2.5rem; }
ol { list-style: none; padding: 0; margin: 0; border-left: 1px solid rgb(184 149 90 / 0.35); }
.version { position: relative; padding: 0 0 2.5rem 1.75rem; }
.version::before { content: ''; position: absolute; left: -6px; top: 0.55rem; width: 11px; height: 11px; transform: rotate(45deg); background: var(--svart); border: 1px solid var(--massing); }
.version.prod::before { background: var(--massing); }
.huvud { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
.nr { text-transform: uppercase; letter-spacing: 0.25em; font-size: 0.8rem; font-weight: 600; color: var(--massing); }
.markning { font-size: 0.75rem; letter-spacing: 0.15em; text-transform: uppercase; font-weight: 600; background: var(--massing); color: var(--svart); padding: 0.15rem 0.6rem; }
h2 { font-weight: 400; font-style: italic; font-size: 1.9rem; line-height: 1.15; margin: 0.35rem 0 0.25rem; }
.datum { color: var(--dampad); margin: 0 0 0.75rem; font-size: 1rem; }
.text p, .text ul { margin: 0 0 0.5rem; }
.text ul { padding-left: 1.1rem; }
.text a { color: var(--massing-ljus); word-break: break-all; }
code { font-size: 0.9em; }
.knappar { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 1rem; }
.knapp { text-decoration: none; text-transform: uppercase; letter-spacing: 0.2em; font-size: 0.8rem; font-weight: 600; color: var(--elfenben); border: 1px solid var(--massing); padding: 0.75rem 1.2rem; min-height: 44px; display: inline-flex; align-items: center; }
.knapp:hover { background: var(--massing); color: var(--svart); }
.knapp.stilla { border-color: rgb(184 149 90 / 0.4); color: var(--dampad); }
.tom { color: var(--dampad); font-style: italic; }
</style>
</head>
<body>
<main>
  <p class="overrad">Leo · käppar</p>
  <h1>Versioner</h1>
  <nav class="adresser" aria-label="Adresser">
    <a href="${PROD}">Riktiga sidan (prod)</a>
    <a href="${STAGE}">Demo (stage)</a>
  </nav>
  <p class="ingress">${
    paProd
      ? `Just nu visar den riktiga sidan version ${paProd.nr}. Tryck Titta för att se en version precis som den var.`
      : 'Tryck Titta för att se en version precis som den var.'
  }</p>
  ${versioner.length ? `<ol>${kort}</ol>` : '<p class="tom">Inga versioner än.</p>'}
</main>
</body>
</html>
`;

mkdirSync(new URL('./dist/typsnitt/', import.meta.url), { recursive: true });
writeFileSync(new URL('./dist/index.html', import.meta.url), html);
for (const [fran, till] of [['400-normal', '400'], ['400-italic', '400-italic'], ['600-normal', '600']]) {
  copyFileSync(`${fontKatalog}/cormorant-garamond-latin-${fran}.woff2`, new URL(`./dist/typsnitt/${till}.woff2`, import.meta.url));
}
console.log(`${versioner.length} versioner, på prod: ${paProd ? `version ${paProd.nr}` : 'okänd'}`);
