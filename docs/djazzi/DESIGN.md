# Djazzi — règles de design

Les règles visuelles de Djazzi sur le téléphone, le bureau, le navigateur (chat.djazzi.com), le site et les apps à venir. Toute valeur visuelle doit venir de ce document. Une valeur qui n'y est pas se discute et s'ajoute ici avant d'entrer dans le code.

Les choix du fondateur priment sur tout le reste : une règle reprise d'ailleurs cède devant eux. Une règle **datée** est une décision déjà prise et visible dans le code. Une règle **sans date** (les échelles de taille, d'espacement et d'arrondi, les états des composants) est une **proposition**, écrite le 24/11/2026 à partir des valeurs les plus utilisées dans le code, et elle attend la validation du fondateur. Les écarts sont listés à la fin, avec la question à trancher.

Inspirations : [ai-design-skills](https://github.com/elayadesign/ai-design-skills) (MIT) pour la forme des échelles, et [impeccable](https://github.com/pbakaus/impeccable) (Apache-2.0) pour la vérification. Leurs règles qui contredisent les choix de Djazzi ne sont pas reprises : Djazzi garde Inter et ses propres icônes.

## 1. Principes

1. **Le D est le signe de Djazzi** (24/11/2026). C'est un D noir plein, avec deux yeux. Sa forme vient de `packages/control/src/d-mark.ts`, qui est la seule source : on ne redessine pas le D ailleurs. Le mot « Djazzi » est en Geist SemiBold vectorisé (`logo.ts`).
2. **Noir et blanc, sur un papier chaud** (07/11/2026, signe C du fondateur, comme OpenBaara) :
   - le jour, un blanc cassé chaud et une encre presque noire ;
   - la nuit, un anthracite chaud et un blanc cassé ;
   - pas de couleur de marque : l'accent est l'encre elle-même.
3. **Jamais d'étoile** (03/10/2026) : ni étoile, ni étincelle, ni baguette magique. L'étoile se lit « fait par une IA ». Le thème du bureau masque `lucide-sparkles`, `lucide-sparkle` et `lucide-wand-sparkles`.
4. **Pas d'images décoratives ni générées.** Seulement de vraies photos et de vrais films (règle du site).
5. **Ce que fait l'agent se voit** :
   - le D au travail ;
   - une orbe pour le genre d'action en cours (section 9) ;
   - le texte de l'action ;
   - le temps passé.

   Pas de roue de chargement anonyme quand on sait ce qui se passe.
6. **Des mots, pas du jargon**, dans la langue de la personne : le français d'abord, l'anglais ensuite. Les textes passent par `i18n-extract.mjs --check`.

## 2. Polices

| Rôle | Police | Graisse | Où |
|---|---|---|---|
| Tout le texte d'interface | Inter | 400, 500, 600 | partout |
| Titre de page, grande salutation | Source Serif 4 | 500, approche −0,02 em | `h1` du bureau, « Bon après-midi » du téléphone |
| Code, chemins, chiffres alignés | monospace du système | 400 | blocs de code, durées (`tabular-nums`) |
| Logo, mot « Djazzi » | Geist SemiBold **vectorisé** | — | jamais comme police de texte |

Les polices viennent du site et sont fournies avec les apps (`assets/fonts`, licence OFL) : elles s'affichent pareil hors ligne.

- **Graisses** : 400 pour le texte courant, 500 pour un titre de carte ou un libellé, 600 pour un bouton ou un titre de section. On ne dépasse pas 600 dans l'interface : le 700 du téléphone (7 usages) est à ramener à 600.
- **Italique** : il n'est pas utilisé pour marquer un état. Le « Thinking… » en italique du téléphone est remplacé par l'orbe et le texte scintillant (section 9).
- **Un seul serif par écran**, et seulement pour le titre principal.

## 3. Tailles de texte

On n'invente pas de taille : on prend une ligne de ce tableau. Une taille entre deux lignes descend à la ligne du dessous.

| Style | Taille / interligne | Graisse | Usage |
|---|---|---|---|
| Titre 1 | 30 / 36 | Serif 500 | titre de page, salutation |
| Titre 2 | 24 / 32 | 600 | titre de section |
| Titre 3 | 20 / 28 | 600 | titre de feuille, de dialogue |
| Libellé fort | 16 / 24 | 600 | titre de carte, ligne de liste |
| Corps | 16 / 24 | 400 | messages, texte courant (téléphone) |
| Corps compact | 14 / 20 | 400 | texte courant (bureau), descriptions |
| Libellé | 14 / 20 | 500 | navigation, réglages |
| Bouton | 14 / 20 | 600 | tous les boutons |
| Légende | 12 / 16 | 500 | heure, compteur, aide, badge |

Sur le téléphone, le texte suit la taille de texte choisie dans iOS ou Android : on ne la bloque pas.

## 4. Couleurs

Seules les valeurs de ce tableau sont autorisées. Elles viennent de `mobile/src/theme/colors.ts`, la référence.

| Rôle | Jour | Nuit |
|---|---|---|
| Fond | `#faf9f6` | `#171614` |
| Fond secondaire, champs | `#f1efea` | `#24221f` |
| Carte | `#faf9f6` | `#1b1a18` |
| Fond des écrans groupés | `#f1efea` | `#100f0e` |
| Texte | `#1c1b19` | `#f2efe9` |
| Texte secondaire | `#45423c` | `#c4c0b8` |
| Texte tertiaire | `#8f8b84` | `#86827b` |
| Filet | `rgba(66,56,40,0.16)` | `rgba(255,244,225,0.10)` |
| Accent (bouton principal, envoi, sélection) | `#000000` | `#f2efe9` |
| Texte sur l'accent | `#ffffff` | `#171614` |
| Destruction, erreur | `#ff3b30` | `#ff5a4f` |

- **La nuit, plus on avance vers soi, plus c'est clair** : fond, puis carte, puis champ.
- **Pas de dégradé de fond, jamais.** Le seul « dégradé » admis est le reflet qui passe sur un texte en cours (`djazzi-shimmer`).
- **Une couleur qui dit quelque chose la garde** : le rouge d'un enregistrement ou d'une erreur. Tout le reste est en encre.
- **Contraste** : au moins 4,5:1 pour le texte et 3:1 pour une icône ou un filet utile. Le texte tertiaire ne porte jamais une information indispensable.

## 5. Espacements

On utilise seulement ces valeurs, en pixels ou en points :

`0 · 2 · 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 80`

- Marges de l'écran : 16 sur le téléphone, 24 sur le bureau.
- Entre deux blocs d'une même section : 12 ou 16. Entre deux sections : 32.
- Bouton : 8 en haut et en bas, 12 sur les côtés (14 en hauteur de texte, donc 36 de haut). Bouton principal du téléphone : au moins 44 de haut (taille de doigt).
- Icône et texte côte à côte : 8 (6 dans une ligne dense).

## 6. Arrondis

`4 · 8 · 12 · 16 · 20 · 24 · plein (999)`

- Champ, petit bouton : 8. Carte, bouton : 12. Feuille, grande carte : 20. Pilule (barre du bas, puces) : plein.
- **Arrondi imbriqué** : quand une forme est dans une autre, avec moins de 32 d'écart, l'arrondi intérieur est égal à l'arrondi extérieur moins l'écart. Par exemple, une carte de 20 avec 8 de marge intérieure donne 12 à l'intérieur. Si le résultat vaut 2 ou moins, l'angle intérieur reste droit.
- Bord : un filet sur tout le tour, ou aucun. Jamais un filet sur un seul côté d'une carte.

## 7. Icônes

- **Bureau et navigateur** : lucide, trait 1,75, gris au repos, couleur de l'encre sur la ligne active (thème du bureau).
- **Téléphone** : les symboles du système (`expo-symbols`, SF Symbols sur iOS) et nos propres SVG pour les formes de marque.
- **Tailles** : 16 dans une ligne de texte, 20 dans une barre, 24 seule.
- Une icône seule a toujours un libellé d'accessibilité. Jamais d'étoile (section 1).

## 8. Mouvement

- **Courbe de Djazzi** : `cubic-bezier(0.2, 0.8, 0.3, 1)`, qui ralentit à l'arrivée. On ne laisse jamais la courbe par défaut du navigateur (`ease`, `linear`).
- **Durées** :
  - 150 à 220 ms pour un survol, une couleur ou une icône ;
  - 300 ms pour ouvrir ou fermer ;
  - 500 ms au plus pour un déplacement de mise en page.
- On n'anime que la position, l'échelle et la transparence (`transform`, `opacity`), jamais la largeur, la hauteur ou la position absolue.
- **« Réduire les animations »** : le mouvement devient un simple fondu, et les signes animés (D, orbes) restent sur une image fixe.
- Une animation s'arrête quand elle n'est pas visible : écran caché, app en arrière-plan, élément hors de vue.

## 9. Signes animés

| Signe | Quand | Règle |
|---|---|---|
| D au travail (`motion="loading"`) | l'agent travaille | les yeux regardent alentour, le corps ne bouge pas |
| D immobile + badge | l'agent attend un accord | badge bouclier, texte « Attend votre accord » |
| Orbe de réflexion (20 px, dessinée à 16 sur le bureau) | à côté de l'action en cours | choisie par `assets/orbs/orb-for.ts`, avec le moteur thinking-orbs repris tel quel |
| Texte scintillant (`djazzi-shimmer`) | le mot de l'état (« Réflexion… », « Djazzi travaille… ») | seulement sur ce mot, jamais sur une phrase entière |

Correspondance des orbes : recherche et lecture → globe ; outil et connexion → constellation ; écriture → ruban ; raisonnement et code → anneaux ; image et création → forme qui change ; planification → tresse ; autre → orbites.

Une seule animation principale à la fois dans une ligne : le D et l'orbe, oui ; le D, l'orbe et une roue de chargement, non.

## 10. Composants

- **États obligatoires** pour un élément interactif : repos, survol (bureau), appui, focus visible (anneau de 2 à l'encre), désactivé (40 % d'opacité), chargement.
- **Vide, erreur, hors ligne** : chaque écran qui charge des données a son état vide, avec une phrase et une action, et son état d'erreur, avec ce qui s'est passé et « Réessayer ». Pas d'écran blanc.
- **Saisie** : la zone d'écriture se détache du fond. La nuit sur le bureau (03/10/2026), c'est une surface grise relevée avec un filet visible, plus clair quand on écrit.
- **Barres** : sur le téléphone, une barre en pilule en bas et un menu à gauche (23/11/2026). Sur le bureau, une seule barre latérale (07/11/2026).

## 11. Vérifier

Avant de dire qu'un écran est fini :

1. Ses valeurs sortent des sections 2 à 8, sans valeur inventée.
2. Il a été vu en vrai, au simulateur ou dans l'app, de jour et de nuit, avec « Réduire les animations » activé, en français et en anglais.
3. Le détecteur d'impeccable ne signale rien de neuf :

   ```bash
   npx impeccable detect apps/djazzi/packages/desktop/assets
   ```

   Inter est notre police de marque : on la déclare une fois avec `npx impeccable ignores add-value overused-font Inter --reason "Police de marque de Djazzi"`, puis on ne contourne aucune autre règle sans écrire pourquoi.
4. Les tests et contrôles habituels passent (`brand.mjs --check`, `i18n-extract.mjs --check`, types, tests). Leur résultat sur GitHub est relu avant de fusionner.

## 12. Écarts connus au 24/11/2026

Ce qui ne suit pas encore ces règles, à corriger dans l'ordre :

1. ~~L'accent du bureau était bleu~~ (`#1a6dff`, 02/10/2026) : **corrigé le 24/11/2026**, sur décision du fondateur. Le bureau est en noir et blanc comme le téléphone, et les liens des messages, désormais de la couleur du texte, sont soulignés.
2. ~~La nuit du bureau était neutre~~ (`#171717`, `#262626`) : **corrigé le 24/11/2026**. Elle utilise maintenant les gris chauds de la section 4.
3. **Arrondis du téléphone hors échelle** dans `assets/mobile` : 23 (7 usages), 29 (5), 22 (12), 18 (11), 14 (10). Ils sont à ramener vers 20, 24, 16 ou 12.
4. **Espacements hors échelle** dans `assets/mobile` : 14 (32 usages), 10 (32), 18 (14), 6 (10), 5 (5), 26 (4), 22 (4). Ils sont à ramener vers 12, 16 ou 8. Les boutons du bureau (`padding: 9px 12px`, arrondi 9) sont à ramener à 8/12 et 8.
5. **Graisse 700** sur le téléphone (7 usages), à ramener à 600.
6. **« Thinking… » en italique** sur le téléphone (`turn-view.tsx`), à remplacer par le texte scintillant à côté de l'orbe.
7. **Texte anglais visible** sur le serveur d'essai : « No assistant model configured (connect a provider or sign in) ». Il est à traduire.
8. **Le jour du bureau est blanc pur** (`#ffffff`, valeur de Rowboat), alors que le téléphone est sur papier chaud (`#faf9f6`). **Question à trancher** : passer aussi le jour du bureau au papier chaud ?
9. **L'éditeur 3D (CAD) a son propre accent bleu** (`--accent: #4d8dff`, dans `assets/motion/cad-editor-page.ts`), à ramener à l'encre.

Chaque correction suit la règle du dépôt : on modifie la source dans `apps/djazzi` (thème, assets ou `brand.mjs`), jamais la copie dans `apps/x`.
