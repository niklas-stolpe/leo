#!/usr/bin/env bash
# Publicera från den här datorn – samma bygge som Cloudflare Workers Builds gör vid push.
# Reservväg när Workers Builds inte kör, se docs/processmall.md.
#   scripts/deploy-local.sh prod     main → https://leo.niklasstolpe.workers.dev
#   scripts/deploy-local.sh stage    aktuell branch → https://stage-leo.niklasstolpe.workers.dev
# Kräver: `npx wrangler login` en gång (i site/). Prod publiceras bara från en ren main som är
# i takt med origin – det som ligger på main har redan gått genom grindarna i merge-pr.sh.
source "$(dirname "$0")/lib.sh"
miljo="${1:?prod eller stage}"
cd "$(dirname "$0")/../site"

[ -z "$(git status --porcelain -- .)" ] || fail "site/ har ändringar som inte är committade – committa eller stasha först"
branch="$(git rev-parse --abbrev-ref HEAD)"

case "$miljo" in
  prod)
    [ "$branch" = "main" ] || fail "prod publiceras bara från main (du står på $branch)"
    git fetch -q origin main
    [ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || fail "lokal main är inte i takt med origin/main – kör git pull"
    ;;
  stage) ;;
  *) fail "okänd miljö: $miljo (prod eller stage)" ;;
esac

log "npm ci + typkontroll"
npm ci --silent
npm run check --silent >/dev/null || fail "astro check hittade fel – kör 'npm run check' för detaljer"

log "bygg ($miljo)"
rm -rf dist
if [ "$miljo" = prod ]; then PUBLIC_MILJO=prod npm run build --silent >/dev/null; else npm run build --silent >/dev/null; fi

log "publicera"
if [ "$miljo" = prod ]; then
  npx wrangler deploy 2>&1 | grep -E 'workers\.dev|Version ID|ERROR|✘' || true
else
  npx wrangler versions upload --preview-alias stage --message "stage = $branch (lokalt)" 2>&1 | grep -E 'workers\.dev|Version ID|ERROR|✘' || true
fi
ok "$miljo publicerad från $branch @ $(git rev-parse --short HEAD)"
