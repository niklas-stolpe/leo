# Leo – så byggs det

Förklaringen för Admin. Reglerna står i `CLAUDE.md`, Leos version i `README.md`. Handlingarna är
script i `scripts/` och workflows i `.github/workflows/`. Ingen ska behöva minnas en procedur – den körs.

Bygger på Eaves-processen, med en skillnad: **Leo läser ingen kod.** Allt Claude bygger blir en
version på versionssidan; Leo (eller Admin) tittar och väljer vilken version den riktiga sidan ska
visa – det valet är godkännandet (B-06). Allt han inte ser – buggar, hastighet, tillgänglighet,
säkerhet – täcks av grindar och granskning.

## Vem gör vad

| Aktör | Jobb | Var |
|---|---|---|
| **Leo** | Skriver önskemål och nya käppar (issue-mallar med `@claude` förifyllt). Tittar på versionerna. Väljer "Publicera på prod" eller skriver `@claude ändra …`. | GitHub, gärna mobilappen |
| **Admin** | Beslutar (B-rader), sköter konton och hemligheter, följer boardet. Står i Leos ställe tills Leo har konto (B-09). | – |
| **`claude.yml`** | Claude bygger vid `@claude` – från issue till PR, eller ändringar på en PR. | GitHub Actions |
| **Cloudflare Workers Builds** | Typkontroll + bygge vid varje push. Andra brancher → stage (https://stage-leo.niklasstolpe.workers.dev, senaste pushade ändringen), main → ny Cloudflare-version (`wrangler versions upload`) – **inte** prod. Check-run `Workers Builds: leo` på commiten. Inställningar: `docs/processmall.md` 3b. | Cloudflare – drar inga GitHub-minuter |
| **`requirements-gate`** | Kravgrinden som röd/grön bock på PR:en. | GitHub Actions, varje PR |
| **Claude Code Review** | Granskar det Leo inte ser. Kommenterar, rättar inget. | GitHub Actions, varje PR |
| **`publicera.yml`** | Issue "Publicera version N på prod" (knappen på versionssidan) eller kommentaren "publicera version N" från ett konto i `LEO_LOGINS` → `publicera-version.sh N`. | GitHub Actions |
| **Versioner** | `merge-pr.sh` → `version-release.sh`: varje synlig merge blir Version N (tagg + release). Versionssidan https://leo-versioner.niklasstolpe.workers.dev. `publicera-version.sh N` lägger version N på prod; `borja-om-fran.sh N` fortsätter utvecklingen från version N. Se `docs/processmall.md`, Versioner. | Session / Actions + Cloudflare |
| **`board.yml`** | Nytt issue → Backlog, `@claude` → In progress, PR → In review. | GitHub Actions |
| **Kravagenten** | Nattlig, bara om något mergats. Drift mellan kod och krav → ett issue `kravavvikelser`. | GitHub Actions, 05:00 |
| **Claude i session** | Större ändringar, process, felsökning. Kör samma script. | Admins dator |

Branch protection finns inte på privata repon i GitHub Free – därför sitter grinden i
`merge-pr.sh`. Merga aldrig med GitHub-knappen.

## Ett önskemål från start till publicerat

```
Leo: nytt issue "Önskemål" (mallen har @claude)          board → In progress   (board.yml)
Claude: branch, bygger, gh pr create "Closes #n …"       board → In review     (board.yml)
Cloudflare: bygger branchen → stage visar ändringen (check Workers Builds: leo)
Claude Code Review: granskar → fynd? "@claude åtgärda granskningsfynden" (Admin eller Leo)
Claude: merge-pr.sh (grindar, merge, board Done)  → Version N på versionssidan (prod orörd)
Leo: Titta → "@claude gör bilden större" (ny version) … eller Publicera på prod
publicera.yml → publicera-version.sh N → prod visar version N
```

I session: `scripts/issue-start.sh <n> <område> <slug>` → bygg → `gh pr create` → `scripts/pr-open.sh <pr>`
→ `scripts/merge-pr.sh <pr>` (ny version) → när Admin/Leo väljer: `scripts/publicera-version.sh N`.

## Grindarna i `merge-pr.sh`

1. **Kravgrinden** (`requirements-check.sh`, deterministisk): `Uppfyller:`-raden finns; angivna ID:n finns
   och är `Klar` med verifiering; inget i dokumentet är `Klar` utan verifiering; rör PR:en Admins yta
   (`.github/`, `scripts/`, `site/wrangler.jsonc`, `site/package*.json`) krävs `Säkerhet:`.
2. **Bygget:** Cloudflares check `Workers Builds: leo` grön (`BUILD_CHECK` i `lib.sh`). Actions-kravgrinden räknas inte – steg 1 kör samma script.
3. **Granskning:** inga olösta trådar, ingen granskning pågår.

## Kravdokumentet

`docs/requirements.md`. Ett krav per rad, skrivet så att Leo förstår det. Stabila ID:n, status
`Backlog · Pågår · Klar · Utgått`, verifiering `leo · bygg · lighthouse · admin · –`. Nya krav läggs in
som rad direkt. Ändringsloggen överst uppdateras.

## Board

Organisationsprojekt 1 "leo", statusar `Backlog · Ready · In progress · In review · Done`. Workflows och
script sätter dem. Beroenden står i issues som `Beror på: #n`; `merge-pr.sh` flyttar till Ready när
alla beroenden stängts. Roadmapen är issue #1.

## Så rapporterar Claude

**Till Leo:** enkel svenska, inga tekniska ord. Vad som gjorts, vad han ska titta på, hur han svarar.

**Till Admin** (samma regel som Eaves):
1. Sammanfattning först, 3–5 rader.
2. Krav-ID, PR- och issue-nummer följs av klartext första gången: `F-13 (fråga om en käpp)`, `#4 (galleriet)`.
3. Script följs av vad de gör: "`merge-pr.sh` (grindarna + merge)".
4. Inga oförklarade förkortningar eller siffror.
5. Tekniktermer på engelska: merge, branch, preview, deploy, build.
6. Var ändringen märks – sidan, issue, fil – står ut.

## Konton som ska flyttas till Leo (B-09)

| Vad | Nu | När Leo har eget |
|---|---|---|
| Claude-prenumeration | Admins `CLAUDE_CODE_OAUTH_TOKEN` | Leo kör `claude setup-token`, Admin byter secreten. |
| GitHub | Admin godkänner i Leos ställe (`LEO_LOGINS=nstolpeflir`) | Bjud in Leo som collaborator (Write), lägg hans login i `LEO_LOGINS`, ta bort Admins. |

## Manuella steg som inte går att scripta (Admin)

Gjort 2026-09-25 (#2). Behövs igen när en nyckel går ut eller flyttas till Leo.

Lägg in secrets via webben (repo → Settings → Secrets and variables → Actions), **inte** med
`gh secret set` i Windows-terminalen – den dolda inmatningen tappade inklistringen och sparade tomma värden.
Klistra först in i Anteckningar: `claude setup-token` skriver nyckeln över två rader, och ett mellanslag
i skarven gjorde den ogiltig (401). Rätt nyckel: 108 tecken, `sk-ant-oat01-…AAA`, inga blanksteg.

1. **Claude GitHub App** installerad på `niklas-stolpe/leo` (github.com/apps/claude).
2. **Secret `CLAUDE_CODE_OAUTH_TOKEN`** – `claude setup-token`. Giltig 1 år – **går ut ~2027-09-25**.
3. **Secrets `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`** – Cloudflare → My Profile → API Tokens → mallen "Edit Cloudflare Workers", nyckeln heter "Leo", begränsad till Admins konto. Account ID står i adressfältet i Cloudflare-dashboarden. Samma konto som Eaves.
4. **Secret `PROCESS_TOKEN`** – classic token "leo-process" från Admins konto med scope `repo`, `workflow`, `project`, `read:org` (utan `read:org`: "unknown owner type" från `gh project`). **Går ut 2027-03-26** – förnya under github.com/settings/tokens → leo-process → Regenerate, och byt secreten.
5. Första publiceringen: `scripts/deploy-local.sh prod` (efter `npx wrangler login` i `site/`) så att Workern finns. Koppla sedan Workers Builds (`docs/processmall.md` 3b – gjort 2026-09-26, nyckel `leo-token`). Produktion: https://leo.niklasstolpe.workers.dev

Utgången nyckel syns som: Claude svarar inte på `@claude` (Claude-nyckeln), boardet står still och "Publicera på prod"
gör inget (processnyckeln), eller ingen förhandsvisningslänk (Cloudflare).
