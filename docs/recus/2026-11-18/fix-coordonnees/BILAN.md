# Correctif : coordonnées du propriétaire depuis la fiche patient, 18 novembre 2026

Branche `chantier/fix-coordonnees-2026-11-18`, partie de master (`eeeec25`) dans le worktree neuf `~/work/fix-coordonnees-wt`. Les commits sont locaux, rien n'est poussé, aucun tag n'est posé. Le dossier principal, garé en HEAD détaché sur `e409495`, n'a pas été touché.

Commits :
- `ee34d08` fix(patients) : coordonnées modifiables et enregistrées depuis la fiche ;
- `ad9ecd3` chore(release) : 5.0.11 ;
- le commit de ce bilan.

## 1. Le constat, reproduit avant correction

Il est reproduit sur master, dans le banc navigateur (`avant.json`), sur la fiche de Rex (propriétaire `ZZ-TEST Léa Martin`) :
- **le bloc Propriétaire de la fiche n'a aucun bouton.** Les coordonnées s'y lisent, mais rien ne permet de les modifier. L'éditeur de la page (`saveProfile`) n'écrit que le patient ;
- **« Modifier les informations », sous les notes générales, ouvre bien l'éditeur, mais hors de l'écran.** Juste après le clic, l'éditeur n'est pas dans la fenêtre et le focus n'y est pas, d'où l'impression que le bouton ne fait rien.

**Un troisième défaut, trouvé en écrivant les tests :** un champ facultatif vidé (email, adresse, ville, contact secondaire, téléphone secondaire, consigne) n'était jamais effacé.
- La normalisation le rend `undefined`, et la couche d'écriture (`useSQLite`, `stripUndefinedEntries`) ignore les `undefined` : l'ancienne valeur restait en base.
- Le dialogue de la liste des patients avait le même défaut.
- Le test qui le prouve échoue sans le correctif et passe avec (section 4).

## 2. Ce qui change

- **Fiche patient, bloc « Propriétaire » :** un bouton « Modifier les coordonnées », toujours visible sous les coordonnées, en clair comme en sombre (`captures/fiche-bloc-proprietaire-*`).
- **L'éditeur des coordonnées** (`src/modules/patients/components/owner-contact-dialog.tsx`) :
  - il s'ouvre en dialogue, au premier plan, avec le focus sur « Nom ». Il est impossible à manquer ;
  - **les champs** sont ceux de la carte Propriétaire du dialogue de la liste, dans le même ordre et avec les mêmes libellés : Nom, Prénom, Téléphone, Email, Adresse, Ville, Contact privilégié, Contact secondaire, Téléphone secondaire, Consigne de communication ;
  - **le lot envoyé** est celui de `handleSaveAll` dans le dialogue de la liste ;
  - **l'écriture** passe par `ownersRepo.update`, déjà branché sur la page, avec sa normalisation `normalizeOwnerDraft`.
- **Les règles,** les mêmes que dans la liste :
  - un nom ou un prénom, avec le message de la liste « Le nom du propriétaire est obligatoire. » ;
  - un téléphone ou un email ;
  - des téléphones de 8 à 15 chiffres, le secondaire compris ;
  - un email valide.
  - Le message s'affiche dans le dialogue, qui reste ouvert, et s'efface dès qu'on corrige. Un échec d'écriture se dit sans jargon : « Les coordonnées n'ont pas pu être enregistrées. Réessayez. »
  - Depuis la liste, ces mêmes refus donnent toujours le message général « Impossible d'enregistrer les modifications. ». Je n'y ai pas touché.
- **Champ vidé :** `ownersRepo.update` (`src/data/repositories/index.ts`) envoie `null` pour un champ du lot que la normalisation rend vide. Il est donc vraiment effacé, depuis la fiche comme depuis la liste. `ownersRepo.update` n'a qu'un autre appelant, le dialogue de la liste, qui envoie déjà ses champs vidés dans ce but.
- **« Modifier les informations » :** à l'ouverture, l'éditeur de profil défile jusqu'à l'écran et son premier champ prend le focus. Cela vaut aussi pour l'entrée du menu d'en-tête, qui ouvre le même éditeur.
- **Rien n'est supprimé ni déplacé :**
  - le dialogue de la liste, `saveProfile` et l'éditeur de profil restent en place ;
  - `OwnerContact` reçoit un `onEdit` facultatif ; sans lui (l'aperçu latéral), il reste en lecture seule ;
  - le changement de propriétaire lié reste dans le dialogue de la liste : il n'était pas demandé.

## 3. « Corrigé partout »

Le nom et le numéro ne sont stockés qu'une fois, dans la fiche du propriétaire (table `owners`). Tout ce qui les affiche relit cette fiche : la page du patient, l'Agenda, les Rappels et la liste. C'est vérifié au clic (section 4).

**WhatsApp n'est pas dans cette branche :** le bouton WhatsApp et la relance du rendez-vous sont sur `chantier/whatsapp-2026-11-17`, qui n'est pas fusionnée dans master. Leur code lit le même `owners.data` (`owner.phone`), donc un numéro corrigé ici sera celui du lien WhatsApp. Ce n'est pas vérifié au clic, puisque les deux branches ne sont pas réunies.

## 4. Preuves

**Tests** (`tests/modules/patients/owner-contact-edit.test.tsx`, **22 cas, tous verts**) :
- **Le brouillon et le lot :**
  - toutes les coordonnées sont reprises dans le brouillon ;
  - le lot envoyé est identique à celui de la liste, un champ vidé partant en `undefined`.
- **Validations, 6 refus et 7 acceptations :**
  - **refusés :** pas de nom ; ni téléphone ni email ; téléphone de 7 ou de 16 chiffres ; téléphone secondaire trop court ; email invalide ;
  - **acceptés :** le nom seul, le prénom seul, l'email sans téléphone, le téléphone sans email, un +213, un contact secondaire vidé.
- **Enregistrement réel :** une base SQLite réelle (`node:sqlite`) passe par le vrai `useOwnersRepository().update` et la vraie normalisation.
  - **La couche d'écriture est imitée :** elle reproduit le chemin natif de `useSQLite` (les `undefined` écartés, les noms en snake_case, `null` écrit en NULL), puisque le crochet ne s'exécute pas hors de React.
  - **Ce qui est vérifié :**
    - le nom et le numéro corrigés se relisent en base, normalisés ;
    - les 10 champs s'enregistrent ;
    - un champ vidé devient NULL en base ;
    - un brouillon refusé n'écrit rien ;
    - un échec d'écriture donne un message simple.
  - **Le test du champ vidé échoue sans le correctif de `ownersRepo.update` :** j'ai vérifié en retirant le correctif.
- **Le point d'entrée :** le bloc de la fiche porte « Modifier les coordonnées » ; l'aperçu latéral ne le porte pas.

**Parcours au clic dans le banc navigateur** (`coordonnees.json`, outil `outils/coordonnees.mjs`) :
- **Le banc :** la copie de la base de la VM, avec les propriétaires et les rendez-vous `ZZ-TEST`, en Clean clair et sombre, horloge au 18 novembre 2026 à 13 h 40. Le nom du vétérinaire, qui vient de la vraie base, est masqué dans les fichiers.
- **Sur la fiche de Rex :**
  1. le bloc porte le bouton ;
  2. le dialogue s'ouvre avec les 10 champs dans l'ordre de la liste et le focus sur « Nom » ;
  3. « 0555 12 » est refusé : « Le numéro de téléphone doit contenir entre 8 et 15 chiffres. », le dialogue reste ouvert, et le message s'efface à la saisie suivante ;
  4. le nom devient « Martinez », le téléphone « 0661 22 33 44 », et on ajoute un email et un contact secondaire ;
  5. après « Enregistrer », le dialogue se ferme et le bloc affiche « ZZ-TEST Léa Martinez · 06 61 22 33 44 · lea@example.invalid ».
- **Après rechargement de la page :** la fiche montre toujours la correction, et la copie du navigateur contient `lastName: "Martinez"`, `phone: "0661223344"`.
- **Effacement :** une seconde édition vide l'email et le contact secondaire. Après un nouveau rechargement, `email`, `secondaryContactName` et `secondaryContactPhone` sont `null`.
- **Partout :**
  - **Agenda :** « ZZ-TEST Léa Martinez · 06 61 22 33 44 » ;
  - **Rappels :** le rappel de vaccin de Rex affiche « ZZ-TEST Léa Martinez · 06 61 22 33 44 » ;
  - **liste des patients :** « ZZ-TEST Léa Martinez ».
- **« Modifier les informations » :** après le clic, l'éditeur est à l'écran et le focus y est. Avant correction, il n'y était pas.
- **Erreurs :** aucune erreur de console ni de page, en clair comme en sombre.
- **Captures** (`captures/`) : le bloc Propriétaire avec son bouton, et le dialogue rempli, en clair et en sombre.

**Les contrôles de la CI de publication,** lancés à la main sur le commit 5.0.11 :
- `npm run typecheck` (`tsrs -b`) : sans erreur ;
- `npm run lint -- --max-warnings=0` : rien ;
- `npm test` : 228 fichiers, 1 966 tests verts ;
- `npm run test:licenses` : 0 échec.
- **Ultracite :** aucune remarque sur les nouveaux fichiers. Sur les trois fichiers existants touchés, les remarques sont les mêmes qu'avant.

## 5. Ce qui n'est pas prouvé

- **L'app de bureau :** le parcours a tourné dans le banc navigateur, dont le magasin est le `localStorage`. Le chemin natif SQLite de l'app est couvert par le test sur base réelle, mais avec une imitation de la couche d'écriture de `useSQLite`, pas par un clic dans l'app compilée. Un essai à la main dans l'app avant envoi est recommandé (section 6).
- **Le lien WhatsApp avec un numéro corrigé :** non vérifié au clic, la branche WhatsApp n'étant pas fusionnée (section 3).
- **Windows et macOS :** non vus. La CI construit les trois systèmes.

## 6. Publication 5.0.11 : ce qui est prêt, ce qui reste

**Le processus de la 5.0.10** (commit `e834e84`, tag `v5.0.10`) :
1. un commit `chore(release)` qui porte la version dans `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` et `src-tauri/Cargo.lock` (paquet `vetera`), et qui ajoute l'entrée publiée dans `src/modules/release-notes/release-notes.ts` ;
2. la fusion dans master ;
3. le tag `v*` poussé ;
4. le workflow `release-updater.yml` :
   - il vérifie que le tag correspond à `tauri.conf.json` ;
   - il relance typecheck, lint, tests et licences ;
   - il construit et signe macOS, Windows et Linux ;
   - il publie la release GitHub avec `latest.json` ;
5. les testeurs reçoivent la mise à jour par l'updater, qui lit `releases/latest/download/latest.json`.

**Prêt :**
- **le commit `ad9ecd3` « chore(release): 5.0.11 »** : la version est passée à 5.0.11 aux quatre endroits ;
- **la note de version publiée, datée du 18 novembre 2026,** avec trois nouveautés en langage du cabinet : corriger les coordonnées depuis la fiche, un champ vidé bien effacé, « Modifier les informations » qui amène au formulaire ;
- **les contrôles de la CI**, passés en local sur ce commit (section 4).

**Reste à faire, sur ton mot :**
1. **Un essai à la main dans l'app de bureau** (recommandé) : sur une fiche, corriger le nom et le numéro, fermer, rouvrir, puis les retrouver dans l'Agenda et les Rappels ; vider un email et vérifier qu'il ne revient pas.
2. **Fusionner dans master :** `git merge --ff-only chantier/fix-coordonnees-2026-11-18`. L'avance rapide est possible, la branche part de master.
   - Master local (`eeeec25`) a déjà un commit de plus que `origin/master` (`6bd676f`) : la documentation de la landing. Il partira avec le correctif. Sinon, il faut le retirer avant de pousser.
   - Le dossier principal est en HEAD détaché sur `e409495` : la fusion se fait depuis un autre worktree ou par `git branch -f`, sans changer son état.
3. **Poser et pousser le tag :** `git tag v5.0.11`, puis `git push origin master v5.0.11`. C'est ce qui déclenche la construction et la publication.
4. **Surveiller le workflow** jusqu'à la release et `latest.json`, puis vérifier qu'une 5.0.10 installée propose bien la mise à jour.
5. **Si la publication glisse d'un jour,** corriger la date de la note de version (`2026-11-18`) avant le tag.
6. **Prévenir les testeurs** : la mise à jour arrive d'elle-même par l'updater, et la fenêtre « Quoi de neuf » montre les trois points.

**Hors de ce correctif :** la branche WhatsApp n'est pas dans la 5.0.11.

## Refaire le banc

Les outils sont dans `outils/`.
1. Il faut le magasin du banc WhatsApp : `store.json` tiré de la copie de la base par `base-vers-navigateur.py`, plus `donnees-essai.py` et `rendez-vous-essai.py`, qui donnent `store-rdv.json`.
2. `npx vite --port 5211` dans le worktree, puis `node coordonnees.mjs sortie`.
3. Pour l'état d'avant : la même commande sur un checkout de master, avec `node coordonnees.mjs sortie-avant avant`.
