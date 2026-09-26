#!/usr/bin/env bash
# Börja om från version N: öppnar en PR som ställer tillbaka site/ till taggen vN, så att nästa
# ändring bygger vidare därifrån (F-41). Senare versioner finns kvar och kan publiceras igen.
# Rör inte prod – publicera med scripts/publicera-version.sh.
#   scripts/borja-om-fran.sh <N> [issue]
# PR:en mergas med scripts/merge-pr.sh som vanligt; version-release.sh ser att innehållet är
# identiskt med vN och skapar ingen ny version.
source "$(dirname "$0")/lib.sh"
n="${1:?versionsnummer}"; n="${n#v}"; issue="${2:-}"

git fetch -q --tags origin
git rev-parse -q --verify "refs/tags/v$n" >/dev/null || fail "version $n finns inte (ingen tagg v$n)"
titel="$(gh release view "v$n" --repo "$REPO" --json name --jq .name)"
git fetch -q origin main
[ "$(site_tree origin/main)" != "$(site_tree "v$n")" ] || { ok "main har redan innehållet i version $n"; exit 0; }

branch="site/borja-om-fran-v$n-$(date +%Y%m%d%H%M)"
git checkout -q -b "$branch" origin/main
git rm -r -q site && git checkout -q "v$n" -- site
git commit -q -m "site: börja om från version $n – ${titel#Version $n – }

site/ identiskt med taggen v$n. Senare versioner finns kvar som taggar och releaser.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -q -u origin "$branch"
gh pr create --repo "$REPO" --head "$branch" --title "site: börja om från version $n" --body "${issue:+Closes #$issue

}## Vad Leo ska titta på
- Nästa ändring bygger vidare från **$titel**. Inget ändras på den riktiga sidan av det här.

## För Admin
\`site/\` ställs tillbaka till taggen \`v$n\`. Senare versioner finns kvar på $VERSIONER_URL och kan publiceras igen.

Uppfyller: – börja om från version $n"
git checkout -q -
