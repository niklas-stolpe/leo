#!/usr/bin/env bash
# Publicera en version på prod eller demo (F-41, F-43). För prod ÄR det här godkännandet (B-06):
# prod ändras bara här, när Admin eller Leo har valt versionen – aldrig av en merge.
#   scripts/publicera-version.sh <N> [prod|demo] [issue]      (prod om inget anges)
#
# prod: prod byts till exakt Cloudflare-versionen från version N (samma filer, inget nytt bygge, sekunder).
#       Finns den inte längre byggs den om från taggen vN och publiceras.
# demo: version N byggs om från taggen vN som stage (stage-ikon, noindex) och läggs på demo-adressen
#       (aliaset stage). Nästa push till en branch ersätter den – demo visar alltid det senaste.
# main rörs inte – vill man fortsätta utveckla från version N: scripts/borja-om-fran.sh N.
# Kräver wrangler-inloggning (npx wrangler login i site/) eller CLOUDFLARE_API_TOKEN/_ACCOUNT_ID.
source "$(dirname "$0")/lib.sh"
n="${1:?versionsnummer, t.ex. 3}"; n="${n#v}"
miljo="prod"; issue=""
case "${2:-}" in prod|demo) miljo="$2"; issue="${3:-}" ;; stage) miljo="demo"; issue="${3:-}" ;; *) issue="${2:-}" ;; esac
rot="$(cd "$(dirname "$0")/.." && pwd)"
wrangler="$rot/site/node_modules/.bin/wrangler"
[ -x "$wrangler" ] || (cd "$rot/site" && npm ci --silent)

git fetch -q --tags origin
git rev-parse -q --verify "refs/tags/v$n" >/dev/null || fail "version $n finns inte (ingen tagg v$n)"
titel="$(gh release view "v$n" --repo "$REPO" --json name --jq .name)"
cf="$(gh release view "v$n" --repo "$REPO" --json body --jq .body | grep -oE '^Cloudflare-version: [0-9a-f-]{36}' | head -1 | sed 's/.*: //')"

# bygg_fran_tagg <extra-miljö> <wrangler-kommando…> – bygger vN i en egen arbetskopia och kör kommandot.
bygg_fran_tagg() {
  local miljovar="$1"; shift
  local wt; wt="$(mktemp -d)"
  git worktree add -q --detach "$wt" "v$n"
  if (cd "$wt/site" && npm ci --silent && env $miljovar npm run build --silent >/dev/null && "$wrangler" "$@" >/dev/null); then
    git worktree remove --force "$wt"
  else
    git worktree remove --force "$wt"; fail "bygget av v$n misslyckades"
  fi
}

if [ "$miljo" = demo ]; then
  log "demo → $titel"
  bygg_fran_tagg "PUBLIC_MILJO=stage" versions upload --preview-alias stage --message "Version $n (demo)"
  ok "demo visar version $n ($STAGE_URL)"
  adress="$STAGE_URL"; var="Demon"
else
  log "prod → $titel"
  if [ -n "$cf" ] && (cd "$rot/site" && "$wrangler" versions deploy "$cf@100" --yes --message "Version $n" >/dev/null 2>&1); then
    ok "prod kör version $n ($PROD_URL)"
  else
    warn "Cloudflare-versionen finns inte kvar – bygger version $n från taggen v$n"
    bygg_fran_tagg "PUBLIC_MILJO=prod" deploy --message "Version $n (ombyggd från v$n)"
    ok "prod ombyggd från v$n ($PROD_URL)"
  fi
  adress="$PROD_URL"; var="Den riktiga sidan"
fi

"$(dirname "$0")/versioner.sh"

if [ -n "$issue" ]; then
  gh issue close "$issue" --repo "$REPO" --comment "Klart – $(printf '%s' "$var" | tr '[:upper:]' '[:lower:]') ($adress) visar nu **$titel**. Alla versioner: $VERSIONER_URL" >/dev/null
  board_set "$issue" Done
fi
