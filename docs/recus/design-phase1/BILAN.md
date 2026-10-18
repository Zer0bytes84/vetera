# Audit design, phase 1 : jetons, polices, correctifs rapides

Aucun commit. Vérifications : typecheck 0 erreur, ESLint 0 erreur 0 avertissement, Vitest 114 fichiers et 901 tests réussis. Captures : `avant/` et `apres/`, mêmes numéros, thème clair Premium, 1440 px.

## 1. Jetons du thème Premium (`src/design-system/premium.css`, thème clair)

| Jeton | Avant | Après |
| --- | --- | --- |
| `--ink`, `--card-foreground`, `--sidebar-foreground` | #191919 | #292929 |
| `--ink-soft`, `--text-2` | #222222, #555555 | #5D5D5D |
| `--ink-muted`, `--soft` | #666666 | #7F7F7F |
| `--ink-faint`, `--faint` | #999999 | #7F7F7F |
| `--line`, `--hairline`, `--border`, `--sidebar-border` | rgba(0,0,0,.08 / .12) | #F2F2F2 |

Barre latérale (`premium-sidebar.css`) : `--nav-ink`, `--nav-text`, `--nav-muted`, `--nav-border` pointent vers ces jetons (avant #191919, #4C4C4C, #8F8F8F). Mesuré après : texte du corps rgb(41,41,41), navigation rgb(93,93,93), titres de groupe rgb(127,127,127). Thème sombre inchangé.

Effet à valider : les contours de cartes en #F2F2F2 sur le fond #F5F5F5 deviennent presque invisibles (visible dans `apres/11-parametres.jpg`). Les champs de saisie gardent leur bordure (`--line-strong`, inchangé).

## 2. Polices codées en dur

`medical-record.css`, `care-page.css`, `hospitalisation.css` : `var(--app-font-sans)`. Dans Hospitalisation, les titres passent sur `var(--app-font-heading)`. Mesuré : dossier patient 0 texte en police système (30 avant), Hospitalisation 0 (4 avant).

## 3. Correctifs rapides

- Double « % » retiré : Clinique (« +33 % d’avancement du jour »), Finances (« taux de recouvrement ») et, même défaut trouvé en chemin, Agenda (« d’occupation »).
- « 96.5 % » devient « 96,5 % » (`formatNumber` fr-FR).
- Formateurs partagés ajoutés à `src/utils/display-format.ts` : `formatClockTime` (« 08:00 »), `formatLongDay` (« samedi 17 octobre »), `formatElapsed` (« Il y a 27 min »), `formatPersonName` (« Dr » sans point, affichage seulement, noms enregistrés inchangés). Appliqués à l’Agenda (heures, journée, en-tête du calendrier, vétérinaires), la date des en-têtes de page (tableau de bord, Paramètres), les Documents, l’Équipe, le profil, les historiques, la fiche patient et l’ordonnance imprimée. Données de démonstration : « Dr Lina Ait Salem », « Dr Karim Messaoud ».
- Onglets du dossier clinique : un seul état actif neutre (#F5F5F5, #292929, soulignement 2 px) à la place des huit couleurs. Le changement d’onglet a été vérifié.
- Widget Rappels médicaux : badge d’état masqué pendant une erreur ou un chargement ; « Voir les rappels » reste affiché.

Tests ajoutés : formateurs fr-FR, badge masqué en cas d’erreur.
