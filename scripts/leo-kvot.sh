#!/usr/bin/env bash
# Leos tokenkvot (F-47). Claudes arbete med Leos mejlärenden räknas per vecka mot en budget som Admin
# styr med repo-variabler (Settings → Secrets and variables → Actions → Variables):
#   LEO_TOKEN_BUDGET      100 %, tokens per vecka          (t.ex. 20000000)
#   LEO_KVOT_PROCENT      Leos del av budgeten, procent    (10)
#   LEO_VARNING_PROCENT   varningsmejl vid, procent        (8)
#   LEO_CLAUDE_AKTIV      false = pausat helt
#   LEO_TOKENS_ÅÅÅÅ_MM_DD förbrukat sedan veckans start (datumet) – skrivs av det här scriptet
# Veckan börjar onsdag 05:00 svensk tid – samma gräns som Admins Claude-prenumeration.
# Tokens = input + output + cache-skrivning (cache-läsning räknas inte – den är nästan gratis).
#
#   scripts/leo-kvot.sh status                    → ok | pausad | slut  (och procent på stderr)
#   scripts/leo-kvot.sh saldo                     → skriver saldot till ärendet med etiketten kvot
#   scripts/leo-kvot.sh lagg-till <execution.json|antal> <issue>
#                                                 → räknar upp; mejlar Leo (via kommentar) vid 8 % och 10 %
#   scripts/leo-kvot.sh minuter <issue|pr> [run-id …] → räknar byggtid (Actions-minuter); mejlar vid 8 % och 10 %
# Kräver GH_TOKEN med rätt att läsa och skriva repo-variabler (PROCESS_TOKEN).
source "$(dirname "$0")/lib.sh"
# Senaste onsdag 05:00 svensk tid → veckans start och nästa nollställning. Svensk tid räknas själv (Git Bash
# på Windows saknar tidszonsdata): sommartid från sista söndagen i mars till sista söndagen i oktober, 01:00 UTC.
sista_sondag() { echo "$1-$2-$(( $3 - $(date -u -d "$1-$2-$3" +%u) % 7 ))"; }
offset() {   # <epoch> → timmar före UTC i Sverige
  local ar; ar="$(date -u -d "@$1" +%Y)"
  local fran till
  fran="$(date -u -d "$(sista_sondag "$ar" 03 31) 01:00" +%s)"; till="$(date -u -d "$(sista_sondag "$ar" 10 31) 01:00" +%s)"
  if [ "$1" -ge "$fran" ] && [ "$1" -lt "$till" ]; then echo 2; else echo 1; fi
}
kl05() {     # <YYYY-MM-DD> → epoch för 05:00 svensk tid den dagen
  local t; t="$(date -u -d "$1 05:00" +%s)"; echo $(( t - $(offset "$t") * 3600 ))
}
nu="$(date -u +%s)"
lokal_dag="$(date -u -d "@$(( nu + $(offset "$nu") * 3600 ))" +%Y-%m-%d)"
start_dag="$(date -u -d "$lokal_dag -$(( ( $(date -u -d "$lokal_dag" +%u) - 3 + 7 ) % 7 )) days" +%Y-%m-%d)"
[ "$(kl05 "$start_dag")" -le "$nu" ] || start_dag="$(date -u -d "$start_dag -7 days" +%Y-%m-%d)"
start_iso="$(date -u -d "@$(kl05 "$start_dag")" +%Y-%m-%dT%H:%M:%SZ)"
nollstalls="$(date -u -d "@$(kl05 "$(date -u -d "$start_dag +7 days" +%Y-%m-%d)")" +%Y-%m-%dT%H:%M:%SZ)"
manad="LEO_TOKENS_${start_dag//-/_}"   # en räknare per vecka, namngiven efter veckans första dag

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

# Byggtid (GitHub Actions-minuter): Leo får samma andel (kvot %) av organisationens minuter per månad – GitHub
# räknar per kalendermånad. Räknas av körningarna som hör till hans mejl (claude.yml, mejl-version.yml, och
# granskning/kravgrind/tavla på hans PR:er) med kommandot "minuter".
min_budget="$(var LEO_ACTIONS_BUDGET 2000)"; heltal "$min_budget" || min_budget=2000   # 0 = ingen gräns (räknas ändå)
min_var="LEO_MINUTER_$(date -u +%Y_%m)"
min_anvant="$(var "$min_var" 0)"; heltal "$min_anvant" || min_anvant=0
min_tak=$(( min_budget * kvot / 100 ))
min_nollstalls="$(date -u -d "$(date -u +%Y-%m-01) +1 month" +%Y-%m-%dT00:00:00Z)"

# Skriver saldot till ett stängt ärende med etiketten kvot – inkorgen (inkorg/Kod.gs) läser det och skriver
# "kvar den här veckan" längst ned i varje mejl till Leo. Inkorgens nyckel har bara Issues-behörighet.
skriv_saldo() {
  local anv="$1" tak nr
  tak=$(( budget * kvot / 100 ))
  nr="$(gh issue list --repo "$REPO" --label kvot --state all --limit 1 --json number --jq '.[0].number // empty')"
  local text="Leos tokenkvot – skrivs automatiskt av scripts/leo-kvot.sh, läses av inkorgen. Ändra inte för hand.

period: $start_dag
nollstalls: $nollstalls
anvant: $anv
tak: $tak

byggtid_manad: $(date -u +%Y-%m)
byggtid_nollstalls: $min_nollstalls
byggtid_anvant: $min_anvant
byggtid_tak: $min_tak"
  if [ -n "$nr" ]; then gh issue edit "$nr" --repo "$REPO" --body "$text" >/dev/null
  else
    gh label create kvot --repo "$REPO" --color ededed --force >/dev/null
    nr="$(gh issue create --repo "$REPO" --title "Leos tokenkvot (automatisk)" --label kvot --body "$text" | grep -oE '[0-9]+$')"
    gh issue close "$nr" --repo "$REPO" >/dev/null
  fi
}

case "${1:?status|lagg-till|saldo|veckostart}" in
  veckostart) echo "$start_iso" ;;   # för claude.yml: beskedet om paus/slut en gång per vecka
  saldo)
    skriv_saldo "$anvant"
    ok "saldo skrivet: $anvant av $(( budget * kvot / 100 )) tokens"
    ;;
  status)
    andel="$(procent "$anvant" "$budget")"
    printf 'Leo har använt %s %% av budgeten i %s (kvot %s %%)\n' "$andel" "${manad#LEO_TOKENS_}" "$kvot" >&2
    if [ "$(var LEO_CLAUDE_AKTIV true)" = false ]; then echo pausad
    elif [ "$budget" -le 0 ] || awk -v a="$andel" -v k="$kvot" 'BEGIN { exit !(a >= k) }'; then echo slut
    elif [ "$min_tak" -gt 0 ] && [ "$min_anvant" -ge "$min_tak" ]; then echo slut-byggtid
    else echo ok; fi
    printf 'Byggtid: %s av %s min i %s
' "$min_anvant" "$min_tak" "${min_var#LEO_MINUTER_}" >&2
    ;;
  lagg-till)
    fil="${2:?execution-fil}"; issue="${3:?issue}"
    # Körningen kan ha gällt en PR (t.ex. granskningsfynd) – mejlen går via issuet den stänger.
    if gh pr view "$issue" --repo "$REPO" >/dev/null 2>&1; then
      stanger="$(pr_closes "$issue" | head -1)"; [ -z "$stanger" ] || issue="$stanger"
    fi
    if [[ "$fil" =~ ^[0-9]+$ ]]; then tokens="$fil"   # antalet redan uträknat (claude.yml, jobbet "efter")
    else
    [ -f "$fil" ] || { warn "ingen execution-fil ($fil) – inget att räkna"; exit 0; }
    tokens="$(node -e "
      const m = JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'));
      const r = [].concat(m).reverse().find((x) => x.type === 'result') ?? {};
      const u = r.usage ?? {};
      console.log((u.input_tokens ?? 0) + (u.output_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0));" "$fil")"
    fi
    nytt=$(( anvant + tokens ))
    gh variable set "$manad" --repo "$REPO" --body "$nytt"
    skriv_saldo "$nytt"
    fore="$(procent "$anvant" "$budget")"; efter="$(procent "$nytt" "$budget")"
    ok "+$tokens tokens → $nytt ($efter % av budgeten, kvot $kvot %)"
    if awk -v f="$fore" -v e="$efter" -v k="$kvot" 'BEGIN { exit !(f < k && e >= k) }'; then
      till_leo "$issue" "Hej Leo! Veckans utrymme för Claude är nu slut – det fylls på igen på onsdag morgon. Det du redan har fått finns kvar på versionssidan: $VERSIONER_URL. Hör av dig till Niklas om något brådskar."
    elif awk -v f="$fore" -v e="$efter" -v v="$varning" 'BEGIN { exit !(f < v && e >= v) }'; then
      till_leo "$issue" "Hej Leo! En liten varning: det mesta av veckans utrymme för Claude är använt. Det räcker till något mindre till – sedan fylls det på igen på onsdag morgon."
    fi
    ;;
  minuter)
    # minuter <issue|pr> [run-id …] – lägger till den här körningens minuter hittills (avrundat uppåt per jobb)
    # och de angivna färdiga körningarna som inte redan räknats (granskning, kravgrind, tavla på Leos PR).
    issue="${2:?issue}"; shift 2
    if gh pr view "$issue" --repo "$REPO" >/dev/null 2>&1; then
      stanger="$(pr_closes "$issue" | head -1)"; [ -z "$stanger" ] || issue="$stanger"
    fi
    jobbmin() {
      gh api "repos/$REPO/actions/runs/$1/jobs" --jq '[.jobs[] | select(.started_at and .conclusion != "skipped")
        | ((((.completed_at // (now | todate)) | fromdateiso8601) - (.started_at | fromdateiso8601) + 59) / 60 | floor)
        | if . < 1 then 1 else . end] | add // 0'
    }
    raknade_var="LEO_MINUTER_RAKNADE_$(date -u +%Y_%m)"; raknade="$(var "$raknade_var" "")"
    # Listan börjar om varje månad (håller sig långt under GitHubs storleksgräns); förra månadens tas bort.
    gh variable delete "LEO_MINUTER_RAKNADE_$(date -u -d "$(date -u +%Y-%m-01) -1 day" +%Y_%m)" --repo "$REPO" 2>/dev/null || true
    summa=0; [ -z "${GITHUB_RUN_ID:-}" ] || summa="$(jobbmin "$GITHUB_RUN_ID")"
    for id in "$@"; do
      case ",$raknade," in *",$id,"*) continue ;; esac
      summa=$(( summa + $(jobbmin "$id") )); raknade="${raknade:+$raknade,}$id"
    done
    [ $# -eq 0 ] || gh variable set "$raknade_var" --repo "$REPO" --body "${raknade:-–}"
    fore="$min_anvant"; min_anvant=$(( min_anvant + summa ))
    gh variable set "$min_var" --repo "$REPO" --body "$min_anvant"
    skriv_saldo "$anvant"
    ok "+$summa min byggtid → $min_anvant av $min_tak"
    vgrans=$(( min_budget * varning / 100 ))
    if [ "$min_tak" -le 0 ]; then :   # ingen gräns – inga varningar
    elif [ "$fore" -lt "$min_tak" ] && [ "$min_anvant" -ge "$min_tak" ]; then
      till_leo "$issue" "Hej Leo! Månadens byggtid är nu slut – den fylls på igen den 1:a nästa månad. Det du redan har fått finns kvar på versionssidan: $VERSIONER_URL. Hör av dig till Niklas om något brådskar."
    elif [ "$fore" -lt "$vgrans" ] && [ "$min_anvant" -ge "$vgrans" ]; then
      till_leo "$issue" "Hej Leo! En liten varning: det mesta av månadens byggtid är använd. Det räcker till någon ändring till – sedan fylls den på igen den 1:a nästa månad."
    fi
    ;;
  *) fail "okänt kommando: $1" ;;
esac
