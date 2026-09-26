#!/usr/bin/env bash
# ENDA sättet en PR mergas. Vägrar om något villkor inte håller; gör sedan alla efter-steg.
#   scripts/merge-pr.sh <pr>
# Körs av Admin/Claude på dev-datorn, och av .github/workflows/publish.yml när Leo skriver "godkänt".
#
# Villkor:  kravgrinden · Cloudflare-bygget grönt · granskningen klar och alla trådar lösta ·
#           Leos godkännande efter senaste ändringen om PR:en rör site/ (B-06).
# Efter:    squash-merge + radera branch · board Done (PR + Closes-issues) · stäng issues ·
#           bocka av i roadmap #1 · lås upp issues som väntade (Beror på) · synka main lokalt ·
#           ny version (tagg + release + versionssidan) om det som syns ändrades (F-40).
#           Pushen till main publicerar webbplatsen (Cloudflare Workers Builds).
source "$(dirname "$0")/lib.sh"
pr="${1:?pr}"
here="$(dirname "$0")"

state="$(pr_field "$pr" .state)"; [ "$state" = "OPEN" ] || fail "PR #$pr är $state"
head="$(pr_field "$pr" .headRefName)"; sha="$(pr_field "$pr" .headRefOid)"

log "1/4 kravgrinden"
"$here/requirements-check.sh" "$pr"

log "2/4 Leos godkännande"
"$here/leo-approval.sh" "$pr"

log "3/4 bygget ($BUILD_CHECK)"
# Bygget körs av Cloudflare Workers Builds, inte GitHub Actions – fungerar även när Actions-minuterna
# är slut. Kravgrinden i Actions (requirements-gate) räknas inte här: steg 1 körde samma script.
for i in $(seq 1 60); do
  byggt="$(gh api "repos/$REPO/commits/$sha/check-runs" \
    --jq ".check_runs[] | select(.name==\"$BUILD_CHECK\" and .app.slug==\"$BUILD_APP\") | \"\(.status)|\(.conclusion // \"\")\"" | head -1)"
  case "$byggt" in completed\|*) break ;; esac
  [ "$i" -eq 60 ] && fail "$BUILD_CHECK blev inte klar inom 10 min (${byggt:-ingen check-run – är Workers Builds kopplat?})"
  sleep 10
done
[ "$byggt" = "completed|success" ] || fail "$BUILD_CHECK: $byggt – se bygget i Cloudflare-dashboarden"
ok "$BUILD_CHECK grönt (stage visar ändringen)"

log "4/4 granskningstrådar"
unresolved="$(gh api graphql -f query="{repository(owner:\"$OWNER\",name:\"${REPO#*/}\"){pullRequest(number:$pr){reviewThreads(first:100){nodes{isResolved}}}}}" \
  --jq '[.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved==false)] | length')"
[ "$unresolved" = "0" ] || fail "$unresolved olöst(a) granskningstråd(ar) – åtgärda och resolve:a först (eller skriv '@claude åtgärda granskningsfynden' på PR:en)"
review_running="$(gh run list --repo "$REPO" --branch "$head" --workflow "Claude Code Review" --limit 1 --json status --jq '.[0].status // "none"')"
[ "$review_running" != "in_progress" ] && [ "$review_running" != "queued" ] || fail "granskningen kör fortfarande – vänta in den"
ok "inga olösta trådar, ingen granskning pågår"

log "merge"
issues="$(pr_closes "$pr")"
title="$(pr_field "$pr" .title)"
# Via API i stället för `gh pr merge` – fungerar likadant lokalt och i Actions (ingen lokal branch att städa).
synligt=0; pr_visible "$pr" && synligt=1
merge_sha="$(gh api -X PUT "repos/$REPO/pulls/$pr/merge" -f merge_method=squash -f sha="$sha" \
  -f commit_title="$title (#$pr)" --jq .sha)"
gh api -X DELETE "repos/$REPO/git/refs/heads/$head" >/dev/null 2>&1 || true
ok "PR #$pr mergad"
board_set "$pr" Done

for n in $issues; do
  if [ "$(gh issue view "$n" --repo "$REPO" --json state --jq .state)" = "OPEN" ]; then
    gh issue close "$n" --repo "$REPO" --comment "Publicerat via #$pr." >/dev/null
  fi
  board_set "$n" Done
  # Bocka av i roadmapen.
  rb="$(gh issue view "$ROADMAP_ISSUE" --repo "$REPO" --json body --jq .body)"
  if printf '%s\n' "$rb" | grep -qE "^- \[ \] #$n\b"; then
    tmp="$(mktemp)"
    printf '%s\n' "$rb" | sed -E "s/^- \[ \] #$n\b/- [x] #$n/" > "$tmp"
    gh issue edit "$ROADMAP_ISSUE" --repo "$REPO" --body-file "$tmp" >/dev/null && ok "#$ROADMAP_ISSUE: #$n avbockat"
    rm -f "$tmp"
  fi
  # Lås upp issues som väntade på #n och vars övriga beroenden är stängda.
  for dep in $(gh issue list --repo "$REPO" --state open --limit 200 --json number --jq '.[].number'); do
    deps="$(gh issue view "$dep" --repo "$REPO" --json body --jq .body | grep -iE 'Beror på' -A2 | sed -E 's/(Blockerar|Blockeras|Underlag).*//I' | grep -oE '#[0-9]+' | tr -d '#' | sort -u || true)"
    printf '%s\n' "$deps" | grep -qx "$n" || continue
    allclosed=1
    for d in $deps; do [ "$(gh issue view "$d" --repo "$REPO" --json state --jq .state)" = "CLOSED" ] || allclosed=0; done
    if [ "$allclosed" = 1 ]; then
      gh issue edit "$dep" --repo "$REPO" --remove-label status:blocked --add-label status:ready >/dev/null 2>&1 || true
      board_set "$dep" Ready
    fi
  done
done

if [ -z "${CI:-}" ]; then
  git checkout -q main && git pull -q origin main
  git branch -D "$head" -q 2>/dev/null || true
  ok "main synkad lokalt"
fi
# Ändrades det som syns blir publiceringen en version (F-40) – väntar in Cloudflares prod-bygge.
if [ "$synligt" = 1 ]; then
  log "version"
  "$here/version-release.sh" "$merge_sha" "$pr" || warn "versionen skapades inte – kör scripts/version-release.sh $merge_sha $pr"
fi
ok "PR #$pr klar – Cloudflare publicerar main till prod"
