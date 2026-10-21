#!/usr/bin/env bash
# Påbörja ett issue: board → In progress, ny branch från main.
#   scripts/issue-start.sh <issue> <område> <slug>     t.ex.  scripts/issue-start.sh 7 site galleri
source "$(dirname "$0")/lib.sh"
n="${1:?issue}"; area="${2:?område (site|kappa|docs|ci|process|chore)}"; slug="${3:?slug}"
git_nat fetch -q origin && git checkout -q main && git_nat pull -q origin main
git checkout -q -b "$area/$n-$slug"
# Ett stängt issue som får en uppföljningsgren ska inte se ut som pågående arbete igen.
if [ "$(gh issue view "$n" --repo "$REPO" --json state --jq .state)" = "OPEN" ]; then
  board_set "$n" "In progress"
else
  ok "#$n är stängt – boardstatusen lämnas orörd (uppföljning)"
fi
ok "branch $area/$n-$slug från main"
