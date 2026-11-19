# Data Answer, tranche 1 : cartes, graphiques et tableaux triables, sans nouvelle lecture, 19 novembre 2026

**Où :** branche `chantier/data-answer-2026-11-19`, worktree `~/work/data-answer-wt`, au-dessus des gardes et du panneau (`03873c5`, `59c57ae`). Commit local, rien n'est poussé, fusionné ni tagué.

**La décision :** la tranche 1 pour les quatre sujets, sans nouvelle lecture, avec les oracles posés ; les cartes de chiffre écrites à la main, sur le dessin mis au point au banc UI SDK (ui-sdk n'entre pas) ; le reflet pour les squelettes, Message pour les réponses de l'assistant.

## 1. Ce qui change à l'écran

**Chaque réponse montre maintenant, sous sa phrase :**
- **des cartes de chiffre**, dans une bande grise, deux par ligne dans le panneau (quatre au-delà de 44rem) ;
- **un graphique** sur un panneau blanc, sans ligne de base ni grille : une aire (caisse) ou des barres (rendez-vous, nouveaux dossiers, espèces), les légendes en pastilles, trois dates sous l'axe ;
- **le tableau, dont chaque colonne se trie** : les dates par leur heure, les montants et les nombres par leur valeur.

| Sujet | Cartes | Graphique |
|---|---|---|
| Recettes et dépenses | Encaissé (ton positif), Dépensé (négatif), Solde net, Lignes | aires Encaissé et Dépensé, par jour, semaine ou mois |
| Rendez-vous | Rendez-vous, Terminés (positif), Annulés, Absences (négatif) | barres par jour, semaine ou mois |
| Absences seules | Absences (négatif) | barres « Absences » |
| Nouveaux dossiers | Dossiers créés | barres par jour, semaine ou mois |
| Dossiers actifs | Dossiers actifs, Dossiers au total | barres par espèce, les sept premières et « Autres » au-delà de huit |
| Tâches | Tâches, En retard (négatif), Sans échéance | aucun |

**La carte de chiffre** (`src/components/ui/stat-card.tsx`), écrite à la main :
- un groupe nommé par son libellé, la valeur en 24 px (le plafond de l'échelle typographique), l'unité plus petite ;
- **le ton métier** : un point coloré devant le libellé, vert pour une bonne nouvelle, rouge pour une mauvaise ;
- une variation éventuelle dite en mots aux lecteurs d'écran, en texte caché plutôt qu'en `aria-label` (non lu sur un `span`). Aucune variation n'est montrée en tranche 1.

**Le Loading Skeleton** (`src/components/ui/loading-skeleton.tsx`), écrit à la main :
- les deux variantes, Message et Cards, avec l'effet reflet ;
- une région `status` nommée et occupée, ses formes cachées aux lecteurs d'écran ;
- la géométrie de Cards reprend celle de la carte, ligne pour ligne.
- **Dans l'onglet Données,** Message s'affiche quand une lecture dure plus de 120 ms. La fin est annoncée une fois (« Réponse affichée ») par une région d'annonce partagée, nouvelle (`src/lib/announce.ts`).
- **Pour le tableau de bord,** Cards est prêt mais pas encore branché : voir le § 5.

## 2. L'oracle : les cartes et le graphique ne lisent rien

**Le principe :** les cartes et le graphique ne font que montrer ce que le moteur calcule déjà.
- **Une carte nomme un chiffre de la réponse.** Elle ne porte aucun nombre à elle.
- **Une série vient des lignes du tableau.** Elle est rangée par jour local, avec le même lecteur de dates que le filtre de période.

**`verifyAnswer`, la dernière garde avant l'écran, ajoute deux contrôles :**
1. **Il refait les cartes et le graphique à partir des chiffres et du tableau,** et les exige identiques : point pour point, libellé pour libellé, ton pour ton. Un point déplacé d'un jour, une série rattachée à un autre chiffre ou un ton inversé : la réponse est refusée.
2. **Indépendamment de ce calcul,** chaque série doit faire exactement la somme de son chiffre, au centime, sans point négatif. Ce chiffre est lui-même rattaché au tableau, comme avant.

**La conséquence :** le graphique, les cartes, la phrase et le tableau ne peuvent pas se contredire. Si l'un s'écartait, l'écran afficherait « je n'affiche pas cette réponse ».

**Le découpage du temps se fait en jours de calendrier,** jamais par tranches de 24 heures :
- jusqu'à 62 jours, un point par jour ;
- jusqu'à 182 jours, par semaine, comptées depuis le dernier jour pour que la dernière soit entière ;
- au-delà, par mois.

## 3. Les preuves

**Les tests d'oracle** (`tests/modules/assistant-answers/presentation.test.ts`, 12 cas) :
- les sommes au centime pour les recettes, les recettes seules, les rendez-vous, les absences, les espèces avec « Autres » ;
- les semaines et les mois sur des périodes longues (90 jours, année dernière, 731 jours) ;
- le découpage sans trou ni recouvrement pour 1, 2, 30, 62, 63, 92, 182, 183 et 731 jours ;
- les falsifications refusées : un point retouché ou déplacé, une carte inventée, un point négatif, une série rattachée ailleurs, un ton inversé, les cartes absentes.

**Les fuseaux horaires :**
- toute la suite de l'onglet passe dans **sept fuseaux** : Paris, Alger, New York, Beyrouth, Santiago, Le Caire, La Havane ;
- **le balayage d'une année** dans les fuseaux où l'heure change à minuit (§ 4) ne refuse aucune réponse ;
- **ce test attrape bien le défaut :** remis à l'ancienne façon, en tranches de 24 heures, il échoue sous Beyrouth et Santiago (vérifié, puis rétabli).

**Les composants** (`tests/components/stat-card-skeleton.test.tsx`) :
- la carte : le groupe nommé, le ton, la variation en texte caché ;
- les deux squelettes : région `status` nommée et occupée, toutes les formes cachées ;
- la région d'annonce : créée une fois, polie, vidée puis écrite.

**Dans l'app assemblée comme la release** (navigateur, copie masquée de la base, clair et sombre), une question par sujet :
- les cartes égalent la phrase ;
- le graphique porte les mêmes totaux ;
- chaque colonne du tableau se trie au clic (`aria-sort` posé) ;
- aucune erreur dans la console.

Captures dans `captures/` : le panneau, les cartes et le graphique de chaque sujet, en clair et en sombre.

**Les contrôles :** typecheck 0, lint `--max-warnings=0` 0, **2 205 tests verts sur 2 205**.

## 4. L'équipe rouge

Une relecture indépendante, avec des sondes de fuseau, de période et de falsification.

**Ce qu'elle a vérifié :** aucun chiffre affiché ne contredit son tableau ni sa phrase à Paris, Alger ou New York, et la finition (ni trait ni ombre, rayons concentriques).

**Elle a trouvé 12 problèmes, tous corrigés et rejoués :**
1. **Un refus à tort de toute la réponse dans les fuseaux où l'heure change à minuit** : 27 réponses par an à Beyrouth, 29 à Santiago. Un jour sans 00:00 décalait les seaux d'une heure.
2. **Le contrôle ne vérifiait que la somme de chaque série :** un point déplacé ou une série rattachée ailleurs passait. Il refait maintenant tout.
3. **Une exception au lieu d'un refus** quand les cartes manquent.
4. **Les absences :** la carte et le graphique disaient « Rendez-vous », en ton neutre.
5. **Le ton ne se voyait pas.**
6. **La variation était donnée par `aria-label` sur un `span`**, où les lecteurs d'écran ne la lisent pas.
7. **La dernière semaine pouvait ne compter qu'un jour.**
8. **Une date en double** sous un graphique de deux jours ; **un graphique d'un jour réduit à un point** (il passe en barre).
9. **40 espèces donnaient 40 libellés illisibles.**
10. **Les dates se triaient comme du texte,** et l'annonce du tri nommait la clé technique (`amount`) au lieu de la colonne.
11. **La ligne de base du graphique,** contraire à « ni trait ».
12. **Un grand montant débordait de sa carte,** et une carte seule prenait la moitié de la largeur.

**Gardé tel quel, et dit :** une ligne de caisse au montant négatif rend la réponse refusée. C'est antérieur à la tranche (le contrôle du tableau).

## 5. Ce qui n'est pas prouvé, et la suite

- **Le squelette Message n'a pas été vu dans l'onglet,** dans le navigateur : la lecture y est synchrone et tient en moins de 120 ms, si bien que le squelette n'a jamais le temps de paraître. Sur le bureau, la lecture passe par le pont natif, de façon asynchrone. **À voir dans ton test en tauri dev,** sur une vraie base. Son dessin et son balisage sont prouvés par les tests et au banc.
- **L'annonce n'a pas été écoutée avec un vrai lecteur d'écran.**
- **Le squelette Cards n'est pas branché sur le tableau de bord.** Le tableau de bord a ses propres repères de chargement, module par module (`RowSkeleton`). Les remplacer change son chargement : c'est le sujet du chantier démarrage, que je prends avec les repères de temps sur le Mac, avec une mesure avant et après. La géométrie de Cards correspond à une carte avec variation (130 px) ; une carte sans variation fait 112 px. À ajuster pour les cartes du tableau de bord.
- **Le balayage des fuseaux à changement d'heure à minuit** ne mord que si les tests tournent dans ces fuseaux : un processus ne change pas de fuseau en cours de route. Les sept fuseaux ont été lancés à la main pour ce bilan.
- **L'app de bureau (WebKit) n'a pas été lancée.**
