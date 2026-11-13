# Tableau de bord et Flux : hiérarchie, lisibilité, vide

Branche `banc/fable-fraicheur-2026-11-12`, partie de `65a7c2f`. Six propositions, un commit chacune, plus ce bilan. Rien n'a été poussé ni mergé, et `master` n'a pas été touché.

Captures à 1440 × 900, thème Clean en clair et en sombre, horloge figée au jeudi 12 novembre 2026 à 10 h (heure de Paris), base de test réelle convertie pour le navigateur. `captures/avant` et `captures/apres` contiennent les images pleine taille, `captures/cote-a-cote` les planches (avant à gauche, après à droite) et `preuves/` les zooms et les mesures.

## Verdict honnête

- **Tableau de bord : mieux, et ça se voit.** Les anomalies du jour sont maintenant en tête de page, et chaque chiffre est un bouton qui ouvre la page où l'action se fait. Avant, elles n'apparaissaient qu'en bas de page, à environ 2 200 px, sous la forme d'un graphique non cliquable. Entre 33 et 44 % des pixels changent.
- **Flux : mieux sur une journée vide ou légère**, et ce défaut était le principal. Sur une journée pleine, seule la hauteur des colonnes change (1,3 à 1,9 % des pixels). Je n'ai rien proposé d'autre sur la journée pleine, faute de mieux que l'existant.

## Les propositions

| Commit | Ce qui change | Mesure |
| --- | --- | --- |
| `6893d75` | **« À traiter » en tête** : soins en retard, visites à clore, rappels échus, factures en retard, séjours à surveiller. Mêmes cartes que les Chiffres clés. Un clic ouvre Soins, Agenda, Rappels médicaux ou Finances. Le filtre **En retard / Tout l'ouvert** change les comptes. Une source illisible affiche « — », jamais 0. Sans hospitalisation au cabinet, la carte Hospitalisés disparaît. | 6 tests de modèle. Sur la journée d'essai, « Visites à clore » passe de 2 (en retard) à 5 (ouvert). Le clic sur Factures mène à `#/finances`. |
| `bdd0395` | **Heroicons seules** sur le tableau de bord : pastilles d'écart, flèches, vues du graphique, en-têtes de widgets, calendrier, invitation, choix de vue. | Audit des icônes de la zone principale : 22 Lucide et 5 Hugeicons avant, 1 Lucide (« Actions rapides » dans l'en-tête de l'app) et 0 Hugeicons après. |
| `71d967b` | **Chiffres clés sans entrée** : la cascade (glissé de 6 px, 50 ms d'écart par carte) disparaît. Le survol fonce le fond de 3 %, l'appui de 5 %, en 150 ms. | Image par image : avant, les cartes restaient invisibles environ 450 ms après leur montage et n'étaient pleinement lisibles qu'au bout d'environ 790 ms. Après, elles sont là dès la première image. |
| `9b1dc62` | **Contraste de fonds seuls** : je retire la maille bleu-indigo de l'invitation au tour (ma proposition du round 2, annulée) et l'ombre de contact des panneaux sur le tableau de bord. | Sur les 8 bandes : cadre de 6 px, rayons de 22 et 16 px, 0 bordure, 0 ombre (`preuves/cadres-mesures.txt`). |
| `fa7b267` | **Flux, colonnes sur toute la hauteur** : la page occupe la vue et les colonnes descendent jusqu'aux raccourcis. Une colonne vide le dit en une ligne, sans cadre en pointillés. | Colonnes de 180 px avant, 671 px après. Blanc sous les raccourcis : 523 px avant, 32 px après (la marge basse de la page). |
| `e43d02f` | **Flux, journée sans visite** : à la place de « Prévus aujourd'hui » et sur la grille des cinq colonnes, le prochain rendez-vous (jour, heure, patient, motif, vétérinaire, lien vers l'agenda), le résumé du jour (visites, annulés, absences, encaissé, rendez-vous des 7 prochains jours) et deux gestes qui existent déjà : Arrivée sans RDV et Nouveau rendez-vous. | 4 tests de modèle. Au clic : Arrivée sans RDV ouvre « Arrivée sans rendez-vous », Nouveau rendez-vous ouvre le formulaire dans l'Agenda, Ouvrir l'agenda mène à `#/agenda`. |

Les règles de comptage viennent toutes du code existant (vue Soins, graphique Alertes, Créances, agenda, journal). Aucune n'est nouvelle.

## Ce qui a été mesuré

- **Échelle typographique** : relevé de tous les textes visibles. Tableau de bord et Flux, avant comme après : 12, 13, 14, 16, 18 et 24 px, rien d'autre. Le tableau de bord la tenait déjà, donc je n'ai pas fait de commit de typographie.
- **Contrôles** : typecheck vert. Tests : 220 fichiers et 1 836 tests verts, dont 10 nouveaux, aucun test existant modifié. Lint des fichiers touchés identique à la référence (0 erreur, les 6 mêmes avertissements `react-hooks/todo`). `vite build` vert.
- **Pixels** : `preuves/pixels.txt`.

## Ce qui n'est pas prouvé

- **La vraie app.** Tout a été vérifié dans Chromium sur le banc, pas dans la fenêtre Tauri, et pas sur le Mac.
- **Soins, rappels médicaux et séjours** sont lus par SQLite natif, que le navigateur n'atteint pas. Sur le banc, « Soins » affiche donc « — » (chargement impossible), et Rappels et Hospitalisés affichent 0. Les règles sont couvertes par les tests, mais l'affichage sur tes vraies données reste à voir dans l'app.
- **La base de test est presque vide** : aucun impayé, aucun rendez-vous à venir. Sur les vraies données, la bande ne montre que des zéros en vert. Pour prouver que le filtre change l'écran, j'ai ajouté **six rendez-vous d'essai dans le banc seulement** (`outils/journee-essai.py`, jamais dans l'app ni dans le dépôt). Les planches « journée chargée » et `preuves/a-traiter-filtre-statut-journee-essai.png` en viennent.
- **Le ressenti du survol en sombre** : 3 % de blanc sur un gris foncé, visible au zoom. À juger à l'œil.

## Écarts au brief, et décisions à prendre

- **Périodes** : j'ai gardé Aujourd'hui, 7J, 30J, 90J et 12M (périodes glissantes) au lieu d'« Aujourd'hui, cette semaine, ce mois » (semaine et mois calendaires). Passer au calendaire change le calcul des Chiffres clés et de leurs comparaisons, ce qui est une mécanique. Ces filtres sont déjà branchés. Dis-moi si tu veux le calendaire.
- **Filtre par type d'alerte** : il existe déjà, c'est la légende du graphique Alertes (chaque type s'allume ou s'éteint). Dans la bande « À traiter », chaque carte est elle-même un type, donc je n'ai pas ajouté de second filtre.
- **En-tête de l'app** : ses icônes restent en Hugeicons (`toolbar-icon.tsx` est une famille choisie pour tout l'en-tête), plus une Lucide dans « Actions rapides ». C'est le cadre commun à toutes les pages, donc je n'y ai pas touché.
- **Flux et Heroicons** : je n'ai rien converti. Les glyphes d'espèce et le stéthoscope n'existent pas chez Heroicons : la règle ne peut pas y être tenue sans perdre de l'information.
- **Stock** : il n'est pas dans la bande, parce que le brief ne le cite pas. Il reste dans le graphique Alertes, qui le compte.

## Reproduire

Les scripts sont dans `outils/` : `shots.mjs` (captures), `statut.mjs` (filtre et clic), `entree.mjs` (cartes image par image), `survol.mjs`, `vide.mjs` (hauteurs du Flux), `tailles.mjs`, `icones.mjs`, `cadre.mjs`, `clics-flux.mjs` et `regles.mjs` (règle CSS gagnante). La référence tourne sur le port 5198 (`65a7c2f`), la branche sur 5199. `FIXED` fixe l'heure du banc, `BASE` choisit le magasin. Les deux worktrees partagent `node_modules/.vite` par le lien symbolique : si une page renvoie 504 « Outdated Optimize Dep », relance son serveur avec `--force`.
