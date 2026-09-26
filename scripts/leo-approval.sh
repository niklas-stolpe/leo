#!/usr/bin/env bash
# Leos godkännande (B-06, T-04). Lyckas om PR:en inte ändrar något synligt, om site/ är identiskt med
# en godkänd version, eller om någon i LEO_LOGINS har kommenterat "godkänt" och det som syns inte har
# ändrats sedan dess. Commits efter godkännandet som inte ändrar själva ändringen av site/ (t.ex. en
# uppdatering mot main) behåller godkännandet; ändras det som syns krävs ett nytt.
#   scripts/leo-approval.sh <pr>
source "$(dirname "$0")/lib.sh"
pr="${1:?pr}"

if ! pr_visible "$pr"; then
  ok "PR #$pr ändrar inget på webbplatsen – Leos godkännande behövs inte"
  exit 0
fi

# Tillbaka till en version Leo redan godkänt (F-41, publicera-version.sh): site/ på PR:ens senaste
# commit är exakt samma träd som en tagg vN – då är det redan sett och godkänt en gång.
git fetch -q --tags origin
git fetch -q origin "refs/pull/$pr/head"
head_sha="$(git rev-parse FETCH_HEAD)"
samma="$(release_med_trad "$(site_tree "$head_sha")")"
if [ -n "$samma" ]; then
  ok "PR #$pr ställer site/ exakt tillbaka till $samma – redan godkänd, inget nytt godkännande behövs"
  exit 0
fi

logins_json="$(printf '%s' "$LEO_LOGINS" | tr ' ' '\n' | sed 's/.*/"&"/' | paste -sd, -)"
# Första raden i kommentaren ska börja med godkänt/godkänd/godkänner (versaler spelar ingen roll).
approved_at="$(gh api --paginate "repos/$REPO/issues/$pr/comments" --jq "
  .[] | select(.user.login as \$u | [$logins_json] | index(\$u))
      | select(.body | split(\"\n\")[0] | test(\"^[[:space:]]*godkän(t|d|ner)([^[:alpha:]]|$)\"; \"i\"))
      | .created_at" | sort | tail -1)"
[ -n "$approved_at" ] || fail "PR #$pr ändrar webbplatsen men Leo har inte skrivit 'godkänt'. Förhandsvisningen står i PR:en."

commits="$(gh pr view "$pr" --repo "$REPO" --json commits --jq '.commits[] | "\(.committedDate) \(.oid)"')"
last_commit="$(printf '%s\n' "$commits" | tail -1 | cut -d' ' -f1)"
if [[ "$approved_at" > "$last_commit" ]]; then
  ok "Leo godkände PR #$pr $approved_at (efter senaste ändringen $last_commit)"
  exit 0
fi

# Commits efter godkännandet: godkännandet gäller ändringen, inte en viss commit. Är PR:ens ändring
# av site/ (mot main) exakt densamma som den Leo godkände står godkännandet kvar.
godkand="$(printf '%s\n' "$commits" | awk -v t="$approved_at" '$1 <= t {c=$2} END {print c}')"
[ -n "$godkand" ] || fail "PR #$pr: godkännandet ($approved_at) kom före alla commits – skriv 'godkänt' igen"
git fetch -q origin main
andring() { git diff "$(git merge-base origin/main "$1")" "$1" -- site | git patch-id --stable | cut -d' ' -f1; }
fore="$(andring "$godkand" 2>/dev/null || true)"
nu="$(andring "$head_sha")"
if [ -n "$fore" ] && [ "$fore" = "$nu" ]; then
  ok "Leo godkände PR #$pr $approved_at – det som syns är exakt samma ändring sedan dess (${godkand:0:7} → ${head_sha:0:7})"
  exit 0
fi
fail "PR #$pr har ändrats i det som syns efter Leos godkännande ($approved_at, senaste ändringen $last_commit) – skriv 'godkänt' igen efter att ha tittat på förhandsvisningen"
