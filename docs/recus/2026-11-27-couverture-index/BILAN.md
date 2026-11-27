# Couverture de l'index sémantique : toute la base existante

Reçu du 27 novembre 2026, copie `work-fondations-mac`, branche `chantier/couverture-index-2026-11-27` (partie de `chantier/fondations-2026-11-26`). Option A retenue : la règle reste « seules les notes validées entrent dans la recherche par le sens », et l'indexation rattrape toute la base.

## Ce qui a été trouvé

Sur la copie de la base réelle (`.backup`, version 47), le diagnostic (`outils/diagnostic.banc.ts`) donne : 9 notes SOAP et 4 documents validés sans aucun passage. Seuls les dossiers ouverts dans l'assistant avaient été indexés.

- **La logique d'indexation n'est pas en cause.** Sur une copie de travail de la même base, avec un faux moteur d'embeddings, le parcours tous patients indexe tout : 68 → 203 passages, aucune erreur (`outils/indexation.banc.ts`).
- **Ce qui empêchait le parcours d'aller au bout, d'après le code :**
  - une erreur sur un patient arrêtait le parcours de tous les suivants ;
  - le premier patient dans l'ordre des identifiants n'a aucun passage ;
  - le `catch {}` de `searchAllPatientsClinical` avalait l'erreur ;
  - aucune note n'était indexée à sa validation : `indexReviewedSource` n'était appelée nulle part ;
  - il n'y a qu'un jeton pour les modèles locaux : une deuxième tâche échoue avec « Une tâche locale est déjà en cours ». La barre et l'assistant qui préparent en même temps suffisent à provoquer cet échec.
- **Non prouvé :** l'erreur exacte rencontrée dans l'app sur ta base. Elle n'était journalisée nulle part. Elle est maintenant affichée dans l'assistant et écrite dans la console.

## Ce qui a été fait

1. **Indexation à la validation.**
   - « Valider » et la validation manuelle d'une note SOAP (`soap-panel.tsx`) indexent la note aussitôt, en arrière-plan.
   - L'enregistrement d'un document validé (`save-reviewed-document.ts`) et d'une note hors visite (`off-visit-note.ts`) aussi.
   - Le module d'indexation se charge à ce moment-là seulement.
   - Si le modèle est occupé, le rattrapage s'en charge plus tard.
2. **Rattrapage en arrière-plan** (`index-coverage.ts`).
   - Il démarre 20 s après le lancement, sur le poste principal ou un poste seul. Un poste client laisse ce travail au poste principal.
   - Il traite un patient à la fois, et ne calcule que les passages manquants ou périmés (`readPatientBacklog`, une seule lecture groupée des passages par patient).
   - Il est interruptible : il réserve le jeton des modèles en mode **préemptible** (`model-lease.ts`). La dictée, une recherche ou toute autre tâche locale prend le modèle sans erreur ; le patient en cours est abandonné, et le rattrapage reprend 30 s plus tard.
   - Le compteur s'affiche dans l'onglet Cas similaires : « Indexation en arrière-plan : X patients indexés sur Y », « en pause », « Index à jour », « Index incomplet ».
3. **Parcours tous patients protégé patient par patient.**
   - `indexAllPatientsDocuments` rend `{ indexed, failures }`.
   - Un échec est noté avec son patient et son message, et les autres patients sont indexés. Seule une annulation arrête le parcours.
   - Les échecs s'affichent dans l'assistant (« Non indexé : … (message) ») jusqu'à ce qu'une passe réussisse.
4. **L'échec de la recherche par le sens n'est plus muet.**
   - La barre garde ses résultats par mots.
   - L'erreur est journalisée (`console.error`), enregistrée, rendue à l'appelant (`onIssue`), puis affichée dans l'assistant : « La recherche par le sens a échoué (…) : résultats par mots seulement. »
   - Même chose pour la recherche dans un seul dossier.
5. **L'assistant gagne le rappel de la barre, par le haut.**
   - Dans un dossier, les notes et documents non validés que la barre trouve par leurs mots apparaissent à part (« … dans des notes non validées »), avec la raison : jamais validée, modifiée depuis sa validation, ou document sans validation.
   - En mode tous patients, les résultats non validés portent l'étiquette « Non validée ».
   - Le classement sémantique (`rankPassages`) est **inchangé** : ces notes n'y entrent pas.
   - Une réponse vide dit pourquoi, par exemple : « l'index couvre X patients sur Y ».
6. **Perte de validation signalée.** Quand les rubriques s'écartent de la version validée, un avertissement apparaît une fois, puis un message reste à côté du bouton de validation : « Note modifiée depuis sa validation : elle n'est plus validée, ni proposée dans les cas similaires. Revalidez-la. » Revenir au texte validé rend la validation.
7. **Barre : le `LIMIT 100` sans `ORDER BY` sur `consultation_soaps` est retiré**, appuyé sur l'index des rubriques SOAP (migration 048). Voir plus bas.

## Preuves

- **Test** `tests/modules/consultations/index-coverage.test.ts` (10 cas, base aux vraies migrations, jeton réel). Il couvre :
  - des anciennes notes non marquées, des notes modifiées, des documents non validés : la recherche par le sens est vide, mais l'assistant les montre, avec ce que montre la barre ;
  - un patient en échec qui n'arrête plus les autres ;
  - la recherche par le sens en échec, qui n'est plus muette ;
  - une barre qui va au-delà de 100 notes ;
  - l'indexation à la validation ;
  - un rattrapage complet avec son compteur, une deuxième passe qui ne recalcule rien, un échec qui s'affiche puis s'efface ;
  - la dictée qui prend le modèle pendant le rattrapage, puis la reprise ;
  - une tâche normale qui garde l'ancien refus.
- **Mutations** : remettre le `LIMIT 100`, laisser une erreur arrêter le parcours, retirer la préemption ou effacer l'enregistrement de l'erreur fait échouer le test correspondant.
- **Copie de la base réelle**, faux moteur : le rattrapage indexe **7 patients sur 7** (ceux qui ont une note ou un document validés ; 11 dossiers vérifiés), 68 → 203 passages ; la deuxième passe ne calcule rien (`mesures/base-reelle-copie.json`).
- **Portes :**
  - suite complète 2 451 tests verts (2 438 + 13) ;
  - `npm run lint` 0 ;
  - typecheck 0 ;
  - biome : aucune règle en hausse sur les fichiers touchés (comparaison règle par règle avec `HEAD`) ;
  - démarrage 283,5 ko gzip (283,4 avant ; la migration 048 ajoute 0,1 ko ; `index-coverage` reste dans son propre morceau).

## La barre : retrait du `LIMIT 100`, appuyé sur un index des rubriques SOAP

Le retrait seul (commit `3e3579e9`) gardait les résultats identiques, mais il faisait lire toutes les notes à chaque question qui ne remplit pas 15 résultats. Le p95 passait de 135 à 1 696 ms à 1 000 patients, et de 816 à 7 780 ms à 3 000. Décision : ce commit ne part pas seul.

**Ce qui le rend fusionnable :**
- **Migration 048, `soap_lexical` :** index FTS5 des rubriques, construit comme la 046.
  - Quatre entrées par note, `rowid = rowid de la note × 4 + rubrique`, aux mots `lexicalWords(rubrique)`.
  - Des déclencheurs effacent les entrées d'une note à sa suppression, à sa modification, et à toute insertion. Ce dernier cas couvre un `INSERT OR REPLACE` qui laisserait d'anciennes entrées sous un `rowid` réattribué plus tard.
  - `syncSoapLexicalIndex` ajoute ce qui manque, avant chaque recherche de la barre et au début de chaque passe du rattrapage.
- **Lecture des notes de la barre :**
  1. **Présélection.** Seules les notes que l'expression FTS de la question sélectionne sont lues. `matchesSearchTerms` décide toujours, comme pour les passages.
  2. **Lecture par pages, dans l'ordre, avec arrêt dès que les 15 sources sont acquises.** C'est la règle déjà prouvée pour les passages.
  3. **Ordre conservé sans tri.** `ORDER BY p.rowid, s.rowid` fixe l'ordre du plan d'origine (patients, puis leurs notes par `idx_consultation_soaps_patient_id`). Le `CROSS JOIN` et le `+s.rowid` imposent ce plan avec l'index : chaque page se lit sans trier toutes les candidates. Sans eux, une page coûtait 1,1 s à 3 000 patients ; avec, 10 ms.
  4. **Notes déjà jugées laissées de côté.** Une note est sautée seulement si chacune de ses rubriques a un passage de l'index actif au texte **exactement** identique, et si la lecture des passages a examiné toutes ses candidates sans qu'aucun passage soit écrit entre-temps (compteur de la migration 047 relu avant chacun des deux blocs). Au moindre doute, la note est lue : rubrique longue coupée en passages, note non indexée, index ou compteur indisponible.

**Résultats :**
- **Égalité : 153/153 identiques** sur chaque paire mesurée, aux deux paliers.
- **1 000 patients :**
  - dans un état neuf de la machine, p95 **133,3 ms** contre 134,7 ms avec `LIMIT 100`, juste avant que les notes déjà jugées soient sautées ;
  - en alternance avec la version `LIMIT 100`, dans l'état de machine de fin de session : p95 163 à 186 ms contre 154 à 174 ms, médiane à 1 ou 2 ms près, autant de questions au-delà de 300 ms (5) ;
  - **Atterrissage : environ le niveau d'avant le retrait, à 10 ms près au p95.** Les 1 696 ms ont disparu.
- **3 000 patients**, en alternance, même état de machine :
  - médiane 368 à 369 ms contre 349 à 360 ms (+3 à +5 %) ;
  - p95 1,9 à 2,1 s contre 1,4 à 4,3 s (les plages se recouvrent ; ce palier varie beaucoup d'une passe à l'autre sur ce Mac de 8 Go) ;
  - 133 questions au-delà de 300 ms contre 114 à 127 ;
  - **Atterrissage : pas tout à fait le niveau d'avant.** Le surcoût reste petit mais mesurable. Il se concentre sur les questions qui n'ont aucune réponse et dont l'expression est très large (« rénal », « œdème », « stérilisée », « radio »). Elles lisent toutes leurs candidates, là où le `LIMIT 100` en lisait 100.
- **Première recherche après la mise à jour :** remplissage de l'index, 1,9 s (5 195 notes) et 7,6 s (15 195 notes), une seule fois. Le rattrapage le fait au lancement, 20 s après le démarrage, sur le poste principal.
- **Tests** (`tests/modules/consultations/soap-lexical-index.test.ts`) :
  - l'index sélectionne toute rubrique acceptée (300 notes, 36 questions, plus de 500 paires acceptées) ;
  - les déclencheurs suivent une note modifiée, supprimée, remplacée, puis un `rowid` réattribué ;
  - la barre rend exactement la même chose avec et sans index et compteur, y compris pour une rubrique longue dont les deux mots tombent dans deux passages.
- **Mutations :** retirer l'égalité de texte du saut ou le déclencheur d'insertion fait échouer le test correspondant.

## Correctif d'usage : le périmètre de Cas similaires (après l'essai réel)

**Défaut constaté sur la vraie base.** Dès qu'un patient est ouvert, Cas similaires cherche dans « Ce dossier », et seul le résumé discret des filtres le disait. Sur Nika, « Boitement » rendait zéro sans le dire. On croyait à une panne.

**Correctif :**
- **Périmètre visible d'emblée.** Un sélecteur au-dessus du champ, « Dossier de Nika | Tous les dossiers », remplace le choix caché dans le menu des filtres. Changer de périmètre relance la recherche déjà faite.
- **Réponse vide qui nomme le périmètre.** « Rien dans le dossier de Nika pour « Boitement » : la recherche est limitée à ce dossier. »
- **Ce que contiennent les autres dossiers**, ajouté au message. La barre de recherche compte ses résultats par mots hors de ce dossier, par exemple « 1 résultat par mots dans 1 autre dossier », et dit « ou plus » quand elle plafonne à 15. Si elle ne trouve rien ailleurs, le message le dit et rappelle que la recherche par le sens peut encore trouver des cas proches.
- **Élargir en un clic.** Le bouton « Chercher dans tous les dossiers » passe le périmètre à tous les dossiers et relance la même question.

**Autre mécanisme, en plus du bouton demandé.** Le compte de ce que contiennent les autres dossiers dit, avant de cliquer, si élargir servira à quelque chose. C'est ce qui manquait le plus pour ne pas croire à une panne. Il coûte une recherche par mots de plus (environ 100 ms à 1 000 patients), et seulement quand le dossier ne rend rien. Je n'élargis pas automatiquement : sur un dossier ouvert, le vétérinaire cherche d'abord dans ce dossier, et un élargissement silencieux mélangerait les patients sans qu'il le voie.

**Ce que le cas de Nika révèle aussi.** D'après le diagnostic de la base réelle, la barre trouvait Nika par une fiche de **consultation** (un rendez-vous), pas par une note SOAP. Or « Ce dossier » ne cherche que dans les notes SOAP, les documents et les protocoles : même la liste des notes non validées restait vide. Je propose d'ajouter au périmètre « Ce dossier » les consultations et la fiche du patient, comme les cherche la barre. Ce n'est pas fait ici.

**Preuves :**
- Test « rien dans ce dossier, des passages existent dans les autres » (`index-coverage.test.ts`). Le dossier de Nika ne rend rien, ni par le sens ni parmi les notes non validées. Le compte hors dossier donne 1 résultat dans 1 autre dossier. Le message nomme le dossier et le périmètre. L'élargissement retrouve la note de Dora.
- Un second test couvre les variantes du message : rien ailleurs, compte plafonné, patient sans nom.
- **Mutation :** un compte hors dossier toujours vide fait échouer le test.
- Suite complète 2 453 tests verts, typecheck et lint à 0, biome sans hausse, démarrage 283,5 ko gzip.
- **Non vu dans la vraie fenêtre :** le sélecteur, le message et le bouton. Il n'y a pas de test d'interface dans le projet (pas de testing-library) ; la logique est testée, l'affichage non.

## Ajout : fiches de consultation et fiche du patient dans le périmètre « Ce dossier »

**But :** l'assistant ne manque pas ce que la barre trouve, pour la même question, dans le même dossier.

**Ce qui change :**
- **Dans un dossier,** la liste « trouvés par mots » lit maintenant aussi toutes les fiches de consultation (rendez-vous) du patient et sa fiche (signalement, allergies, affections chroniques, notes). C'est la nouvelle fonction `patientRecordMatches`, appelée par `readPatientUnreviewedMatches`.
- **Mêmes textes que la barre :** `consultationSearchChunks` et `patientSearchChunks`, avec la même décision `matchesSearchTerms`. La barre lit les 100 rendez-vous les plus récents de toute la clinique et 100 patients pris sans ordre. L'assistant lit, lui, **toutes** les fiches du dossier : il couvre au moins ce que la barre y trouve.
- **Montrées pour ce qu'elles sont.** Chaque résultat porte « fiche de consultation » ou « fiche du patient », dans la liste à part « … trouvés par mots, hors recherche par le sens ». Le sous-titre explique que les notes non validées y entreront une fois validées, et que les fiches n'y entrent pas.
- **Pas dans la recherche par le sens.** Ces fiches n'ont ni validation ni passages ; les y faire entrer demanderait de les indexer, donc une règle de validation à décider. Elles entrent par les mots seulement.
- **Périmètre tous dossiers : inchangé.** Il montrait déjà les résultats de la barre, fiches comprises.
- **Chemin par le sens : inchangé,** sauf un défaut corrigé en passant. Avec la source « Consultations » ou « Fiches patients » choisie dans un dossier, la recherche par le sens recevait une liste de sources vide et échouait (« Choisissez un patient, une source et une rubrique »). Elle est maintenant sautée, et seule la recherche par mots répond.

**Preuves :**
- **Test, cas de Nika en synthèse** (`index-coverage.test.ts`) : une note validée sur autre chose, une fiche de consultation « Boitement de l'antérieur gauche », une fiche patient « Boiterie intermittente ».
  - « Boitement » dans le dossier fait remonter la fiche de consultation et la fiche du patient.
  - Toute source que la barre trouve dans ce dossier est présente dans la réponse de l'assistant (recherche par le sens et liste par mots réunies).
- **Défaut réintroduit :** sans la lecture des fiches, le test échoue.
- **Copie de la base réelle**, en lecture seule (`outils/perimetre.banc.ts`) : pour « Boitement » dans le dossier de Nika, la barre trouve `consultation:mw9hfek6ztdga9ebgw`, et l'assistant la rend maintenant (« fiche de consultation »). Aucune source manquante.
- **Portes :** suite complète 2 454 tests verts, typecheck et lint à 0, biome sans hausse, démarrage 283,5 ko gzip.
- **Non vu dans la vraie fenêtre :** l'affichage de la liste avec ces nouvelles sources.

**À signaler à ce moment-là :** dans la barre, les blocs consultations et fiches patients gardaient leur `LIMIT 100`. C'est corrigé plus bas (migration 049).

## Barre : fiches de consultation et fiches patients sans plafond (migration 049)

**Défaut.** La barre lisait les 100 rendez-vous les plus récents de toute la clinique, et 100 patients sans ordre. Au-delà, elle ne voyait rien, sans le signaler. À l'échelle de l'hôpital, des fiches étaient perdues à coup sûr.

**Correctif :** la recette de la migration 048.
- **Index :** `appointment_lexical` et `patient_lexical` (FTS5), une entrée par fiche sous son `rowid`. Ses mots sont `lexicalWords` du texte que la barre compare (`consultationSearchChunks`, `patientSearchChunks`). Le texte d'un rendez-vous ne contient pas le nom du patient : renommer un patient ne touche pas ces entrées.
- **Déclencheurs :** ajout, modification des champs cherchés, suppression, et insertion sous un `rowid` réattribué (cas `INSERT OR REPLACE`).
- **Remplissage :** `syncAppointmentLexicalIndex` et `syncPatientLexicalIndex`, en arrière-plan au début de chaque passe du rattrapage, donc au lancement qui suit la mise à jour, et avant une recherche si le rattrapage n'est pas encore passé.
- **Lecture** (`readRecordPages`), pour les deux blocs :
  - présélection par l'index, et `matchesSearchTerms` qui décide toujours ;
  - lecture par pages, avec arrêt dès que les 15 sources sont acquises ;
  - ordre d'origine écrit en entier : `ORDER BY a.start_time DESC, a.rowid DESC` pour les rendez-vous (le parcours inverse de `idx_appointments_start_time`), `ORDER BY rowid` pour les patients. Les deux ordres ont été vérifiés identiques à l'ordre plafonné, en SQL, sur les bases de 1 000 et 3 000 patients et sur la copie de la base réelle. Le `+rowid` garde ce plan : pas de tri.
- **Contrôle des index seulement quand quelque chose a changé.** La première version vérifiait les index à chaque recherche (`NOT EXISTS` sur chaque ligne). À 3 000 patients, cela coûtait environ 37 ms sur les rendez-vous et 42 ms sur les notes ; médiane +20 à +32 ms, p95 doublé.
  - La 049 ajoute donc `record_index_state` : un compteur, incrémenté par des déclencheurs à chaque écriture sur les rendez-vous, les patients et les notes SOAP, et un jeton aléatoire propre à chaque base.
  - La barre ne revérifie un index que si le couple (jeton, compteur) a bougé depuis sa dernière vérification réussie. Le compteur est lu avant la vérification : une écriture pendant celle-ci impose la suivante.
  - Même règle pour l'index des passages (046), avec le compteur de la 047. C'est un changement voulu : il retire de chaque frappe un contrôle qui coûtait le plus cher (environ 310 ms à froid sur 121 560 passages).
  - Sans compteur (base plus ancienne), chaque recherche vérifie comme avant.

**Résultats.** Paires mesurées en alternance avec la version `5fb711f7` :

| | 1 000 patients | 3 000 patients |
|---|---|---|
| Résultats | 152 identiques, 1 qui gagne (« IRC » : +1 fiche de consultation, +1 fiche patient), 0 perdu | 153/153 identiques |
| Médiane | 107 → **64 ms** | 319–339 → **188 ms** |
| p95 | 136–156 → **96–129 ms** | 1,2–1,8 → **1,0–1,5 s** |
| Questions au-delà de 300 ms | 5 → 5 | 110–125 → **28–32** |

La barre ne trouve rien de moins sur le banc : la seule différence est un gain. Elle est aussi plus rapide qu'avant, grâce au contrôle des index sauté quand rien n'a changé.

**Mode tous dossiers de l'assistant :** il hérite du correctif. `searchAllPatientsClinical` reprend les résultats de `searchAllPatientsFastLexical`, et le test le vérifie : la fiche ancienne y est trouvée.

**Tests** (`tests/modules/consultations/record-lexical-index.test.ts`, 5 cas) :
- plus de 100 rendez-vous, et la fiche cherchée est la plus ancienne : absente des 100 lus avant, trouvée après, par la barre et par l'assistant ;
- plus de 100 patients, et le patient cherché est hors des 100 : absent avant, trouvé après ;
- une fiche ajoutée ou modifiée après une recherche est trouvée à la suivante (le cache ne la masque pas) ;
- les déclencheurs suivent une fiche modifiée, supprimée, remplacée, puis un `rowid` réattribué ;
- l'ordre d'origine est gardé, ex æquo compris.

**Défauts réintroduits.** Chacun fait échouer son test :
- l'ancien code, avec ses deux `LIMIT 100`, fait échouer les 2 tests « plus de 100 » ;
- sans le compteur sur l'insertion d'un rendez-vous, le test du cache échoue ;
- sans le déclencheur d'insertion, le test du `rowid` réattribué échoue.

**Portes :**
- suite complète 2 459 tests verts ;
- typecheck et lint à 0 ;
- biome sans aucune règle en hausse ;
- démarrage 283,8 ko gzip (283,5 avant : le SQL de la migration est chargé au démarrage).

**Limites :**
- Les questions sans réponse lisent maintenant toutes leurs fiches candidates. Le plafond de 100 en bornait le coût, au prix des fiches perdues.
- Un poste client dont le poste principal changerait de base en cours de session est protégé par le jeton. Une restauration de sauvegarde de la même base sur le poste principal, pendant qu'un client tourne, pourrait retomber sur le même couple (jeton, compteur) ; c'est improbable, et la prochaine écriture le corrige. Sur un poste seul, une restauration ou une remise à zéro relance l'app, ce qui vide le cache.
- Le bloc des documents de la barre garde son `LIMIT 1000` (avec `ORDER BY`).

## Ce qui n'est pas prouvé

- **L'erreur réelle de l'app sur ta base** : on la verra dans l'assistant au prochain essai.
- **Les vrais modèles.** Tous les essais utilisent un faux moteur d'embeddings. Le temps d'un rattrapage réel n'est pas mesuré : chaque source est calculée par chaque modèle installé, 4 sur ta base.
- **La préemption avec le vrai worker.** Le test vérifie la règle du jeton et la fermeture de session ; il ne lance pas un vrai worker interrompu en pleine inférence.
- **L'interface n'a pas été vue dans la vraie fenêtre** : compteur, liste à part, avertissement de perte de validation. Couvert par le typecheck et des tests de logique seulement.
- **Le mode réseau.** Le rattrapage est désactivé sur un poste client. L'indexation à la validation y tourne, comme les recherches d'aujourd'hui. Non essayé sur deux postes.
- **Un modèle d'arrière-plan qui prend le jeton libère le modèle laissé en mémoire par une autre tâche** (règle existante du jeton). La dictée suivante peut donc recharger son modèle.
- **L'assistant montre au plus 5 résultats classés.** La barre en montre 15. Le rappel « par le haut » porte sur les notes non validées, montrées toutes à part ; les notes validées restent sous la limite de 5 du classement.
- **Le bloc des documents de la barre** garde son `LIMIT 1000` (avec `ORDER BY`). Non touché, comme convenu.
- **La barre n'a pas été mesurée dans la vraie fenêtre**, seulement dans Node. Dans l'app, chaque lecture passe par l'IPC : une note lue en plus coûte plus cher qu'ici.
- **Les `rowid` de `consultation_soaps` (comme ceux d'`embeddings` pour la 046) supposent qu'aucun `VACUUM` ne les renumérote.** L'app n'en lance aucun ; une base passée par un `VACUUM` extérieur aurait un index faux jusqu'à sa reconstruction.
- **Un `INSERT OR REPLACE` laisse les anciennes entrées de la note sous son ancien `rowid`.** Elles ne désignent aucune note et sont effacées si ce `rowid` est réattribué. L'app n'utilise pas `INSERT OR REPLACE` sur cette table.
- **Sur un poste client**, la première recherche de la barre remplit l'index sur le poste principal, à travers le réseau. Non mesuré.
