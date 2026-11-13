# Page Équipe au niveau du tableau de bord, du Flux et des Rappels

Branche `banc/fable-fraicheur-2026-11-12`, à partir de `6dbc6fa`. Cinq commits, un par pièce, puis ce bilan. Rien n'a été poussé ni mergé, `master` n'a pas été touché. La mécanique ne change pas : mêmes rôles, mêmes accès, même création de membre, mêmes actions.

Les captures sont prises à 1440 × 900, en Clean clair et sombre, horloge figée au jeudi 12 novembre 2026 à 10 h, heure de Paris. Trois équipes :

- **réelle** : la base de test, avec 1 administrateur et 1 vétérinaire ;
- **d'essai** : 6 membres, dont 1 compte inactif, ajoutés au banc seulement ;
- **d'une personne** : l'administrateur seul.

`captures/cote-a-cote` contient les comparaisons, avant à gauche et après à droite.

## Ce qui a changé

| Commit | Pièce | Mesure |
| --- | --- | --- |
| `86d19a7` | **1. Ligne d'état.** Elle affiche jour, heure de lecture, effectif (complet, ou N sur M en poste), praticiens et soignants, accès (à jour, ou N en attente). Les règles de comptage sont celles que la page appliquait déjà. | Équipe réelle : « effectif complet · 1 praticien, 0 soignant · accès à jour ». Équipe d'essai : « 5 sur 6 en poste · 2 praticiens, 3 soignants · 1 accès en attente ». Trois tests. |
| `ff15f68` | **2. Pied des cartes.** Chaque carte se termine par un compte lu dans l'équipe. Les pastilles disparaissent, comme sur les Rappels : « ↗ 0 » se lisait comme une hausse et « ASV & internes » ne disait rien de l'état. La carte Accès passe en rose dès qu'un compte est inactif. | Lignes coupées : 7 sur 8 avant, 0 sur 8 après (équipes réelle et d'essai). 0 sur 4 pour l'équipe d'une personne. |
| `c8650c1` | **3. Icônes Heroicons seules** : bouton, menu d'actions, rôle, courriel, téléphone, pastille de statut, dialogues. Le rôle vétérinaire prend la croix cerclée, comme sa carte. | Hugeicons dans la page : 11 avant, 0 après. Tailles inchangées : icônes du menu à 16 px, bannière du dialogue à 17 px. |
| `b45e831` | **4. Annuaire.** Le bloc de titre (« Annuaire interne », « Coordination de l'équipe ») et le grand cadre qui doublait celui des fiches disparaissent. Il reste une rangée sans filet : compteur à gauche, recherche à droite. | Les fiches commencent 143 px plus haut. Plus de texte en 18 px sur la page. |
| `34c326c` | **5. Équipe réduite.** La page reste juste avec l'équipe réelle et avec une seule personne. La recherche sans résultat était le seul état encore générique : elle prend le langage de celle des Rappels, avec une ligne vraie et un bouton « Effacer la recherche ». | Au clic, la recherche s'efface et les 2 fiches reviennent. Clair et sombre : `preuves/etats-reduits.png` et `preuves/recherche-vide-clair-sombre.png`. |

## Ce qui a été mesuré

- **Contrôles** : typecheck vert ; 222 fichiers et 1 846 tests verts, dont 3 nouveaux, aucun test modifié. Lint identique à la référence sur les fichiers touchés : 0 erreur, les 2 mêmes avertissements. `vite build` vert.
- **Échelle typographique** : 12, 13, 14, 16 et 24 px. Le 18 px du titre d'annuaire a disparu avec son bloc.
- **Pixels changés** : de 4 à 15 % selon l'équipe et le thème (`preuves/pixels.txt`).

## Ce qui n'est pas prouvé

- **La vraie app** : les vérifications ont été faites dans Chromium sur le banc. Je n'ai rien testé dans Tauri ni sur le Mac.
- **Équipe d'essai** : les quatre membres ajoutés (`journee-essai.py`, complété) existent dans le banc seulement, jamais dans l'app ni dans le dépôt.

## Remarques, non traitées

- **Menu d'actions trop étroit** : ses libellés se coupent sur trois lignes (« Réinitialiser / le mot de / passe »). C'était déjà le cas avant, et ce n'est pas une des cinq pièces.
- **Icône de la bannière des dialogues** : elle mesure 0 px de large avant comme après. C'est un état préexistant du dialogue, que je n'ai pas touché.
- **Cabinet sans vétérinaire** : avec un administrateur seul, la carte affiche « Aucun vétérinaire » en bleu neutre. Je ne l'ai pas passée en ambre, car l'administrateur est souvent lui-même vétérinaire et l'alerte serait fausse.
