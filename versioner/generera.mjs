// Gör versionsdata av GitHub Releases – körs av scripts/versioner.sh (F-40).
//   node versioner/generera.mjs <releases.json> <fontkatalog>
// Skriver dist/versioner.json och typsnitten. Sidan ritas av Workern (src/index.js) vid varje
// besök, så att "På prod nu" / "På demo nu" alltid är aktuellt.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';

const [releasesFil, fontKatalog] = process.argv.slice(2);
const versal = (s) => s.charAt(0).toLocaleUpperCase('sv') + s.slice(1);
// Länkar i PR-texten pekar på stage – på versionssidan leder Titta rätt, så de tas bort.
const utanLankar = (l) => l.replace(/:?\s*https:\/\/\S+/g, '').replace(/\s+$/, '');

const versioner = JSON.parse(readFileSync(releasesFil, 'utf8'))
  .filter((r) => /^v\d+$/.test(r.tag_name))
  .map((r) => {
    const rader = (r.body ?? '').split(/\r?\n/);
    const id = (nyckel) => rader.flatMap((l) => l.match(new RegExp(`^${nyckel}: ([0-9a-f-]{36})`))?.[1] ?? []);
    return {
      nr: Number(r.tag_name.slice(1)),
      namn: versal(r.name.replace(/^Version \d+\s*[–-]\s*/, '')),
      publicerad: (rader.find((l) => l.startsWith('Publicerad:')) ?? '').replace('Publicerad:', '').trim().slice(0, 10),
      beskrivning: rader.filter((l) => l.trim() && !/^(Publicerad|Cloudflare-version|Demo-version):/.test(l)).map(utanLankar),
      // Första id:t är versionens eget bygge; senare är samma innehåll publicerat igen.
      prod: id('Cloudflare-version'),
      demo: id('Demo-version')[0] ?? null,
    };
  })
  .sort((a, b) => b.nr - a.nr);

mkdirSync(new URL('./dist/typsnitt/', import.meta.url), { recursive: true });
writeFileSync(new URL('./dist/versioner.json', import.meta.url), JSON.stringify(versioner));
for (const [fran, till] of [['400-normal', '400'], ['400-italic', '400-italic'], ['600-normal', '600']]) {
  copyFileSync(`${fontKatalog}/cormorant-garamond-latin-${fran}.woff2`, new URL(`./dist/typsnitt/${till}.woff2`, import.meta.url));
}
console.log(`${versioner.length} versioner`);
