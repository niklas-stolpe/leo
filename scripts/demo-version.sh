#!/usr/bin/env bash
# Bygger en version i demo-utförande och laddar upp den till Workern leo-demo – utan att publicera
# (F-44). Skriver Cloudflare-versionens id på stdout.
#   scripts/demo-version.sh <N> [ref]      ref = commit/tagg att bygga, standard vN
# Körs av version-release.sh för varje ny version; kan köras för hand för äldre versioner.
# Äldre taggar som inte känner till PUBLIC_MILJO=demo byggs i stage-utförande (noindex ändå).
source "$(dirname "$0")/lib.sh"
n="${1:?versionsnummer}"; n="${n#v}"; ref="${2:-v$n}"
rot="$(cd "$(dirname "$0")/.." && pwd)"
wrangler="$rot/site/node_modules/.bin/wrangler"
[ -x "$wrangler" ] || (cd "$rot/site" && npm ci --silent)

wt="$(mktemp -d)"
git worktree add -q --detach "$wt" "$ref"
trap 'git -C "$rot" worktree remove --force "$wt" 2>/dev/null' EXIT
cp "$rot/site/wrangler.demo.jsonc" "$wt/site/wrangler.demo.jsonc"
(cd "$wt/site" && npm ci --silent >&2 && PUBLIC_MILJO=demo npm run build --silent >/dev/null 2>&1) || fail "bygget av $ref i demo-utförande misslyckades"
id="$(cd "$wt/site" && "$wrangler" versions upload --config wrangler.demo.jsonc --message "Version $n" 2>&1 \
  | grep -oE 'Worker Version ID: [0-9a-f-]{36}' | sed 's/.*: //')"
[ -n "$id" ] || fail "uppladdningen till leo-demo gav inget Version ID"
printf '%s\n' "$id"
