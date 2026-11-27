# Chantier fondations, phase 1 : les fondations de données (TypeScript)

Reçu du 26 novembre 2026, copie `work-fondations-mac` (Mac M1, 8 Go), branche `chantier/fondations-2026-11-26`.
Référence du chantier : `docs/recus/2026-11-26-exploration-rust/PROPOSITION.md`.

## En bref

| Chantier | Commit | 1 000 patients | 3 000 patients | Égalité |
|---|---|---|---|---|
| 1.1 Fiche patient lue par patient | `2af5ad8a` | 24,4 Mo puis **1,0 Mo** ; 155 ms puis **12,5 ms** | 71,5 Mo puis **3,1 Mo** ; 529 ms puis **38,5 ms** | 9 tests du cache ; suite complète |
| 1.2 Sémantique « tous patients » en une requête | `83e633e4`, `53075d0d` | 7,8 s puis **2,6 s** ; 1 001 requêtes puis 2 | 25,2 s puis **8,4 s** | 200/200 identiques, écart ≤ 3,0e-15 |
| 1.3 Recherche par mots (FTS5) | `5d13e54a` | médiane 1 990 ms puis **101 ms** (p95 2 144 puis **141 ms**) | 6 990 ms puis **294 ms** (p95 9 244 puis **525 ms**) | 153/153 identiques ; sur-ensemble sans perte |
| Sémantique, fin de phase 1 (référence de la phase 2) | `5d13e54a` | **1,14 s** | **5,1 s** | 200/200 identiques |

**Ce que ces chiffres ne disent pas.** Ils sont pris dans Node (`node:sqlite`), avec un aller-retour JSON pour figurer le greffon SQL. L'IPC réel de Tauri n'y est pas : dans la vraie fenêtre, chaque mégaoctet traversé coûte en plus (environ 11 Mo/s en debug d'après la proposition). Les volumes transférés sont publiés à côté des temps pour cette raison. La mesure dans la vraie fenêtre, en build release, est faite avec la phase 2 : un seul build lourd sert aux deux phases.

Portes à chaque commit : suite complète verte (2 398 tests au départ, 2 435 à la fin, aucune régression) ; `npm run typecheck` et `npm run lint` à zéro ; `npm run check` (ultracite) au niveau du départ, soit **133 erreurs déjà présentes à `50730a61`, aucune ajoutée**, vérifié règle par règle ; démarrage 283,3 ko gzip (budget 300 ko).

## Données de mesure

- Base au schéma réel : `outils/base-schema.mjs` (migrations de l'app). Le Mac n'avait pas la base de test de la VM.
- Cliniques : `outils/gen-clinique.py` (celui de l'exploration), 1 000 patients (5 195 consultations, 20 780 extraits par génération) et 3 000 patients (15 195 consultations, 60 780 extraits). Hors dépôt, dans `~/work/mesures-fondations-2026-11-26/`.
- Limite des textes synthétiques : ils tirent 70 mots au hasard. Une question courante touche donc environ 40 % des extraits, bien plus que dans une vraie clinique. C'est défavorable à l'index de mots ; dans une vraie clinique, il devrait mieux filtrer.

## 1.1 Fiche patient : lecture par patient

- `useSQLite(table, { patientId })` lit `SELECT * FROM table WHERE patient_id = ?` sous sa propre clé de cache (`src/services/sqlite/patient-scope.ts`). Les tables du dossier qui portent `patient_id` sont passées par patient : rendez-vous, SOAP, notes, poids, vaccins, ordonnances, tâches, hospitalisations, anesthésies, pièces jointes. Les 17 composants du dossier sont branchés.
- Comportement du cache gardé pour l'utilisateur :
  - une écriture optimiste se pose sur toutes les lectures de la table, entière et par patient, au même moment ; son retour arrière aussi ;
  - une ligne qui change de patient sort de la lecture de l'ancien patient ;
  - une invalidation de table touche toutes ses lectures ;
  - les huit dernières lectures par patient restent en mémoire : rouvrir un dossier récent reste instantané, sans que la mémoire grandisse avec chaque dossier parcouru.
- Le contrôle de conflit d'un nouveau rendez-vous a besoin des autres patients. Limité à un patient, le dépôt lit les seuls candidats : même vétérinaire ou même salle, soit exactement ce que `findAppointmentConflicts` compare.
- Toujours lus en entier par la fiche : `patients` et `owners` (3 Mo à 3 000 patients), `users`, `transactions` et `prescription_items`. Ces deux dernières sont vides dans la clinique synthétique ; elles pèseront dans un vrai hôpital. C'est une suite possible.
- Mesures : `mesures/1.1-dossier-avant.json`, `mesures/1.1-dossier-apres.json` (`outils/bench-dossier.mjs`).

## 1.2 Recherche sémantique « tous patients »

- Une requête jointe aux patients, au lieu d'une par patient. Les vecteurs sont décodés en `Float32Array`, le cosinus est calculé sur tableaux typés en double précision. `rankPassages` reçoit ce cosinus tout fait : seuils, bonus lexical, contraintes numériques, meilleur extrait par source et tri global restent les siens.
- Seules les lignes qui peuvent être retenues lui sont passées : cosinus au-dessus du plus bas des deux seuils, ou termes exacts de la question présents (la seule autre façon d'être retenue).
- **« Binaire » côté TypeScript, mais pas sur le fil.** tauri-plugin-sql 2.3.1 envoie un BLOB sous forme de tableau JSON d'octets (`decode/sqlite.rs`), soit environ 3,6 caractères par octet contre 2 en hexadécimal. L'hex reste donc le transport le plus compact par ce greffon, et ce chemin reste borné par le volume (149 Mo à 1 000 patients, 436 Mo à 3 000). C'est la limite que la phase 2 lève.
- **Décision prise en route.** Une première version reproduisait le cosinus de `rankPassages` au bit près (double `Math.hypot`). Elle coûtait 0,9 s sur 20 780 lignes, et l'exactitude n'aurait valu que pour un moteur JS donné (V8 ici, JavaScriptCore dans l'app). Elle a été remplacée par un produit scalaire divisé par la norme : 22 ms. Écart mesuré sur 200 questions : 2,4e-15 à 1 000 patients, 3,0e-15 à 3 000, classement identique.
- Le chemin `sections` (génération v2, gardée pour un retour arrière) n'est pas modifié.
- Preuve : référence enregistrée avant le changement (`outils/enregistre-semantique.mjs`, 200 questions dont le vecteur est voisin de 1 à 3 extraits réels, et dont le texte touche le lexique). Vérification : `outils/verifie-semantique.mjs`. Résultats : `mesures/1.2-reference-*.json`, `mesures/1.2-verification.json`, `mesures/1.3-semantique-index.json`.

## 1.3 Recherche par mots : FTS5

- Migration 046 : table FTS5 sans contenu `embeddings_lexical`. Elle indexe **les mots tels que le lexique les compare** (`normalizeLexical`), pas le texte brut. Le tokenizer FTS standard garderait « 10mg » et « œdème » entiers, alors que le lexique y lit « 10 mg » et « deme » : un index sur le texte brut perdrait des extraits.
- L'index est entretenu par des déclencheurs SQLite (suppression, réécriture d'un extrait) et complété avant chaque recherche (`syncLexicalIndex`, par lots, idempotent, possible aussi depuis un poste client). La première recherche le remplit : 2,3 s à 1 000 patients, 8,3 s à 3 000, une seule fois.
- Le lexique ne part pas en Rust : il écrit son expansion de la question en expression FTS5 (`lexicalMatchExpression`). Celle-ci couvre les termes, les racines et leurs alias (« claudication » mène à « boit »), les sigles, les marques et DCI, les synonymes et la phrase entière. L'expression sélectionne un **sur-ensemble** ; `matchesSearchTerms` décide toujours. L'égalité ne repose donc que sur la propriété de sur-ensemble, vérifiée :
  - sur toute la clinique : 0 extrait manqué sur 1 253 785 couples question-extrait acceptés (1 000 patients) et sur 3 670 958 (3 000 patients) ; 0 aussi pour les termes exacts ;
  - par des tests sur un corpus piégé (unités collées, ligatures, majuscules, apostrophes, marques déposées), avec une lecture du code du raciniseur pour vérifier que chaque racine dédiée a ses alias.
- Lecture par pages : la fonction ne rend que les 15 premières sources, donc la lecture s'arrête dès qu'elles sont trouvées. Les étapes suivantes (SOAP, consultations, produits, profils, documents) sont alors sautées, sans effet possible sur le résultat.
- **Ex aequo.** L'ancien `ORDER BY patient_id, source_id, chunk_index` laissait les quatre sections d'un extrait à égalité ; leur ordre venait de l'index choisi par le planificateur. Avec l'index FTS, le plan change, et 93 questions sur 153 rendaient une autre section. L'ordre est maintenant écrit jusqu'au bout (`…, source_type, section, rowid`). Sur les deux cliniques, il reproduit exactement l'ancien ordre (`outils/ordre-explicite.mjs`), et il ne dépend plus du plan.
- Sans index (hôte réseau resté sur une version antérieure) ou s'il échoue, tous les extraits sont lus comme avant, par pages. Mesuré sans index à 1 000 patients : médiane 7,9 ms (les mots fréquents trouvent leurs 15 sources dès la première page), p95 2,0 s (les questions rares parcourent tout) ; résultats identiques.
- Correctif induit : la remise à zéro locale supprimait les tables internes de FTS5 après la table virtuelle. Elle supprime désormais les tables virtuelles d'abord, et le reste avec `IF EXISTS`.
- Preuve : référence enregistrée avant le changement (`outils/lexical.banc.ts`, 153 questions, aux deux paliers). Mesures : `mesures/1.3-*.json`.

## Ce qui reste à savoir

- Les gains dans la vraie fenêtre Tauri (avec l'IPC) : mesurés en phase 2, sur le build release.
- La migration 046 fait refuser la base à une version plus ancienne de l'app : c'est la règle de toutes les migrations (pas de rétrogradation automatique). En mode réseau, l'hôte doit être mis à jour en premier.
- La vraie sélectivité de l'index de mots sur des textes cliniques réels.
