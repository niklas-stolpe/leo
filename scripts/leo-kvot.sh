#!/usr/bin/env bash
# Leos tokenkvot (F-47). Claudes arbete med Leos mejlärenden räknas per månad mot en budget som Admin
# styr med repo-variabler (Settings → Secrets and variables → Actions → Variables):
#   LEO_TOKEN_BUDGET      100 %, tokens per månad          (t.ex. 20000000)
#   LEO_KVOT_PROCENT      Leos del av budgeten, procent    (10)
#   LEO_VARNING_PROCENT   varningsmejl vid, procent        (8)
#   LEO_CLAUDE_AKTIV      false = pausat helt
#   LEO_TOKENS_ÅÅÅÅ_MM    förbrukat hittills i månaden – skrivs av det här scriptet
# Tokens = input + output + cache-skrivning (cache-läsning räknas inte – den är nästan gratis).
#
#   scripts/leo-kvot.sh status                    → ok | pausad | slut  (och procent på stderr)
#   scripts/leo-kvot.sh lagg-till <execution.json> <issue>
#                                                 → räknar upp; mejlar Leo (via kommentar) vid 8 % och 10 %
# Kräver GH_TOKEN med rätt att läsa och skriva repo-variabler (PROCESS_TOKEN).
source "$(dirname "$0")/lib.sh"
manad="LEO_TOKENS_$(date -u +%Y_%m)"

var() { gh variable get "$1" --repo "$REPO" 2>/dev/null || printf '%s' "${2:-}"; }
procent() { awk -v a="$1" -v b="$2" 'BEGIN { if (b <= 0) print 0; else printf "%.2f", a * 100 / b }'; }
till_leo() {   # kommentar som Apps-scriptet i inkorgen mejlar till Leo (markörerna, se inkorg/Kod.gs)
  gh issue comment "$1" --repo "$REPO" --body "<!-- till-leo -->
$2
<!-- /till-leo -->" >/dev/null
}

budget="$(var LEO_TOKEN_BUDGET 0)"; kvot="$(var LEO_KVOT_PROCENT 10)"; varning="$(var LEO_VARNING_PROCENT 8)"
anvant="$(var "$manad" 0)"

case "${1:?status|lagg-till}" in
  status)
    andel="$(procent "$anvant" "$budget")"
    printf 'Leo har använt %s %% av budgeten i %s (kvot %s %%)\n' "$andel" "${manad#LEO_TOKENS_}" "$kvot" >&2
    if [ "$(var LEO_CLAUDE_AKTIV true)" = false ]; then echo pausad
    elif [ "$budget" -le 0 ] || awk -v a="$andel" -v k="$kvot" 'BEGIN { exit !(a >= k) }'; then echo slut
    else echo ok; fi
    ;;
  lagg-till)
    fil="${2:?execution-fil}"; issue="${3:?issue}"
    [ -f "$fil" ] || { warn "ingen execution-fil ($fil) – inget att räkna"; exit 0; }
    tokens="$(node -e "
      const m = JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'));
      const r = [].concat(m).reverse().find((x) => x.type === 'result') ?? {};
      const u = r.usage ?? {};
      console.log((u.input_tokens ?? 0) + (u.output_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0));" "$fil")"
    nytt=$(( anvant + tokens ))
    gh variable set "$manad" --repo "$REPO" --body "$nytt"
    fore="$(procent "$anvant" "$budget")"; efter="$(procent "$nytt" "$budget")"
    ok "+$tokens tokens → $nytt ($efter % av budgeten, kvot $kvot %)"
    if awk -v f="$fore" -v e="$efter" -v k="$kvot" 'BEGIN { exit !(f < k && e >= k) }'; then
      till_leo "$issue" "Hej Leo! Månadens utrymme för Claude är nu slut – det fylls på igen den 1:a nästa månad. Det du redan har fått finns kvar på versionssidan: $VERSIONER_URL. Hör av dig till Niklas om något brådskar."
    elif awk -v f="$fore" -v e="$efter" -v v="$varning" 'BEGIN { exit !(f < v && e >= v) }'; then
      till_leo "$issue" "Hej Leo! En liten varning: det mesta av månadens utrymme för Claude är använt. Det räcker till något mindre till – sedan fylls det på den 1:a nästa månad."
    fi
    ;;
  *) fail "okänt kommando: $1" ;;
esac
