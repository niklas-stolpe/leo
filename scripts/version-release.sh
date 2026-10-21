#!/usr/bin/env bash
# Efter en merge som ändrar det som syns: gör publiceringen till en version (F-40).
#   scripts/version-release.sh <merge-sha> <pr>
# Körs av merge-pr.sh. Väntar in Cloudflares prod-bygge av commiten och läser dess Version ID.
#   Nytt innehåll            → tagg vN + GitHub Release "Version N – <namn>" med Cloudflare-versionen
#   Samma innehåll som vN    → ingen ny version; Cloudflare-versionen läggs till i vN:s release
#                              (så att versionssidan vet att vN är på prod igen)
# Uppdaterar sedan versionssidan (scripts/versioner.sh).
source "$(dirname "$0")/lib.sh"
sha="${1:?merge-sha}"; pr="${2:?pr}"
here="$(dirname "$0")"

git_nat fetch -q --tags origin
cf="$(cloudflare_version_for "$sha")" || fail "hittade ingen Cloudflare-version för $sha – versionen skapas inte (kör scripts/version-release.sh $sha $pr igen)"
[ -n "$cf" ] || fail "Cloudflare-bygget av $sha saknar Version ID i sin sammanfattning"
datum="$(date +%Y-%m-%d)"

finns="$(release_med_trad "$(site_tree "$sha")")"
if [ -n "$finns" ]; then
  body="$(gh release view "$finns" --repo "$REPO" --json body --jq .body)"
  printf '%s\nCloudflare-version: %s (publicerad igen %s, #%s)\n' "$body" "$cf" "$datum" "$pr" > "${TMPDIR:-/tmp}/rel-$$.md"
  gh release edit "$finns" --repo "$REPO" --notes-file "${TMPDIR:-/tmp}/rel-$$.md" >/dev/null
  rm -f "${TMPDIR:-/tmp}/rel-$$.md"
  ok "samma innehåll som $finns – ingen ny version, prod-versionen tillagd i $finns"
else
  senast="$(git tag -l 'v[0-9]*' --sort=-v:refname | head -1)"
  n=$(( ${senast#v} + 1 ))
  # Namnet: PR-titeln utan "område #nr:"-prefixet. Texten: avsnittet "Vad Leo ska titta på".
  titel="$(pr_field "$pr" .title | sed -E 's/^[^:]*#[0-9]+[^:]*: *//')"
  vad="$(pr_field "$pr" .body | awk '/^## Vad Leo ska titta på/{f=1;next} /^## /{f=0} f' | sed '/^[[:space:]]*$/d')"
  # Samma version i demo-utförande till Workern leo-demo (F-44) – så att "Publicera på demo" går på sekunder.
  demo="$("$here/demo-version.sh" "$n" "$sha")" || { warn "demo-bygget misslyckades – kör scripts/demo-version.sh $n $sha och lägg till raden i releasen"; demo=""; }
  {
    printf '%s\n\n' "${vad:-(ingen beskrivning)}"
    printf 'Publicerad: %s · #%s\n' "$datum" "$pr"
    printf 'Cloudflare-version: %s\n' "$cf"
    [ -z "$demo" ] || printf 'Demo-version: %s\n' "$demo"
  } > "${TMPDIR:-/tmp}/rel-$$.md"
  git tag "v$n" "$sha"
  git_nat push -q origin "v$n"
  gh release create "v$n" --repo "$REPO" --title "Version $n – $titel" --notes-file "${TMPDIR:-/tmp}/rel-$$.md" >/dev/null
  rm -f "${TMPDIR:-/tmp}/rel-$$.md"
  ok "Version $n – $titel ($(version_url "$cf"))"
fi

"$here/versioner.sh"
