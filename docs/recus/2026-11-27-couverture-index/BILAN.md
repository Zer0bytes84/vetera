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
7. **Barre : le `LIMIT 100` sans `ORDER BY` sur `consultation_soaps` est retiré**, et rien d'autre ne change. Voir le point d'attention plus bas.

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
  - suite complète 2 448 tests verts (2 438 + 10) ;
  - `npm run lint` 0 ;
  - typecheck 0 ;
  - biome : aucune règle en hausse sur les fichiers touchés (comparaison règle par règle avec `HEAD`) ;
  - démarrage 283,4 ko gzip (inchangé, `index-coverage` dans son propre morceau de 1,09 ko).

## Point d'attention : le coût du retrait du `LIMIT 100` dans la barre

Banc `outils/barre.banc.ts`, les 153 questions de la phase 1.3, avec puis sans le `LIMIT` :

| | 1 000 patients (5 195 SOAP) | 3 000 patients (15 195 SOAP) |
|---|---|---|
| Résultats identiques | 153/153 | 153/153 |
| Médiane | 101 → 103 ms | 293 → 596 ms |
| p95 | 135 → **1 696 ms** | 816 → **7 780 ms** |
| Questions au-delà de 300 ms | 5 → 55 | 52 → 116 |

La barre s'arrête dès qu'elle tient 15 résultats. Une question qui n'en trouve pas autant, souvent un mot en cours de frappe ou sans réponse, lit maintenant **toutes** les notes SOAP. La synthèse n'y gagne aucun résultat : ses notes sont toutes validées et déjà indexées. Une vraie clinique, avec ses anciennes notes non validées, y gagne au contraire du rappel.

Le retrait est dans son **propre commit** (`fix(barre)`), facile à écarter.

Recommandation avant fusion : indexer aussi les rubriques SOAP dans un index de mots FTS5 (même méthode que la migration 046, avec `matchesSearchTerms` qui garde la décision). Je ne l'ai pas fait : c'est hors du périmètre fixé pour la barre.

## Ce qui n'est pas prouvé

- **L'erreur réelle de l'app sur ta base** : on la verra dans l'assistant au prochain essai.
- **Les vrais modèles.** Tous les essais utilisent un faux moteur d'embeddings. Le temps d'un rattrapage réel n'est pas mesuré : chaque source est calculée par chaque modèle installé, 4 sur ta base.
- **La préemption avec le vrai worker.** Le test vérifie la règle du jeton et la fermeture de session ; il ne lance pas un vrai worker interrompu en pleine inférence.
- **L'interface n'a pas été vue dans la vraie fenêtre** : compteur, liste à part, avertissement de perte de validation. Couvert par le typecheck et des tests de logique seulement.
- **Le mode réseau.** Le rattrapage est désactivé sur un poste client. L'indexation à la validation y tourne, comme les recherches d'aujourd'hui. Non essayé sur deux postes.
- **Un modèle d'arrière-plan qui prend le jeton libère le modèle laissé en mémoire par une autre tâche** (règle existante du jeton). La dictée suivante peut donc recharger son modèle.
- **L'assistant montre au plus 5 résultats classés.** La barre en montre 15. Le rappel « par le haut » porte sur les notes non validées, montrées toutes à part ; les notes validées restent sous la limite de 5 du classement.
- **Le bloc des documents de la barre** garde son `LIMIT 1000` (avec `ORDER BY`). Non touché, comme convenu.
