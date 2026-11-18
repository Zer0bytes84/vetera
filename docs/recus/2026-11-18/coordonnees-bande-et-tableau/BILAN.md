# Coordonnées du propriétaire : la pilule de la bande et le crayon du tableau, 18 novembre 2026

Complément du correctif du matin (`docs/recus/2026-11-18/fix-coordonnees/BILAN.md`), pour la 5.0.11.

**Le point de départ :**
- **la branche :** `chantier/coordonnees-bande-tableau-2026-11-18`, dans le worktree neuf `~/work/coord-bande-wt` ;
- **la pointe de `chantier/fix-coordonnees-2026-11-18` est `f0be0c1` et non `ad9ecd3` :** elle n'y ajoute que le bilan du matin. Le code de départ est donc exactement celui de `ad9ecd3` ;
- **l'avance rapide reste possible :** la branche du correctif peut être avancée sur celle-ci.

**Ce qui n'a pas bougé :**
- les commits sont locaux, rien n'est poussé, aucun tag n'est posé ;
- le dossier principal, garé en HEAD détaché sur `ad9ecd3`, n'a pas été touché.

**Les commits :**
- `5ebbc42` : la pilule, le crayon et la note de version ;
- le commit de ce bilan.

Le bilan du matin dit encore que le bouton est dans le bloc Propriétaire : c'était vrai avant ce complément.

## 1. Fiche patient : la pilule au bout de la bande

- **Où :** « Modifier les coordonnées » est maintenant le dernier bouton de la première bande grise de la fiche, « Chiffres clés · Repères du dossier ». Il vient après « Modifier », « Actions » et l'action principale, « Note hors visite » ou « Note clinique ».
- **Le style :** une pilule avec le crayon, comme l'action principale des autres pages (« Nouveau patient » dans la liste, par exemple). Elle reprend les classes de l'action principale de la bande (`medical-action medical-action-primary rounded-full`) : noire en clair, violette en sombre.
- **Sans propriétaire lié,** la pilule n'apparaît pas.
- **Le bloc Propriétaire redevient une lecture pure :** `medical-record-summary.tsx` est revenu à l'identique de master. Le paramètre `onEdit` ajouté ce matin est retiré, et le bloc ne contient plus aucun bouton.
- **Le dialogue ouvert est exactement le même :** `OwnerContactDialog`, avec ses validations et l'écriture par `ownersRepo.update`.
- **Ce qui a changé dans le code :**
  - `PatientRecordActions` (`patient-header.tsx`) reçoit un `onEditOwner` facultatif ;
  - la page passe celui qui ouvrait l'éditeur depuis le bloc.
  - Rien d'autre ne change dans la bande.

**À regarder à l'œil :** il y a maintenant deux pilules pleines côte à côte, « Note hors visite » et « Modifier les coordonnées ». C'est ce que donne la demande d'une pilule « comme le bouton d'action principal ». Si l'on veut que « Note hors visite » reste la seule action principale, la pilule peut prendre le style contour de « Modifier » ; c'est une ligne à changer.

## 2. Tableau Patients : le crayon de la colonne Propriétaire

- **Le crayon :** chaque ligne qui a un propriétaire porte, dans la colonne Propriétaire, juste après le nom et le téléphone, la même icône crayon que la pilule (`Pencil` de `@/lib/icons`).
  - C'est un bouton fantôme de 32 px.
  - Il est annoncé aux lecteurs d'écran comme « Modifier les coordonnées de <propriétaire> ».
  - Une infobulle dit « Modifier les coordonnées ».
- **Le clic :**
  - il ouvre `OwnerContactDialog` pour le propriétaire de la ligne, sans ouvrir la fiche : le clic et les touches s'arrêtent au crayon et n'atteignent pas la ligne ;
  - le dialogue est rendu par la liste (`patients-view.tsx`) ;
  - il écrit par le même `updateOwner` de la page, c'est-à-dire `useOwnersRepository().update`. Il n'y a aucun nouveau chemin d'écriture.
- **Après enregistrement, la ligne montre les valeurs corrigées :** la liste relit les propriétaires après l'écriture.
- **Un défaut évité au passage** (`use-patients-page-model.tsx`, `hydratedOwners`) :
  - **le défaut :** la liste garde une copie des propriétaires créés pendant la séance, et cette copie passait avant la ligne du magasin. Un propriétaire créé puis corrigé depuis le crayon aurait gardé son ancien numéro à l'écran jusqu'au rechargement ;
  - **la correction :** l'ordre est inversé. La copie sert tant que le magasin n'a pas la ligne, puis le magasin l'emporte. Aucune fonction n'est déplacée ;
  - **ce qui n'est pas prouvé :** ce cas précis (créer puis corriger dans la même séance) n'est pas joué au banc. Voir la section 4.

## 3. Note de version 5.0.11

La première nouveauté devient « Corrigez les coordonnées du propriétaire en quelques secondes » : « En haut de la fiche du patient, « Modifier les coordonnées » permet de corriger le nom, le téléphone, l'email, l'adresse ou le contact secondaire. Dans la liste des patients, le crayon à côté du propriétaire ouvre la même fenêtre sans quitter la liste. La correction se retrouve partout : fiche, Agenda, Rappels et liste. »

Les deux autres nouveautés ne changent pas. La version est toujours 5.0.11, datée du 18 novembre. Le banc montre bien la fenêtre « Quoi de neuf dans la version 5.0.11 » au premier lancement.

## 4. Preuves

**Tests** (`tests/modules/patients/owner-contact-edit.test.tsx`, **26 cas, tous verts**) :
- Les 20 cas du matin sur les règles, l'écriture et l'effacement sont inchangés.
- Les deux cas du point d'entrée dans le bloc sont remplacés.
- **Points d'entrée, 6 cas :**
  - le bloc Propriétaire ne contient plus aucun bouton ;
  - « Modifier les coordonnées » est le dernier bouton de la bande, juste après « Note hors visite », en pilule (`rounded-full`, `medical-action-primary`) ;
  - pas de pilule sans propriétaire ;
  - le crayon du tableau porte l'identifiant du propriétaire et le libellé « Modifier les coordonnées de ZZ-TEST Léa Martn » ;
  - pas de crayon sans propriétaire, ni quand la liste ne le propose pas ;
  - **depuis le tableau :** le dialogue enregistre par `ownersRepo.update` dans une base SQLite réelle, avec la même imitation de la couche d'écriture que ce matin. La ligne, rendue de nouveau avec la fiche relue en base, montre le nom et le numéro corrigés, et plus l'ancien numéro.

**Parcours au clic dans le banc navigateur** (`bande-tableau.json`, outil `outils/bande-tableau.mjs`) :
- **Le banc :** la copie de la base, cas `ZZ-TEST`, horloge au 18 novembre 2026 à 13 h 40, en clair et en sombre. Le nom du vétérinaire, qui vient de la vraie base, est masqué dans le fichier.
- **La fiche de Rex, en clair et en sombre :**
  - la bande contient « Modifier · Actions · Note hors visite · Modifier les coordonnées », dans cet ordre ;
  - le bloc Propriétaire a 0 bouton ;
  - la pilule ouvre « Modifier les coordonnées du propriétaire » avec ses 10 champs ;
  - en clair, le nom corrigé en « Martinez » s'affiche dans le bloc après l'enregistrement.
- **Le tableau, en clair et en sombre :**
  - 10 crayons pour 10 lignes ;
  - le crayon de Rex ouvre le dialogue, déjà rempli avec le nom du propriétaire, et l'adresse de la page reste celle de la liste : la fiche ne s'ouvre pas.
- **Le tableau, en clair, jusqu'à l'enregistrement :**
  1. « 12 » est refusé : « Le numéro de téléphone doit contenir entre 8 et 15 chiffres. » ;
  2. avec « 0770 98 76 54 », le dialogue se ferme, on reste sur la liste, et la ligne affiche aussitôt « ZZ-TEST Léa Martinez · 0770987654 » ;
  3. après rechargement, la ligne et la copie du navigateur gardent `Martinez` et `0770987654` ;
  4. l'Agenda affiche « ZZ-TEST Léa Martinez · 07 70 98 76 54 », et le bloc de la fiche aussi.
- **Erreurs :** aucune erreur de console ni de page, en clair comme en sombre.
- **Captures** (`captures/`, en clair et en sombre) :
  - la bande de la fiche avec la pilule au bout ;
  - le bloc Propriétaire en lecture seule ;
  - la ligne du tableau avec le crayon ;
  - le dialogue ouvert depuis le tableau.

**Les contrôles de la CI de publication,** lancés à la main sur ce complément :
- `npm run typecheck` : sans erreur ;
- `npm run lint -- --max-warnings=0` : rien ;
- `npm test` : 228 fichiers, 1 970 tests verts ;
- `npm run test:licenses` : 13 réussis, 0 échec.
- **Ultracite :** les remarques sont les mêmes qu'avant sur les six fichiers touchés.

**Ce qui n'est pas prouvé :**
- **L'app de bureau :** comme ce matin, le parcours a tourné dans le banc navigateur.
- **Un propriétaire créé puis corrigé dans la même séance :** la correction de l'ordre est vue dans le code, pas jouée au banc.
- **WhatsApp :** il n'est toujours pas dans cette branche.

## 5. Publication 5.0.11

Le processus et les étapes restantes sont ceux de la section 6 du bilan du matin, avec une étape de plus au départ.
1. **Avancer la branche du correctif sur ce complément,** ou fusionner directement celui-ci, qui contient tout : `git merge --ff-only chantier/coordonnees-bande-tableau-2026-11-18`.
2. **Un essai à la main dans l'app de bureau,** sur les deux points d'entrée.
3. **La fusion dans master, le tag et la publication :** fast-forward dans master (attention au commit de documentation de la landing, non poussé, qui partira avec), puis `git tag v5.0.11` sur la pointe et `git push origin master v5.0.11`. Le workflow publie, puis il faut vérifier qu'une 5.0.10 propose la mise à jour.
4. **La date de la note de version** est à corriger si la publication glisse.

## Refaire le banc

`outils/bande-tableau.mjs` utilise `banc.mjs` et les données du bilan du matin (`../fix-coordonnees/outils/`). Il faut Vite sur le port 5211 dans le worktree, puis `node bande-tableau.mjs sortie-bande`.
