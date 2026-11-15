#!/usr/bin/env bash
# Klart-mejlet till Leo när en ny version finns (mejl-version.yml).
#   scripts/klart-till-leo.sh <ärende> <"Version N – titel"> <länk>
# Innan mejlet går ut kontrolleras att versionssidan visar versionen (F-80) och att länken fungerar (F-81).
# Gör något av dem det inte får Leo ett ärligt besked utan trasig länk, och Niklas ett mejl (F-82).
source "$(dirname "$0")/lib.sh"
arende="${1:?ärende}"; namn="${2:-}"; lank="${3:-}"
forsok="${KLART_FORSOK:-6}"; paus="${KLART_PAUS:-10}"

# svarar <url> [text] – lyckas när sidan svarar 200 (och innehåller texten), med några försök.
svarar() {
  local i sida
  for ((i = 1; i <= forsok; i++)); do
    if sida="$(curl -fsSL --max-time 20 "$1" 2>/dev/null)" && { [ -z "${2:-}" ] || grep -qF -- "$2" <<< "$sida"; }; then return 0; fi
    [ "$i" -lt "$forsok" ] && sleep "$paus"
  done
  return 1
}

if [ -z "$namn" ]; then
  text="Hej Leo! Ändringen är klar. Titta på versionssidan: $VERSIONER_URL"
  syns=ja; lankOk=nej
else
  nr="${namn%% –*}"
  svarar "$VERSIONER_URL" "$nr" && syns=ja || syns=nej
  [ -n "$lank" ] && svarar "$lank" && lankOk=ja || lankOk=nej
  if [ "$syns" = ja ] && [ "$lankOk" = ja ]; then
    text="Hej Leo! Nu är det klart – **$namn**.

Titta här: $lank

Gillar du den? Logga in på versionssidan och tryck Publicera på prod (eller på demo om du vill visa den för någon först): $VERSIONER_URL

Vill du ändra något, svara bara på det här mejlet."
  elif [ "$syns" = ja ]; then
    text="Hej Leo! Nu är det klart – **$namn**.

Länken direkt till den fungerar inte just nu. Felet är vårt, och Niklas har fått ett mejl om det. Du hittar den på versionssidan: $VERSIONER_URL

Vill du ändra något, svara bara på det här mejlet."
  else
    text="Hej Leo! **$namn** är klar, men den syns inte på versionssidan än. Felet är vårt, och Niklas har fått ett mejl om det. Du behöver inte göra något.

Du kan mejla som vanligt under tiden."
  fi
fi

gh issue comment "$arende" --repo "$REPO" --body "[[till-leo]]
$text
[[/till-leo]]" >/dev/null

if [ -n "$namn" ] && { [ "$syns" = nej ] || [ "$lankOk" = nej ]; }; then
  fel=""
  [ "$syns" = nej ] && fel="$nr syns inte på versionssidan ($VERSIONER_URL) – kör scripts/versioner.sh."
  [ "$lankOk" = nej ] && fel="$fel Länken ${lank:-(saknas)} svarar inte – förhandsvisningarna kan vara avstängda (cd site && npx wrangler triggers deploy)."
  gh issue create --repo "$REPO" --label mejl-ut --title "Leo: $nr – något syns inte" --body "Till: Niklas

[[till-leo]]
Hej Niklas! Ärende #$arende: $fel Leo har fått besked.
[[/till-leo]]" >/dev/null
  warn "Klart-mejlet gick ut utan allt: $fel"
fi
ok "Klart-mejl till Leo (#$arende): versionssidan $syns, länken $lankOk"
