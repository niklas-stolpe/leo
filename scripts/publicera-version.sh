#!/usr/bin/env bash
# Publicera en version på prod (F-41). Det här ÄR godkännandet (B-06): prod ändras bara här, när
# Admin eller Leo har valt versionen – aldrig av en merge.
#   scripts/publicera-version.sh <N> [issue]
#
# Prod byts till exakt Cloudflare-versionen från version N (samma filer, inget nytt bygge, sekunder).
# Finns den inte längre hos Cloudflare byggs den om från taggen vN och publiceras.
# main rörs inte – vill man fortsätta utveckla från version N: scripts/borja-om-fran.sh N.
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

log "prod → $titel"
if [ -n "$cf" ] && (cd "$rot/site" && "$wrangler" versions deploy "$cf@100" --yes --message "Version $n" >/dev/null 2>&1); then
  ok "prod kör version $n ($PROD_URL)"
else
  warn "Cloudflare-versionen finns inte kvar – bygger version $n från taggen v$n"
  wt="$(mktemp -d)"
  git worktree add -q --detach "$wt" "v$n"
  (cd "$wt/site" && npm ci --silent && PUBLIC_MILJO=prod npm run build --silent >/dev/null && "$wrangler" deploy --message "Version $n (ombyggd från v$n)" >/dev/null) \
    || { git worktree remove --force "$wt"; fail "ombygget av v$n misslyckades"; }
  git worktree remove --force "$wt"
  ok "prod ombyggd från v$n ($PROD_URL)"
fi

"$(dirname "$0")/versioner.sh"

if [ -n "$issue" ]; then
  gh issue close "$issue" --repo "$REPO" --comment "Klart – den riktiga sidan ($PROD_URL) visar nu **$titel**. Alla versioner: $VERSIONER_URL" >/dev/null
  board_set "$issue" Done
fi
