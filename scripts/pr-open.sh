#!/usr/bin/env bash
# Efter `gh pr create`: PR:en och issuet den stänger → In review, kravgrinden en första gång,
# och PR:ens egen förhandsvisningslänk som kommentar (pr-preview.sh).
# Körs automatiskt av .github/workflows/board.yml när en PR öppnas; går även att köra för hand.
#   scripts/pr-open.sh <pr>
source "$(dirname "$0")/lib.sh"
pr="${1:?pr}"
board_set "$pr" "In review"
for n in $(pr_closes "$pr"); do board_set "$n" "In review"; done
"$(dirname "$0")/requirements-check.sh" "$pr" || { echo; echo "Rätta PR-texten/kravdokumentet – grinden är röd tills dess." >&2; exit 1; }
"$(dirname "$0")/pr-preview.sh" "$pr" || warn "förhandsvisningslänken kunde inte postas – kör scripts/pr-preview.sh $pr"
