# Adoption de Clean comme thème par défaut

Date : 22 octobre 2026. Commit local, aucun push.

## Les hashes

| Passe | Commit |
| --- | --- |
| Corrections : tableau de bord et barre latérale (fermée) | `20b031b` : le code ; `70e5832` : le complément du bilan, avec ta vérification dans l'app réelle |
| Adoption de Clean (cette passe) | `d0324df` |

## Ce qui change

**Le thème par défaut est Clean** : `DEFAULT_SKIN` passe de `"premium"` à `"clean"` dans `src/lib/theme-skin.ts`. C'est la valeur unique qui décide du thème d'une installation sans préférence.

**Écart, décidé avec toi : une deuxième valeur, le mode.** Un premier lancement s'ouvrait en **sombre** : `<ThemeProvider defaultTheme="dark">` dans `src/main.tsx`, vérifié sur un profil vierge avant toute modification (racine `dark`, Premium). Avec la seule valeur du thème, l'app se serait ouverte en Clean sombre. Tu as choisi le mode clair : `defaultTheme="light"`.

## Aucune préférence écrasée

Le défaut ne vaut que pour une installation neuve. Le piège : une installation existante peut n'avoir **jamais enregistré** son thème ni son mode (une installation jamais touchée ne stocke ni `skin` ni `theme`). Sans précaution, elle aurait basculé en Clean clair sans l'avoir choisi.

`keepPreviousAppearanceDefaults` (`src/lib/theme-store.ts`) s'exécute une seule fois, avant la première lecture du thème et du mode :
- **installation existante** (configuration d'apparence enregistrée, ou clé de migration que chaque lancement écrit depuis longtemps) : elle garde ce qu'elle affichait. Le thème est figé à Premium s'il n'avait jamais été choisi, et le mode à sombre s'il n'avait jamais été choisi ;
- **choix déjà enregistré** (Premium, Clean, clair, sombre, Auto) : jamais touché ;
- **installation neuve** : rien n'est figé, donc Clean clair.

Ensuite, une clé (`baitari-clean-default-v1`) empêche toute nouvelle migration. Un réglage fait plus tard sur une installation neuve, la couleur d'accent par exemple, ne la ramène donc pas vers Premium.

**À savoir.** Le thème est rangé par poste, pas par compte : « nouvel utilisateur » veut dire ici nouveau poste. Un nouveau compte créé sur un poste existant garde le thème de ce poste.

**La barre latérale reste sur Automatique** par défaut : en Clean clair, c'est la barre sombre du thème (vérifié : aucun `data-sidebar-tone` posé au premier lancement).

## Preuves

### Premier lancement sans préférence

Profil de capture vidé de toute clé d'apparence (thème, mode, migrations, barre latérale), base de démonstration conservée :

| Lancement | Racine | Thème | Barre | Mode enregistré |
| --- | --- | --- | --- | --- |
| Avant la bascule | `dark` | Premium | — | aucun |
| Après, installation neuve | `light` | **Clean** | Automatique | aucun (le défaut clair s'applique) |
| Après, installation existante simulée (configuration sans thème ni mode) | `dark` | **Premium** | Automatique | `dark`, figé |

Captures : `captures/premier-lancement.jpg` (Clean clair, barre sombre) et `captures/installation-existante.jpg` (Premium sombre conservé).

### Premium toujours là, inchangé

- `captures/selecteur-themes.jpg` : après un premier lancement, les quatre thèmes sont proposés, Clean clair sélectionné.
- `captures/selecteur-premium-sombre-choisi.jpg` : Premium sombre sélectionné, toujours disponible.

Empreintes avec **Premium explicitement sélectionné**, fichiers du commit des corrections puis ceux de la bascule :

| Écran | Premium clair | Premium sombre |
| --- | --- | --- |
| Tableau de bord | `638:1355ccfc` = | `637:d36afdbd` = |
| Soins | `338:17d5647c` = | `337:b04da947` = |
| Finances | `342:36424e20` = | `341:ebf285ad` = |
| Analyse financière | `481:f4ab1f22` = | `480:fdee9d5` = |
| Patients | `465:13500697` = | `464:526e186c` = |
| Paramètres | `457:a8555978` = | `456:8bd9ce2d` = |

« = » : même empreinte avant et après. Le tableau de bord et Patients n'ont pas les mêmes valeurs qu'au bilan précédent : la base de démonstration a avancé dans la journée (heure de mise à jour, rendez-vous). Les deux relevés de cette passe ont été faits l'un après l'autre, sur la même base.

## Vérifications

- **Vitest :** 153 fichiers, 1 179 tests verts. Le test du défaut, qui affirmait « Premium par défaut », est mis à jour, et quatre cas s'ajoutent :
  - installation neuve : Clean, aucun mode enregistré ;
  - installation existante : Premium et sombre figés, ses autres réglages gardés ;
  - installation existante sans configuration enregistrée : Premium aussi ;
  - choix déjà enregistré : jamais touché ;
  - une seule fois : un réglage fait ensuite sur une installation neuve reste en Clean.
- **Typage :** 0 erreur. **ESLint :** 0 problème.
