# La 5.1.0 : WhatsApp fusionné avec le correctif des coordonnées, 18 novembre 2026

Changement de plan : une seule mise à jour riche au lieu du correctif seul. La 5.0.11 n'a jamais été publiée : il n'y a de tag `v5.0.11` ni en local ni sur le dépôt distant, comme vérifié avant de commencer. Sa note de version devient celle de la 5.1.0.

**Le point de départ :**
- **la branche :** `chantier/whatsapp-dans-510-2026-11-18`, partie de master `ac88995` (aussi la pointe de `origin/master`) ;
- **le worktree :** `~/work/wa510-wt`, neuf.

**Ce qui n'a pas bougé :**
- les commits sont locaux, rien n'est poussé, aucun tag n'est posé ;
- le dossier principal, garé en HEAD détaché sur `ad9ecd3`, n'a pas été touché, pas plus que les autres worktrees.

| Commit | Contenu |
|---|---|
| `a856d06` | la fusion de `chantier/whatsapp-2026-11-17` (`e409495`) |
| `e6fe4dc` | `chore(release): 5.1.0`, avec la note de version |
| `e8c5f50` | le test manquant relevé par la revue rouge |
| *(ce bilan)* | |

## 1. La fusion

- **Ancêtre commun :** `eeeec25`.
  - Master y ajoute 36 fichiers : le correctif des coordonnées et la 5.0.11.
  - La branche WhatsApp en ajoute 48.
- **Fichiers touchés des deux côtés :** deux seulement, fusionnés automatiquement, **sans aucun conflit textuel** :
  - **`src-tauri/tauri.conf.json` :** la version de master (5.0.11, puis 5.1.0) et le motif `plugins.shell.open` de WhatsApp sont dans deux zones séparées. Le JSON fusionné est valide et contient les deux ;
  - **`src/modules/patients/patient-detail-page.tsx` :** il garde la pilule, l'état et le dialogue des coordonnées de master, et `OwnerContact animal={patient.name}` de WhatsApp. Rien n'est en double ni perdu.
- **Le seul point où les deux côtés auraient pu se contredire :** `medical-record-summary.tsx`.
  - Master l'avait remis à l'identique de `eeeec25`, en retirant le bouton d'édition du bloc.
  - Pour Git, master ne le modifie donc pas, et c'est la version WhatsApp qui est gardée : celle qui a la ligne WhatsApp en secondaire.
  - C'est voulu : le bloc Propriétaire n'a pas de bouton d'édition, et son seul bouton est la ligne WhatsApp, un geste de contact comme le lien d'appel.

**La revue rouge :** deux revues indépendantes, en lecture seule, ont relu le code fusionné sans se fier aux bilans, l'une côté WhatsApp, l'autre côté coordonnées et publication.
- **Côté WhatsApp, chaque point est retrouvé dans le code fusionné :**
  - le menu de l'Agenda ;
  - les deux groupes des Rappels, avec 1 h avant, 7 jours et aucun délai de grâce ;
  - la ligne de la fiche et de l'aperçu ;
  - le bouton des rappels médicaux ;
  - le réglage +213 ;
  - les deux gardes ;
  - aucune adresse wa.me ;
  - les styles.
  - Les tests WhatsApp sont identiques à ceux de `e409495`.
  - Entre `e409495` et la fusion, aucun fichier WhatsApp ne diffère d'une façon que les commits de master n'expliquent pas.
- **Les interactions entre les deux chantiers sont vérifiées :**
  - un téléphone vidé par `ownersRepo.update` (`null` ou `""`) ne fait apparaître de bouton WhatsApp nulle part et ne casse rien. `whatsAppNumber` et `formatPhone` acceptent `null` ;
  - aucun chemin WhatsApp ne lit le téléphone secondaire ;
  - la priorité du magasin dans `hydratedOwners` ne touche aucun code WhatsApp.
- **Côté coordonnées, retrouvés dans le code fusionné :**
  - le dialogue et sa logique, identiques à `ac88995` ;
  - la pilule en dernier dans la bande ;
  - le crayon du tableau ;
  - l'effacement des champs vidés ;
  - la priorité du magasin.
- **Côté publication :**
  - 5.1.0 aux quatre endroits, plus aucun « 5.0.11 » ;
  - le tag `v5.1.0` passera la vérification du workflow ;
  - un testeur en 5.0.10 verra une fois « Quoi de neuf dans la version 5.1.0 ». Paramètres > Nouveautés listera la 5.1.0 comme version installée, puis la 5.0.10.
- **Le seul vrai problème trouvé est un test :**
  - le cas « le bloc Propriétaire est une lecture pure » rendait le bloc sans l'animal, ce que l'app ne fait jamais ;
  - il ne voyait donc pas le bouton WhatsApp, et ne verrait pas un bouton d'édition revenu dans le bloc ;
  - **la correction :** un cas ajouté (`e8c5f50`) rend le bloc comme la fiche, avec l'animal, et exige que son seul bouton soit « WhatsApp » ;
  - **la preuve :** avec un bouton d'édition injecté dans le bloc, ce nouveau cas échoue et l'ancien reste vert. Le code livré n'avait pas de défaut.

## 2. La version 5.1.0

- **La version :** 5.1.0 dans `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` et `src-tauri/Cargo.lock` (paquet `vetera`).
  - `package-lock.json` est toujours en 5.0.6 : il n'est tenu à jour par aucune publication précédente et rien ne le vérifie. Je n'y ai pas touché.
- **La note de version :** publiée, datée du 18 novembre 2026. Elle a quatre nouveautés, dans le format habituel, en langage du cabinet :
  1. **« Relancez vos clients sur WhatsApp en un clic »**, la nouveauté principale : le menu du rendez-vous dans l'Agenda, le message prêt avec l'animal, la date et l'heure, la remontée dans les Rappels une heure avant puis si le rendez-vous est manqué ou marqué absent, et « rien ne part tout seul » ;
  2. **« Corrigez les coordonnées du propriétaire en quelques secondes »** : la pilule de la fiche, le crayon de la liste et le champ vidé bien effacé ;
  3. **« Les numéros algériens prêts pour WhatsApp »** : +213 sur les numéros en 0, le réglage visible dans Mon cabinet ;
  4. **« « Modifier les informations » vous amène au formulaire ».**
- **La landing** annonce WhatsApp « Bientôt » : cette version le livre. Le texte de la landing n'est pas changé ici, c'est un autre dépôt.

## 3. Les preuves

**Les contrôles de la CI de publication,** lancés à la main sur l'état final, l'un après l'autre :

| Contrôle | Résultat |
|---|---|
| `npm run typecheck` | sortie 0 |
| `npm run lint -- --max-warnings=0` | sortie 0 |
| `npm test` | 230 fichiers, **2 109 tests verts** |
| `npm run test:licenses` | 13 réussis, 0 échec |

**Le compte des tests :**
- l'ancêtre commun en avait 1 944 ;
- les coordonnées en ajoutent 26, plus 1 cas de la revue rouge ;
- WhatsApp en ajoute 138, dont `tests/whatsapp.test.ts` (94) et `tests/appointment-relance.test.ts` (44).
- Rien ne manque.

**Le banc navigateur** (`wa510.json`, outil `outils/wa510.mjs`) :
- **Le banc :** la copie de la base, cas `ZZ-TEST`, horloge au 18 novembre 2026 à 13 h 40, en Clean clair et sombre. Le nom du vétérinaire, qui vient de la vraie base, est masqué.
- **WhatsApp n'est pas installé dans le banc :** `window.open` rend `null`. Le résultat attendu au clic est donc le toast d'échec, et c'est ce qu'on obtient : « WhatsApp n'a pas pu être ouvert. » à chaque clic, en clair comme en sombre. Le lien remis au système est lui aussi relevé.

| Point d'entrée | Ce qu'on voit (clair et sombre) |
|---|---|
| Agenda, menu de Rex | « Ouvrir, Modifier, **Relance WhatsApp**, Marquer absent, Annuler le rendez-vous, Rouvrir le rendez-vous, Supprimer ». Le clic remet `whatsapp://send?phone=213555123456` avec « Nous vous rappelons le rendez-vous de Rex le mercredi 18 novembre 2026 à 14 h 30… », puis affiche le toast d'échec |
| Rappels | « Rendez-vous dans l'heure » avec Rex à 14:30, avec bouton. « Rendez-vous manqués » avec Médor, absent le 17 à 10:00, avec bouton. Le clic sur Rex donne le même lien et le toast |
| Paramètres > Mon cabinet | une ligne « Indicatif pour WhatsApp », +213, avec son explication |
| Fiche de Rex, bande | « Modifier · Actions · Note hors visite · **Modifier les coordonnées** » |
| Fiche de Rex, bloc Propriétaire | un seul bouton, « WhatsApp ». Le clic remet « Nous vous écrivons au sujet de Rex. », puis affiche le toast |
| Fiche, pilule | le dialogue s'ouvre. Le nom corrigé s'affiche dans le bloc, et le dialogue se ferme |
| Tableau, crayon de Rex | le dialogue s'ouvre, on reste sur la liste. Le numéro corrigé (0770 98 76 54) s'affiche aussitôt dans la ligne |
| Agenda après la correction | « Relance WhatsApp » remet `phone=213770987654` : la correction faite dans le tableau est bien le numéro du lien WhatsApp, avec +213 ajouté |
| Après rechargement | la copie du navigateur garde `Martinez` et `0770987654` |

- **Erreurs :** aucune erreur de console ni de page, en clair comme en sombre.
- **La fenêtre « Quoi de neuf dans la version 5.1.0 »** s'ouvre au premier lancement avec les quatre nouveautés.
- **Captures** (`captures/`) : le menu de l'Agenda, les deux groupes des Rappels, la bande de la fiche, le bloc Propriétaire, la ligne et le dialogue du tableau, en clair et en sombre, et « Quoi de neuf » en sombre.

## 4. Ce qui n'est pas prouvé

- **La 5.1.0 compilée :** aucune construction de l'app de bureau n'a été faite dans la VM. C'est la CI qui construira les trois systèmes.
  - L'ouverture réelle de WhatsApp a été prouvée ce matin sur ton Mac. Je ne l'ai pas vue moi-même.
  - La 5.1.0 fusionnée n'a pas encore tourné dans une app compilée.
- **Le toast d'échec dans l'app de bureau quand WhatsApp n'est pas installé :** le banc prouve le toast quand l'ouverture échoue dans le navigateur. Dans l'app de bureau, le plugin shell confie le lien au système : s'il ne renvoie pas d'erreur, le toast ne s'affiche pas. Ce cas n'est pas vu.
- **WhatsApp Desktop sous Windows :** les testeurs devront confirmer la bonne conversation et le message pré-rempli.
- **Le déclenchement des relances à l'heure réelle** dans l'app de bureau : fenêtre en arrière-plan, mise en veille. Il n'est prouvé qu'avec une horloge pilotée dans le banc.
- **Un propriétaire créé puis corrigé dans la même séance :** la priorité du magasin est vérifiée dans le code et par la revue, pas jouée au banc.
- **L'écriture native SQLite** du correctif des coordonnées : elle est prouvée par une base SQLite réelle, avec une imitation de la couche d'écriture, pas par l'app compilée.

## 5. Publication de la 5.1.0 : les étapes qui restent pour Zo

1. **Un essai à la main dans l'app de bureau,** recommandé :
   - relance depuis le menu de l'Agenda ;
   - les deux groupes des Rappels ;
   - la ligne WhatsApp de la fiche ;
   - la pilule et le crayon, jusqu'à l'enregistrement.
2. **Avancer master sur la branche :** l'avance rapide est possible, puisque la branche part de `ac88995` (master et `origin/master`).
   - Depuis un worktree qui a master, ou sans toucher au dossier principal en HEAD détaché : `git branch -f master chantier/whatsapp-dans-510-2026-11-18`.
3. **Pousser master, puis poser et pousser le tag :** `git push origin master`, puis `git tag v5.1.0` et `git push origin v5.1.0`.
4. **Le workflow `release-updater.yml` :**
   - il vérifie que le tag correspond à `tauri.conf.json` ;
   - il relance typecheck, lint, tests et licences ;
   - il construit et signe macOS, Windows et Linux ;
   - il publie la release et `latest.json`.
5. **Vérifier qu'une 5.0.10 installée propose la mise à jour,** puis prévenir les testeurs. La mise à jour arrive d'elle-même, avec la fenêtre « Quoi de neuf ».
6. **Si la publication glisse,** corriger la date de la note de version (`2026-11-18`) avant le tag.
7. **Après la publication :** retirer « Bientôt » de WhatsApp sur la landing.

## Refaire le banc

`outils/wa510.mjs` utilise `banc.mjs` et les données du banc des coordonnées (`../fix-coordonnees/outils/`) : `store-rdv.json` vient de `donnees-essai.py` puis de `rendez-vous-essai.py`. Il faut Vite sur le port 5211 dans le worktree, puis `node wa510.mjs sortie-510`.
