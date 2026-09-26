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
