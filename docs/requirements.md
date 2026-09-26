# Leo – krav

**Version 2026-09-25.** Ett krav per rad. Status flippas i den PR som levererar kravet
(granskaren kontrollerar). Referera ID:n i issues och PR-texter (`Uppfyller: F-10`).
Prio = milstolpe; allt är `v1` tills Admin säger till.
Status: `Backlog` · `Pågår` · `Klar` · `Utgått` (kvar, överstruket, med orsak).
Verifiering: `leo` (Leo har godkänt i förhandsvisningen) · `bygg` (CI bygger och kontrollerar) ·
`lighthouse` (mätt med Lighthouse på förhandsvisningen) · `admin` (Admin har kontrollerat) · `–` (ej verifierad).

Kraven skrivs så att Leo förstår dem: vad besökaren ska se, göra eller känna. Tekniken står i
"Klart när" eller i `docs/process.md`, inte i själva kravet.

## Ändringslogg

| Datum | Ändring |
|---|---|
| 2026-09-26 | #19 (Admin): bygge, stage och prod flyttade från GitHub Actions till Cloudflare Workers Builds (Actions-minuterna tog slut 2026-09-25); `merge-pr.sh` kräver Cloudflare-checken; `deploy.yml` borttagen; reservväg `scripts/deploy-local.sh`; återanvändbar `docs/processmall.md`. B-03, T-03, NF-05. |
| 2026-09-25 | #17 (Admin): hemskärmsikoner – mörk prod-ikon med käpp i mässing, ljus stage-ikon med STAGE-etikett; manifest, apple-touch-icon, noindex på stage. F-31, nytt F-32. |
| 2026-09-25 | Admin (chatt): fast förhandsvisningsadress "stage" + fast prod-adress, i stället för en ny länk per ändring (T-03, T-07, NF-05). |
| 2026-09-25 | #5/#6: startsida och galleri i mörk, klassisk stil (Cormorant Garamond, mässing, ornament efter käpparnas ringar). 23 käppar ur Admins album, numrerade med romerska siffror – titel, år, material och status tomma tills Leo fyller i (F-12 kvar). F-01, F-03 (sidfot från #11/#13, nu i layouten), F-10, F-11 Klar; NF-03 (största bild 91 kB) Klar; NF-06 Pågår (ingen horisontell scroll vid 360 px i webbläsaren – mäts med Lighthouse i #9). Bilder på Jan Guillou hålls utanför tills samtycke (F-23, Q-05). |
| 2026-09-25 | Första versionen. Admin (chatt): egen webbplats som nav, Instagram/Facebook länkar dit, ingen webbshop, gratis drift, Leo godkänner genom att titta. Konton startar hos Admin och flyttas till Leo senare. |

## Terminologi

| ID | Term | Betyder |
|---|---|---|
| T-01 | **Leo** | Konstnären. Beställare och konstnärlig ledare – bestämmer hur sidan ska se ut och kännas. |
| T-02 | **Admin** | Niklas. Beslutar om säkerhet, konton, domän, pengar och låsta beslut (B-rader). |
| T-03 | **Förhandsvisning (stage)** | Fast adress https://stage-leo.niklasstolpe.workers.dev som alltid visar den senaste ändringen innan den publiceras. Byggs av Cloudflare Workers Builds vid varje push till en branch. |
| T-07 | **Prod** | Den publicerade sidan, https://leo.niklasstolpe.workers.dev (tills egen domän, Q-02). |
| T-04 | **Godkänt** | Leo skriver `godkänt` som kommentar på PR:en efter att ha tittat på förhandsvisningen. Då publiceras ändringen. |
| T-05 | **Käpp-mappen** | `site/src/content/kappar/<namn>/` – en mapp per käpp med `index.md` (text) och bilderna. |
| T-06 | **Önskemål** | Ett issue där Leo beskriver vad han vill ändra, med ord och bilder. Claude bygger det. |

## Aktörer

| Aktör | Roll |
|---|---|
| Leo | Skriver önskemål, skickar bilder och text om käppar, godkänner förhandsvisningar. |
| Admin | Beslutar, följer boardet, sköter konton och hemligheter. Står i Leos ställe tills Leo har GitHub-konto (B-09). |
| Claude (GitHub) | Bygger önskemål från issues, öppnar PR, granskar, nattlig kravkontroll. |
| Claude (session) | Samma som ovan fast från Admins dator – större ändringar, process, felsökning. |
| Besökare | Hittar hit via Instagram, Facebook, Google eller en artikel. Oftast på mobilen. |

## Begränsningar (låsta beslut – relitigera inte utan att fråga)

| ID | Beslut | Källa |
|---|---|---|
| B-01 | **Gratis drift.** Inga löpande kostnader utöver Claude-prenumerationen och ev. domän (~100–200 kr/år). Gratisnivåer hos GitHub och Cloudflare räcker. | Admin 2026-09-25 |
| B-02 | **Statisk webbplats byggd med Astro.** Ingen databas, ingen egen server. | Admin 2026-09-25 |
| B-03 | **Cloudflare Workers med statiska filer** som webbhotell, samma konto som Eaves. Bygge och publicering med Cloudflare Workers Builds (Admin 2026-09-26) – inte GitHub Actions. | Admin 2026-09-25 |
| B-04 | **Ingen webbshop i v1.** Köparna vill träffa Leo – sidan leder till kontakt och möte, inte till kassa. | Admin 2026-09-25 |
| B-05 | **Käpparna är filer i repot** (en mapp per käpp, T-05), inget CMS. Leo skickar bilder och text, Claude lägger upp. | Admin 2026-09-25 |
| B-06 | **Leo godkänner allt som syns.** Ingen ändring i `site/` publiceras utan Leos `godkänt` (T-04) på förhandsvisningen. `scripts/merge-pr.sh` kontrollerar. | Admin 2026-09-25 |
| B-07 | **Admin äger det riskabla:** säkerhet, konton, hemligheter, domän, pengar, `.github/` och `scripts/`. Leo kan inte råka ha sönder något. | Admin 2026-09-25 |
| B-08 | **Webbplatsen är navet.** Instagram och Facebook länkar hit; ingen Facebook-app. | Admin 2026-09-25 |
| B-09 | **Konton startar hos Admin** – Claude-prenumerationen och GitHub (Admin godkänner i Leos ställe) – och flyttas till Leo när han har egna. | Admin 2026-09-25 |

## Funktionella krav

### Webbplatsen

| ID | Krav | Klart när | Prio | Status | Verif. | Källa |
|---|---|---|---|---|---|---|
| F-01 | Startsidan presenterar Leo och käpparna så att besökaren förstår direkt att det är konst som används. | Leo har godkänt startsidan i förhandsvisningen. | v1 | Klar | leo | Admin 2026-09-25 |
| F-02 | Sidan finns på en publik adress och uppdateras automatiskt när en ändring godkänts. | Godkänd ändring syns på produktionsadressen utan manuella steg. | v1 | Backlog | – | Admin 2026-09-25 |
| F-03 | Längst ned på sidan finns en diskret sidfot med "© Leo" och årtalet, i samma dämpade färg som övrig text. | Sidfoten syns, är liten och lugn. Leo har godkänt förhandsvisningen. | v1 | Klar | leo | Leo (issue #11) 2026-09-25 |

### Käpparna

| ID | Krav | Klart när | Prio | Status | Verif. | Källa |
|---|---|---|---|---|---|---|
| F-10 | Galleri med alla käppar, stora bilder, lugn presentation. | Galleriet visar alla käpp-mappar (T-05); Leo har godkänt utseendet. | v1 | Klar | leo | Admin 2026-09-25 |
| F-11 | Varje käpp har en egen sida med egen adress som går att länka till från ett Instagram-inlägg. | `/kappar/<namn>` finns för varje käpp. | v1 | Klar | leo | Admin 2026-09-25 |
| F-12 | Varje käpp visar status: tillgänglig, såld eller beställningsverk. Sålda käppar ligger kvar i galleriet. | Status syns i galleri och på käppens sida. | v1 | Backlog | – | Admin 2026-09-25 |
| F-13 | Besökaren kan fråga om en käpp eller be om ett möte. Frågan kommer som mejl till Leo. Gratis tjänst (B-01). | Ett testmeddelande från förhandsvisningen når Leos mejl. | v1 | Backlog | – | Admin 2026-09-25 |
| F-14 | Leo lägger upp en ny käpp genom att skicka bilder och text i ett issue (mall "Ny käpp"). Claude skapar käpp-mappen och en förhandsvisning. | En käpp har lagts upp från ett issue utan att Leo rört kod. | v1 | Backlog | – | Admin 2026-09-25 |

### Berättelsen

| ID | Krav | Klart när | Prio | Status | Verif. | Källa |
|---|---|---|---|---|---|---|
| F-20 | "Om Leo" – vem han är, varför käppar, verkstaden. | Leo har godkänt texten och bilderna. | v1 | Backlog | – | Admin 2026-09-25 |
| F-21 | Beställningsverk – hur det går till från första möte till överlämning. | Leo har godkänt sidan. | v1 | Backlog | – | Admin 2026-09-25 |
| F-22 | Press – artiklar om Leo med citat och länkar. | Befintliga artiklar finns med. | v1 | Backlog | – | Admin 2026-09-25 |
| F-23 | Kända ägare som referens – bara de som sagt ja. | Varje namn på sidan har ett noterat samtycke. | v1 | Backlog | – | Admin 2026-09-25 |

### Delning

| ID | Krav | Klart när | Prio | Status | Verif. | Källa |
|---|---|---|---|---|---|---|
| F-30 | En länk som delas i Instagram, Facebook eller Messenger visar en snygg förhandsbild med titel. | Förhandsbilden syns i Facebooks delningsfelsökare för startsidan och en käppsida. | v1 | Backlog | – | Admin 2026-09-25 |
| F-31 | Sidan går att installera som app på mobilen (PWA). Låg prio – bonus, inte huvudsak. | "Lägg till på hemskärmen" ger ikon och namn. | v1 | Klar | leo | Admin 2026-09-25 |
| F-32 | Stage och prod går att skilja åt på hemskärmen: prod har mörk ikon med käpp i mässing och heter "Leo", stage har ljus ikon med röd STAGE-etikett och heter "Leo stage". Stage syns inte på Google. | Båda installerade på Leos/Admins mobil med rätt ikon och namn. | v1 | Klar | leo | Admin (chatt, #17) 2026-09-25 |

## Icke-funktionella krav

| ID | Krav | Mått | Prio | Status | Verif. | Källa |
|---|---|---|---|---|---|---|
| NF-01 | Snabb på mobilen. | Lighthouse Performance ≥ 90 (mobil) på startsidan och en käppsida. | v1 | Backlog | – | Admin 2026-09-25 |
| NF-02 | Tillgänglig. | Lighthouse Accessibility ≥ 90; alla käppbilder har alt-text. | v1 | Backlog | – | Admin 2026-09-25 |
| NF-03 | Bilderna optimeras automatiskt – Leo kan skicka stora originalbilder. | Bilder i käpp-mappar byggs till moderna format och flera storlekar; ingen bild > 400 kB till besökaren. | v1 | Klar | bygg | Admin 2026-09-25 |
| NF-04 | Hittas på Google. | Lighthouse SEO ≥ 90; sitemap finns. | v1 | Backlog | – | Admin 2026-09-25 |
| NF-05 | Varje ändring får en förhandsvisning (T-03) på stage – samma adress varje gång, så att Leo kan spara den i mobilen. | Stage visar ändringen inom 5 minuter efter push (Cloudflare-checken `Workers Builds: leo` grön). | v1 | Backlog | – | Admin 2026-09-25 |
| NF-06 | Fungerar på mobil. | Ingen horisontell scroll vid 360 px bredd. | v1 | Pågår | – | Admin 2026-09-25 |

## Ej inom scope

- Webbshop, kassa, betalning (B-04). Kan bli aktuellt för t.ex. förskott – då nytt beslut av Admin.
- Facebook-app (B-08).
- Inloggning för besökare, konton, kommentarer.
- Automatisk publicering till Instagram/Facebook.

## Antaganden & beroenden

| ID | Antagande |
|---|---|
| A-01 | Claude GitHub App kan läsa bilder som Leo bifogar i issues och spara dem i repot. Verifieras i första "Ny käpp"-issuet. |
| A-02 | Cloudflares gratisnivå för Workers räcker (100 000 anrop/dag). |

## Öppna frågor

| ID | Fråga |
|---|---|
| Q-01 | Har Leo Instagram och/eller Facebook i dag? Vilka konton? |
| Q-02 | Domän – finns ett namn Leo redan använder? |
| Q-03 | Vilken gratis formulärtjänst för F-13 (t.ex. Web3Forms, Formspree)? |
| Q-04 | Vad heter varumärket – "Leo", fullt namn, eller något annat? |
| Q-05 | Har Jan Guillou sagt ja till att visas på sidan (bilderna 02–04 i albumet)? Krävs för F-23. |
| Q-06 | Vem är personen i verkstaden (bild 15 i albumet), och får bilden visas? |
| Q-07 | Namn, år, material och status för käpparna Nº I–XXIII – vill Leo fylla i dem? |
