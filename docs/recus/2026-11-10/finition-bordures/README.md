# Finition des blocs : cadre de 6 px et rayons concentriques

Date : 10 novembre 2026. Règle appliquée, avec les valeurs mesurées sur le widget Mirror Strips de TuffUI : **bordure à 0, aucune ombre** ; la bande (Shell) est un **cadre de 6 px** autour du panneau (Panel) ; **rayon extérieur = rayon intérieur + épaisseur du cadre** (16 + 6 = 22 px) ; le bord n'est défini que par le contraste entre le fond de la bande et celui du panneau. Rien d'autre ne change : contenus, couleurs de fond, espacements internes.

## La règle, dans nos jetons

| Jeton | Valeur | Rôle |
| --- | --- | --- |
| `--radius-panel` (existant) | 16 px | rayon intérieur : le panneau |
| `--card-frame` (nouveau) | 6 px | épaisseur du cadre : `padding` de la bande |
| rayon de la bande | `calc(var(--radius-panel) + var(--card-frame))` = 22 px | rayon extérieur, concentrique |

Les fonds restent `--card-band` (gris de la bande) et `--card-inset` (panneau) : ce sont déjà les valeurs de TuffUI. Un seul code, `src/components/ui/surface.tsx`, plus le jeton dans `src/design-system/tokens.css`.

## Ce qui change

| | Avant | Après |
| --- | --- | --- |
| Bordure / ombre | Aucune (la bande se fondait dans la page) | Aucune : le bord vient du seul contraste des fonds |
| Cadre autour du panneau | 6 px en haut et sur les côtés, **12 px en bas** (`pb-3`) | **6 px sur les quatre côtés** : chaque bande est 6 px moins haute |
| Rayons | 22 px et 16 px écrits en dur | Mêmes valeurs, la bande dérivée du panneau et du cadre |

## Mesuré dans le navigateur (Clean clair et Premium sombre, 1440 px)

Sur chaque bande du tableau de bord et de Patients : `border` 0 px, `box-shadow` none, `padding` 6/6/6/6 px, rayon 22 px ; panneau : `border` 0, `box-shadow` none, rayon 16 px, 6 px de cadre sous lui sur le tableau de bord. Sur la page Patients, la bande du tableau garde en plus son pied de pagination sous le panneau (inchangé).

## Périmètre

`Shell` et `Panel` : bandes « Chiffres clés » de chaque page, widgets du tableau de bord, cartes de chiffres, tableaux de données. Les boîtes écrites à la main avec leurs propres classes (sections de réglages…) ne sont pas touchées.

## Captures (`captures/`)

`dashboard-clean-light.jpg`, `dashboard-premium-dark.jpg`, `patients-clean-light.jpg`, `patients-premium-dark.jpg` : AVANT au-dessus, APRÈS en dessous.

## Contrôles

`npm run typecheck` vert ; `npm test` : 208 fichiers, 1652 tests verts.
