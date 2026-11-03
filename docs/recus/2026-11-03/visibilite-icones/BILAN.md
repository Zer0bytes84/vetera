# Visibilité des icônes, thème Clean (sidebar et entête)

Le 03/11/2026, suite au retour d'Aissa sur la 5.0.1 : les icônes sont fades et manquent de visibilité, dans la sidebar comme dans l'entête.

Les captures ont été faites dans l'application web en mode dev (Vite, Chromium headless, 1440 × 900 à 2x). La base navigateur est vide et le compte est fictif (« Dr Capture Test »), sans aucune donnée réelle. Elles couvrent Clean clair et Clean sombre.

- `avant/` : HEAD 5e1d78a, avant ce changement ;
- `apres/` : ce changement ;
- `cote-a-cote/` : la sidebar avant (à gauche) et après (à droite) ; l'entête avant (en haut) et après (en bas) ;
- `autres-themes/` : Premium et Classique après le changement, pour la cohérence.

## Diagnostic : ce que le code appliquait vraiment

Valeurs lues dans le navigateur (styles calculés), pas seulement dans le CSS.

| Point | Supposé | Réel |
| --- | --- | --- |
| Trait des icônes de navigation | `--clean-icon-stroke: 1px` | Bien 1 px, mais **le jeton n'y était pour rien** : `premium-sidebar.css` impose `stroke-width: 1 !important` sur `.sidebar-nav-icon svg` et `.premium-shortcut-icon`. Changer le jeton seul n'aurait rien changé dans la sidebar. |
| Composant d'icônes en Clean | `sidebar-icon.tsx` (trait 1,5) ou `premium-sidebar-icon.tsx` (trait 1) | Clean utilise `PremiumSidebarIcon` (Lucide, `strokeWidth={1}`), parce que Clean est une couche sur Premium (`data-visual-style="premium"`). `SidebarIcon` sert seulement au thème Classique. |
| Couleur des icônes inactives | Le 4ᵉ gris (`--clean-ink-disabled`) | **Le 3ᵉ gris**, `--clean-ink-quiet`. Le 4ᵉ ne sert qu'à l'état désactivé. |
| Valeur de ce gris | #7f7f7f | **#959698**. La sidebar Clean est sombre dans les deux déclinaisons et reprend le bloc de jetons sombre (fond #0c0d0f). Le libellé à côté de l'icône est en `--clean-ink` (#cbcccd) : l'icône était plus pâle que son propre texte. |
| Masques SVG de substitution | trait 1 | 5 masques en `stroke-width='1'` (book-heart, syringe, siren, calendar-clock, clock-alert). `calendar-heart` était déjà à 1,5. |
| Entête | 18 px, trait 1,6 | Confirmé : 18 px, 1,6 px, gris fort (#292929 en clair, #f3f3f5 en sombre). |

Pour l'entête, un point compte : la 5.0.1 testée par Aissa (tag `v5.0.1`, 69a3d0b) ne contient **pas** le commit d'hier, 5e1d78a. Dans la 5.0.1, les outils de l'entête étaient encore à 16 px, trait 1,5, en gris par défaut `--clean-ink`. Le passage à 18 px, trait 1,6 et gris fort n'est pas encore publié. Son retour sur l'entête porte donc sur une version déjà dépassée.

## Ajustement

| Valeur | Avant | Après |
| --- | --- | --- |
| `--clean-icon-stroke` (navigation, raccourcis, listes, tableaux) | 1px | **1.5px** |
| Trait effectif des icônes de la sidebar | 1 px (imposé par premium-sidebar.css) | **1,5 px**, grâce à une règle Clean en `!important`, plus spécifique, limitée à `.app-sidebar .sidebar-nav-icon svg` et `.app-sidebar .premium-shortcut-icon` |
| Masques de substitution | `stroke-width='1'` (5 masques) | **`stroke-width='1.5'`** (les 6) |
| Couleur des icônes inactives de la navigation | `--clean-ink-quiet` (#959698 dans la sidebar) | **`--clean-ink`** (#cbcccd dans la sidebar ; #5d5d5d si la sidebar passe en ton clair), le gris du libellé |
| Icône active | `--clean-ink-strong` | inchangé (#f3f3f5 dans la sidebar ; #292929 sur fond clair) |
| Survol | `--clean-ink-strong` | inchangé |
| Désactivé | `--clean-ink-disabled` | inchangé : mesuré à #575759 sur un élément de navigation passé en `aria-disabled`, nettement en retrait par rapport à #cbcccd |
| Taille des icônes de navigation | 16 px | **inchangée, 16 px** : le trait et la couleur suffisent sur les captures, je ne suis pas monté à 17 ou 18 px |
| Entête (60 px, contrôles 36 px, icônes 18 px, trait 1,6, avatar) | – | inchangé, vérifié par mesure après le changement |

« #5D5D5D », la valeur visée dans la consigne, est le gris par défaut du jeu clair. La sidebar Clean est sombre en clair comme en sombre, donc ce même jeton y vaut #cbcccd. J'ai pris le jeton (`--clean-ink`) et non une valeur en dur, pour que la sidebar en ton clair (`data-sidebar-tone="light"`) donne bien #5d5d5d.

### Corrections annexes

- `sidebar-icon.tsx` (thème Classique seulement) : l'icône « soins » dessinée à la main passe du trait 1 à 1,5, comme ses voisines HugeIcons. C'était la seule plus fine de la liste.
- `clean.css`, jeton `--clean-online` (pastille verte d'hier) : déclaré aussi dans le bloc sombre, avec la même valeur. Le test de charte « chaque jeton de couleur est redéfini en sombre » était rouge depuis 5e1d78a. Aucun changement visuel.
- `clean.css`, survol du contrôle de l'entête dans `@layer utilities` (5e1d78a) : placé sous `@media (hover: hover) and (pointer: fine)`, comme l'exige la charte d'interaction, dont le test était rouge. Rien ne change à la souris ; sur écran tactile, le survol ne reste plus collé.

## Autres thèmes

- **Premium** : inchangé, 20 px, trait 1 (la règle ajoutée ne vise que `data-skin="clean"`). Voir `autres-themes/premium-*`.
- **Classique** : 22 px, trait 1,5, inchangé, sauf l'icône « soins » alignée à 1,5. Voir `autres-themes/classique-*`.

Premium garde donc un trait plus fin que Clean. C'est son dessin d'origine, je ne l'ai pas refondu.

## Tests

- `npm run typecheck` : vert.
- `npm test` : 1366 tests verts sur 1367. **Un rouge, hérité de 5e1d78a et laissé tel quel** : `tests/type-scale.test.ts` refuse `font-size: 15px` sur le disque de l'avatar de l'entête (l'échelle admet 12, 13, 14, 16, 18 et 24). L'avatar fait partie des tailles validées hier, je n'y ai pas touché. Correctif d'une ligne, au choix : 14 px ou 16 px dans la règle `.shell-account-trigger .shell-account-avatar` de `clean.css`, ou une exception explicite dans le test si 15 px est voulu pour l'emoji.
- Nouveaux tests dans `tests/theme-clean-charter.test.ts` : trait 1,5 et sa règle `!important` face à premium-sidebar.css ; gris du libellé au repos et gris fort pour l'actif ; masques à 1,5.

## Ce qui n'est pas prouvé

- **Pas de capture sur la vraie application Tauri** ni sur la base réelle, et pas sur Windows : rendu web Chromium sur Linux seulement. L'antialiasing de WebView2 (Windows, la machine d'Aissa) et de WKWebView (macOS) peut rendre un trait de 1,5 px un peu différemment.
- **L'entête de la 5.0.1** n'a pas été capturé : l'écart 5.0.1 → aujourd'hui est établi par le code (`git show v5.0.1`), pas par une image. Les captures « avant » de l'entête montrent déjà l'entête d'hier, d'où leur identité avec les « après ».
- **Les icônes de listes et de tableaux** (`[data-list-row]`, `.medical-data-table`) : la base de capture est vide, donc aucune ligne n'a été affichée. Le jeton s'y applique dans le CSS, mais un éventuel `!important` concurrent, comme celui trouvé dans la sidebar, n'a pas été cherché par mesure.
- **Les raccourcis de la sidebar** (`.premium-shortcut-icon`) étaient absents de la base vide : la règle les couvre, sans mesure.
- **La sidebar en ton clair** (`data-sidebar-tone="light"`) n'a pas été capturée.
- **L'état désactivé** a été vérifié en forçant `aria-disabled` sur un élément de navigation : l'application n'en a aucun de désactivé en usage normal.
- **L'avis d'Aissa** : la lisibilité perçue reste à confirmer par elle sur sa machine.
