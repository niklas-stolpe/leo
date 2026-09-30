#!/usr/bin/env bash
# Bygger versionsdatat från GitHub Releases och publicerar versionssidans Worker (F-40).
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

rm -rf "$rot/versioner/dist"
node "$rot/versioner/generera.mjs" "$tmp/releases.json" "$rot/site/node_modules/@fontsource/cormorant-garamond/files"
rm -rf "$tmp"

cd "$rot/versioner"
"$wrangler" deploy 2>&1 | grep -E 'workers.dev|ERROR|✘' || true
# Sessionerna signeras med en slumpad hemlighet – skapas en gång, visas aldrig.
if ! "$wrangler" secret list 2>/dev/null | grep -q SESSION_SECRET; then
  node -e "process.stdout.write(require('crypto').randomBytes(32).toString('base64url'))" | "$wrangler" secret put SESSION_SECRET >/dev/null 2>&1     && ok "SESSION_SECRET skapad" || warn "SESSION_SECRET kunde inte sättas"
fi
ok "versionssidan uppdaterad: $VERSIONER_URL"
