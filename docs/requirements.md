# Leo – krav

**Version 2026-09-25.** Ett krav per rad. Status flippas i den PR som levererar kravet
(granskaren kontrollerar). Referera ID:n i issues och PR-texter (`Uppfyller: F-10`).
Prio = milstolpe; allt är `v1` tills Admin säger till.
Status: `Backlog` · `Pågår` · `Klar` · `Utgått` (kvar, överstruket, med orsak).
Verifiering: `leo` (Leo eller Admin har tittat på versionen) · `claude` (Claude har kontrollerat i webbläsaren mot förhandsvisningen) · `bygg` (CI bygger och kontrollerar) ·
`lighthouse` (mätt med Lighthouse på förhandsvisningen) · `admin` (Admin har kontrollerat) · `–` (ej verifierad).

Kraven skrivs så att Leo förstår dem: vad besökaren ska se, göra eller känna. Tekniken står i
"Klart när" eller i `docs/process.md`, inte i själva kravet.

## Ändringslogg

| Datum | Ändring |
|---|---|
| 2026-10-24 | #48 (Admin): bara Admin och Claude får skriva i repot, alla andra läsa. Claude startar bara när Admins konto skriver @claude (inkorgen skriver med det kontot). |
| 2026-10-24 | #48 (Admin): repot är publikt (obegränsade Actions-minuter). Mejladresser borta ur filerna (TILLATNA på versionssidan är nu en secret), Claude startar bara för medlemmar/medarbetare. Leos mejl blir publika ärenden – godkänt av Admin. |
| 2026-10-24 | #48 (Admin): personer på bild – andra än Leo går bra när ansiktet inte syns (t.ex. handen på nr-03/04/13–16); syns ett ansikte krävs Admins bekräftade samtycke. Alla 24 bilder granskade: bara Leo med ansikte (leo-vaggen.jpg, bekräftad). |
| 2026-10-22 | #48 (Admin): Leos byggtid begränsas till 10 % av organisationens Actions-minuter per månad (F-47) – leo-kvot.sh minuter räknar claude.yml, mejl-version.yml och granskning/kravgrind/tavla på hans PR:er; stopp och varning som för tokens; saldoraden visar byggtid kvar. Daglig requirements-audit avstängd i leo för att spara minuter – med `gh workflow disable requirements-audit` (Actions-inställning, ingen kodändring; slås på med `gh workflow enable`). |
| 2026-10-22 | #57 (Admin): informera först (F-51) – #64 fastnade (Cloudflare-bygget >10 min, och "försök igen" som tom commit startade ingen granskning) och Leo väntade i tre timmar. Nu: Leo mejlas innan något rättas (fixar_till_leo), "försök igen" startar mejl-version.yml direkt (workflow_dispatch), bygget får 25 min, och en vakt i inkorgen mejlar Leo och Niklas efter 45 min utan händelse och ber Leo kontakta Niklas efter 3 timmar. |
| 2026-10-21 | #48 (Admin): Leos kvot per vecka i stället för per månad (F-47) – 10 % av LEO_TOKEN_BUDGET per vecka, nollställs onsdag 05:00 svensk tid som Admins prenumeration; Leos modell Sonnet 5.5, effort medium (repo-variabler). |
| 2026-10-21 | #57 (Admin): Leo får alltid besked (F-51) – Leos första ändring (#59) fastnade tyst: kravgrinden stoppade på Uppfyller:-raden och Cloudflare byggde aldrig commiten. Nu ger varje stopp i mejl-version.yml och en krasch i claude.yml ett mejl till Leo med förslag (scripts/lib.sh stopp_till_leo); röd kravgrind → Claude rättar PR-texten själv (högst två gånger); Claude kör kravgrinden innan "Nu bygger jag"; "försök igen" = tom commit. |
| 2026-10-21 | #57 (Leo via mejl): startsidans överdel och menyn (F-50) – märket "llcanes" i stället för LEO, den gula raden "Handgjorda käppar" borttagen, rubriken "Leo Lowejko" + "(@llcanes)", ny ingress, "Se käpparna"; menyn Käpparna, Om Leo, Kontakt med dubbelt så stor text i huvudet (F-19); "beställningsverk" → "beställning av käpp" överallt på sidan. |
| 2026-10-21 | #57 (Leo via mejl): "(@llcanes)" under rubriken byts mot "Käppmakare"; menytexten i huvudet (Käpparna, Om Leo, Kontakt och "Meny") en tredjedel mindre (F-50, F-19). |
| 2026-10-22 | #57 (Leo via mejl): startsidans bakgrundsbild på mobil – lägre topp och ljusare toning så att mer av käppen syns (F-50). |
| 2026-10-19 | #51 (Niklas via mejl, första testet av F-46): hälsningstexten på startsidan lite större (F-48) – från clamp(1.3rem, 2.4vw, 1.55rem) till clamp(1.5rem, 2.8vw, 1.8rem). |
| 2026-10-19 | #48 (Admin): Saldo och utskick (F-49) – leo-kvot.sh skriver saldot till ett stängt ärende med etiketten kvot som inkorgen läser och skriver sist i varje mejl; ärenden med etiketten mejl-ut skickas som nya mejl och blir sedan vanliga mejlärenden. Citatraden "… skrev <adress>:" rensas nu bort ur Leos svar. |
| 2026-10-19 | #48 (Admin): Leo mejlar Claude (F-46) – Google Apps Script i en egen Gmail-inkorg (inkorg/Kod.gs) gör mejl till issues och mejlar tillbaka text mellan <!-- till-leo -->-markörer; claude.yml svarar och bygger; mejl-version.yml mergar efter granskningen och mejlar länken. Admins styrning (F-47): repo-variabler LEO_CLAUDE_AKTIV/MODELL (Opus 5.5)/EFFORT (medium), månadskvot 10 % av LEO_TOKEN_BUDGET med varning vid 8 % (scripts/leo-kvot.sh). |
| 2026-10-19 | #45: version att jämföra – klassisk stil (som version 8) med samlingen på ljus elfenbensbakgrund och mörkare mässing (--samling-accent) så att små texter har kontrast ≥ 4,5. |
| 2026-10-19 | #43: version att jämföra – modern stil (Jost, tunt och rakt, ingen kursiv) med samma struktur som version 8. Stilen styrs av variablerna i layouten (--rubrik, --brodtext, --kursiv, --versal-vikt). |
| 2026-10-19 | #41 (Leo via Admin): ny struktur inspirerad av gilliscanes.com – stor bild, Leos hälsning (hans utkast), grupper (krok/skulpterad/T-handtag – Claudes förslag), meny med Om Leo, Beställningsverk, Kontakt (platshållare där Leos text saknas). Käppsidan med miniatyrer och materialdel (F-18); Nº I med Leos text, material och status privat. Leo vill inte att det kallas konst (B-10) – all sådan text borttagen. Pris väntar (Leo). |
| 2026-09-30 | #37 (Admin): Google-inloggning på versionssidan (F-45) – versionssidan blir en Worker med egen Google-inloggning (inte Cloudflare Zero Trust, som krävde betalkort), tillåtna adresser, live-märkningar och publicering direkt via Cloudflares API. Egen stabil demo `leo-demo` (F-44) med demo-utförande (PUBLIC_MILJO=demo, "Leo demo", DEMO-ikon); v1–v6 uppladdade dit bakåt. Stage blir Claudes arbetsyta (T-03, T-10). |
| 2026-09-30 | #35 (Admin): F-43 publicera en version på demo – `publicera-version.sh N demo` bygger om taggen som stage och lägger den på aliaset stage; knappen "Publicera på demo" och märkningen "På demo nu" på versionssidan; `publicera.yml` förstår "på demo". |
| 2026-09-26 | #29: F-16 mjuk entré – käpparna tonar fram vid scroll (CSS scroll-driven animation), ornamentet vidgas. Ingen JavaScript. |
| 2026-09-26 | #27: sitemap.xml (startsidan + alla käppar), robots.txt (prod tillåter och pekar ut sitemapen, stage stänger ute), kanonisk adress och og:url per sida. NF-04 Pågår tills Lighthouse SEO är mätt (#9). |
| 2026-09-26 | #25: F-15 käppen i helbild (dialog med största bildstorleken ≤ 2000 px) och bläddring med svep/piltangenter. |
| 2026-09-26 | #33 (Admin): B-06 ändrad – versioner fritt, prod bara när en version väljs. Merge → ny Cloudflare-version (`wrangler versions upload`, inte deploy) + tagg/release; prod byts med `publicera-version.sh` eller `publicera.yml` (issue "Publicera version N på prod", knappen på versionssidan). `leo-approval.sh` och `publish.yml` borttagna; `borja-om-fran.sh` för att fortsätta utveckla från en äldre version. T-04, F-02. |
| 2026-09-26 | #23 (Admin): versioner – varje publicering av något synligt blir en version (tagg + release), versionssida https://leo-versioner.niklasstolpe.workers.dev, "publicera version N på prod" direkt (scripts/publicera-version.sh). Historiken inlagd som version 1–3. Tre adresser: prod, demo (stage), versioner. F-40 Klar, F-41 Pågår, F-42 + Q-08 nya. |
| 2026-09-26 | #21 (Admin): bildtexten på startsidan "Leo och en vägg av käppar" → "Leo bland sina verk" (F-01). |
| 2026-09-26 | #19 (Admin): bygge, stage och prod flyttade från GitHub Actions till Cloudflare Workers Builds (Actions-minuterna tog slut 2026-09-25); `merge-pr.sh` kräver Cloudflare-checken; `deploy.yml` borttagen; reservväg `scripts/deploy-local.sh`; återanvändbar `docs/processmall.md`. B-03, T-03, NF-05. |
| 2026-09-25 | #17 (Admin): hemskärmsikoner – mörk prod-ikon med käpp i mässing, ljus stage-ikon med STAGE-etikett; manifest, apple-touch-icon, noindex på stage. F-31, nytt F-32. |
| 2026-09-25 | Admin (chatt): fast förhandsvisningsadress "stage" + fast prod-adress, i stället för en ny länk per ändring (T-03, T-07, NF-05). |
| 2026-09-25 | #5/#6: startsida och galleri i mörk, klassisk stil (Cormorant Garamond, mässing, ornament efter käpparnas ringar). 23 käppar ur Admins album, numrerade med romerska siffror – titel, år, material och status tomma tills Leo fyller i (F-12 kvar). F-01, F-03 (sidfot från #11/#13, nu i layouten), F-10, F-11 Klar; NF-03 (största bild 91 kB) Klar; NF-06 Pågår (ingen horisontell scroll vid 360 px i webbläsaren – mäts med Lighthouse i #9). Bilder på Jan Guillou hålls utanför tills samtycke (F-23, Q-05). |
| 2026-09-25 | Första versionen. Admin (chatt): egen webbplats som nav, Instagram/Facebook länkar dit, ingen webbshop, gratis drift, Leo godkänner genom att titta. Konton startar hos Admin och flyttas till Leo senare. |

## Terminologi

| ID | Term | Betyder |
|---|---|---|
| T-01 | **Leo** | Leo Lowejko, käppmakaren. Beställare och den som bestämmer över uttrycket – bestämmer hur sidan ska se ut och kännas. |
| T-02 | **Admin** | Niklas. Beslutar om säkerhet, konton, domän, pengar och låsta beslut (B-rader). |
| T-03 | **Stage** | Claudes arbetsyta, https://stage-leo.niklasstolpe.workers.dev – visar alltid den senast pushade ändringen. |
| T-08 | **Version** | En publicering till prod av något som syns: "Version 3 – Leo bland sina verk", med datum, vad som ändrades och en egen länk som visar den precis som den var. Tagg `vN` + GitHub Release. |
| T-09 | **Versionssidan** | https://leo-versioner.niklasstolpe.workers.dev – alla versioner, vilken som är på prod nu. |
| T-10 | **Demo** | https://leo-demo.niklasstolpe.workers.dev – den version Admin eller Leo har valt att visa för andra (F-44). |
| T-07 | **Prod** | Den publicerade sidan, https://leo.niklasstolpe.workers.dev (tills egen domän, Q-02). |
| T-04 | **Publicera** | Att välja en version för den riktiga sidan: "publicera version N på prod". Det är godkännandet (B-06). |
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
| B-06 | **Prod ändras bara när Admin eller Leo väljer en version.** Allt som byggs får mergas och bli en ny version (versionssidan) utan godkännande; "publicera version N på prod" – i chatt, med knappen på versionssidan eller i ett issue – *är* godkännandet (`scripts/publicera-version.sh`, `publicera.yml`). En merge publicerar aldrig. | Admin 2026-09-26 (ersätter: ingen ändring i site/ utan Leos godkänt) |
| B-07 | **Admin äger det riskabla:** säkerhet, konton, hemligheter, domän, pengar, `.github/` och `scripts/`. Leo kan inte råka ha sönder något. | Admin 2026-09-25 |
| B-08 | **Webbplatsen är navet.** Instagram och Facebook länkar hit; ingen Facebook-app. | Admin 2026-09-25 |
| B-09 | **Konton startar hos Admin** – Claude-prenumerationen och GitHub (Admin godkänner i Leos ställe) – och flyttas till Leo när han har egna. | Admin 2026-09-25 |
| B-10 | **Konsthantverk, inte konst.** Leo kallar inte käpparna konst – "jävligt bra konsthantverk" med en viktig funktion för brukaren. Ordet konst (konstverk, konstnär) används inte på sidan. | Leo via Admin 2026-10-19 |

## Funktionella krav

### Webbplatsen

| ID | Krav | Klart när | Prio | Status | Verif. | Källa |
|---|---|---|---|---|---|---|
| F-01 | Startsidan presenterar Leo och käpparna så att besökaren förstår direkt att det är handgjort konsthantverk som används. | Leo har godkänt startsidan i förhandsvisningen. | v1 | Klar | leo | Admin 2026-09-25 |
| F-02 | Sidan finns på en publik adress och visar den version Admin eller Leo har valt. | Vald version syns på produktionsadressen inom en minut, utan manuella steg utöver valet. | v1 | Backlog | – | Admin 2026-09-25 |
| F-03 | Längst ned på sidan finns en diskret sidfot med "© Leo" och årtalet, i samma dämpade färg som övrig text. | Sidfoten syns, är liten och lugn. Leo har godkänt förhandsvisningen. | v1 | Klar | leo | Leo (issue #11) 2026-09-25 |

### Käpparna

| ID | Krav | Klart när | Prio | Status | Verif. | Källa |
|---|---|---|---|---|---|---|
| F-10 | Galleri med alla käppar, stora bilder, lugn presentation. | Galleriet visar alla käpp-mappar (T-05); Leo har godkänt utseendet. | v1 | Klar | leo | Admin 2026-09-25 |
| F-16 | Käpparna i samlingen tonar stillsamt fram när de kommer in i bild. Ingen rörelse för den som valt minskad rörelse; webbläsare utan stöd visar allt direkt. | Framtoning syns vid scroll; med "minska rörelse" visas allt direkt. | v1 | Klar | claude | Admin (chatt, #29) 2026-09-26 |
| F-17 | Startsidan i Gillis anda: stor bild på en käpp överst, Leos hälsning, käpparna i grupper efter handtagets form med snabblänkar, och vägar vidare till beställningsverk och Om Leo. | Struktur på plats; grupperna godkända av Leo. | v1 | Pågår | – | Leo via Admin (#41) 2026-10-19 |
| F-18 | Varje käpps sida har plats för 4–5 bilder från olika håll (miniatyrer + helbild) och en materialdel: del, träslag, latinskt namn, längd, status – sedan Leos text. | Nº I med Leos text och material; flera bilder visas som miniatyrer. | v1 | Klar | claude | Leo via Admin (#41) 2026-10-19 |
| F-19 | Meny med få, tydliga sidor: Käpparna, Om Leo, Kontakt (Leo #57: Beställning av käpp nås från startsidan) – samma i huvud och fot, egen meny i mobilen. | Menyn fungerar vid 360 px utan horisontell scroll. | v1 | Klar | claude | Leo via Admin (#41) 2026-10-19 |
| F-11 | Varje käpp har en egen sida med egen adress som går att länka till från ett Instagram-inlägg. | `/kappar/<namn>` finns för varje käpp. | v1 | Klar | leo | Admin 2026-09-25 |
| F-12 | Varje käpp visar status: tillgänglig, såld, beställningsverk eller privat (inte till salu). Sålda käppar ligger kvar i galleriet. | Status syns i galleri och på käppens sida. | v1 | Backlog | – | Admin 2026-09-25 |
| F-13 | Besökaren kan fråga om en käpp eller be om ett möte. Frågan kommer som mejl till Leo. Gratis tjänst (B-01). | Ett testmeddelande från förhandsvisningen når Leos mejl. | v1 | Backlog | – | Admin 2026-09-25 |
| F-14 | Leo lägger upp en ny käpp genom att skicka bilder och text i ett issue (mall "Ny käpp"). Claude skapar käpp-mappen och en förhandsvisning. | En käpp har lagts upp från ett issue utan att Leo rört kod. | v1 | Backlog | – | Admin 2026-09-25 |
| F-15 | Tryck på käppens bild för att se den i helbild; svep åt sidan (mobil) eller använd piltangenterna (dator) för att gå till föregående eller nästa käpp. | Helbild öppnas och stängs; svep och piltangenter byter käpp; lodrät scroll byter inte. | v1 | Klar | claude | Admin (chatt, #25) 2026-09-26 |

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

### Versioner

| ID | Krav | Klart när | Prio | Status | Verif. | Källa |
|---|---|---|---|---|---|---|
| F-40 | Leo kan se alla versioner på en egen sida, titta på var och en precis som den var, och se vilken som är på prod nu. | Versionssidan visar version 1–3 med fungerande Titta-länkar och märkningen "På prod nu". | v1 | Klar | admin | Admin (chatt, #23) 2026-09-26 |
| F-41 | Leo kan säga "publicera version N på prod" – prod visar version N direkt, utan omväg via stage och utan nytt godkännande. Inget försvinner; senare versioner kan publiceras igen. | En äldre version har publicerats på prod och sedan en nyare igen. | v1 | Pågår | – | Admin (chatt, #23) 2026-09-26 |
| F-42 | Stage fungerar som demo som andra kan granska och lämna förslag på. | Förslagsvägen för granskare utan GitHub-konto är bestämd och byggd (öppen fråga Q-08). | v1 | Backlog | – | Admin (chatt, #23) 2026-09-26 |
| F-43 | Admin eller Leo kan publicera en version på demon (stage), med en knapp på versionssidan, för att visa den för andra. Rör inte den riktiga sidan. | Version 6 publicerad på demo; versionssidan märker den "På demo nu". | v1 | Klar | claude | Admin (chatt, #35) 2026-09-30 |
| F-44 | Demon har en egen stabil adress (https://leo-demo.niklasstolpe.workers.dev) som bara visar den version Admin eller Leo har valt – den skrivs aldrig över av Claudes arbete. Varje version finns i demo-utförande (osynlig för Google, "Leo demo", egen ikon), så att publicera på demo tar sekunder. | Version 5 och 6 publicerade på demo på sekunder; en branch-push ändrar inte demon. | v1 | Klar | claude | Admin (chatt, #37) 2026-09-30 |
| F-45 | Admin och Leo loggar in med sina Google-konton på versionssidan och publicerar på demo eller den riktiga sidan därifrån. Andra kan titta men inte publicera. Gratis, utan betalkort. | Admin och Leo har loggat in och publicerat; en annan Google-adress nekas. | v1 | Pågår | – | Admin (chatt, #37) 2026-09-30 |
| F-46 | Leo kan mejla Claude: mejlet blir ett ärende, Claude svarar med vad den förstått och frågar "Ska jag börja?", bygger efter ja och mejlar en länk när den nya versionen finns. Bara Leo och Admin tas emot (äkta avsändare). Allt Leo får är vanlig svenska – inget tekniskt. | Ett testmejl har gått hela vägen: ärende, svar, bygge, version, mejl med länk. | v1 | Pågår | – | Admin (chatt, #48) 2026-10-19 |
| F-47 | Admin styr Leos användning av Claude: på/av, modell och effort, och en veckokvot (10 % av en tokenbudget per vecka). Vid 8 % får Leo ett varningsmejl, vid 10 % ett mejl om att det är slut till onsdag morgon (samma veckogräns som prenumerationen). Samma andel gäller byggtiden (GitHub Actions-minuter) per månad: varning vid 8 %, stopp vid 10 %, påfyllning den 1:a. Varje mejl visar vad som är kvar av båda. | Kvoten räknas per körning; varning och stopp provade. | v1 | Pågår | – | Admin (chatt, #48) 2026-10-19 |
| F-48 | Hälsningstexten på startsidan ("Leo Lowejko är möbelsnickaren …") är lite större – den märks, men tar inte över sidan. | Texten är ungefär 15 % större än förut på både mobil och dator; ingen horisontell scroll vid 360 px. | v1 | Pågår | – | Niklas via mejl (#51) 2026-10-19 |
| F-49 | Varje mejl Leo får från Claude slutar med hur mycket av veckans utrymme han har kvar. Claude kan också skicka ett nytt mejl till Leo (inte bara svara), t.ex. en introduktion till hur han pratar med Claude. | Ett mejl till Leo visar saldot; introduktionsmejlet har kommit fram och Leos svar på det når Claude. | v1 | Pågår | – | Admin (chatt, #48) 2026-10-19 |
| F-50 | Överst på sidan: "llcanes" uppe till vänster på alla sidor (leder till startsidan). Startsidans stora rubrik är "Leo Lowejko" med "Käppmakare" under i samma stil men mindre, sedan "Handgjorda och unika käppar i exklusiva träslag" och knappen "Se käpparna". Menyn i huvudet har lite större text än i foten (en tredjedel mindre än första versionen) på både mobil och dator. Ordet "beställningsverk" heter "beställning av käpp" överallt på sidan. På mobil är bilden överst lägre och toningen ljusare, så att mer av käppen syns. | Texterna syns som ovan; ingen horisontell scroll vid 360 px. | v1 | Pågår | – | Leo via mejl (#57) 2026-10-21 |
| F-51 | Leo blir aldrig stående utan besked. Han får mejl *innan* något rättas, och fastnar hans ändring får han ett mejl i enkla ord med förslag (vänta, "försök igen" eller ändra önskemålet); Niklas får orsaken. Händer inget på 45 min får Leo veta att det dröjer och Niklas ett mejl; efter 3 timmar ska Leo kontakta Niklas. | Varje stopp i mejlkedjan (granskning, kravgrind, bygge, Admins yta, krasch) ger ett mejl till Leo med förslag. | v1 | Pågår | – | Admin (chatt, #57) 2026-10-21 |

## Icke-funktionella krav

| ID | Krav | Mått | Prio | Status | Verif. | Källa |
|---|---|---|---|---|---|---|
| NF-01 | Snabb på mobilen. | Lighthouse Performance ≥ 90 (mobil) på startsidan och en käppsida. | v1 | Backlog | – | Admin 2026-09-25 |
| NF-02 | Tillgänglig. | Lighthouse Accessibility ≥ 90; alla käppbilder har alt-text. | v1 | Backlog | – | Admin 2026-09-25 |
| NF-03 | Bilderna optimeras automatiskt – Leo kan skicka stora originalbilder. | Bilder i käpp-mappar byggs till moderna format och flera storlekar; ingen bild > 400 kB till besökaren. | v1 | Klar | bygg | Admin 2026-09-25 |
| NF-04 | Hittas på Google. | Lighthouse SEO ≥ 90; sitemap finns. | v1 | Pågår | – | Admin 2026-09-25 |
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
| Q-08 | Hur lämnar granskare av demon förslag – mejl till Admin, mejl till Leo, formulär eller GitHub? (F-42) |
| Q-09 | Pris på käpparna – på startsidan, efter informationstexten eller inte alls? (Leo funderar) |
| Q-10 | Leos mejladress och telefonnummer för kontaktsidan, och vilken formulärtjänst (F-13, Q-03). |
| Q-07 | Namn, år, material och status för käpparna Nº I–XXIII – vill Leo fylla i dem? |
