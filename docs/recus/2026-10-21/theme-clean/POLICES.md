# Thème Clean : polices

Date : 21 octobre 2026. Commit local, aucun push.

## Ce qui change, dans Clean seulement

- **Inter** pour l'interface, le corps et les titres : c'est la police de Linear (étude, § 1.1 : « Inter Variable partout »).
  - Jetons : `--clean-font-ui` pour l'interface et le corps ; `--clean-font-heading`, qui vaut `--clean-font-ui`, pour les titres.
- **Interlettrage resserré de Linear sur les titres** :
  - `--clean-tracking-title` vaut -0,022 em, pour les titres de page et l'accueil ;
  - `--clean-tracking-heading` vaut -0,015 em, pour les titres de section et de carte.
- **Chiffres tabulaires** (`tabular-nums`) pour les montants et les tableaux : tableaux, valeurs des indicateurs, faits de « Cette semaine » et graduations du graphique. Les colonnes de chiffres s'alignent.
- **Premium ne bouge pas :** la règle Geist et Space Grotesk reste celle de Premium. Les empreintes de rendu sont identiques à la référence :
  - Premium clair : Patients `465:6f8890fa`, tableau de bord `670:4b2a9820` ;
  - Premium sombre : Patients `464:155e0011`, tableau de bord `669:3465a8e0`.

## Déclinaison mixte, pour trancher

La déclinaison mixte garde Inter pour l'interface et le corps, et Space Grotesk pour les titres : c'est la signature Baitari. Elle se règle par une seule valeur :
- `--clean-font-heading: "Space Grotesk Variable", …` dans `clean.css` ;
- par défaut, `--clean-font-heading` vaut `var(--clean-font-ui)`, c'est-à-dire Inter.

La capture `polices/clean-mixte-tableau-de-bord.jpg` a été faite en surchargeant ce seul jeton dans le navigateur de capture. Rien de tel n'est livré.

**Ce que montrent les captures :** Inter est plus large que Geist, et quelques détails d'indicateurs passent sur deux lignes au lieu d'une.

## Captures (`polices/`)

- **`police-tableau-de-bord`, `police-patients`, `police-dossier` :** Clean Geist et Clean Inter, côte à côte.
- **`police-trois-declinaisons` :** le tableau de bord en Geist, en Inter et en mixte.
- **`police-gros-plan-titres` :** l'accueil et les indicateurs dans les trois déclinaisons, en gros plan.
- **`clean-mixte-tableau-de-bord` :** la déclinaison mixte en pleine taille.

## Vérifications

- Vitest : 150 fichiers, 1 132 tests verts.
- La charte gagne 3 tests de police par thème :
  - Geist et Space Grotesk dans Premium ;
  - Inter dans Clean, pour les cinq jetons de police ;
  - l'interlettrage des titres et les chiffres tabulaires.
- Typage : 0 erreur.
- ESLint : 0 problème.
