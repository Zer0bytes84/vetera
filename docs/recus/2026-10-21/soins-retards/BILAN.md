# Soins : les retards des jours passés remontent dans le jour courant

Date : 21 octobre 2026. Commit local, aucun push. Décision prise après la vérification sur données réelles : le soin non validé du 14 octobre n'apparaissait plus dans aucun compteur.

## Règle

Un soin non validé ne disparaît plus des compteurs. Dans la vue du jour courant, tout soin « à faire » ou « en cours » dont l'heure prévue est antérieure à aujourd'hui remonte dans « En retard », avec sa date d'origine. Il y reste jusqu'à ce qu'il soit :
- validé ;
- replanifié à une heure à venir ;
- ou annulé.

## Ce qui change

- **Lecture.** Le magasin des soins gagne `overdueBefore(début du jour)` : les soins « à faire » ou « en cours » prévus avant cette date. La vue du jour courant l'ajoute à la liste du jour.
  - Une date choisie dans le passé ou le futur n'est pas concernée.
  - L'Agenda des soins, qui lit une plage de dates, ne change pas.
- **Badge de l'onglet Soins.** Il compte ces retards.
- **Indicateurs.**
  - « Soins prévus » ne compte que les soins prévus aujourd'hui. Exemple : « 9 · 3 faits · 6 à terminer · 1 annulé ».
  - « À terminer » compte aussi les retards reportés. Sans prochain soin, son détail indique « Dont N des jours précédents ».
  - « En retard » compte tous les retards. Exemple : « Le plus ancien : 14 oct., 12:30 · Simba · 1 des jours précédents ».
- **Liste par patient.** Le soin reporté monte en tête de la carte de l'animal. Sa date d'origine (« 14 oct. ») s'affiche en rouge au-dessus de l'heure.
  - Les doses « n/m faits » et la frise restent celles du jour : un soin d'un autre jour n'y est ni compté ni placé.
- **Liste par heure.** Un groupe « Retards des jours précédents » passe avant les retards du jour.
- **Détail du soin.** « Heure prévue » indique la date quand le soin vient d'un autre jour : « 14 oct., 12:30 ».
- **Valider, Commencer, Annuler** fonctionnent comme avant : le soin quitte les retards dès qu'il est validé ou annulé.

## Vérifications

- Typage : 0 erreur.
- ESLint : 0 problème.
- Vitest : 149 fichiers, 1 118 tests verts, dont 2 nouveaux :
  - le magasin, sur une vraie base SQLite en mémoire : un soin non validé reste en retard, un soin commencé aussi, un soin fait ou annulé n'y est plus, et la validation le retire ;
  - la synthèse du jour : un report compte en retard et à terminer, jamais comme prévu.
- **Écran :** vérifié dans le navigateur de capture, avec les soins de démonstration et un soin non validé du 14 octobre injecté pour la capture seulement. Le badge et « En retard » passent à 4, et la ligne est en tête avec sa date.

## À vérifier devant le Mac (tauri:dev)

Dans les données réelles, le soin « Médicaments prescrits sur ordonnance » du 14 octobre doit maintenant apparaître :
- en tête de Soins, aujourd'hui ;
- avec « 14 oct. » au-dessus de l'heure ;
- et compter 1 dans le badge de l'onglet et dans « En retard ».

## Captures

`apres/` :
- les indicateurs ;
- la liste par patient en clair et en sombre ;
- la liste par heure.
