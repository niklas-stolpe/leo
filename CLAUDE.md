# CLAUDE.md – Leo

Webbplats för Leos käppar – konsthantverk som används (aldrig "konst", B-10). Astro (statisk) → Cloudflare Workers.
Krav: `docs/requirements.md` · Process: `docs/process.md` · Leos guide: `README.md` · Roadmap: issue #1.

## Regler

1. **`docs/requirements.md` är sanningen** för vad sidan ska göra och om det är klart. Läs den vid start. `B-`-raderna är låsta beslut – relitigera inte utan att fråga Admin.
2. **Nya krav = ny rad, direkt.** Ett önskemål från Leo som är nytt beteende blir en F-rad i samma PR som bygger det. Skriv kravet så att Leo förstår det.
3. **En PR som levererar ett krav flippar dess status till `Klar`** och skriver `Uppfyller: F-xx` i PR-texten. Inget krav (ny käpp, docs, process): `Uppfyller: – <skäl>`. Rör PR:en Admins yta (`.github/`, `scripts/`, `site/wrangler.jsonc`, `site/package*.json`): rad `Säkerhet:`. Verifiering `leo` betyder att Admin eller Leo har tittat på versionen.
4. **Merga bara via `scripts/merge-pr.sh`.** Aldrig `gh pr merge`, aldrig GitHub-knappen. En merge publicerar inte – den blir en ny version på versionssidan.
5. **Prod ändras bara när Admin eller Leo väljer en version (B-06).** Claude publicerar aldrig på eget initiativ – bara när någon av dem uttryckligen säger "publicera version N" (chatt, issue, knappen på versionssidan).
6. **En granskning är inte klar förrän fynden är fixade.** Fixa, pusha, svara i tråden, resolve:a.
7. **Gratis (B-01), ingen kassa (B-04).** Inga betaltjänster, inga nya konton utan Admin.

## Två sätt att prata – välj efter mottagare

- **Till Leo** (issues och PR-kommentarer där han skrivit): enkel svenska, inga tekniska ord alls – inte "PR", "branch", "build", "deploy", "commit". Säg vad du gjort, att det finns som en ny version på versionssidan (https://leo-versioner.niklasstolpe.workers.dev), och att han trycker **Publicera på prod** när han vill ha den – eller skriver **@claude** och vad som ska ändras. Kort och vänligt.
- **Till Admin:** sammanfattning först, krav-ID och nummer följs av klartext (`F-13 (fråga om en käpp)`), tekniktermer på engelska. Se `docs/process.md` "Så rapporterar Claude".

## När du kör i GitHub (@claude)

**Från ett issue (önskemål eller ny käpp):**
1. Läs issuet och bilderna. Är det oklart vad Leo vill – fråga i en kommentar i stället för att gissa, med högst två konkreta alternativ.
2. Skapa branch `site/<issue>-<kort-namn>` (käpp: `kappa/<issue>-<namn>`) från `main`.
3. Bygg. Kör `npm run check` och `npm run build` i `site/` – båda ska gå igenom.
4. Levererar ändringen ett krav: sätt raden till `Klar` med verifiering `claude` när du själv har kontrollerat det i webbläsaren mot förhandsvisningen (nytt krav: lägg till raden först, + ändringslogg). `leo` sätts först när Admin eller Leo har tittat.
5. Öppna PR med `gh pr create`. Titel `<område> #<issue>: <vad>`. Text:
   ```
   Closes #<issue>

   ## Vad Leo ska titta på
   <1–3 punkter på enkel svenska>

   Uppfyller: F-xx  |  – <skäl>
   Säkerhet: … (bara om Admins yta rörs)
   ```
6. Kör `bash scripts/pr-preview.sh <pr>` – postar ändringens egen förhandsvisningslänk på PR:en (stage visar bara den senast pushade ändringen).
7. Kör `bash scripts/merge-pr.sh <pr>` när kravgrinden, bygget och granskningen är klara – det blir en ny version.
8. Kommentera i issuet till Leo: vad du gjort och att den nya versionen finns på versionssidan (https://leo-versioner.niklasstolpe.workers.dev), med knappen **Publicera på prod** när han vill ha den.

**Ny käpp:** ny mapp `site/src/content/kappar/nr-<NN>/` med nästa lediga nummer, bilderna bredvid `index.md`. Frontmatter enligt `site/src/content.config.ts`: `nummer` (styr ordningen, visas som Nº XXIV), `bilder`, `alt` (beskriv käppen för den som inte ser den), `bildtexter` (en beskrivning per extra bild), och bara det Leo faktiskt skrivit: `titel`, `ar`, `material`, `status`. Berättelsen skrivs som text under frontmattern. Hitta aldrig på fakta.

**Personer på bild:** Leo själv går bra. Andra personer, särskilt kända (F-23), visas bara när Admin bekräftat samtycke – fråga i stället för att lägga in.

**Från en PR-kommentar:** ändra på PR:ens branch, kör check + build, pusha. Cloudflare bygger om stage automatiskt.

**"Publicera version N på prod" (F-41, B-06):** bara när Admin eller Leo uttryckligen ber om det. Kör `bash scripts/publicera-version.sh N <issue>` – prod byts direkt till version N (sekunder), versionssidan uppdateras och issuet stängs. `publicera.yml` gör samma sak av sig själv när Admin/Leo skapar issuet "Publicera version N på prod".

**"Publicera version N på demo" (F-43, F-44):** `bash scripts/publicera-version.sh N demo <issue>` – Workern `leo-demo` byts till version N:s demo-bygge (sekunder). Rör inte prod. Admin och Leo gör det själva på versionssidan efter Google-inloggning (F-45).

**"Börja om från version N":** `bash scripts/borja-om-fran.sh N <issue>` – en PR ställer `site/` tillbaka till `vN` så att nästa ändring bygger därifrån. Rör inte prod.

## Mejl från Leo (etiketten `mejl`, F-46)

Leo mejlar inkorgen; `inkorg/Kod.gs` gör mejlet till ett issue (eller en kommentar i samma tråd) och mejlar
tillbaka **allt du skriver mellan `[[till-leo]]` och `[[/till-leo]]`** – inget annat når Leo. Markörerna ska stå
synliga på egna rader (HTML-kommentarer rensas bort ur dina kommentarer innan de postas).
Skriv där på enkel svenska, kort och varmt, utan tekniska ord, länkar till GitHub eller kodnamn.

1. **Nytt mejl – bygg inte än.** Svara (mellan markörerna): vad du har förstått, högst två frågor om något är
   oklart, och sist *"Ska jag börja?"*. Bilderna ligger som länkar i issuet – hämta dem med `curl -L` och titta.
2. **Leo svarar ja** (eller "kör", "börja"): bygg enligt avsnittet ovan – branch, `npm run check` + `build`,
   PR med `Closes #<issue>` och `Uppfyller:`, `bash scripts/pr-preview.sh <pr>`. Svara sedan (mellan markörerna):
   *"Nu bygger jag – du får ett mejl när den nya versionen finns att titta på."*
   `mejl-version.yml` mergar efter granskningen och mejlar länken till versionen. Publicera aldrig själv (B-06).
3. **Nya käppar via mejl:** spara bilderna i en ny käpp-mapp och skriv bara det Leo har skrivit (se *Ny käpp*).
4. **Leo rättar eller vill ändra:** samma sak igen – sammanfatta, fråga, bygg efter ja.

Modell, effort och om Leo får använda Claude alls styr Admin med repo-variablerna `LEO_CLAUDE_MODELL`,
`LEO_CLAUDE_EFFORT` och `LEO_CLAUDE_AKTIV`; hans månadskvot räknas av `scripts/leo-kvot.sh`.

## Fakta som behövs i kod

- Struktur: `site/` (Astro; `src/pages/`, `src/layouts/`, `src/content/kappar/`) · `docs/` · `scripts/` · `.github/`.
- Bilder går via Astros bildhantering (`image()` i schemat, `<Image>`/`<Picture>`), inte via `public/` – annars optimeras de inte (NF-03).
- Node ≥ 22.12. TypeScript är låst till 6 – `astro check` stöder inte 7.
- Repo `niklas-stolpe/leo`, board = organisationsprojekt 1. Id:n och vem som får godkänna (`LEO_LOGINS`) står i `scripts/lib.sh`.
- Utveckla lokalt: `cd site && npx astro dev --background` (stoppa med `npx astro dev stop`).

## Får aldrig committas

`.env*`, API-nycklar, tokens, `node_modules/`, `dist/`, `.astro/`, `.wrangler/`. Leos och köpares privata kontaktuppgifter.
