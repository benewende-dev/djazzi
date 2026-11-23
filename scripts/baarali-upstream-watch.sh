#!/usr/bin/env bash
# La veille de l'upstream (docs/baarali/UPSTREAM.md §4 bis, 23/11/2026).
#
# Dit, avant toute fusion, ce que rowboatlabs/rowboat a changé depuis notre
# dernière synchro dans les zones où un changement de direction coûte cher :
# le serveur des Espaces (Harbor : migrations, stockage, connexion), le
# client des Espaces, les fichiers que Baarali modifie (DIVERGENCES.md), et
# les commits qui suppriment, renomment ou retirent quelque chose. Écrit du
# Markdown sur la sortie standard ; ne touche à rien.
#
#   scripts/baarali-upstream-watch.sh [ref]     (par défaut upstream/main)
#
# Né de la synchro du 23/11/2026 : l'upstream avait supprimé les équipes de
# Harbor le 09/11, et personne ne l'avait vu passer.
set -euo pipefail

ref="${1:-upstream/main}"
root="$(git rev-parse --show-toplevel)"
cd "$root"

base="$(git merge-base HEAD "$ref")"
behind="$(git rev-list --count "HEAD..$ref")"
echo "## Veille upstream : ${behind} commit(s) à intégrer"
echo
echo "Depuis \`$(git rev-parse --short "$base")\` jusqu'à \`$(git rev-parse --short "$ref")\`."
echo
[ "$behind" = "0" ] && exit 0

# Les zones sensibles : un changement ici peut retirer ce sur quoi Baarali s'appuie.
sensitive=(
  apps/harbor/SPEC.md
  apps/harbor/CONTRACT.md
  apps/harbor/packages/server/src/migrations.ts
  apps/harbor/packages/server/src/store.ts
  apps/harbor/packages/server/src/pg-store.ts
  apps/harbor/packages/server/src/auth.ts
  apps/harbor/packages/server/src/auth-oidc.ts
  apps/harbor/packages/server/src/http.ts
  apps/harbor/packages/server/src/main.ts
  apps/harbor/packages/protocol/src
  apps/x/packages/spaces-client/src
  apps/x/packages/core/src/spaces
  apps/x/packages/core/src/config/env.ts
  apps/x/packages/core/src/auth
  apps/x/apps/mobile/src/app/_layout.tsx
  apps/x/apps/mobile/src/lib/spaces
)

echo "### Zones sensibles"
echo
out="$(git log -n 60 --no-merges --format='- `%h` %s (%as)' "$base..$ref" -- "${sensitive[@]}")"
if [ -n "$out" ]; then echo "$out"; else echo "Rien."; fi
echo

echo "### Ce qui supprime, renomme ou change de direction"
echo
out="$(git log -n 40 --no-merges -i -E --grep='remove|delete|drop|retire|rename|deprecat|breaking|dissolv|replace' \
  --format='- `%h` %s (%as)' "$base..$ref")"
if [ -n "$out" ]; then echo "$out"; else echo "Rien."; fi
echo

# Les fichiers upstream que Baarali modifie (première colonne de DIVERGENCES.md)
# et que l'upstream a aussi changés : là où la fusion demandera de l'attention.
echo "### Fichiers que Baarali modifie et que l'upstream a changés"
echo
changed="$(git diff --name-only "$base" "$ref")"
listed="$(grep -o '^| `[^`]*`' docs/baarali/DIVERGENCES.md | sed 's/^| `//; s/`$//' | sort -u)"
hits=0
while IFS= read -r file; do
  [ -n "$file" ] || continue
  if grep -qxF "$file" <<<"$changed"; then
    echo "- \`$file\`"
    hits=$((hits + 1))
  fi
done <<<"$listed"
[ "$hits" = 0 ] && echo "Aucun."
echo

echo "### Fichiers supprimés par l'upstream"
echo
out="$(git diff --name-only --diff-filter=D "$base" "$ref" | { grep -v '^\.\(github\|changeset\)/' || true; } | sed -n '1,40p' | sed 's/^/- `/; s/$/`/')"
if [ -n "$out" ]; then echo "$out"; else echo "Aucun."; fi
