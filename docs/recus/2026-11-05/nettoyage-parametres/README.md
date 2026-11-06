# Nettoyage des paramètres d'affichage

Date : 5 novembre 2026. Branche locale `design/nettoyage-parametres`, partie de `design/finition-espacements` (après le commit `a5f8ae0`, Geist par défaut). Aucun push.

## En bref

- **Retirés de l'interface.** Six réglages décoratifs disparaissent de l'écran Apparence : couleur d'accent, Style Premium/Classique, Liquid Glass, teinte de la barre latérale, présentation de la barre latérale, contraste du verre.
- **Retirés en silence.** Quatre valeurs cachées, sans interface depuis la 3.3.8, ne sont plus lues : arrondi, densité, police historique et motif d'en-tête.
- **Ce qui reste à l'écran.** Chaque réglage retiré est remplacé par son défaut, appliqué de façon fixe. C'est l'apparence qu'avait toute installation par défaut.
- **Preuve visuelle.** 60 écrans sur 60 (Clean et Premium, clair et sombre) sont identiques au pixel près, avant et après. La seule zone exclue est la mascotte animée de la sidebar.
- **Migration.** Une ancienne préférence enregistrée retombe sur le défaut au premier lancement, sans erreur. Le thème, la police, le mode et le repli de la barre latérale sont gardés. C'est prouvé par 5 tests et par un essai dans l'application réelle.
- **Code supprimé.** 2 386 lignes de code source en moins, dont 2 fichiers entiers ; 173 ajoutées.

## 1. Inventaire de départ (avant tout retrait)

Écran : **Paramètres → Apparence** (captures `captures/parametres-avant-*.jpg`).

| Réglage | Où dans l'interface | Ce qu'il changeait exactement | Où la valeur était stockée |
| --- | --- | --- | --- |
| Compagnon (mascotte ou logo) et « Donner vie au compagnon » | Apparence, premier panneau | L'animal de la sidebar, ou le logo ; l'animation des yeux et de l'humeur | `useMascotPreferences` (stockage local du poste) |
| **Thème** (Premium clair ou sombre, Clean clair ou sombre) | Affichage | Le skin (`data-skin`) et le mode | `theme-config.skin`, clé `theme` |
| **Style Premium** (interrupteur) | Affichage | Premium ou Classique (`data-visual-style`). En Classique, il masquait aussi la ligne « Thème » | `theme-config.visualStyle` |
| **Mode** (clair, auto, sombre) | Affichage | La classe `dark` sur la racine | clé `theme` |
| **Barre latérale** (automatique, claire, sombre) | Affichage | Forçait une teinte de sidebar contraire au thème : attribut `data-sidebar-tone`, feuille de jetons générée à la volée (`src/lib/sidebar-tone.ts`) | `baitari-sidebar-tone`, une valeur par utilisateur |
| **Police** (Inter, Geist, Plex, Signature) | Affichage, en Clean seulement | Le jeu de polices de Clean | `theme-config.cleanFont` |
| **Liquid Glass** (interrupteur) | Affichage | Le chrome de l'entête et de la sidebar (`data-chrome-style`). Tant qu'il était activé, il imposait la variante `sidebar` et annulait le réglage « Présentation » | `theme-config.chromeStyle` |
| **Couleur d'accent** (8 pastilles, plus cyan et sarcelle s'ils étaient déjà choisis) | Affichage | Premium remplace déjà les couleurs principales (`--primary`, `--ring`) par ses propres valeurs ; l'accent ne touchait donc que les couleurs des graphiques (`--chart-*`) | `theme-config.accent` |
| Disposition du tableau de bord | Panneau à part | Ouvre la réorganisation des widgets | `sessionStorage` (`baitari:customize-dashboard`) |
| Tableau de bord (vue d'ensemble ou journée clinique) | Ligne à part | La vue d'accueil | `useDashboardVersion` |
| **Présentation** (épurée, encadrée) | Navigation | La variante de sidebar (`minimal` ou `inset`). **Sans effet par défaut**, puisque Liquid Glass, activé, imposait `sidebar` | `layout_variant_v8` |
| Réduire la barre latérale (icônes, masquée, jamais) | Navigation | Le comportement de repli | `layout_collapsible_v7` |
| **Contraste du verre** (curseur) | Navigation, visible seulement en variante `glass` | L'opacité et le flou de la sidebar en verre | `sidebar_glass_contrast_v1` |
| **Arrondi**, **densité**, **police historique**, **motif d'en-tête** | Aucune interface depuis la 3.3.8. Le composant orphelin `ThemeSelector.tsx` n'était plus monté | Restaient appliqués depuis le stockage : `--radius`, `data-density`, `--app-font-*`, `data-header-pattern` (6 motifs) | `theme-config.radius`, `.density`, `.font`, `.headerPattern`, `.sidebarStyle` |
| Migrations ponctuelles anciennes | Aucune | Ne réécrivaient que les champs ci-dessus | `baitari-crm-geist-trial-v1`, `baitari-neutral-controls-v1`, `baitari-blue-system-polish-v1`, `baitari_original_header_restored_v2` |

**Hors de l'affichage, non concernés :** dans le même onglet, « Identité du cabinet », « Présentation de la facture », « Votre logo » et « Couleur du document ». Ils servent aux documents et aux factures, donc au métier.

## 2. Retirés et gardés, avec la raison

| Réglage | Décision | Valeur fixe retenue | Raison |
| --- | --- | --- | --- |
| Couleur d'accent | **Retiré** | `blue`, le défaut | Décoratif ; en Premium, il ne colorait que les graphiques |
| Style Premium/Classique | **Retiré** | Premium | Variante d'apparence héritée. Le choix utile, Clean ou Premium, reste dans « Thème » |
| Liquid Glass | **Retiré** | Activé, le défaut | Effet décoratif |
| Teinte de la barre latérale | **Retiré** | Automatique, le défaut | Variante d'apparence de la sidebar |
| Présentation de la barre latérale | **Retiré** | `sidebar`, la variante réellement affichée | Variante d'apparence, déjà sans effet par défaut |
| Contraste du verre | **Retiré** | Aucune : la variante `glass` disparaît | Décoratif, lié à une variante retirée |
| Arrondi, densité, police historique, motif d'en-tête | **Retirés** (valeurs cachées) | 0,5 rem (`md`), `comfortable`, système, `opaline` | Réglages fantômes : appliqués depuis le stockage, sans aucune interface |
| Thème Clean/Premium | **Gardé** | — | Usage réel, à ta demande |
| Mode clair/sombre | **Gardé** | — | Usage réel, à ta demande |
| Police (Clean), Geist par défaut | **Gardé** | — | Usage réel, à ta demande |
| Réduire la barre latérale | **Gardé** | — | Comportement, pas apparence : il donne de la place sur un petit écran de cabinet |
| Tableau de bord (vue) et disposition des widgets | **Gardés** | — | Organisation du travail, pas décoration |
| Compagnon (mascotte) et son animation | **Gardés** | — | Identité Baitari, validée auparavant ; il n'est pas listé dans ta règle de tri. **À trancher par toi** si tu le juges décoratif |

## 3. Ce qui a été fait

### Interface (`src/components/Parametres.tsx`)

- **Lignes supprimées.** Style Premium, Barre latérale, Liquid Glass, Couleur d'accent, Présentation, Contraste du verre.
- **Lignes gardées.** La ligne « Thème » est désormais toujours visible ; elle était masquée en Classique.
- **Libellés.** La description de l'onglet devient « Thème, police et navigation ». Les mots-clés de recherche « couleur », « accent » et « arrondi » sont retirés.

### Fichiers supprimés

- `src/lib/sidebar-tone.ts` : le réglage par utilisateur, la feuille de jetons générée et les hooks associés.
- `src/components/ThemeSelector.tsx` : un composant orphelin, monté nulle part.
- `tests/sidebar-tone.test.ts` : les tests d'une fonctionnalité retirée.

### Autres fichiers de code

- **`src/lib/theme-store.ts`.**
  - `ThemeConfig` se réduit à `{ skin?, cleanFont? }`.
  - `applyTheme` pose des valeurs fixes.
  - La table des 10 accents, `FONT_MAP`, `RADIUS_MAP`, `DENSITY_MAP` et `HEADER_PATTERNS` sont retirés.
  - Les quatre anciennes migrations ponctuelles sont retirées.
  - Nouvelle fonction **`cleanUpRemovedDisplaySettings`**, présentée au § 4.
- **`src/contexts/layout-provider.tsx`.** Il ne garde que le repli de la sidebar. Il valide désormais la valeur stockée : une valeur inconnue revient à « icônes ».
- **`src/modules/shell/app-shell.tsx`.**
  - La variante `sidebar` est fixe.
  - Les branches `inset`, `minimal`, `floating` et `glass` sont supprimées, ainsi que leurs cadres et leurs classes.
  - Le suivi de `chromeStyle` est supprimé.
- **`src/components/ui/sidebar.tsx`.** La classe `dark` forcée est retirée. Les variantes génériques du composant shadcn restent, car elles font partie de l'API de la bibliothèque.
- **`src/components/HeroPattern.tsx`.** Il ne garde que `HeroPattern` ; les six motifs et deux composants n'étaient plus montés.
- **`src/modules/dashboard/v2/use-is-premium.ts`.** Il renvoie `true`. Le hook reste, pour ne pas toucher les 8 composants qui l'appellent.
- **`src/lib/visual-style.ts`.** `normalizeVisualStyle` est retiré.

### CSS

Le script est dans `preuves/cssclean.mjs`. Il est passé sur `index.css`, `premium.css`, `premium-sidebar.css`, `clean.css` et `premium-analytics.css`.

- **Sélecteurs morts supprimés.** 140 sélecteurs ne pouvaient plus correspondre. Ils portaient `[data-sidebar-tone]`, `data-variant` (`glass`, `minimal`, `inset`, `floating`), les motifs d'en-tête autres qu'`opaline`, `data-density` (`compact`, `spacious`) ou les classes `header-pattern` ; s'y ajoutent les deux `@keyframes` des motifs.
- **Gardes simplifiées.** La garde `:where(:not([data-sidebar-tone="light"]))` est retirée de 26 sélecteurs. Elle a une spécificité nulle et était toujours vraie, donc la cascade ne change pas.
- **Variante `dark` de Tailwind.** Elle redevient `&:is(.dark *)`.
- **Erreur de mon script, corrigée et vérifiée.** La barre de défilement sombre (`.dark *`) avait été supprimée à tort. Je l'ai restaurée, puis vérifiée par les empreintes.

### Ce qui reste volontairement

- **Branches Classique.** Les composants qui testent `isPremium` gardent leurs branches Classique, désormais inatteignables. Elles sont réparties dans 8 fichiers de modules métier. Les retirer, c'est toucher aux tableaux de bord, aux dossiers et aux en-têtes ; c'est un nettoyage à mener à part, qui n'est pas bloquant.
- **Base des règles Liquid Glass.** Les règles `[data-chrome-style="liquid-glass"]` restent ; c'est le chrome affiché. L'attribut reste aussi posé, pour ne changer aucune spécificité.

## 4. Migration d'une ancienne préférence

### Le mécanisme

`getThemeConfig()` appelle `cleanUpRemovedDisplaySettings()` à chaque lecture :

- elle ne garde que `skin` et `cleanFont`, s'ils sont valides ;
- elle réécrit `theme-config` ;
- elle supprime les clés retirées : `layout_variant_v8`, `sidebar_glass_contrast_v1`, `baitari-sidebar-tone` et les quatre clés de migration anciennes.

Elle ne lève jamais d'erreur. Une configuration illisible est laissée telle quelle, et les défauts s'appliquent. Elle est idempotente : relancer la lecture ne change rien.

### Preuve par les tests (`tests/display-settings-cleanup.test.ts`, 5 tests)

Le premier test simule le stockage d'un testeur qui aurait changé tous les réglages retirés : Classique, accent rose, arrondi `xl`, densité compacte, police Geist, motif `tide`, variante `inset`, contraste de 15, sidebar claire, Liquid Glass désactivé. Ce testeur a aussi choisi Clean et Plex, en mode sombre, avec la sidebar masquée.

| Test | Ce qu'il vérifie |
| --- | --- |
| Après le premier lancement | <ul><li>`theme-config` vaut `{ skin: "clean", cleanFont: "plex" }`.</li><li>Les 7 clés retirées sont supprimées.</li><li>Mode `dark`, repli `offcanvas` et marqueurs de migration sont conservés.</li><li>Racine : `premium`, `clean`, `liquid-glass`, `plex`, `opaline` ; plus de `data-radius` ni de `data-density`.</li><li>`--radius` vaut 0,5 rem ; `--primary` vaut `#3b1fe5` en sombre.</li></ul> |
| Seconde lecture | Rien ne change : la fonction est idempotente. |
| Configuration illisible ou inconnue | Aucune erreur ; les défauts s'appliquent. |
| Installation neuve | Rien n'est écrit ; Clean et Geist par défaut. |
| Traces dans le code | Plus aucune dans `Parametres.tsx` ni dans le CSS (sélecteurs morts). |

### Preuve dans l'application réelle

Script : `preuves/migr.mjs`. Résultat : `preuves/migration-navigateur.json`.

- **Mise en place.** Le même stockage ancien est posé dans le navigateur, puis l'application est rechargée.
- **Erreurs :** aucune, ni de page ni dans la console.
- **Racine :** `visualStyle=premium`, `skin=clean`, `chromeStyle=liquid-glass`, `cleanFont=plex`.
- **Préférences gardées :** mode sombre, corps en IBM Plex Sans.
- **Clés retirées :** effacées.
- **Données :** les 5 patients sont intacts.
- **Capture :** `captures/migration-ancienne-preference.jpg`.

## 5. Preuve que l'apparence par défaut n'a pas bougé

Fichier : `preuves/nettoyage-empreintes.txt`.

- **Protocole.** 15 vues × clair et sombre × Clean et Premium, à heure figée, avant puis après le nettoyage.
- **Résultat.** **60 sur 60 identiques**, empreintes SHA-256 égales. La seule zone masquée est la mascotte animée de la sidebar.
- **Conséquence.** Premium est inchangé, et une installation restée sur les défauts ne voit aucune différence.

## 6. Captures de l'écran des paramètres

Dans `captures/`, l'onglet Apparence en entier :

- `parametres-avant-clean-clair.jpg` et `parametres-apres-clean-clair.jpg` ;
- les mêmes en Clean sombre et en Premium clair. En Premium, la ligne « Police » est absente, comme prévu : elle ne s'affiche qu'en Clean.

**Après le nettoyage,** il reste :

- le compagnon et son animation ;
- Thème, Mode et Police (en Clean) ;
- Disposition du tableau de bord ;
- la vue du tableau de bord ;
- Navigation, avec « Réduire la barre latérale ».

## 7. Tests, typage, lint

| Contrôle | Résultat |
| --- | --- |
| **Vitest** | 177 fichiers, 1 375 tests : **1 374 verts, 1 échec préexistant** |
| **Typage** (`tsc -b`) | 0 erreur |
| **ESLint** | 0 problème |

- **L'échec préexistant.** `tests/type-scale.test.ts` refuse le `font-size: 15px` des initiales de l'avatar dans l'en-tête (commit `5e1d78a`). Déjà signalé dans le bilan de la finition ; non corrigé, car hors périmètre.
- **Tests adaptés, parce qu'ils vérifiaient des réglages retirés :**
  - `tests/visual-style.test.ts`, réécrit : Premium fixe, persistance limitée au thème et à la police, actions noires et bleu-violet, ancienne préférence Classique ramenée à Premium ;
  - `tests/theme-clean-charter.test.ts` : constante `SIDEBAR` sans la garde, « installation existante » sans densité, « pose la peau toujours sur Premium » ;
  - `tests/sidebar-tone.test.ts` : supprimé, avec la fonctionnalité.
- **Test ajouté :** `tests/display-settings-cleanup.test.ts`.

## 8. Enchaînement avec la finition et Geist

Aucun blocage. La branche part de `a5f8ae0` : finition, jeux de polices et Geist par défaut. La prochaine mise à jour peut partir de cette branche.

Deux points à connaître :

- **Les testeurs qui avaient changé un réglage retiré verront leur apparence revenir au défaut.** C'est voulu. Par exemple : sidebar claire forcée, Classique, accent, Liquid Glass désactivé.
- **Le compagnon reste.** C'est à toi de confirmer.

## 9. Fichiers non commités rencontrés

Ce sont les mêmes qu'à la session de finition : `AGENTS.md` supprimé, et des fichiers non suivis (`.claude/`, `CLAUDE.md`, `briefs/`, `docs/etudes/`, `graphify-out/` et d'anciens reçus). Je ne les ai ni modifiés ni commités.

Le hook git de graphify relance une reconstruction de `graphify-out/` à chaque commit, comme lors de la finition.

## 10. Commits locaux

Ils sont listés dans le message de clôture et dans `git log design/nettoyage-parametres`. Aucun push.
