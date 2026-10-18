# Audit design, phase 2 : échelle typographique

Aucun commit. Vérifications : typecheck 0 erreur, ESLint 0 erreur 0 avertissement, Vitest 115 fichiers et 902 tests réussis. Captures : `avant/` et `apres/`, mêmes numéros, thème clair Premium, 1440 px.

## Mesure à l’écran (textes visibles hors échelle 12 / 13 / 14 / 16 / 18 / 24)

| Page | Avant | Après |
| --- | --- | --- |
| Tableau de bord | 40 | 0 |
| Patients | 24 | 0 |
| Dossier patient | 4 | 0 |
| Agenda | 57 | 0 |
| Clinique | 27 | 0 |
| Rappels | 9 | 0 |
| Documents | 6 | 0 |
| Produits | 48 | 0 |
| Finances | 9 | 0 |
| Équipe | 11 | 0 |
| Paramètres | 22 | 0 |
| Dialogue Nouveau patient | 35 | 0 |

Le comptage « avant » incluait une douzaine d’émojis (choix d’avatar, mascotte) ; ils sont exclus du comptage « après » car ce sont des images, pas du texte.

## Ce qui a changé

- `src/design-system/type-scale.css` : utilitaires `t-12`, `t-13`, `t-14`, `t-16`, `t-18`, `t-24` déclarés avec `@utility` (les variantes comme `md:t-18` fonctionnent). `cn()` les reconnaît comme tailles de police (`src/lib/utils.ts`), donc une taille passée par un composant parent remplace bien la taille par défaut.
- Composants : 595 tailles libres remplacées (`text-[11px]` → `t-12`, etc.), plus les tailles en rem des composants partagés (bouton petit, badge, bascule, calendrier) et les tailles Tailwind hors échelle sur les écrans visibles (`text-xl`, `text-3xl`…).
- CSS : 117 déclarations ramenées sur l’échelle (tableaux 13,5 → 13, en-têtes de colonnes 11 → 12, titres de page 26 → 24, titres de dialogue 25 et 27 → 24, titre Paramètres 36 → 24, sections Paramètres 23 → 18, titres de carte 15 → 16).
- Chiffres clés : 32 → 24 partout (cartes de synthèse, tableau de bord, statistiques). Aucun besoin d’un pas « affichage » plus grand n’est apparu : le libellé reste en 13 et le chiffre en 24, la hiérarchie tient.
- Graduations des graphiques : 10 et 11 → 12.
- Test de garde `tests/type-scale.test.ts` : échoue si une taille libre hors échelle réapparaît.

## Laissé volontairement hors échelle

- Mises en page imprimées A4 (ordonnance, fiche d’hospitalisation) : tailles pensées pour le papier, le passage à 12 px risquerait de déborder d’une page.
- Écrans de première installation et de connexion (titres d’accueil), hors périmètre de l’audit.
- Émojis et glyphes (choix d’avatar, initiales des avatars, logo).

## Effets visibles à noter

- Tableau de bord, carte Trésorerie : la ligne « Solde net … Dépenses : 2 950 DA » passe sur deux lignes (12 px au lieu de 11).
- Dialogue Nouveau patient : le sous-titre « Coordonnées et rattachement du contact. » passe sur deux lignes.
- Paramètres : « Modèles de documents » reste sur deux lignes dans le menu (déjà le cas avant, point de l’audit).

Vérification de compilation CSS faite par un build frontend local (`vite build` dans `dist/`, ignoré par git) ; aucun build Tauri.
