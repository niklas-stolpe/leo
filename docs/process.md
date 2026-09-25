# Leo – så byggs det

Förklaringen för Admin. Reglerna står i `CLAUDE.md`, Leos version i `README.md`. Handlingarna är
script i `scripts/` och workflows i `.github/workflows/`. Ingen ska behöva minnas en procedur – den körs.

Bygger på Eaves-processen, med en skillnad: **Leo läser ingen kod.** Han bedömer hur det ser ut på
en förhandsvisning och svarar `godkänt`. Allt han inte ser – buggar, hastighet, tillgänglighet,
säkerhet – täcks av grindar och granskning.

## Vem gör vad

| Aktör | Jobb | Var |
|---|---|---|
| **Leo** | Skriver önskemål och nya käppar (issue-mallar med `@claude` förifyllt). Tittar på förhandsvisningen. Svarar `godkänt` eller `@claude ändra …`. | GitHub, gärna mobilappen |
| **Admin** | Beslutar (B-rader), sköter konton och hemligheter, följer boardet. Står i Leos ställe tills Leo har konto (B-09). | – |
| **`claude.yml`** | Claude bygger vid `@claude` – från issue till PR, eller ändringar på en PR. | GitHub Actions |
| **`deploy.yml`** | `site-build` (typkontroll + bygge) på varje PR och main. Förhandsvisning per PR på fasta adressen stage (senaste pushade ändringen) och på `pr-<n>`, länk i en kommentar. Publicering från main. | GitHub Actions |
| **`requirements-gate`** | Kravgrinden som röd/grön bock på PR:en. | GitHub Actions, varje PR |
| **Claude Code Review** | Granskar det Leo inte ser. Kommenterar, rättar inget. | GitHub Actions, varje PR |
| **`publish.yml`** | Leo skriver `godkänt` → kör `merge-pr.sh` → merge → `deploy.yml` publicerar. | GitHub Actions |
| **`board.yml`** | Nytt issue → Backlog, `@claude` → In progress, PR → In review. | GitHub Actions |
| **Kravagenten** | Nattlig, bara om något mergats. Drift mellan kod och krav → ett issue `kravavvikelser`. | GitHub Actions, 05:00 |
| **Claude i session** | Större ändringar, process, felsökning. Kör samma script. | Admins dator |

Branch protection finns inte på privata repon i GitHub Free – därför sitter grinden i
`merge-pr.sh`. Merga aldrig med GitHub-knappen.

## Ett önskemål från start till publicerat

```
Leo: nytt issue "Önskemål" (mallen har @claude)          board → In progress   (board.yml)
Claude: branch, bygger, gh pr create "Closes #n …"       board → In review     (board.yml)
deploy.yml: site-build + förhandsvisning → kommentar med länk på PR:en
Claude Code Review: granskar → fynd? "@claude åtgärda granskningsfynden" (Admin eller Leo)
Leo: tittar i mobilen → "@claude gör bilden större"  … ny förhandsvisning …
Leo: "godkänt"  → publish.yml → merge-pr.sh (grindar, merge, board Done, issue stängt)
main: deploy.yml publicerar
```

I session: `scripts/issue-start.sh <n> <område> <slug>` → bygg → `gh pr create` → `scripts/pr-open.sh <pr>`
→ vänta på Leos `godkänt` → antingen gör `publish.yml` resten, eller `scripts/merge-pr.sh <pr>`.

## Grindarna i `merge-pr.sh`

1. **Kravgrinden** (`requirements-check.sh`, deterministisk): `Uppfyller:`-raden finns; angivna ID:n finns
   och är `Klar` med verifiering; inget i dokumentet är `Klar` utan verifiering; rör PR:en Admins yta
   (`.github/`, `scripts/`, `site/wrangler.jsonc`, `site/package*.json`) krävs `Säkerhet:`.
2. **Leos godkännande** (`leo-approval.sh`): rör PR:en `site/` krävs en kommentar som börjar med
   `godkänt`/`godkänd` från ett konto i `LEO_LOGINS` (`scripts/lib.sh`), skriven **efter** senaste committen.
   Ändras något efter godkännandet måste Leo godkänna igen – han godkänner det han såg.
3. **CI:** `site-build` och `requirements-gate` gröna.
4. **Granskning:** inga olösta trådar, ingen granskning pågår.

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
5. Kör `deploy` en gång för hand (Actions → deploy → Run workflow) så att Workern skapas – förhandsvisningarna kräver att den finns. Produktion: https://leo.niklasstolpe.workers.dev

Utgången nyckel syns som: Claude svarar inte på `@claude` (Claude-nyckeln), boardet står still och "godkänt"
publicerar inte (processnyckeln), eller ingen förhandsvisningslänk (Cloudflare).
