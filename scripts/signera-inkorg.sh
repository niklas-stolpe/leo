#!/usr/bin/env bash
# Signerar inkorgens logik (inkorg/logik.js) så att startfilen i Apps Script (inkorg/Kod.gs) kör den.
# Nyckeln finns bara hos Admin – aldrig i repot: ~/.leo/inkorg-nyckel (eller LEO_INKORG_NYCKEL), och samma
# värde i Apps Script-egenskapen KOD_NYCKEL. Signaturen räknas på filen som den ligger i git (index, LF).
#
#   scripts/signera-inkorg.sh          → skriver inkorg/logik.sig och lägger den i indexet
#   scripts/signera-inkorg.sh kolla <ref> → lyckas om inkorg/logik.sig i <ref> stämmer med logik.js i <ref>
source "$(dirname "$0")/lib.sh"
fil="${LEO_INKORG_NYCKEL:-$HOME/.leo/inkorg-nyckel}"
[ -f "$fil" ] || fail "nyckeln saknas ($fil) – inkorgens logik kan bara signeras på Admins dator"
nyckel="$(tr -d '\r\n' < "$fil")"
hmac() { openssl dgst -sha256 -hmac "$nyckel" -r | cut -d' ' -f1; }

if [ "${1:-}" = kolla ]; then
  ref="${2:?ref}"
  [ "$(git show "$ref:inkorg/logik.js" | hmac)" = "$(git show "$ref:inkorg/logik.sig" | tr -d '\r\n ')" ] \
    || fail "inkorg/logik.sig stämmer inte med inkorg/logik.js i $ref – kör scripts/signera-inkorg.sh"
  ok "inkorgens logik är signerad"
else
  git add inkorg/logik.js
  git show :inkorg/logik.js | hmac > inkorg/logik.sig
  git add inkorg/logik.sig
  ok "inkorg/logik.sig uppdaterad – committa den tillsammans med logik.js"
fi
