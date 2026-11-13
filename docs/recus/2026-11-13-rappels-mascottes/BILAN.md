# Rappels, « À traiter » sous le graphique, nouvelles mascottes

Branche `banc/fable-fraicheur-2026-11-12`, à partir de `cb42993`. Sept commits et ce bilan. Rien n'est poussé ni mergé, `master` n'est pas touché.

Captures à 1440 × 900, thème Clean en clair et en sombre, horloge figée au jeudi 12 novembre 2026 à 10 h (heure de Paris), base de test réelle :

- `captures/avant` et `captures/apres` : les écrans ;
- `captures/cote-a-cote` : avant à gauche, après à droite ;
- `preuves/` : zooms et mesures.

## Ce qui a changé

| Commit | Ce qui change | Mesure |
| --- | --- | --- |
| `df3e525` | **Rappels, bande des chiffres clés.** Elle lit l'état comme « À traiter » : rose en retard, ambre pour ce qui est dû aujourd'hui, vert à zéro, bleu pour « À venir ». La rangée irrégulière de pastilles « À jour » (2 cartes sur 4) disparaît. Le sous-titre date la lecture (jour, heure, retard). Plus d'ombre de contact sous les panneaux. | Les rappels d'essai font passer les cartes au rose et à l'ambre, avec « 1 en retard » au sous-titre. |
| `89f171b` | **Tableau de bord** : « À traiter » descend sous le graphique Recettes et activité. Rien d'autre ne change. | Captures après, en clair et en sombre (`captures/apres/*-tableau-de-bord-a-traiter-sous-le-graphique*`). |
| `7c384ba` | **Rappels, rangée du nouveau rappel** dans le langage des bandes : cadre de 6 px, panneau de 16 px, détails sur un second panneau, les deux filets en moins. Les libellés des détails passent à 12 px medium, comme ceux de la rangée. | Fermée et ouverte, avant et après : `preuves/rappels-rangee-avant-apres.png`. CSS seulement. |
| `3ea300c` | **Rappels, filtres** : En cours, À venir, Terminés et Rappels du jour passent en segments, comme Tous, Manuels, Médicaux. Le filet sous la barre disparaît. | La barre passe de 3 lignes (100 px) à 1 ligne (32 px). Les deux groupes ont le même fond, un rayon de 8 px et une hauteur de 32 px. |
| `92d5ed5` | **Rappels, « Rien à traiter »**, composé comme la journée vide du Flux. Il contient le prochain rappel ouvert (avec un lien vers À venir ou Terminés), les rappels ouverts par origine, ceux des 7 prochains jours, les terminés, et deux gestes existants : Nouveau rappel et Rappel médical. Une recherche sans résultat garde une ligne et un bouton pour l'effacer. | 3 tests de modèle. Au clic : Nouveau rappel met le curseur dans la rangée, Rappel médical ouvre le même dialogue que la bande, et le lien change d'onglet. |
| `67fe82d` | **Rappels, Heroicons seules** : rangées, bouton Détails, barre de sélection, panneau médical, et les contrôles partagés de la page (liste déroulante, recherche, sélecteur de type). Toutes les icônes ont une taille explicite. | Zone principale : avant, 10 Lucide et 8 Hugeicons, dont 5 dans l'en-tête. Après, 1 Lucide et 5 Hugeicons, toutes dans l'en-tête. La coche du sélecteur de type mesure 16 × 16. |
| `a755f88` | **Mascottes** : chouette, âne et furet s'ajoutent au sélecteur, aux deux endroits (Paramètres › Apparence et fenêtre de la barre latérale), après les douze. Le chien reste le compagnon par défaut. | Le regard suit le pointeur avec la même amplitude que le chien (±1,9 px), et chacune a cligné dans les 8 s. Le SVG des douze existantes est identique avant et après (`preuves/empreintes-*.txt`). |

## Ce qui a été mesuré

- **Typecheck, tests, build** : typecheck vert ; 221 fichiers de test et 1 843 tests verts, dont 5 nouveaux ; `vite build` vert. **Un test modifié** : « douze compagnons » devient « quinze ». C'est l'ajout demandé, et le test vérifie aussi que le chien reste le défaut.
- **Lint** : identique à la référence, avertissement pour avertissement (0 erreur, 6 avertissements `react-hooks/todo` déjà connus).
- **Échelle typographique des Rappels** : 12, 13, 14, 18 et 24 px, sans autre taille. Le 16 px de l'ancien titre vide passe à 14, comme les titres de bande.
- **Pixels changés sur les Rappels** : de 9 à 36 % selon le thème et les données (`preuves/pixels.txt`).

## Ce qui n'est pas prouvé

- **La vraie app** : tout a été vérifié dans Chromium sur le banc, ni dans Tauri, ni sur le Mac.
- **Rappels médicaux** : ils se lisent par SQLite natif. Sur le banc, aucun n'est ouvert : les cartes et l'état vide ne les comptent pas, et je n'ai pas vu de rangée médicale ouverte avec ses nouvelles icônes.
- **Données d'essai** : les 6 rappels manuels de la base sont tous terminés. Les états rose, ambre et « Prochain rappel » viennent de **quatre rappels d'essai ajoutés au banc seulement** (`outils/journee-essai.py` du chantier précédent, complété), jamais dans l'app ni dans le dépôt.
- **Qualité des trois mascottes** : mon avis du round 2 tient. La chouette et le furet se lisent à la taille de la barre latérale ; l'âne est correct mais proche du cheval.

## Écarts et décisions

- **Contrôles partagés** : la liste déroulante, la recherche et le combobox ont changé d'icônes pour toute l'app, pas seulement pour les Rappels. C'est le même choix que pour le calendrier au chantier précédent.
- **Ligne de section « Votre petit compagnon »** : son icône reste Lucide. Je n'ai rien touché d'autre dans les Paramètres.
- **Fenêtre de la barre latérale** : trois colonnes, donc « Logo classique » reste seul sur sa ligne. C'était déjà le cas avec douze.
