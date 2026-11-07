#!/usr/bin/env bash
# Nytt försök när Claude-abonnemangets gräns har släppt (F-73). Körs var 10:e minut av gransen-igen.yml.
# claude.yml sätter repo-variabeln LEO_IGEN_<ärende> = "<UTC-tid> <körning>" när gränsen stoppar Claude, och tar
# bort den när Claude har svarat. Här körs den stoppade körningen om när tiden har passerat.
source "$(dirname "$0")/lib.sh"

nu="$(date -u +%s)"
rader="$(gh variable list --repo "$REPO" --json name,value \
  --jq '.[] | select(.name | startswith("LEO_IGEN_")) | "\(.name) \(.value)"')"
while read -r namn tid korning; do
  [ -n "$namn" ] || continue
  if ! [[ "$tid" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$ && "$korning" =~ ^[0-9]+$ ]]; then
    gh variable delete "$namn" --repo "$REPO"; continue
  fi
  [ "$(date -u -d "$tid" +%s)" -le "$nu" ] || { echo "väntar: ${namn#LEO_IGEN_} kl $tid"; continue; }
  # Bort först: stoppas försöket igen sätter claude.yml en ny tid.
  gh variable delete "$namn" --repo "$REPO"
  gh run rerun "$korning" --failed --repo "$REPO" && ok "nytt försök för ärende ${namn#LEO_IGEN_}: körning $korning"
done <<< "$rader"
