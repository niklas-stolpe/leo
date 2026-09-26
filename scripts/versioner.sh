#!/usr/bin/env bash
# Bygger och publicerar versionssidan (F-40) från GitHub Releases och vad prod kör just nu.
#   scripts/versioner.sh
# Körs av version-release.sh och publicera-version.sh. Kräver wrangler-inloggning
# (`npx wrangler login` i site/) eller CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID i miljön.
source "$(dirname "$0")/lib.sh"
rot="$(cd "$(dirname "$0")/.." && pwd)"
wrangler="$rot/site/node_modules/.bin/wrangler"
[ -x "$wrangler" ] || (cd "$rot/site" && npm ci --silent)

tmp="$(mktemp -d)"
gh api --paginate "repos/$REPO/releases" --jq '.[] | {tag_name, name, body}' | node -e "
let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
  const r=d.trim()?d.trim().split(/\n(?=\{)/).map(JSON.parse):[];
  require('fs').writeFileSync(process.argv[1],JSON.stringify(r));})" "$tmp/releases.json"

prod="$(cd "$rot/site" && "$wrangler" deployments status --json 2>/dev/null \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const v=JSON.parse(d).versions||[];const t=v.sort((a,b)=>b.percentage-a.percentage)[0];process.stdout.write(t?t.version_id:'')})")"

rm -rf "$rot/versioner/dist"
node "$rot/versioner/generera.mjs" "$tmp/releases.json" "$prod" "$rot/site/node_modules/@fontsource/cormorant-garamond/files"
rm -rf "$tmp"

(cd "$rot/versioner" && "$wrangler" deploy 2>&1 | grep -E 'workers\.dev|ERROR|✘' || true)
ok "versionssidan uppdaterad: $VERSIONER_URL"
