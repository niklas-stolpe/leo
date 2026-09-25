#!/usr/bin/env bash
# Kravgrinden. Deterministisk, ingen AI. Körs av merge-pr.sh och av Actions (requirements-gate).
#
#   scripts/requirements-check.sh <pr-nummer>
#
# Regler (docs/process.md):
#   1. PR-texten har en rad `Uppfyller: F-01, NF-03` – eller `Uppfyller: –` följt av ett skäl
#      (ny käpp, docs, ci, process). Saknas raden helt → rött.
#   2. Varje angivet ID finns som rad i docs/requirements.md på PR:ens branch.
#   3. Varje angiven rad har status `Klar` i PR:ens version.
#   4. Ingen rad i dokumentet är `Klar` med verifiering `–` (ej verifierad = inte klar).
#   5. Rör PR:en Admins yta (B-07: .github/, scripts/, site/wrangler.jsonc, site/package*.json)
#      krävs en rad `Säkerhet:` – `oförändrad (<skäl>)` eller vad som är nytt.
source "$(dirname "$0")/lib.sh"

pr="${1:?pr-nummer}"
body="$(pr_field "$pr" .body)"
sha="$(pr_field "$pr" .headRefOid)"

# En rad som BÖRJAR med Uppfyller: vinner; annars sista omnämnandet (prosa om regeln kan komma före).
line="$(printf '%s\n' "$body" | grep -iE '^[[:space:]*_>#-]*Uppfyller\**:' | head -1 || true)"
[ -n "$line" ] || line="$(printf '%s\n' "$body" | grep -iE 'Uppfyller\**:' | tail -1 || true)"
[ -n "$line" ] || fail "PR #$pr saknar raden 'Uppfyller: F-xx' (eller 'Uppfyller: – <skäl>') i PR-texten"

# Dokumentet i PR:ens version via head-SHA (fungerar lokalt, i Actions och för mergade PR:er).
doc="$(gh api "repos/$REPO/contents/$REQUIREMENTS?ref=$sha" --jq .content | base64 -d)"

ids="$(printf '%s' "$line" | grep -oE '\b(F|NF|B)-[0-9]+\b' | sort -u || true)"
if [ -z "$ids" ]; then
  # Tankstreck (–) är flerbyte – alternation, inte bracket-klass, så det fungerar i C-locale (Actions).
  rest="$(printf '%s' "$line" | sed -E 's/.*Uppfyller\**:\**[[:space:]]*//')"
  if printf '%s' "$rest" | grep -qE '^(–|—|-)[[:space:]]*[^[:space:]]'; then
    ok "PR #$pr: 'Uppfyller: –' med skäl – inget krav att kontrollera"
  else
    fail "PR #$pr: 'Uppfyller:' utan ID och utan skäl. Skriv 'Uppfyller: F-xx' eller 'Uppfyller: – <varför inget krav>'"
  fi
else
  for id in $ids; do
    row="$(printf '%s\n' "$doc" | grep -E "^\| $id \|" | head -1 || true)"
    [ -n "$row" ] || fail "PR #$pr anger $id men raden finns inte i $REQUIREMENTS (commit $sha)"
    case "$id" in B-*) ok "$id är ett låst beslut – status kontrolleras inte"; continue ;; esac
    status="$(printf '%s' "$row" | awk -F'|' '{ for (i=2;i<=NF;i++) gsub(/^ +| +$/,"",$i); print $6 }')"
    verif="$(printf '%s' "$row" | awk -F'|' '{ for (i=2;i<=NF;i++) gsub(/^ +| +$/,"",$i); print $7 }')"
    [ "$status" = "Klar" ] || fail "$id har status '$status' i PR:ens version – ska vara 'Klar' i den PR som levererar (eller ta bort ID:t ur Uppfyller:)"
    [ "$verif" != "–" ] && [ -n "$verif" ] || fail "$id är 'Klar' men verifiering är '–'. Ej verifierad = inte klar. Ange leo/bygg/lighthouse/admin."
    ok "$id: Klar, verifierad ($verif)"
  done
fi

# Regel 4 – hela dokumentet: Klar utan verifiering finns aldrig.
bad="$(printf '%s\n' "$doc" | awk -F'|' '/^\| (F|NF)-[0-9]+ \|/ { s=$6; v=$7; gsub(/^ +| +$/,"",s); gsub(/^ +| +$/,"",v); if (s=="Klar" && (v=="–" || v=="")) print $2 }' || true)"
[ -z "$bad" ] || fail "Rader som är 'Klar' utan verifiering:$bad"

# Regel 5 – Admins yta ⇒ Säkerhet-rad. Tvingar frågan, granskaren bedömer svaret.
SEC_PATH='^(\.github/|scripts/|site/wrangler\.jsonc$|site/package(-lock)?\.json$)'
files="$(gh api --paginate "repos/$REPO/pulls/$pr/files" --jq '.[].filename')"
sec_files="$(printf '%s\n' "$files" | grep -E "$SEC_PATH" || true)"
if [ -n "$sec_files" ]; then
  sec="$(printf '%s\n' "$body" | grep -iE '^[[:space:]*_>#-]*Säkerhet\**:' | head -1 || true)"
  [ -n "$sec" ] || fail "PR #$pr rör Admins yta ($(printf '%s' "$sec_files" | head -3 | tr '\n' ' ')…) men saknar raden 'Säkerhet: oförändrad (<skäl>)' eller 'Säkerhet: <vad som är nytt>'"
  srest="$(printf '%s' "$sec" | sed -E 's/.*Säkerhet\**:\**[[:space:]]*//')"
  [ -n "$srest" ] || fail "PR #$pr: 'Säkerhet:' utan innehåll"
  if printf '%s' "$srest" | grep -qiE '^oförändrad' && ! printf '%s' "$srest" | grep -qE '\('; then
    fail "PR #$pr: 'Säkerhet: oförändrad' utan skäl i parentes"
  fi
  ok "Säkerhet: $srest"
fi

ok "Kravgrinden grön för PR #$pr"
