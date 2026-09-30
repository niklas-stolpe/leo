#!/usr/bin/env bash
# Postar PR:ens egen förhandsvisningslänk som kommentar (NF-05). Stage visar bara den senast
# pushade ändringen; när flera PR:er är öppna behöver var och en sin egen länk.
#   scripts/pr-preview.sh <pr>
# Väntar in Cloudflares bygge av PR:ens senaste commit och läser "Preview URL" ur checken.
# Körs av pr-open.sh; kör igen efter en ny push (en ny version får en ny länk).
source "$(dirname "$0")/lib.sh"
pr="${1:?pr}"
sha="$(pr_field "$pr" .headRefOid)"

for i in $(seq 1 60); do
  rad="$(gh api "repos/$REPO/commits/$sha/check-runs" \
    --jq ".check_runs[] | select(.name==\"$BUILD_CHECK\" and .app.slug==\"$BUILD_APP\") | \"\(.status)|\(.conclusion // \"\")\"" | head -1)"
  case "$rad" in completed\|*) break ;; esac
  [ "$i" -eq 60 ] && fail "$BUILD_CHECK blev inte klar inom 10 min för #$pr"
  sleep 10
done
[ "$rad" = "completed|success" ] || fail "$BUILD_CHECK för #$pr: $rad – ingen förhandsvisning"
url="$(gh api "repos/$REPO/commits/$sha/check-runs" \
  --jq ".check_runs[] | select(.name==\"$BUILD_CHECK\" and .app.slug==\"$BUILD_APP\") | .output.summary" \
  | grep -oE 'Preview URL: https://[^ )]+' | head -1 | sed 's/Preview URL: //')"
[ -n "$url" ] || fail "hittade ingen Preview URL i Cloudflares bygge av #$pr"

gh pr comment "$pr" --repo "$REPO" --body "## 👀 Förhandsvisning av just den här ändringen

**$url**

Stage ($STAGE_URL) visar den senast pushade ändringen – är flera ändringar på gång kan det vara en annan. Den här länken visar alltid just den här (version \`${sha:0:7}\`).

- Ser det bra ut? Svara med en kommentar som börjar med **godkänt**.
- Vill du ändra något? Skriv **@claude** och beskriv vad." >/dev/null
ok "#$pr: förhandsvisning $url"
