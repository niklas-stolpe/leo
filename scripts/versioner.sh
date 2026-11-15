#!/usr/bin/env bash
# Bygger versionsdatat från GitHub Releases och publicerar versionssidans Worker (F-40).
#   scripts/versioner.sh [vN]
# Med vN byggs sidan först när vN finns i GitHubs lista över versioner (F-79) – listan hinner inte alltid få med
# en version som just skapats. Efteråt kontrolleras att sidan visar den (F-80).
# Körs av version-release.sh och publicera-version.sh. Kräver wrangler-inloggning
# (`npx wrangler login` i site/) eller CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID i miljön.
source "$(dirname "$0")/lib.sh"
rot="$(cd "$(dirname "$0")/.." && pwd)"
wrangler="$rot/site/node_modules/.bin/wrangler"
[ -x "$wrangler" ] || (cd "$rot/site" && npm ci --silent)

tmp="$(mktemp -d)"
ny="${1:-}"; forsok="${VERSIONER_FORSOK:-12}"; paus="${VERSIONER_PAUS:-10}"
for ((i = 1; ; i++)); do
  lista="$(gh api --paginate "repos/$REPO/releases" --jq '.[] | {tag_name, name, body}')"
  [ -z "$ny" ] || grep -qF "\"tag_name\":\"$ny\"" <<< "$lista" && break
  [ "$i" -lt "$forsok" ] || fail "$ny finns inte i GitHubs lista över versioner efter $forsok försök – versionssidan byggs inte"
  sleep "$paus"
done
[ "${VERSIONER_BARA_LISTA:-}" != 1 ] || { printf '%s\n' "$lista"; exit 0; }
printf '%s\n' "$lista" | node -e "
let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
  const r=d.trim()?d.trim().split(/\n(?=\{)/).map(JSON.parse):[];
  require('fs').writeFileSync(process.argv[1],JSON.stringify(r));})" "$tmp/releases.json"

rm -rf "$rot/versioner/dist"
node "$rot/versioner/generera.mjs" "$tmp/releases.json" "$rot/site/node_modules/@fontsource/cormorant-garamond/files"
rm -rf "$tmp"

cd "$rot/versioner"
"$wrangler" deploy 2>&1 | grep -E 'workers.dev|ERROR|✘' || true
# Sessionerna signeras med en slumpad hemlighet – skapas en gång, visas aldrig.
# Vem som får logga in är en secret (repot är publikt) – utan den kan ingen publicera från sidan.
"$wrangler" secret list 2>/dev/null | grep -q TILLATNA   || warn "versionssidan saknar TILLATNA – kör: cd versioner && npx wrangler secret put TILLATNA (adresserna, kommaseparerade)"
if ! "$wrangler" secret list 2>/dev/null | grep -q SESSION_SECRET; then
  node -e "process.stdout.write(require('crypto').randomBytes(32).toString('base64url'))" | "$wrangler" secret put SESSION_SECRET >/dev/null 2>&1     && ok "SESSION_SECRET skapad" || warn "SESSION_SECRET kunde inte sättas"
fi
if [ -n "$ny" ]; then
  for ((i = 1; ; i++)); do
    curl -fsSL --max-time 20 "$VERSIONER_URL" 2>/dev/null | grep -qF "Version ${ny#v}" && break
    [ "$i" -lt 6 ] || fail "versionssidan visar inte Version ${ny#v} efter publiceringen"
    sleep "$paus"
  done
fi
ok "versionssidan uppdaterad: $VERSIONER_URL"
