#!/usr/bin/env bash
# Delat av scripts/*.sh. Källa: `source "$(dirname "$0")/lib.sh"`.
# Kräver: gh (inloggad, scope repo + project), git. Inget jq – gh --jq räcker.
# Körs både på Admins dator och i GitHub Actions (CI=true, GH_TOKEN = secrets.PROCESS_TOKEN).
set -euo pipefail

REPO="${LEO_REPO:-niklas-stolpe/leo}"
OWNER="${REPO%%/*}"
PROJECT_OWNER="niklas-stolpe"                 # organisationsprojekt 1 "leo"
PROJECT_NUMBER=1
PROJECT_ID="PVT_kwDOE5dLzs4BksoP"
STATUS_FIELD_ID="PVTSSF_lADOE5dLzs4BksoPzhjcTs0"
ROADMAP_ISSUE=1
REQUIREMENTS="docs/requirements.md"

# Vilka GitHub-konton som får godkänna i Leos namn (B-06). Admin står i Leos ställe tills Leo
# har ett eget konto (B-09) – lägg då till Leos login här och ta bort Admins.
LEO_LOGINS="nstolpeflir"

# Ändringar här kräver Leos godkännande – allt som syns på webbplatsen.
VISIBLE_PATH='^site/'

# Byggets check-run på commiten – Cloudflare Workers Builds (docs/processmall.md, 3b).
BUILD_CHECK="Workers Builds: leo"
BUILD_APP="cloudflare-workers-and-pages"   # bara Cloudflares GitHub-app räknas, inte en check med samma namn

# Versioner (F-40, F-41). En version = en publicering till prod av något som syns, taggad vN och
# sparad som GitHub Release. Cloudflare-versionens id står i releasens text och ger en egen länk.
PROD_URL="https://leo.niklasstolpe.workers.dev"
STAGE_URL="https://stage-leo.niklasstolpe.workers.dev"
VERSIONER_URL="https://leo-versioner.niklasstolpe.workers.dev"
DEMO_URL="https://leo-demo.niklasstolpe.workers.dev"
version_url() { printf 'https://%s-leo.niklasstolpe.workers.dev' "${1:0:8}"; }   # <cloudflare-version-id>

# site/-trädet (git tree-id) för en ref – två versioner med samma träd ser likadana ut.
site_tree() { git rev-parse "$1:site"; }

# release_med_trad <tree-id> – taggen (vN) vars site/-träd är exakt detta, annars tomt.
release_med_trad() {
  local t
  for t in $(git tag -l 'v[0-9]*' --sort=-v:refname); do
    [ "$(site_tree "$t")" = "$1" ] && { echo "$t"; return 0; }
  done
  return 0   # ingen träff är inget fel – annars avbryter set -e anroparen tyst
}

# cloudflare_version_for <commit-sha> – Version ID ur Cloudflares bygge av commiten (väntar in det).
cloudflare_version_for() {
  local sha="$1" rad i
  for i in $(seq 1 60); do
    rad="$(gh api "repos/$REPO/commits/$sha/check-runs" \
      --jq ".check_runs[] | select(.name==\"$BUILD_CHECK\" and .app.slug==\"$BUILD_APP\") | \"\(.status)|\(.conclusion // \"\")\"" | head -1)"
    case "$rad" in completed\|*) break ;; esac
    sleep 10
  done
  [ "$rad" = "completed|success" ] || { warn "Cloudflare-bygget av $sha: ${rad:-saknas}"; return 1; }
  gh api "repos/$REPO/commits/$sha/check-runs" \
    --jq ".check_runs[] | select(.name==\"$BUILD_CHECK\" and .app.slug==\"$BUILD_APP\") | .output.summary" \
    | grep -oE 'Version ID: [0-9a-f-]{36}' | head -1 | sed 's/Version ID: //'
}

# Status → option-id. gh project field-list 1 --owner niklas-stolpe --format json
status_option_id() {
  case "$1" in
    Backlog)       echo b680f023 ;;
    Ready)         echo 78b64115 ;;
    "In progress") echo 5452d752 ;;
    "In review")   echo 36a37c7d ;;
    Done)          echo aa9e37e4 ;;
    *) echo "okänd status: $1" >&2; return 1 ;;
  esac
}

log()  { printf '\033[36m▸ %s\033[0m\n' "$*"; }
ok()   { printf '\033[32m✓ %s\033[0m\n' "$*"; }
warn() { printf '\033[33m! %s\033[0m\n' "$*" >&2; }
fail() { printf '\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

# board_set <issue-eller-pr-nummer> <Status>  – lägger till på boardet om det saknas.
board_set() {
  local n="$1" status="$2" id opt
  opt="$(status_option_id "$status")"
  id="$(gh project item-list "$PROJECT_NUMBER" --owner "$PROJECT_OWNER" --format json --limit 500 \
        --jq ".items[] | select(.content.number==$n) | .id" | head -1)"
  if [ -z "$id" ]; then
    local url
    url="$(gh api "repos/$REPO/issues/$n" --jq .html_url)"
    # item-add returnerar kortets id direkt. item-list kan släpa över 20 s efter att kortet
    # lagts till (#10 2026-09-25) – polla den inte.
    id="$(gh project item-add "$PROJECT_NUMBER" --owner "$PROJECT_OWNER" --url "$url" --format json --jq .id)"
  fi
  [ -n "$id" ] || fail "#$n finns inte på boardet och kunde inte läggas till"
  gh project item-edit --id "$id" --project-id "$PROJECT_ID" \
    --field-id "$STATUS_FIELD_ID" --single-select-option-id "$opt" >/dev/null
  ok "#$n → $status"
}

# pr_field <pr> <jq-uttryck>
pr_field() { gh pr view "$1" --repo "$REPO" --json number,title,body,headRefName,headRefOid,baseRefName,state,mergeable,url --jq "$2"; }

# pr_closes <pr> – issuenummer som PR-texten stänger (Closes/Fixes/Resolves #n).
pr_closes() { pr_field "$1" .body | grep -oiE '(closes|fixes|resolves) #[0-9]+' | grep -oE '[0-9]+' | sort -u || true; }

# pr_visible <pr> – lyckas om PR:en ändrar något som syns på webbplatsen (VISIBLE_PATH).
pr_visible() { gh api --paginate "repos/$REPO/pulls/$1/files" --jq '.[].filename' | grep -qE "$VISIBLE_PATH"; }

# fixar_till_leo <issue> <vad> – besked till Leo INNAN något rättas automatiskt: informera först, fixa sedan.
fixar_till_leo() {
  gh issue comment "$1" --repo "$REPO" --body "[[till-leo]]
Hej Leo! $2 Jag rättar det nu – du behöver inte göra något. Du får ett mejl när den nya versionen finns, eller om jag inte kommer vidare.
[[/till-leo]]" >/dev/null
}

# stopp_till_leo <issue> <text till Admin> – när ett mejlärende stannar får Leo ALLTID besked med förslag på
# vad han kan göra (inkorgen mejlar texten mellan markörerna), och Admin får orsaken i samma kommentar.
stopp_till_leo() {
  gh issue comment "$1" --repo "$REPO" --body "Admin: $2

[[till-leo]]
Hej Leo! Din ändring har fastnat i ett tekniskt steg hos oss – inget du har gjort. Niklas har fått besked.

Du kan välja:
1. Vänta – du får ett mejl så fort den nya versionen finns.
2. Svara \"försök igen\", så gör jag ett nytt försök direkt.
3. Vill du ändra något i önskemålet, skriv det – så tar jag med det.

Hör du inget från mig inom ett par timmar – kontakta Niklas.
[[/till-leo]]" >/dev/null
}

# git_nat <git-argument…> – git mot GitHub. I Actions skickas nyckeln (GH_TOKEN) bara med just det anropet,
# aldrig via .git/config – bygget av en ändring körs i en worktree som delar den (persist-credentials: false).
git_nat() {
  if [ "${CI:-}" = true ] && [ -n "${GH_TOKEN:-}" ]; then
    # Tomt värde först: nollställer en ev. header från actions/checkout, så att bara vår nyckel skickas.
    git -c http.https://github.com/.extraheader= -c http.https://github.com/.extraheader="AUTHORIZATION: basic $(printf 'x-access-token:%s' "$GH_TOKEN" | base64 -w0)" "$@"
  else git "$@"; fi
}
