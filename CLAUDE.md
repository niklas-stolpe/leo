# CLAUDE.md – Leo

Webbplats för Leos käppar – konst som används. Astro (statisk) → Cloudflare Workers.
Krav: `docs/requirements.md` · Process: `docs/process.md` · Leos guide: `README.md` · Roadmap: issue #1.

## Regler

1. **`docs/requirements.md` är sanningen** för vad sidan ska göra och om det är klart. Läs den vid start. `B-`-raderna är låsta beslut – relitigera inte utan att fråga Admin.
2. **Nya krav = ny rad, direkt.** Ett önskemål från Leo som är nytt beteende blir en F-rad i samma PR som bygger det. Skriv kravet så att Leo förstår det.
3. **En PR som levererar ett krav flippar dess status till `Klar`** och skriver `Uppfyller: F-xx` i PR-texten. Inget krav (ny käpp, docs, process): `Uppfyller: – <skäl>`. Rör PR:en Admins yta (`.github/`, `scripts/`, `site/wrangler.jsonc`, `site/package*.json`): rad `Säkerhet:`. Verifiering `leo` får sättas i PR:en – merge-grinden kräver Leos `godkänt`.
4. **Merga bara via `scripts/merge-pr.sh`** – eller låt Leos `godkänt` göra det (`publish.yml` kör samma script). Aldrig `gh pr merge`, aldrig GitHub-knappen.
5. **Leo godkänner allt som syns (B-06).** Ändringar i `site/` publiceras inte utan hans `godkänt` efter senaste committen.
6. **En granskning är inte klar förrän fynden är fixade.** Fixa, pusha, svara i tråden, resolve:a.
7. **Gratis (B-01), ingen kassa (B-04).** Inga betaltjänster, inga nya konton utan Admin.

## Två sätt att prata – välj efter mottagare

- **Till Leo** (issues och PR-kommentarer där han skrivit): enkel svenska, inga tekniska ord alls – inte "PR", "branch", "build", "deploy", "commit". Säg vad du gjort, vad han ska titta på, och att han svarar **godkänt** eller skriver **@claude** och vad som ska ändras. Kort och vänligt.
- **Till Admin:** sammanfattning först, krav-ID och nummer följs av klartext (`F-13 (fråga om en käpp)`), tekniktermer på engelska. Se `docs/process.md` "Så rapporterar Claude".

## När du kör i GitHub (@claude)

**Från ett issue (önskemål eller ny käpp):**
1. Läs issuet och bilderna. Är det oklart vad Leo vill – fråga i en kommentar i stället för att gissa, med högst två konkreta alternativ.
2. Skapa branch `site/<issue>-<kort-namn>` (käpp: `kappa/<issue>-<namn>`) från `main`.
3. Bygg. Kör `npm run check` och `npm run build` i `site/` – båda ska gå igenom.
4. Levererar ändringen ett krav: sätt raden till `Klar` med verifiering `leo` redan i PR:en (nytt krav: lägg till raden först, + ändringslogg). Det är sant först när Leo skrivit `godkänt` – och det är precis vad merge-grinden kräver, så inget publiceras annars.
5. Öppna PR med `gh pr create`. Titel `<område> #<issue>: <vad>`. Text:
   ```
   Closes #<issue>

   ## Vad Leo ska titta på
   <1–3 punkter på enkel svenska>

   Uppfyller: F-xx  |  – <skäl>
   Säkerhet: … (bara om Admins yta rörs)
   ```
6. Kommentera i issuet till Leo: vad du gjort och att länken att titta på kommer i ändringen om ett par minuter.

**Ny käpp:** ny mapp `site/src/content/kappar/nr-<NN>/` med nästa lediga nummer, bilderna bredvid `index.md`. Frontmatter enligt `site/src/content.config.ts`: `nummer` (styr ordningen, visas som Nº XXIV), `bilder`, `alt` (beskriv käppen för den som inte ser den), och bara det Leo faktiskt skrivit: `titel`, `ar`, `material`, `status`. Berättelsen skrivs som text under frontmattern. Hitta aldrig på fakta.

**Personer på bild:** Leo själv går bra. Andra personer, särskilt kända (F-23), visas bara när Admin bekräftat samtycke – fråga i stället för att lägga in.

**Från en PR-kommentar:** ändra på PR:ens branch, kör check + build, pusha. En ny förhandsvisning postas automatiskt.

## Fakta som behövs i kod

- Struktur: `site/` (Astro; `src/pages/`, `src/layouts/`, `src/content/kappar/`) · `docs/` · `scripts/` · `.github/`.
- Bilder går via Astros bildhantering (`image()` i schemat, `<Image>`/`<Picture>`), inte via `public/` – annars optimeras de inte (NF-03).
- Node ≥ 22.12. TypeScript är låst till 6 – `astro check` stöder inte 7.
- Repo `niklas-stolpe/leo`, board = organisationsprojekt 1. Id:n och vem som får godkänna (`LEO_LOGINS`) står i `scripts/lib.sh`.
- Utveckla lokalt: `cd site && npx astro dev --background` (stoppa med `npx astro dev stop`).

## Får aldrig committas

`.env*`, API-nycklar, tokens, `node_modules/`, `dist/`, `.astro/`, `.wrangler/`. Leos och köpares privata kontaktuppgifter.
