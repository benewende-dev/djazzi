# Orbes de réflexion

Le moteur des orbes (`engine/`, `presets.ts`, `theme.ts`) est repris tel quel de
[thinking-orbs](https://github.com/Jakubantalik/thinking-orbs) de Jakub Antalik,
licence MIT (`LICENSE`), au commit `de85557ca220332586d070d8788c0e1d6e877a0d`
(16/08/2026). Deux retouches seulement, marquées `DJAZZI` : `types.ts` est réduit aux types du
moteur, et le paramètre inutilisé `rMin` de `paint` (`engine/core.ts`) devient `_rMin`.

Ne pas retoucher ces fichiers : pour suivre une nouvelle version, les recopier
depuis le dépôt d'origine et changer le commit ci-dessus.

Ce qui est à Djazzi :

- `thinking-orb.tsx` : l'orbe sur le bureau et dans le navigateur (canvas) ;
- `thinking-orb.native.tsx` : l'orbe sur le téléphone (react-native-svg) ;
- `orb-for.ts` : quelle orbe pour quelle action de l'agent.

`brand.mjs` copie ce dossier dans le bureau (`components/djazzi-orbs/`) et dans
le téléphone (`src/components/djazzi-orbs/`).
