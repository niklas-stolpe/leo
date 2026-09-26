# Processmall – självgående utveckling med Claude

Hur det här repot är uppsatt, skrivet så att samma process kan återanvändas i ett nytt projekt.
Leo-repot är referensen: kopiera filerna härifrån och byt det som står under "Byt ut".

- Leo-specifika detaljer: [`process.md`](process.md) · Regler för Claude: [`../CLAUDE.md`](../CLAUDE.md)
- Beställarens guide: [`../README.md`](../README.md) · Krav: [`requirements.md`](requirements.md)

Processen bygger på Eaves (`niklas-stolpe/eaves`), anpassad för en beställare som inte läser kod.

## Idén

**Beställaren tittar och säger ja. Claude bygger. Grindar och granskning täcker det beställaren inte ser.**
Ingen behöver minnas en procedur – den körs av script och workflows.

| Roll | Gör | Gör inte |
|---|---|---|
| **Beställare** (här Leo) | Skriver önskemål i issue-mallar, tittar på stage i mobilen, svarar `godkänt` eller `@claude ändra …` | Läser kod, rör konton |
| **Admin** (här Niklas) | Beslutar låsta beslut (B-rader), äger konton, nycklar och pengar, följer boardet | Behöver inte köra något i vardagen |
| **Claude i GitHub** | Bygger från issue till PR, ändrar på PR vid `@claude`, granskar varje PR, nattlig kravkontroll | Mergar aldrig själv |
| **Claude i session** | Större ändringar, processarbete, felsökning, reservvägar | Går aldrig förbi grindarna |

```
Beställare: issue "Önskemål" (@claude förifyllt)       board → In progress
Claude: branch, bygger, öppnar PR (Closes #n)          board → In review
Cloudflare Workers Builds: bygger branchen → stage visar ändringen på fast adress
Claude Code Review: granskar → fynd fixas (session eller "@claude åtgärda granskningsfynden")
Beställare: tittar på stage → "@claude ändra …" (ny version på samma adress) eller "godkänt"
publish.yml → merge-pr.sh: alla grindar → merge → board Done, issue stängt, roadmap avbockad
main: Cloudflare Workers Builds publicerar till prod
```

## Byggstenarna

| Fil | Vad den gör | Byt ut i nytt projekt |
|---|---|---|
| `CLAUDE.md` | Regler för Claude: kravspec = sanning, merga bara via script, två sätt att prata (beställare/Admin), hur Claude jobbar i GitHub | Projektbeskrivning, struktur, "Fakta som behövs i kod" |
| `docs/requirements.md` | Kravspec: ändringslogg, termer (T), aktörer, låsta beslut (B), krav (F/NF), öppna frågor (Q). Ett krav per rad, status + verifiering | Allt innehåll; behåll tabellformatet – kravgrinden läser kolumn 6 (status) och 7 (verifiering) |
| `docs/process.md` | Projektets egen processbeskrivning och manuella steg | Adresser, nycklar, datum |
| `README.md` | Guide till beställaren på enkel svenska | Namn, adresser |
| `scripts/lib.sh` | Delade inställningar: repo, board-id:n, statusar, vem som får godkänna (`LEO_LOGINS`), vad som syns (`VISIBLE_PATH`) | **Alla id:n** – se steg 2 nedan |
| `scripts/requirements-check.sh` | Kravgrinden: `Uppfyller:`-rad, ID:n finns och är `Klar` med verifiering, `Säkerhet:`-rad när Admins yta rörs | `SEC_PATH` |
| `scripts/leo-approval.sh` | Beställarens `godkänt` måste finnas **efter** senaste committen om PR:en rör det som syns | Inget (läser `lib.sh`) |
| `scripts/merge-pr.sh` | Enda sättet att merga: kravgrind, godkännande, Cloudflare-bygget, granskningstrådar → squash-merge → board, issues, roadmap, beroenden | – (läser `BUILD_CHECK`) |
| `scripts/issue-start.sh`, `pr-open.sh` | Session: branch + board In progress; PR → In review + kravgrind | – |
| `scripts/deploy-local.sh` | Reservväg: publicera prod/stage från datorn när Workers Builds inte kör; första publiceringen | Adresser i kommentaren |
| Cloudflare Workers Builds (inte en fil) | Typkontroll + bygge vid varje push; andra brancher → stage, main → prod. Check-run `Workers Builds: <worker>` som `merge-pr.sh` kräver. Drar inga GitHub-minuter | Inställningarna i 3b, `BUILD_CHECK` i `lib.sh` |
| `.github/workflows/claude.yml` | `@claude` i issue eller PR → Claude bygger | Förinstallation (`npm ci` i rätt katalog) |
| `.github/workflows/claude-code-review.yml` | Granskning av varje PR, `allowed_bots: "claude"` så Claudes egna PR:er granskas | Granskningsprompten (vad som är viktigt i projektet) |
| `.github/workflows/publish.yml` | Kommentar som börjar med `godkänt` → `merge-pr.sh`. Kör alltid main:s version av scripten | – |
| `.github/workflows/board.yml` | Nytt issue → Backlog, `@claude` → In progress, PR → In review | – |
| `.github/workflows/requirements-gate.yml` | Kravgrinden som bock på PR:en | – |
| `.github/workflows/requirements-audit.yml` | Nattlig kravagent → ett återanvänt issue `kravavvikelser` | Promptens projektnamn |
| `.github/ISSUE_TEMPLATE/*.md` | Mallar med `@claude` förifyllt – beställaren fyller bara i text och bilder | Mallarnas innehåll |
| `site/src/lib/miljo.ts`, `site/astro.config.mjs` | Stage eller prod från `PUBLIC_MILJO` (sätts i Workers Builds deploy command): ikon, appnamn, noindex, adress för delningsbilder | Adresser |

## Sätta upp ett nytt projekt

### 1. Repo och board

```bash
gh repo create niklas-stolpe/<namn> --private --add-readme --clone
gh project create --owner niklas-stolpe --title <namn> --format json      # notera id och number
gh project link <number> --owner niklas-stolpe --repo niklas-stolpe/<namn>
gh project field-list <number> --owner niklas-stolpe --format json        # Status-fältets id
```

Byt boardets statusar till `Backlog · Ready · In progress · In review · Done` (GraphQL
`updateProjectV2Field` med `singleSelectOptions`) och läs av de nya option-id:na.

### 2. Kopiera och byt ut

Kopiera filerna i tabellen ovan. I `scripts/lib.sh`: `REPO`, `PROJECT_OWNER`, `PROJECT_NUMBER`,
`PROJECT_ID`, `STATUS_FIELD_ID`, option-id:na i `status_option_id`, `BUILD_CHECK`, `LEO_LOGINS` (Admins login tills
beställaren har konto), `VISIBLE_PATH`. Skapa etiketterna `önskemål`, `admin`, `kravavvikelser`,
`status:blocked`, `status:ready` (+ projektets egna). Glöm inte `git update-index --chmod=+x scripts/*.sh`
på Windows.

### 3. Manuella steg (Admin)

**Lägg in secrets via webben** (repo → Settings → Secrets and variables → Actions), inte med
`gh secret set` i Windows-terminalen – se fallgroparna.

| Vad | Hur |
|---|---|
| Claude GitHub App | github.com/apps/claude → Configure → lägg till repot |
| `CLAUDE_CODE_OAUTH_TOKEN` | `claude setup-token`. Klistra via Anteckningar: 108 tecken, `sk-ant-oat01-…AAA`, inga blanksteg. Giltig 1 år |
| `CLOUDFLARE_API_TOKEN` | Cloudflare → My Profile → API Tokens → Create Token → **Use template "Edit Cloudflare Workers"**, begränsa till eget konto |
| `CLOUDFLARE_ACCOUNT_ID` | Den långa hex-strängen i adressfältet i Cloudflare-dashboarden |
| `PROCESS_TOKEN` | Classic token från Admins konto med scope **`repo`, `workflow`, `project`, `read:org`**. Sätt utgångsdatum och skriv det i `process.md` |
| Första publiceringen | `scripts/deploy-local.sh prod` efter `npx wrangler login` i `site/` (förhandsvisningarna kräver att Workern finns) |
| Cloudflare Workers Builds | Se nästa avsnitt |

### 3b. Cloudflare bygger och publicerar (Workers Builds)

Bygge, stage och prod körs hos Cloudflare i stället för på GitHubs Actions-minuter.

1. GitHub → organisationens Settings → GitHub Apps → **Cloudflare Workers and Pages** → Configure →
   lägg till repot under *Only select repositories*.
2. Cloudflare → Compute (Workers) → Workern → Settings → Build → **Connect**:

| Fält | Värde |
|---|---|
| Repository | repot (inte ett annat som råkar stå förvalt) |
| Production branch | `main` |
| Build command | `npm ci && npm run check` |
| Deploy command | `PUBLIC_MILJO=prod npm run build && npx wrangler deploy` |
| Preview/Version command | `npm run build && npx wrangler versions upload --preview-alias stage` |
| Enable Preview builds | på |
| Advanced → Path | `/site` |
| Advanced → API token | Create new token (egen, t.ex. `<namn>-token` – inte ett annat projekts) |
| Build caching | på |

Push till main → prod. Push till annan branch → stage. Cloudflare rapporterar bygget som en
check på commiten i GitHub; `merge-pr.sh` kräver att den är grön.

### 4. Starta

1. Grundcommiten går direkt till main – den enda gången, eftersom grindarna inte finns förrän den ligger där.
2. Issue #1 = roadmap (`- [ ] #n …`, bockas av automatiskt). Ett issue för de manuella stegen. Ett issue för provkörningen.
3. **Provkör hela kedjan** innan beställaren börjar:
   - [ ] Önskemål-issue → Claude svarar och öppnar PR (Claude-nyckeln fungerar)
   - [ ] Kortet flyttar sig själv till In progress och In review (processnyckeln fungerar)
   - [ ] Checken `Workers Builds: <worker>` blir grön och stage visar ändringen (Cloudflare fungerar)
   - [ ] Granskningen postar PASS/FYND (Claude-appen + `allowed_bots`)
   - [ ] `godkänt` → mergad, kort Done, issue stängt, prod uppdaterad
4. Spara stage och prod på mobilens hemskärm – ikonerna skiljer dem åt.

## Vardagen

- **Beställaren:** issue-mall → titta på stage → `godkänt` eller `@claude …`. Inget annat.
- **Granskningsfynd fixas alltid**, även nice-to-have om de är billiga – svara i tråden och resolve:a.
  `merge-pr.sh` vägrar med olösta trådar.
- **Ny commit efter godkännande = nytt godkännande.** Beställaren godkänner det hen såg.
- **Nya krav blir rader direkt**, i samma PR som bygger dem. PR:en flippar raden till `Klar`.
- **Personer på bild** (utom beställaren) visas bara med samtycke – fråga Admin.

## GitHub Actions-minuterna

Organisationen har 2000 Actions-minuter i månaden på GitHub Free, delade mellan **alla** privata repon.
Bygge och publicering ligger därför hos Cloudflare (3b). Det som fortfarande kör i Actions är Claude
(`@claude`, granskningen, kravagenten), `publish.yml`, `board.yml` och `requirements-gate` – en PR
kostar ungefär 5–10 minuter, mest granskningen (~4 min per push).

När minuterna är slut startar inga Actions-jobb; de faller utan steg och utan logg, och orsaken står
bara i check-runens annotations: `gh api repos/<repo>/check-runs/<id>/annotations`.

| Vad | Fungerar ändå? |
|---|---|
| Bygge, stage, prod | Ja – Cloudflare |
| Merga | Ja – `merge-pr.sh` i session kräver bara Cloudflare-bygget, kravgrinden (lokalt) och godkännandet |
| `godkänt` publicerar av sig själv | Nej – `publish.yml` är Actions. Claude i session kör `merge-pr.sh` |
| `@claude` och granskning | Nej – Claude i session bygger och granskar diffen lokalt |
| Om Cloudflare inte bygger | `npx wrangler login` en gång i `site/`, sedan `scripts/deploy-local.sh prod` (ren main) eller `stage` (aktuell branch) |

Mer utrymme: göra repot publikt (obegränsade minuter) eller en utgiftsgräns – båda Admins beslut.

## Fallgropar vi gått i

| Symptom | Orsak | Lösning |
|---|---|---|
| Secret finns men workflowen ser tomt värde | `gh secret set` i Windows-terminalen: den dolda inklistringen fastnade inte | Lägg in via webben |
| Claude avbryter efter 2 s, 0 kr, `is_error: true` | Claude-nyckeln hade ett mellanslag från terminalens radbrytning (109 tecken, API 401) | Klistra via Anteckningar, kontrollera 108 tecken |
| `unknown owner type` i board-steget | `PROCESS_TOKEN` saknar `read:org` | Lägg till scope (Update token – värdet ändras inte) |
| Granskningen vägrar på Claudes PR:er | `Workflow initiated by non-human actor: claude` | `allowed_bots: "claude"` |
| Granskningen blir grön utan kommentar | PR:en ändrar granskningens egen workflow-fil (säkerhetsspärr) | Läs själv, notera i PR:en |
| Kort hamnar inte på boardet | `gh project item-list` släpar > 20 s efter `item-add` | Använd id:t som `item-add --format json` returnerar |
| `godkänt` känns inte igen | jq-regex med `\s` i bash-sträng | POSIX-klasser (`[[:space:]]`) |
| Kravgrinden röd trots rätt krav | Ett krav-ID nämnt i förklarande text på `Uppfyller:`-raden | Bara ID:n på raden, förklaring på egen rad |
| Staplad PR krockar efter squash-merge | Grenen innehåller de gamla commitsen | Lägg PR:ens egen diff ovanpå main (`git diff <bas> <gren>` + `git apply --3way`) |
| `astro check`: `Cannot find name 'process'` | `// @ts-check` i `astro.config.mjs` utan Node-typer | Ta bort `@ts-check` där |
| Delningsbild pekar på example.com | `site` saknas i `astro.config.mjs` | `site` från `PUBLIC_MILJO` |
| Jobb faller utan steg och logg | Actions-minuterna slut | Se "GitHub Actions-minuterna" |
| Workers Builds föreslår fel repo | Cloudflares GitHub-app hade bara tillgång till ett annat repo | Lägg till repot i appens installation (org → Settings → GitHub Apps) |
| Workers Builds föreslår ett annat projekts API-nyckel | Förvalt är senast skapade nyckeln | Create new token per projekt |

## Flytta till beställarens egna konton

| Vad | Gör |
|---|---|
| Claude-prenumeration | Beställaren kör `claude setup-token`, Admin byter `CLAUDE_CODE_OAUTH_TOKEN` |
| GitHub | Bjud in beställaren som collaborator (Write), lägg hens login i `LEO_LOGINS` och ta bort Admins |
| Cloudflare | Ny Workers-token från beställarens konto, byt båda Cloudflare-secrets, `wrangler login` på beställarens dator |
