#!/usr/bin/env bash
# Publicera en tidigare version på prod – direkt, utan omväg via stage (F-41). Versionen är redan
# godkänd en gång, så inget nytt godkännande behövs.
#   scripts/publicera-version.sh <N> [issue]
#
# 1. Prod byts till exakt Cloudflare-versionen från version N (samma filer, inget nytt bygge).
#    Finns den inte längre hos Cloudflare byggs den om från taggen vN och publiceras.
# 2. En PR ställer tillbaka site/ till vN på main, så att nästa ändring bygger vidare därifrån.
#    leo-approval.sh släpper igenom den utan nytt godkännande eftersom site/ är identiskt med vN.
#    Merga den med scripts/merge-pr.sh – prod byggs då om från main med samma innehåll.
# 3. Versionssidan visar version N som "På prod nu".
# Kräver wrangler-inloggning (npx wrangler login i site/) eller CLOUDFLARE_API_TOKEN/_ACCOUNT_ID.
source "$(dirname "$0")/lib.sh"
n="${1:?versionsnummer, t.ex. 3}"; n="${n#v}"; issue="${2:-}"
rot="$(cd "$(dirname "$0")/.." && pwd)"
wrangler="$rot/site/node_modules/.bin/wrangler"
[ -x "$wrangler" ] || (cd "$rot/site" && npm ci --silent)

git fetch -q --tags origin
git rev-parse -q --verify "refs/tags/v$n" >/dev/null || fail "version $n finns inte (ingen tagg v$n)"
titel="$(gh release view "v$n" --repo "$REPO" --json name --jq .name)"
cf="$(gh release view "v$n" --repo "$REPO" --json body --jq .body | grep -oE '^Cloudflare-version: [0-9a-f-]{36}' | head -1 | sed 's/.*: //')"

log "1/3 prod → $titel"
if [ -n "$cf" ] && (cd "$rot/site" && "$wrangler" versions deploy "$cf@100" --yes --message "Version $n" >/dev/null 2>&1); then
  ok "prod kör Cloudflare-versionen från version $n ($(version_url "$cf"))"
else
  warn "Cloudflare-versionen finns inte kvar – bygger version $n från taggen v$n"
  wt="$(mktemp -d)"
  git worktree add -q --detach "$wt" "v$n"
  (cd "$wt/site" && npm ci --silent && PUBLIC_MILJO=prod npm run build --silent >/dev/null && "$wrangler" deploy --message "Version $n (ombyggd från v$n)" >/dev/null) \
    || { git worktree remove --force "$wt"; fail "ombygget av v$n misslyckades"; }
  git worktree remove --force "$wt"
  ok "prod ombyggd från v$n"
fi

log "2/3 main → innehållet i version $n"
git fetch -q origin main
if [ "$(site_tree origin/main)" = "$(site_tree "v$n")" ]; then
  ok "main har redan innehållet i version $n – ingen PR behövs"
else
  branch="site/tillbaka-till-v$n-$(date +%Y%m%d%H%M)"
  git checkout -q -b "$branch" origin/main
  git rm -r -q site && git checkout -q "v$n" -- site
  git commit -q -m "site: tillbaka till version $n – ${titel#Version $n – }

Innehållet i site/ är identiskt med taggen v$n (redan godkänd). Prod kör redan version $n.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  git push -q -u origin "$branch"
  pr_url="$(gh pr create --repo "$REPO" --head "$branch" --title "site: tillbaka till version $n" --body "${issue:+Closes #$issue

}## Vad Leo ska titta på
- Den riktiga sidan visar redan **$titel** igen – ingenting nytt att godkänna.

## För Admin
\`site/\` ställs tillbaka till taggen \`v$n\` så att nästa ändring bygger vidare från version $n. Prod bytte redan till version $n med \`scripts/publicera-version.sh $n\`. \`leo-approval.sh\` godtar PR:en utan nytt godkännande eftersom \`site/\` är identiskt med en godkänd version.

Uppfyller: – återpublicering av version $n")"
  ok "PR: $pr_url – merga med scripts/merge-pr.sh ${pr_url##*/}"
  git checkout -q -
fi

log "3/3 versionssidan"
"$(dirname "$0")/versioner.sh"
