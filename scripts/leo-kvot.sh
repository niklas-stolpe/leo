#!/usr/bin/env bash
# Leos tokenkvot (F-47). Claudes arbete med Leos mejlärenden räknas per vecka (måndag–söndag, UTC) mot en budget som Admin
# styr med repo-variabler (Settings → Secrets and variables → Actions → Variables):
#   LEO_TOKEN_BUDGET      100 %, tokens per vecka          (t.ex. 20000000)
#   LEO_KVOT_PROCENT      Leos del av budgeten, procent    (10)
#   LEO_VARNING_PROCENT   varningsmejl vid, procent        (8)
#   LEO_CLAUDE_AKTIV      false = pausat helt
#   LEO_TOKENS_ÅÅÅÅ_Vvv   förbrukat hittills i veckan (ISO-vecka) – skrivs av det här scriptet
# Tokens = input + output + cache-skrivning (cache-läsning räknas inte – den är nästan gratis).
#
#   scripts/leo-kvot.sh status                    → ok | pausad | slut  (och procent på stderr)
#   scripts/leo-kvot.sh saldo                     → skriver saldot till ärendet med etiketten kvot
#   scripts/leo-kvot.sh lagg-till <execution.json> <issue>
#                                                 → räknar upp; mejlar Leo (via kommentar) vid 8 % och 10 %
# Kräver GH_TOKEN med rätt att läsa och skriva repo-variabler (PROCESS_TOKEN).
source "$(dirname "$0")/lib.sh"
manad="LEO_TOKENS_$(date -u +%G_V%V)"   # en räknare per ISO-vecka
nollstalls="$(date -u -d 'next monday' +%Y-%m-%d)"

# var <namn> [standard] – finns variabeln inte (404) används standardvärdet; annat fel avbryter, så att
# förbrukningen aldrig räknas från 0 och skrivs över bara för att GitHub inte svarade.
var() {
  local svar
  if svar="$(gh api "repos/$REPO/actions/variables/$1" --jq .value 2>&1)"; then printf '%s' "$svar"
  elif printf '%s' "$svar" | grep -q 'HTTP 404'; then printf '%s' "${2:-}"
  else fail "kunde inte läsa $1: $svar"; fi
}
procent() { awk -v a="$1" -v b="$2" 'BEGIN { if (b <= 0) print 0; else printf "%.2f", a * 100 / b }'; }
till_leo() {   # kommentar som Apps-scriptet i inkorgen mejlar till Leo (markörerna, se inkorg/Kod.gs)
  gh issue comment "$1" --repo "$REPO" --body "[[till-leo]]
$2
[[/till-leo]]" >/dev/null
}

budget="$(var LEO_TOKEN_BUDGET 0)"; kvot="$(var LEO_KVOT_PROCENT 10)"; varning="$(var LEO_VARNING_PROCENT 8)"
anvant="$(var "$manad" 0)"
heltal() { [[ "$1" =~ ^[0-9]+$ ]]; }
heltal "$budget" || { warn "LEO_TOKEN_BUDGET är inte ett heltal ('$budget') – räknas som 0 (= slut)"; budget=0; }
heltal "$anvant" || { warn "$manad är inte ett heltal ('$anvant') – räknas från 0"; anvant=0; }
heltal "$kvot" || kvot=10
heltal "$varning" || varning=8

# Skriver saldot till ett stängt ärende med etiketten kvot – inkorgen (inkorg/Kod.gs) läser det och skriver
# "kvar den här veckan" längst ned i varje mejl till Leo. Inkorgens nyckel har bara Issues-behörighet.
skriv_saldo() {
  local anv="$1" tak nr
  tak=$(( budget * kvot / 100 ))
  nr="$(gh issue list --repo "$REPO" --label kvot --state all --limit 1 --json number --jq '.[0].number // empty')"
  local text="Leos tokenkvot – skrivs automatiskt av scripts/leo-kvot.sh, läses av inkorgen. Ändra inte för hand.

period: $(date -u +%G-V%V)
nollstalls: $nollstalls
anvant: $anv
tak: $tak"
  if [ -n "$nr" ]; then gh issue edit "$nr" --repo "$REPO" --body "$text" >/dev/null
  else
    gh label create kvot --repo "$REPO" --color ededed --force >/dev/null
    nr="$(gh issue create --repo "$REPO" --title "Leos tokenkvot (automatisk)" --label kvot --body "$text" | grep -oE '[0-9]+$')"
    gh issue close "$nr" --repo "$REPO" >/dev/null
  fi
}

case "${1:?status|lagg-till|saldo}" in
  saldo)
    skriv_saldo "$anvant"
    ok "saldo skrivet: $anvant av $(( budget * kvot / 100 )) tokens"
    ;;
  status)
    andel="$(procent "$anvant" "$budget")"
    printf 'Leo har använt %s %% av budgeten i %s (kvot %s %%)\n' "$andel" "${manad#LEO_TOKENS_}" "$kvot" >&2
    if [ "$(var LEO_CLAUDE_AKTIV true)" = false ]; then echo pausad
    elif [ "$budget" -le 0 ] || awk -v a="$andel" -v k="$kvot" 'BEGIN { exit !(a >= k) }'; then echo slut
    else echo ok; fi
    ;;
  lagg-till)
    fil="${2:?execution-fil}"; issue="${3:?issue}"
    # Körningen kan ha gällt en PR (t.ex. granskningsfynd) – mejlen går via issuet den stänger.
    if gh pr view "$issue" --repo "$REPO" >/dev/null 2>&1; then
      stanger="$(pr_closes "$issue" | head -1)"; [ -z "$stanger" ] || issue="$stanger"
    fi
    [ -f "$fil" ] || { warn "ingen execution-fil ($fil) – inget att räkna"; exit 0; }
    tokens="$(node -e "
      const m = JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'));
      const r = [].concat(m).reverse().find((x) => x.type === 'result') ?? {};
      const u = r.usage ?? {};
      console.log((u.input_tokens ?? 0) + (u.output_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0));" "$fil")"
    nytt=$(( anvant + tokens ))
    gh variable set "$manad" --repo "$REPO" --body "$nytt"
    skriv_saldo "$nytt"
    fore="$(procent "$anvant" "$budget")"; efter="$(procent "$nytt" "$budget")"
    ok "+$tokens tokens → $nytt ($efter % av budgeten, kvot $kvot %)"
    if awk -v f="$fore" -v e="$efter" -v k="$kvot" 'BEGIN { exit !(f < k && e >= k) }'; then
      till_leo "$issue" "Hej Leo! Veckans utrymme för Claude är nu slut – det fylls på igen på måndag. Det du redan har fått finns kvar på versionssidan: $VERSIONER_URL. Hör av dig till Niklas om något brådskar."
    elif awk -v f="$fore" -v e="$efter" -v v="$varning" 'BEGIN { exit !(f < v && e >= v) }'; then
      till_leo "$issue" "Hej Leo! En liten varning: det mesta av veckans utrymme för Claude är använt. Det räcker till något mindre till – sedan fylls det på igen på måndag."
    fi
    ;;
  *) fail "okänt kommando: $1" ;;
esac
