#!/usr/bin/env bash
# Leos godkännande (B-06, T-04). Lyckas om PR:en inte ändrar något synligt, eller om någon i
# LEO_LOGINS har kommenterat "godkänt" EFTER den senaste committen – en ändring efter
# godkännandet kräver ett nytt godkännande.
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
samma="$(release_med_trad "$(site_tree FETCH_HEAD)")"
if [ -n "$samma" ]; then
  ok "PR #$pr ställer site/ exakt tillbaka till $samma – redan godkänd, inget nytt godkännande behövs"
  exit 0
fi

last_commit="$(gh pr view "$pr" --repo "$REPO" --json commits --jq '.commits[-1].committedDate')"
logins_json="$(printf '%s' "$LEO_LOGINS" | tr ' ' '\n' | sed 's/.*/"&"/' | paste -sd, -)"
# Första raden i kommentaren ska börja med godkänt/godkänd/godkänner (versaler spelar ingen roll).
approved_at="$(gh api --paginate "repos/$REPO/issues/$pr/comments" --jq "
  .[] | select(.user.login as \$u | [$logins_json] | index(\$u))
      | select(.created_at > \"$last_commit\")
      | select(.body | split(\"\n\")[0] | test(\"^[[:space:]]*godkän(t|d|ner)([^[:alpha:]]|$)\"; \"i\"))
      | .created_at" | tail -1)"

[ -n "$approved_at" ] || fail "PR #$pr ändrar webbplatsen men Leo har inte skrivit 'godkänt' efter senaste ändringen ($last_commit). Förhandsvisningen står i PR:en."
ok "Leo godkände PR #$pr $approved_at (efter senaste ändringen $last_commit)"
