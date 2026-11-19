# Data Answer : état des lieux mesuré, gardes du harnais portées, panneau assistant, 19 novembre 2026

**Où :** branche `chantier/data-answer-2026-11-19`, worktree `~/work/data-answer-wt`, partie de master `0226fdc` (la 5.1.1). Commit local ; rien n'est poussé, fusionné ni tagué.

**Les trois demandes de ce tour :**
1. Un état des lieux mesuré de notre Data Answer.
2. Les gardes du harnais portées dans l'onglet Données avant toute nouvelle lecture, et l'affichage du panneau assistant corrigé.
3. Une proposition de première tranche (cartes, graphiques, tableaux).

**Ce qui n'est pas dans ce tour :**
- aucune nouvelle question au catalogue ;
- ni cartes ni graphiques, en attente de ta validation sur la tranche ;
- le Loading Skeleton, plus tard, comme demandé.

## 1. L'état des lieux, mesuré

**Les données :** une copie **masquée** de la base de banc. Les noms de patients et de propriétaires y sont fictifs, le vétérinaire est masqué, et le courriel, l'avatar et l'auteur des documents sont retirés (`outils/masque.py`).

**Les jeux de questions :**
- **les 374 demandes du jeu G du harnais** (11 classes de 34) ;
- **les 36 formes de dose de son équipe rouge du 15 novembre**, seules et mêlées à une question valide ;
- **les 12 questions que l'onglet propose lui-même.**

### Ce qu'il sait répondre

Quatre sujets :
- recettes et dépenses, depuis le journal de caisse ;
- rendez-vous et absences ;
- tâches ;
- patients : dossiers actifs et nouveaux dossiers.

Les périodes lues sont aujourd'hui, hier, demain, la semaine, le mois, l'année, un mois nommé et « les N derniers jours ». Aucun modèle, des sommes en centimes, chaque chiffre avec sa source.

### Comment il le rend

Pour chaque réponse : des étapes repliables, une phrase, un tableau quand il y a des lignes (filtrable au-delà de 8 lignes), puis « Ce que j'ai lu ». Ni carte de chiffre, ni graphique, ni question sauvegardée.

Sur les 12 questions proposées, 6 ont un tableau. Les 6 autres (rendez-vous du jour, absences, tâches) ne rendent qu'une phrase sur la copie de banc, faute de lignes.

### Ce que la mesure a trouvé sur master

**Les doses :**
- les 34 demandes de dose du jeu G sont refusées ;
- **26 des 36 formes de l'équipe rouge sont refusées. Mêlées à une question valide, 10 passent :** l'onglet répond à la partie valide (« recettes de ce mois 3x/j »). Aucune dose n'est jamais affichée, faute de données de dose, mais la règle « refusée avant tout » est rompue.

**Des réponses justes à une autre question que celle posée** (faux positifs silencieux), dont :

| Question posée | Ce qui est répondu |
|---|---|
| « qui a gagné le match hier » | les recettes d'hier |
| « recette de couscous » | 31 500 DA de recettes |
| « on est chargés demain » | les dépenses de demain |
| « qui on voit ce matin en consultation » | les rendez-vous des **30 derniers jours** |
| « dossier medical Hercule », « Rafale c'est le chien de qui » | « 16 dossiers actifs » |
| « protocole de vermifugation chien adulte » | « 16 dossiers actifs » |
| **« rendez-vous d'après-demain »** | **ceux de demain** : « après-demain » contient « demain » |
| 17 « rendez-vous de X » où X n'est pas un patient de la base | les rendez-vous de **tout le cabinet** |

L'équipe rouge en a ajouté beaucoup, toutes avérées. Les filtres sont ignorés : « combien de chats » compte tous les patients, « recettes en espèces » tous les moyens de paiement, « tâches urgentes » toutes les tâches. Les périodes sont mal lues : « novembre dernier » donne le mois en cours, « la semaine d'après » cette semaine, « demain soir » la journée entière.

## 2. Les gardes du harnais, portées

### a. Le principe d'abstention : on ne répond qu'à une question comprise en entier

`vocabulary.ts`, nouveau. Chaque mot de la question doit être compté :
- une période que le moteur lit ;
- un sujet, ou un filtre que le moteur **applique vraiment**, et pour le seul sujet qui l'applique (« en retard » vaut pour les tâches, pas pour les rendez-vous) ;
- le nom d'un patient de la base ;
- un mot sans sens propre (articles, « combien », « svp »).

Un seul mot de reste et la question est refusée, avec ce mot nommé : « Je n'ai pas compris « chats »… ».

**Les refus propres à cette garde :**
- deux périodes dans la question (« hier et aujourd'hui ») ;
- un patient dont le nom est aussi un mot du vocabulaire (« Mars », « Hier », « Midi ») : je demande « le patient Mars » ;
- une autre écriture que l'alphabet latin, ou un emoji, qui disparaîtraient à la normalisation.

**La raison :** une suite de motifs qui cherchent un sujet et ignorent le reste laissera toujours passer une question voisine. C'est la règle d'abstention du harnais : un refus est un échec sûr, une réponse à une autre question ne l'est pas.

### b. Les doses

- La garde reçoit les formes que l'équipe rouge a fait passer et qui sont une dose quoi qu'il y ait autour : « 3x/j », « toutes les 8 heures », « multiplie par le poids », « milligrammes », « 20 m g », « demi-dose », les unités en caractères cyrilliques ou arabes. Le texte est aussi normalisé (NFKC, caractères invisibles retirés).
- Le reste (« cachet », « pipette », « combien d'amoxicilline ») est refusé comme non compris.
- **Ce que j'ai retiré en route :**
  - le détecteur `containsDosage` du harnais, essayé puis retiré : il refusait « dépenses administratives des 3 derniers mois » comme une dose ;
  - les mots « cachet », « pipette » et « cuillère », retirés pour la même raison (« cachet de la clinique »).

### c. Les corrections de lecture

- « après-demain » est le surlendemain.
- Les moments du jour (« ce matin », « cet aprem », « ce soir ») sont refusés.
- « chargé(s) », avec l'accent tapé, est « occupé », pas « les charges ».
- « gagné » ne vaut « recettes » qu'avec « combien » ou une période.
- « recette » au singulier ne compte qu'avec une période.
- Une question sur les patients qui nomme un patient est refusée, puisque le comptage ignorerait ce patient.
- « vermifugation » et « déparasitage » rejoignent les rappels.

### d. La porte de lecture

`read-port.ts` reprend celle du harnais, et `clinic-reads.ts` est le lecteur de l'onglet.
- Chaque question lit toutes les tables dont elle peut répondre **en un seul instantané** (`BEGIN DEFERRED … COMMIT`), par une connexion gardée qui ne laisse passer qu'un `SELECT` ou un `WITH`. Toute autre instruction est refusée avant SQLite.
- Le compteur de modifications de SQLite (`total_changes()`) est lu au début et à la fin : s'il a bougé, rien n'est répondu.
- Les instructions et la mise en forme des lignes sont **celles des magasins** (`tableReadSql`, `mapTableRow`, `selectInvoices`, sorties sans changement de comportement) : les réponses ne changent pas, seule la porte change.
- **Le reçu s'affiche sous chaque réponse,** dans « Ce que j'ai lu » : « Porte de lecture du harnais · N requêtes · 0 écriture ». Dans le navigateur, ce sont des copies (« aucune écriture possible »).
- **La seule écriture reste la carte « Valider ».** Elle déduplique maintenant contre les tâches de la base au moment de la réponse, et contre celles du magasin.

### Les preuves

**Le jeu G du harnais rejoué** (374 demandes) :

| | Avant | Après |
|---|---|---|
| Réponses | 54 | 6 |
| Faux positifs silencieux parmi elles | 48 au moins, tous vérifiés | 0 |

Les 6 réponses qui restent sont « rendez-vous d'après-demain » ou de demain, correctes.

**Les formes de dose :** 36 sur 36 refusées, seules et mêlées (avant : 26 et 26).

**Les sondes de l'équipe rouge du 19 novembre :**
- **160 sur 160 refusées,** et les 41 questions du catalogue toujours répondues ;
- ce rejeu est un test de la suite ordinaire (`red-team-replay.test.ts`), et aussi `harness-guards.test.ts` et `clinic-reads.test.ts`, sur une base migrée en mémoire.

**Les 12 questions proposées par l'onglet :** réponses identiques avant et après.

**Le coût :** des questions autrefois répondues sont maintenant refusées. Toutes celles que j'ai mesurées répondaient à autre chose. Mais une tournure juste que le vocabulaire ne connaît pas sera refusée aussi : c'est le prix de la règle, à surveiller à l'usage.

## 3. Le panneau assistant

### La cause, mesurée

Après une question, l'onglet ramenait la question en haut de la vue avec `scrollIntoView`. Or cette fonction fait défiler **tous** les conteneurs, y compris le corps du panneau, en `overflow: hidden`, qu'un script peut faire défiler. Mesuré à 1440 × 900 et à 1120 × 640 :
- **l'en-tête du panneau monte à −121 px,** hors de la fenêtre, avec le bouton Fermer ;
- **un vide de 121 px apparaît sous le champ.**

C'est ta capture : l'en-tête hors champ, le premier contenu visible en pleine table des paiements.

### La correction

- **Le défilement :** seul le fil défile (`scrollTo`). Le panneau et son corps passent en `overflow: clip`, avec `hidden` en repli pour un WebKit antérieur à Safari 16. Un conteneur en `clip` ne peut pas être défilé, même par un script.
- **Le mouvement :** la nouvelle question monte en haut du fil, l'en-tête reste ancré.
- **Le dégradé** en maille (trois halos) est retiré.
- **La finition :**
  - une bande grise ancrée au bord droit, sans trait ni ombre ;
  - le coin à 22 px, concentrique aux panneaux de 16 px ;
  - les panneaux blancs, déjà présents dans le panneau, sont gardés.
- **La fermeture :**
  - le bouton Fermer est toujours visible ;
  - Échap ferme le panneau quand le focus est sur l'un de ses contrôles, avec la même vérification que le bouton : une note non enregistrée demande d'abord ;
  - Échap reste au champ de saisie, aux menus, aux listes et aux fenêtres, et pendant une composition de saisie.
- **Le champ :** après chaque réponse, le focus revient au champ, et une double validation est ignorée.

**Mesuré après,** aux deux tailles et en clair et sombre : en-tête à 0 px après chaque question, bouton Fermer visible, aucun conteneur défilé, ni dégradé ni ombre ni bordure.

**Les captures :** `avant/` et `apres/`, à 1440 × 900 et en `petite-` à 1120 × 640 ; l'onglet ouvert, puis après une et deux questions.

## 4. Proposition de première tranche (cartes, graphiques, tableaux)

La référence de Yuri a des cartes de chiffre (grande valeur, pastille de variation, mini-courbe), des graphiques (aires et lignes, axe du temps, légendes en pastilles) et des tableaux (filtre, colonnes triables, colonne de variation), avec les questions sauvegardées et les sources. **Chaque extension a ses chiffres, ses refus et son oracle**, question par question.

**Tranche 1, sans nouvelle lecture.** Les chiffres sont déjà calculés et vérifiés ; seule leur présentation change.

1. **Recettes et dépenses d'une période :**
   - trois cartes : Encaissé, Dépensé, Solde net ;
   - une aire des encaissements par jour sur l'axe du temps ;
   - le tableau du journal avec ses colonnes triables.
   - **Oracle :** la somme des points de la courbe égale la carte et le total du tableau, au centime. `verifyAnswer` est étendu à la courbe, sur le modèle de ce qu'il fait déjà pour le tableau.
2. **Rendez-vous d'une période :**
   - quatre cartes : Rendez-vous, Terminés, Annulés, Absences ;
   - des barres par jour ;
   - le tableau.
   - **Oracle :** le tableau de bord (déjà rapproché) et la somme des barres.
3. **Patients :**
   - deux cartes : actifs, nouveaux ;
   - des barres par espèce à partir du tableau existant.
   - **Oracle :** le tableau de bord.
4. **Tâches :**
   - trois cartes : ouvertes, en retard, sans échéance ;
   - le tableau.

**Tranche 2, avec une lecture nouvelle :** la pastille de variation et la mini-courbe. Il faut comparer à la période précédente de même longueur, ce que le catalogue refuse aujourd'hui. Sa règle de comparaison et son oracle sont à poser avant : même moteur sur la période décalée, puis rapprochement avec le tableau de bord.

**Hors tranche, à décider :**
- les questions sauvegardées ;
- les sources à gauche : le panneau est étroit, je propose les sources en tête de réponse plutôt qu'en colonne.

La finition suivrait le standard : bandes grises, panneaux blancs, rayons concentriques, ni trait ni ombre, Heroicons 20 pleines. **Les cartes de chiffre sont prévues au banc UI SDK** (ta demande du jour) avant d'entrer ici.

## 5. Contrôles

- typecheck 0, lint `--max-warnings=0` 0 ;
- la suite complète : **2 186 tests verts sur 2 186**, 235 fichiers (relancée après les dernières corrections) ;
- `tests/modules/assistant-answers` : 147 tests verts, dont les trois nouveaux fichiers.

## 6. Ce qui n'est pas prouvé, et ce qui est à décider

**1. L'app de bureau n'a pas été lancée.**
- La lecture par SQLite natif (l'instantané, le compteur de modifications) est prouvée sur une base migrée en mémoire, pas dans Tauri.
- Dans le navigateur, l'onglet lit les copies du navigateur.

**2. Le temps d'une question sur une grande base n'est pas mesuré.** Chaque question relit 7 tables en entier, plus les factures, par le pont natif. La file SQLite est tenue pendant ce temps : sur une très grosse base, les écritures de l'app attendent. Avant, les magasins gardaient les lignes en cache.

**3. Le compteur `total_changes()` ne voit que cette connexion.**
- Une écriture du journal d'audit faite hors de la file (`auditService`), au même moment, ferait refuser la lecture à tort. La ligne d'audit, elle, est gardée.
- Les écritures d'autres postes relèvent de l'instantané, pas du compteur.

**4. La carte « Valider » reste une écriture, et ton brief dit « aucune écriture ».**
- Je ne l'ai pas retirée : ce serait retirer une fonction.
- **À trancher :** la garder (une écriture que le vétérinaire valide), ou la retirer de l'onglet.

**5. Échap :**
- il ne ferme pas depuis le champ de saisie, par choix ;
- il ne ferme pas quand le focus est sur la page sous le panneau ;
- une seule pression ferme le panneau quand le focus est sur l'un de ses contrôles.

**6. Les refus nouveaux.** Une tournure correcte absente du vocabulaire est refusée. Le message nomme le mot ; le vocabulaire s'élargit mot par mot, chacun avec le filtre qu'il applique.

**7. Le reste :**
- les thèmes autres que Clean ne sont pas mesurés ;
- l'arabe et les autres langues sont refusés par principe.
