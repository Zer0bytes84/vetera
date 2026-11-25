# C1. Trois familles qui changent un comportement : `useAwait`, `noNonNullAssertion`, `useExhaustiveDependencies`

Référence : commit 8e6c9b6b, branche chantier/erreurs-2026-11-19. Remarques lues dans `c-out/diags.json`, qui ne couvre que `src/` (les dossiers `tests/` et `docs/` ont 86 remarques `useAwait` de plus, hors de ce document). Toutes les mesures ont été faites dans un worktree jetable (`/tmp/claude-0/wt-c1`), remis à l'état du commit après chaque essai. Rien n'a été commité.

Une remarque sur la méthode tsc : `tsc -b` écrit son fichier `.tsbuildinfo` dans `node_modules/.tmp`, et ce dossier est partagé par le lien vers `/home/user/vetera/node_modules`. J'ai donc lancé les deux projets séparément (`tsc -p tsconfig.app.json` puis `tsc -p tsconfig.node.json`, avec `--noEmit --incremental --tsBuildInfoFile` dans un dossier à moi). Le contrôle est le même que `tsc -b`, et l'état de départ donne 0 erreur.

Le détail de chaque site est dans `c-out/c1-sites.json` (231 entrées : règle, chemin, ligne, classe, remplacement proposé).

### `useAwait`, 82 sites

- **Ce qui change :** retirer `async` fait rendre la valeur telle quelle au lieu d'une promesse. Surtout, une erreur levée avant la première promesse devient un throw synchrone au lieu d'un rejet. Un appelant qui fait `.catch`, ou un test qui fait `expect(...).rejects`, ne la voit plus.
- **Les sites, par risque croissant :**

| Classe | Nombre | Ce qui la définit |
|---|---|---|
| (d) sûr | 36 | Le corps rend directement une promesse (`invoke`, `runDbRead`, `runDbTransaction`, `persistence.*`, `savePdf`) sans rien qui lève avant, ou le résultat est ignoré par tous les appelants. |
| (a) exigé par un type | 9 | tsc refuse le retrait : l'interface ou le type de retour attend une promesse et le corps rend une valeur. Le compilateur bloque, donc rien ne change en silence. |
| (c) peut lever | 25 | Un `throw` ou un validateur (`authorRequired`, `assertDateOnly`, `cleanRoomName`, `assertText`…) s'exécute avant la promesse. Ni tsc ni les tests ciblés ne le signalent, mais l'erreur deviendrait synchrone. |
| (b) des appelants comptent sur la promesse | 12 | Prouvé : un test `.rejects` échoue (9 sites), App.tsx fait `.catch` sur le résultat (2 sites, tsc refuse), ou un appelant fait `.catch` sur une fonction dont le travail synchrone peut lever (1 site). |

<details><summary>Liste complète des 82 sites par classe</summary>

**(d) sûr, 36 :** `components/Parametres.tsx:706`, `hooks/useSQLite.ts:137`, `modules/clinique/components/clinique-shared.tsx:164`, `modules/consultations/local-ai/native-dictation.ts:36`, `modules/consultations/local-ai/native-dictation.ts:56`, `modules/documents/document-store.ts:609`, `modules/documents/document-store.ts:880`, `modules/documents/document-store.ts:893`, `modules/documents/document-store.ts:1020`, `modules/documents/document-store.ts:1137`, `modules/hospitalizations/stays/store.ts:257`, `modules/patient-reminders/store.ts:132`, `modules/patient-reminders/store.ts:464`, `modules/stock/hooks/create-stock-snapshot.ts:19`, `modules/stock/hooks/use-stock-inventory.ts:23`, `modules/stock/services/clinical-stock-service.ts:67`, `services/billingService.ts:1261`, `services/billingService.ts:1303`, `services/billingService.ts:1338`, `services/billingService.ts:1355`, `services/billingService.ts:1433`, `services/billingService.ts:1491`, `services/billingService.ts:1565`, `services/billingService.ts:1661`, `services/billingService.ts:1694`, `services/billingService.ts:1805`, `services/billingService.ts:1898`, `services/billingService.ts:2027`, `services/billingService.ts:2150`, `services/billingService.ts:2216`, `services/billingService.ts:2277`, `services/billingService.ts:2346`, `services/licenseActivationService.ts:165`, `services/sqlite/remote-database.ts:16`, `services/sqlite/remote-database.ts:26`, `services/sqlite/remote-database.ts:33`

**(a) exigé par un type, 9 :** `modules/consultations/local-ai/models.ts:26`, `modules/documents/document-store.ts:136`, `modules/documents/document-store.ts:143`, `modules/documents/document-store.ts:149`, `modules/documents/document-store.ts:156`, `modules/patients/export/patient-record-service.ts:415`, `services/backupService.ts:662`, `services/sqlite/auth.ts:169`, `services/sqlite/database.ts:165`

**(c) peut lever, 25 :** `data/repositories/index.ts:144`, `data/repositories/index.ts:650`, `modules/care-tasks/store.ts:148`, `modules/consultations/local-ai/embedding-store.ts:328`, `modules/consultations/local-ai/embedding-store.ts:399`, `modules/consultations/local-ai/embedding-store.ts:908`, `modules/consultations/local-ai/inference-client.ts:106`, `modules/consultations/local-ai/models.ts:31`, `modules/documents/document-store.ts:75`, `modules/documents/document-store.ts:618`, `modules/documents/document-store.ts:899`, `modules/hospitalizations/stays/store.ts:183`, `modules/hospitalizations/stays/store.ts:214`, `modules/hospitalizations/stays/store.ts:485`, `modules/hospitalizations/stays/store.ts:574`, `modules/hospitalizations/stays/store.ts:689`, `modules/hospitalizations/stays/store.ts:768`, `modules/patient-reminders/store.ts:144`, `modules/patient-reminders/store.ts:233`, `modules/patient-reminders/store.ts:389`, `modules/patient-reminders/store.ts:488`, `modules/patients/export/patient-record-service.ts:328`, `modules/patients/export/patient-record-service.ts:365`, `modules/rooms/store.ts:136`, `modules/stock/services/purchase-order-pdf.ts:11`

**(b) appelants dépendants, 12 :** `modules/care-tasks/store.ts:207`, `modules/documents/document-store.ts:690`, `modules/documents/document-store.ts:801`, `modules/documents/document-store.ts:930`, `modules/documents/document-store.ts:1057`, `modules/documents/lib/document-pdf.ts:4`, `modules/hospitalizations/stays/store.ts:353`, `modules/patient-reminders/store.ts:271`, `modules/patient-reminders/store.ts:427`, `modules/rooms/store.ts:119`, `services/demo-data.ts:609`, `services/demo-data.ts:681`

| Site | Classe | Remplacement proposé |
|---|---|---|
| `components/Parametres.tsx:706` | d | Corps synchrone (setters), résultat ignoré par l'unique appelant. Retirer async. |
| `data/repositories/index.ts:144` | c | Lève avant de créer la promesse (throw ou validateur). Sans async, l'erreur devient synchrone ; aucun test ni tsc ne le signale, les appelants vus attendent dans un try. Garder async, ignorer localement. |
| `data/repositories/index.ts:650` | c | Lève avant de créer la promesse (throw ou validateur). Sans async, l'erreur devient synchrone ; aucun test ni tsc ne le signale, les appelants vus attendent dans un try. Garder async, ignorer localement. |
| `hooks/useSQLite.ts:137` | d | Renvoie le cache tel quel ou la promesse en cours ; l'unique appelant fait await. Retirer async (le type devient Row[] \| Promise<Row[]>). |
| `modules/care-tasks/store.ts:148` | c | Lève avant de créer la promesse (throw ou validateur). Sans async, l'erreur devient synchrone ; aucun test ni tsc ne le signale, les appelants vus attendent dans un try. Garder async, ignorer localement. |
| `modules/care-tasks/store.ts:207` | b | Valide l'auteur et le motif avant la transaction ; le test completion-rollback attend un rejet (.rejects) et échoue sans async. Garder async. |
| `modules/clinique/components/clinique-shared.tsx:164` | d | Renvoie directement une promesse (invoke, runDbRead, runDbTransaction, persistence.*, savePdf) sans rien qui lève avant. Retirer async. |
| `modules/consultations/local-ai/embedding-store.ts:328` | c | Lève avant de créer la promesse (throw ou validateur). Sans async, l'erreur devient synchrone ; aucun test ni tsc ne le signale, les appelants vus attendent dans un try. Garder async, ignorer localement. |
| `modules/consultations/local-ai/embedding-store.ts:399` | c | Lève avant de créer la promesse (throw ou validateur). Sans async, l'erreur devient synchrone ; aucun test ni tsc ne le signale, les appelants vus attendent dans un try. Garder async, ignorer localement. |
| `modules/consultations/local-ai/embedding-store.ts:908` | c | Lève avant de créer la promesse (throw ou validateur). Sans async, l'erreur devient synchrone ; aucun test ni tsc ne le signale, les appelants vus attendent dans un try. Garder async, ignorer localement. |
| `modules/consultations/local-ai/inference-client.ts:106` | c | Lève avant de créer la promesse (throw ou validateur). Sans async, l'erreur devient synchrone ; aucun test ni tsc ne le signale, les appelants vus attendent dans un try. Garder async, ignorer localement. |
| `modules/consultations/local-ai/models.ts:26` | a | tsc TS2739 : renvoie EMPTY_MODEL_STATUS hors Tauri. Garder async, ou `return Promise.resolve(EMPTY_MODEL_STATUS)`. |
| `modules/consultations/local-ai/models.ts:31` | c | Lève avant de créer la promesse (throw ou validateur). Sans async, l'erreur devient synchrone ; aucun test ni tsc ne le signale, les appelants vus attendent dans un try. Garder async, ignorer localement. |
| `modules/consultations/local-ai/native-dictation.ts:36` | d | Renvoie directement une promesse (invoke, runDbRead, runDbTransaction, persistence.*, savePdf) sans rien qui lève avant. Retirer async. |
| `modules/consultations/local-ai/native-dictation.ts:56` | d | Renvoie directement une promesse (invoke, runDbRead, runDbTransaction, persistence.*, savePdf) sans rien qui lève avant. Retirer async. |
| `modules/documents/document-store.ts:75` | c | Lève avant de créer la promesse (throw ou validateur). Sans async, l'erreur devient synchrone ; aucun test ni tsc ne le signale, les appelants vus attendent dans un try. Garder async, ignorer localement. |
| `modules/documents/document-store.ts:136` | a | Faux magasin navigateur : l'interface exige Promise (tsc TS2322). Rien ne lève : `return Promise.resolve(tables[table]…)`, ou ignorer localement. |
| `modules/documents/document-store.ts:143` | a | Faux magasin navigateur : l'interface exige Promise<void> (tsc TS2322). Le throw deviendrait synchrone avec Promise.resolve : garder async et ignorer la règle localement. |
| `modules/documents/document-store.ts:149` | a | Idem 143 : interface Promise<void>, throw interne. Garder async, ignorer localement. |
| `modules/documents/document-store.ts:156` | a | Interface Promise<void> (tsc TS2322). `tables[table] = ...; return Promise.resolve();` ou ignorer localement. |
| `modules/documents/document-store.ts:609` | d | Renvoie directement une promesse (invoke, runDbRead, runDbTransaction, persistence.*, savePdf) sans rien qui lève avant. Retirer async. |
| `modules/documents/document-store.ts:618` | c | Lève avant de créer la promesse (throw ou validateur). Sans async, l'erreur devient synchrone ; aucun test ni tsc ne le signale, les appelants vus attendent dans un try. Garder async, ignorer localement. |
| `modules/documents/document-store.ts:690` | b | Valide les longueurs avant la transaction ; managed-documents.test.ts échoue sans async. Garder async. |
| `modules/documents/document-store.ts:801` | b | Throw si non relu ; managed-documents.test.ts échoue sans async. Garder async. |
| `modules/documents/document-store.ts:880` | d | Renvoie directement une promesse (invoke, runDbRead, runDbTransaction, persistence.*, savePdf) sans rien qui lève avant. Retirer async. |
| `modules/documents/document-store.ts:893` | d | Renvoie directement une promesse (invoke, runDbRead, runDbTransaction, persistence.*, savePdf) sans rien qui lève avant. Retirer async. |
| `modules/documents/document-store.ts:899` | c | Lève avant de créer la promesse (throw ou validateur). Sans async, l'erreur devient synchrone ; aucun test ni tsc ne le signale, les appelants vus attendent dans un try. Garder async, ignorer localement. |
| `modules/documents/document-store.ts:930` | b | Throw si non relu ou PDF invalide ; managed-documents.test.ts échoue sans async. Garder async. |
| `modules/documents/document-store.ts:1020` | d | Renvoie directement une promesse (invoke, runDbRead, runDbTransaction, persistence.*, savePdf) sans rien qui lève avant. Retirer async. |
| `modules/documents/document-store.ts:1057` | b | Throw si pièce invalide ; managed-documents.test.ts échoue sans async. Garder async. |
| `modules/documents/document-store.ts:1137` | d | Renvoie directement une promesse (invoke, runDbRead, runDbTransaction, persistence.*, savePdf) sans rien qui lève avant. Retirer async. |
| `modules/documents/lib/document-pdf.ts:4` | b | Appelant `exportClinicalDocument(...).catch(toast)` ; une erreur jsPDF synchrone échapperait au .catch. Garder async. |
| `modules/hospitalizations/stays/store.ts:183` | c | Lève avant de créer la promesse (throw ou validateur). Sans async, l'erreur devient synchrone ; aucun test ni tsc ne le signale, les appelants vus attendent dans un try. Garder async, ignorer localement. |
| `modules/hospitalizations/stays/store.ts:214` | c | Lève avant de créer la promesse (throw ou validateur). Sans async, l'erreur devient synchrone ; aucun test ni tsc ne le signale, les appelants vus attendent dans un try. Garder async, ignorer localement. |
| `modules/hospitalizations/stays/store.ts:257` | d | Renvoie directement une promesse (invoke, runDbRead, runDbTransaction, persistence.*, savePdf) sans rien qui lève avant. Retirer async. |
| `modules/hospitalizations/stays/store.ts:353` | b | Throw si date invalide ; hospitalizations/store.test.ts échoue sans async. Garder async. |
| `modules/hospitalizations/stays/store.ts:485` | c | Lève avant de créer la promesse (throw ou validateur). Sans async, l'erreur devient synchrone ; aucun test ni tsc ne le signale, les appelants vus attendent dans un try. Garder async, ignorer localement. |
| `modules/hospitalizations/stays/store.ts:574` | c | Lève avant de créer la promesse (throw ou validateur). Sans async, l'erreur devient synchrone ; aucun test ni tsc ne le signale, les appelants vus attendent dans un try. Garder async, ignorer localement. |
| `modules/hospitalizations/stays/store.ts:689` | c | Lève avant de créer la promesse (throw ou validateur). Sans async, l'erreur devient synchrone ; aucun test ni tsc ne le signale, les appelants vus attendent dans un try. Garder async, ignorer localement. |
| `modules/hospitalizations/stays/store.ts:768` | c | Lève avant de créer la promesse (throw ou validateur). Sans async, l'erreur devient synchrone ; aucun test ni tsc ne le signale, les appelants vus attendent dans un try. Garder async, ignorer localement. |
| `modules/patient-reminders/store.ts:132` | d | Renvoie directement une promesse (invoke, runDbRead, runDbTransaction, persistence.*, savePdf) sans rien qui lève avant. Retirer async. |
| `modules/patient-reminders/store.ts:144` | c | Lève avant de créer la promesse (throw ou validateur). Sans async, l'erreur devient synchrone ; aucun test ni tsc ne le signale, les appelants vus attendent dans un try. Garder async, ignorer localement. |
| `modules/patient-reminders/store.ts:233` | c | Lève avant de créer la promesse (throw ou validateur). Sans async, l'erreur devient synchrone ; aucun test ni tsc ne le signale, les appelants vus attendent dans un try. Garder async, ignorer localement. |
| `modules/patient-reminders/store.ts:271` | b | assertDateOnly lève ; patient-reminders/store.test.ts échoue sans async. Garder async. |
| `modules/patient-reminders/store.ts:389` | c | Lève avant de créer la promesse (throw ou validateur). Sans async, l'erreur devient synchrone ; aucun test ni tsc ne le signale, les appelants vus attendent dans un try. Garder async, ignorer localement. |
| `modules/patient-reminders/store.ts:427` | b | Throw si motif vide ; patient-reminders/store.test.ts échoue sans async. Garder async. |
| `modules/patient-reminders/store.ts:464` | d | Renvoie directement une promesse (invoke, runDbRead, runDbTransaction, persistence.*, savePdf) sans rien qui lève avant. Retirer async. |
| `modules/patient-reminders/store.ts:488` | c | Lève avant de créer la promesse (throw ou validateur). Sans async, l'erreur devient synchrone ; aucun test ni tsc ne le signale, les appelants vus attendent dans un try. Garder async, ignorer localement. |
| `modules/patients/export/patient-record-service.ts:328` | c | Lève avant de créer la promesse (throw ou validateur). Sans async, l'erreur devient synchrone ; aucun test ni tsc ne le signale, les appelants vus attendent dans un try. Garder async, ignorer localement. |
| `modules/patients/export/patient-record-service.ts:365` | c | Lève avant de créer la promesse (throw ou validateur). Sans async, l'erreur devient synchrone ; aucun test ni tsc ne le signale, les appelants vus attendent dans un try. Garder async, ignorer localement. |
| `modules/patients/export/patient-record-service.ts:415` | a | Lecteur navigateur : l'interface exige Promise<Row[]> (tsc TS2322) et le corps lève. Garder async, ignorer localement. |
| `modules/rooms/store.ts:119` | b | cleanRoomName lève ; rooms.test.ts échoue sans async. Garder async. |
| `modules/rooms/store.ts:136` | c | Lève avant de créer la promesse (throw ou validateur). Sans async, l'erreur devient synchrone ; aucun test ni tsc ne le signale, les appelants vus attendent dans un try. Garder async, ignorer localement. |
| `modules/stock/hooks/create-stock-snapshot.ts:19` | d | Tous les appelants font `void refresh()` ; rien ne lève. Retirer async. |
| `modules/stock/hooks/use-stock-inventory.ts:23` | d | Tous les appelants font `void refresh()` ; rien ne lève. Retirer async. |
| `modules/stock/services/clinical-stock-service.ts:67` | d | Renvoie directement une promesse (invoke, runDbRead, runDbTransaction, persistence.*, savePdf) sans rien qui lève avant. Retirer async. |
| `modules/stock/services/purchase-order-pdf.ts:11` | c | Lève avant de créer la promesse (throw ou validateur). Sans async, l'erreur devient synchrone ; aucun test ni tsc ne le signale, les appelants vus attendent dans un try. Garder async, ignorer localement. |
| `services/backupService.ts:662` | a | tsc TS2739 (renvoie des octets en clair) et parseContainer peut lever. Garder async, ignorer localement. |
| `services/billingService.ts:1261` | d | Renvoie directement une promesse (invoke, runDbRead, runDbTransaction, persistence.*, savePdf) sans rien qui lève avant. Retirer async. |
| `services/billingService.ts:1303` | d | Renvoie directement une promesse (invoke, runDbRead, runDbTransaction, persistence.*, savePdf) sans rien qui lève avant. Retirer async. |
| `services/billingService.ts:1338` | d | Renvoie directement une promesse (invoke, runDbRead, runDbTransaction, persistence.*, savePdf) sans rien qui lève avant. Retirer async. |
| `services/billingService.ts:1355` | d | Renvoie directement une promesse (invoke, runDbRead, runDbTransaction, persistence.*, savePdf) sans rien qui lève avant. Retirer async. |
| `services/billingService.ts:1433` | d | Renvoie directement une promesse (invoke, runDbRead, runDbTransaction, persistence.*, savePdf) sans rien qui lève avant. Retirer async. |
| `services/billingService.ts:1491` | d | Renvoie directement une promesse (invoke, runDbRead, runDbTransaction, persistence.*, savePdf) sans rien qui lève avant. Retirer async. |
| `services/billingService.ts:1565` | d | Renvoie directement une promesse (invoke, runDbRead, runDbTransaction, persistence.*, savePdf) sans rien qui lève avant. Retirer async. |
| `services/billingService.ts:1661` | d | Renvoie directement une promesse (invoke, runDbRead, runDbTransaction, persistence.*, savePdf) sans rien qui lève avant. Retirer async. |
| `services/billingService.ts:1694` | d | Renvoie directement une promesse (invoke, runDbRead, runDbTransaction, persistence.*, savePdf) sans rien qui lève avant. Retirer async. |
| `services/billingService.ts:1805` | d | Renvoie directement une promesse (invoke, runDbRead, runDbTransaction, persistence.*, savePdf) sans rien qui lève avant. Retirer async. |
| `services/billingService.ts:1898` | d | Renvoie directement une promesse (invoke, runDbRead, runDbTransaction, persistence.*, savePdf) sans rien qui lève avant. Retirer async. |
| `services/billingService.ts:2027` | d | Renvoie directement une promesse (invoke, runDbRead, runDbTransaction, persistence.*, savePdf) sans rien qui lève avant. Retirer async. |
| `services/billingService.ts:2150` | d | Renvoie directement une promesse (invoke, runDbRead, runDbTransaction, persistence.*, savePdf) sans rien qui lève avant. Retirer async. |
| `services/billingService.ts:2216` | d | Renvoie directement une promesse (invoke, runDbRead, runDbTransaction, persistence.*, savePdf) sans rien qui lève avant. Retirer async. |
| `services/billingService.ts:2277` | d | Renvoie directement une promesse (invoke, runDbRead, runDbTransaction, persistence.*, savePdf) sans rien qui lève avant. Retirer async. |
| `services/billingService.ts:2346` | d | Renvoie directement une promesse (invoke, runDbRead, runDbTransaction, persistence.*, savePdf) sans rien qui lève avant. Retirer async. |
| `services/demo-data.ts:609` | b | App.tsx fait `.catch` sur le résultat (tsc TS2339 sur void). Garder async. |
| `services/demo-data.ts:681` | b | App.tsx fait `.catch` sur le résultat (tsc TS2532, undefined possible). Garder async. |
| `services/licenseActivationService.ts:165` | d | Renvoie directement une promesse (invoke, runDbRead, runDbTransaction, persistence.*, savePdf) sans rien qui lève avant. Retirer async. |
| `services/sqlite/auth.ts:169` | a | tsc TS2322 (renvoie false). Rien ne lève avant : `return Promise.resolve(false)` aux deux sorties synchrones, ou garder async et ignorer localement. |
| `services/sqlite/database.ts:165` | a | tsc TS2739 (renvoie la connexion en cache). Rien ne lève avant : `return Promise.resolve(db)`, ou garder async et ignorer localement. |
| `services/sqlite/remote-database.ts:16` | d | Renvoie directement une promesse (invoke, runDbRead, runDbTransaction, persistence.*, savePdf) sans rien qui lève avant. Retirer async. |
| `services/sqlite/remote-database.ts:26` | d | Renvoie directement une promesse (invoke, runDbRead, runDbTransaction, persistence.*, savePdf) sans rien qui lève avant. Retirer async. |
| `services/sqlite/remote-database.ts:33` | d | Renvoie directement une promesse (invoke, runDbRead, runDbTransaction, persistence.*, savePdf) sans rien qui lève avant. Retirer async. |

</details>

- **Exemples travaillés (les plus sûrs) :**

`services/billingService.ts:1338`
```ts
// avant
export async function getInvoice(invoiceId: string): Promise<InvoiceDetail | null> {
  return runDbRead((database) => loadInvoiceDetail(database, invoiceId));
}
// après
export function getInvoice(invoiceId: string): Promise<InvoiceDetail | null> {
  return runDbRead((database) => loadInvoiceDetail(database, invoiceId));
}
```
`runDbRead` appelle `runDbOperation`, qui ne fait que `sqliteOperationQueue.then(...)`. Il ne peut pas lever de façon synchrone. La fonction rend donc la même promesse, avec les mêmes rejets. Les 16 sites de `billingService.ts` sont tous en classe (d) et ont cette forme (`return runDbRead(...)` ou `return runBillingCommand(...)`), leurs validations sont dans le rappel.

`services/sqlite/remote-database.ts:33`
```ts
// avant
override async close(): Promise<boolean> { return invoke<boolean>("clinic_network_close"); }
// après
override close(): Promise<boolean> { return invoke<boolean>("clinic_network_close"); }
```
`invoke` de `@tauri-apps/api/core` est déclarée `async function invoke` (node_modules, core.js ligne 201). Elle ne lève jamais de façon synchrone. Le type de la classe parente est respecté.

`modules/stock/hooks/create-stock-snapshot.ts:19`
```ts
// avant
async function refresh() { if (!isTauriRuntime() || pending) { return pending; } … return pending; }
// après
function refresh() { if (!isTauriRuntime() || pending) { return pending; } … return pending; }
```
Les trois appelants font `void refresh()`. Le résultat n'est jamais lu, et le corps ne lève pas (le travail est dans une IIFE `async` avec son propre `try`).

- **La mesure :**
  1. Retrait d'`async` sur les 82 sites : 14 erreurs tsc, sur 11 sites. 9 sites dans les fonctions elles-mêmes (classe a), 2 dans `App.tsx` (lignes 125 et 159, `.catch` sur `purgeDemoDataInTauriIfNeeded` et `seedDemoDataIfNeeded`). Les 71 autres sites compilent.
  2. Toujours sur les 82 sites, 19 fichiers de tests ciblés (magasins de soins, documents, séjours, rappels, salles, facturation, recherche, export, authentification, modèles locaux, dictée) : 9 tests échouent sur 271, dans 5 fichiers. Chaque échec est un `expect(...).rejects` qui reçoit un throw synchrone : `undoCompletion`, `prepare`, `createDraft`, `finalize`, `importAttachment`, `scheduleFollowUp`, `postpone`, `createFromProposal`, `rooms.create`. Sur le commit de départ, les mêmes 19 fichiers passent (271 sur 271).
  3. Retrait d'`async` sur les 36 sites (d) seulement : 0 erreur tsc, 271 tests sur 271. Biome passe de 82 à 46 remarques `useAwait` dans `src/`.
- **Ma recommandation :** appliquer la classe (d) (36 sites). Pour les classes (a), (b) et (c) (46 sites), garder `async` et ajouter `// biome-ignore lint/suspicious/useAwait: <raison>`. Une autre voie est de désactiver la règle pour les magasins (`src/modules/*/store.ts`, `document-store.ts`, `billingService.ts`), où `async` sert à transformer toute validation en rejet. Pour la classe (a), `return Promise.resolve(x)` garde le comportement sur les 5 sites qui ne lèvent pas (`models.ts:26`, `document-store.ts:136` et `:156`, `auth.ts:169`, `database.ts:165`). Sur les 4 autres (`document-store.ts:143` et `:149`, `patient-record-service.ts:415`, `backupService.ts:662`), il rendrait synchrone le `throw` du corps : il faut y garder `async`.
- **Ce qui n'est pas prouvé.** Les appelants en production des 25 sites (c) que j'ai lus font `await` dans un `try` ou dans un `perform`/`run` asynchrone, où un throw synchrone est rattrapé de la même façon. Je ne les ai pas tous lus. Je n'ai pas mesuré l'effet sur l'ordre des microtâches : une fonction `async` qui rend une promesse ajoute des tours de file, la version sans `async` en ajoute moins. Aucun code lu ne dépend de cet ordre, mais aucun test ne le vérifie. `useSQLite.ts:137` et `embedding-store.ts:328` rendraient tantôt une valeur, tantôt une promesse ; leur unique appelant fait `await`, donc le résultat est le même. `Parametres.tsx:706` reste un risque théorique : si `sanitizeAvatarValue` levait, l'erreur passerait d'un rejet ignoré à une erreur dans l'effet.

### `noNonNullAssertion`, 108 sites

- **Ce qui change :** le `!` n'existe plus après la compilation, donc le retirer ne change rien en soi. Le changement vient de ce qu'on met à sa place. Aujourd'hui, une valeur absente donne une TypeError plus loin (lecture d'une propriété de `undefined`), ou un `null` qui se propage en silence (`new Date(null)`). Une garde, un `??` ou une réécriture choisit à la place un autre comportement : erreur nommée, valeur par défaut ou rien rendu.
- **Les sites, par risque croissant :**

| Classe | Nombre | Ce qui la définit |
|---|---|---|
| (r) redondant | 6 | tsc compile sans le `!` (mesuré). On le retire, rien d'autre. |
| (a) garde que TypeScript ne voit pas | 72 | Une garde existe juste avant, mais TypeScript la perd : fermeture `onClick`, `Boolean(x) &&`, filtre suivi d'un tri, bouton `disabled`, contrat d'une fonction (`actor` lève au lieu de rendre null). Le remplacement capture la valeur ou réécrit la garde pour que TypeScript la prouve. Le comportement reste le même. |
| (b) garanti par une construction | 27 | `Map` construite depuis la même liste que les lignes du tableau (19 sites), constante, manifeste JSON livré, `#root` de `index.html`, regex qui correspond toujours. Absence impossible sauf bogue ; le remplacement lève une erreur nommée ou porte la donnée dans la ligne. |
| (c) non garanti | 3 | La valeur vient de la base : `document-store.ts:595` (`consultationId`), `stay-billing.tsx:57` (`discharged_at`), `lot-store.ts:799` (seau introuvable). |

<details><summary>Liste complète des 108 sites par classe, avec le remplacement</summary>

**(r) redondant, 6 :** `modules/consultations/local-ai/patient-mentions.ts:20`, `modules/consultations/local-ai/patient-mentions.ts:21`, `modules/documents/components/document-preview-dialog.tsx:474`, `modules/finances/receivables-aging.ts:69`, `modules/invoices/components/invoice-pdf-preview.tsx:82`, `modules/patients/components/patient-header.tsx:125`

**(a) garde invisible, 72 :** `components/LicenseGate.tsx:41`, `components/LicenseGate.tsx:42`, `components/LicenseGate.tsx:43`, `components/LicenseGate.tsx:44`, `components/LicenseGate.tsx:45`, `components/Parametres.tsx:421`, `components/Parametres.tsx:426`, `components/documents-library.tsx:465`, `components/documents-library.tsx:465`, `components/documents-library.tsx:474`, `components/documents-library.tsx:474`, `components/documents-library.tsx:496`, `components/documents-library.tsx:502`, `components/documents-library.tsx:507`, `components/financial-period-filter.tsx:57`, `components/ui/agent-question.tsx:142`, `components/ui/hex-density.tsx:237`, `components/ui/stat-grid.tsx:350`, `components/ui/status-pill.tsx:149`, `hooks/useSQLite.ts:788`, `modules/assistant-answers/answer.ts:580`, `modules/care-tasks/hooks.ts:44`, `modules/care-tasks/hooks.ts:45`, `modules/care-tasks/store.ts:333`, `modules/clinic-network/clinic-network-settings.tsx:320`, `modules/consultations/components/local-consultation-assistant.tsx:496`, `modules/consultations/local-ai/embedding-index.ts:387`, `modules/consultations/local-ai/generate-soap.ts:56`, `modules/consultations/local-ai/passage-search.ts:97`, `modules/consultations/workers/soap.worker.ts:141`, `modules/dashboard/model/clinical-dashboard.ts:120`, `modules/documents/components/consultation-documents-assistant.tsx:667`, `modules/documents/components/document-preview-dialog.tsx:334`, `modules/documents/document-store.ts:812`, `modules/documents/document-store.ts:907`, `modules/documents/document-store.ts:949`, `modules/documents/document-store.ts:1000`, `modules/documents/document-store.ts:1025`, `modules/documents/document-store.ts:1095`, `modules/flow-board/flow-board-page.tsx:208`, `modules/flow-board/flow-board-page.tsx:209`, `modules/hospitalizations/stays/agenda-stays.tsx:35`, `modules/hospitalizations/stays/store.ts:301`, `modules/hospitalizations/stays/store.ts:307`, `modules/patients/components/patient-timeline.tsx:700`, `modules/patients/components/patient-timeline.tsx:709`, `modules/patients/export/patient-record-data.ts:654`, `modules/patients/export/patient-record-export-dialog.tsx:440`, `modules/patients/export/patient-record-export-dialog.tsx:441`, `modules/patients/export/patient-record-pdf.ts:487`, `modules/patients/export/patient-record-pdf.ts:787`, `modules/patients/health-card/health-card-pdf.ts:266`, `modules/patients/health-card/health-card-pdf.ts:629`, `modules/patients/health-card/health-card-pdf.ts:666`, `modules/patients/lib/vaccination-status.ts:78`, `modules/patients/lib/vaccination-status.ts:78`, `modules/patients/lib/vaccination-status.ts:88`, `modules/patients/lib/vaccination-status.ts:88`, `modules/patients/patient-detail-page.tsx:1225`, `modules/shell/model/palette-suggestions.ts:23`, `modules/shell/model/palette-suggestions.ts:23`, `modules/stock/components/purchasing-panel.tsx:1035`, `modules/stock/components/purchasing-panel.tsx:1064`, `modules/stock/components/purchasing-panel.tsx:1299`, `modules/stock/components/purchasing-panel.tsx:1301`, `modules/stock/services/clinical-stock-store.ts:331`, `modules/stock/services/clinical-stock-store.ts:358`, `modules/stock/services/inventory-store.ts:316`, `modules/stock/services/lot-store.ts:599`, `modules/stock/services/lot-store.ts:660`, `services/licenseRuntime.ts:204`, `services/licenseService.ts:8`

**(b) construction, 27 :** `components/stock/stock-workspace.tsx:230`, `components/stock/stock-workspace.tsx:249`, `components/stock/stock-workspace.tsx:273`, `components/stock/stock-workspace.tsx:321`, `components/stock/stock-workspace.tsx:376`, `lib/invoice-pdf.ts:37`, `main.tsx:107`, `modules/consultations/local-ai/soap-layout.ts:60`, `modules/consultations/local-ai/treatment-routing.ts:283`, `modules/consultations/services/ai-model-provisioning.ts:41`, `modules/finances/components/invoices-table.tsx:120`, `modules/finances/components/invoices-table.tsx:138`, `modules/finances/components/invoices-table.tsx:157`, `modules/finances/components/invoices-table.tsx:182`, `modules/finances/components/invoices-table.tsx:210`, `modules/finances/components/invoices-table.tsx:227`, `modules/finances/components/invoices-table.tsx:316`, `modules/finances/receivables-aging.ts:59`, `modules/patients/components/patients-table.tsx:139`, `modules/patients/components/patients-table.tsx:171`, `modules/patients/components/patients-table.tsx:212`, `modules/patients/components/patients-table.tsx:260`, `modules/patients/components/patients-table.tsx:310`, `modules/patients/components/patients-table.tsx:321`, `modules/patients/health-card/health-card-pdf.ts:627`, `modules/stock/services/clinical-stock-store.ts:179`, `modules/stock/services/lot-store.ts:228`

**(c) non garanti, 3 :** `modules/documents/document-store.ts:595`, `modules/hospitalizations/stays/stay-billing.tsx:57`, `modules/stock/services/lot-store.ts:799`

| Site | Classe | Remplacement proposé, et ce qu'il fait si la valeur manque |
|---|---|---|
| `components/LicenseGate.tsx:41` | a | Remplacer `Boolean(a) &&` par `a !== null &&` puis écrire `a.` : TypeScript rétrécit. Si a est null : false, comme aujourd'hui. |
| `components/LicenseGate.tsx:42` | a | Remplacer `Boolean(a) &&` par `a !== null &&` puis écrire `a.` : TypeScript rétrécit. Si a est null : false, comme aujourd'hui. |
| `components/LicenseGate.tsx:43` | a | Remplacer `Boolean(a) &&` par `a !== null &&` puis écrire `a.` : TypeScript rétrécit. Si a est null : false, comme aujourd'hui. |
| `components/LicenseGate.tsx:44` | a | Remplacer `Boolean(a) &&` par `a !== null &&` puis écrire `a.` : TypeScript rétrécit. Si a est null : false, comme aujourd'hui. |
| `components/LicenseGate.tsx:45` | a | Remplacer `Boolean(a) &&` par `a !== null &&` puis écrire `a.` : TypeScript rétrécit. Si a est null : false, comme aujourd'hui. |
| `components/Parametres.tsx:421` | a | Capturer `const { filename } = action` avant la garde, puis passer `filename` : TypeScript garde le rétrécissement dans la fonction fléchée. Valeur absente : branche non prise, comme aujourd'hui. |
| `components/Parametres.tsx:426` | a | Capturer `const { filename } = action` avant la garde, puis passer `filename` : TypeScript garde le rétrécissement dans la fonction fléchée. Valeur absente : branche non prise, comme aujourd'hui. |
| `components/documents-library.tsx:465` | a | Capturer `const url = entry.item?.url` et tester `url` dans le JSX, puis `onOpenLink(url)`. Absent : menu non rendu, comme aujourd'hui. |
| `components/documents-library.tsx:465` | a | Capturer `const url = entry.item?.url` et tester `url` dans le JSX, puis `onOpenLink(url)`. Absent : menu non rendu, comme aujourd'hui. |
| `components/documents-library.tsx:474` | a | Capturer `const url = entry.item?.url` et tester `url` dans le JSX, puis `onOpenLink(url)`. Absent : menu non rendu, comme aujourd'hui. |
| `components/documents-library.tsx:474` | a | Capturer `const url = entry.item?.url` et tester `url` dans le JSX, puis `onOpenLink(url)`. Absent : menu non rendu, comme aujourd'hui. |
| `components/documents-library.tsx:496` | a | Capturer `const note = entry.note` et tester `note`. Absent : menu non rendu, comme aujourd'hui. |
| `components/documents-library.tsx:502` | a | Capturer `const note = entry.note` et tester `note`. Absent : menu non rendu, comme aujourd'hui. |
| `components/documents-library.tsx:507` | a | Capturer `const note = entry.note` et tester `note`. Absent : menu non rendu, comme aujourd'hui. |
| `components/financial-period-filter.tsx:57` | a | `const date = parse(value); return date ? format(date, …) : "";`. Aujourd'hui, une valeur vide ferait lever format (date invalide) ; après, libellé vide. Les appelants ne passent que des valeurs non vides. |
| `components/stock/stock-workspace.tsx:230` | b | Map construite depuis la même liste que les lignes. Mettre le produit dans la ligne (`rows = products.map(p => ({ …, product: p }))`) et lire `row.product`. Absent : impossible par construction ; aujourd'hui TypeError au rendu. |
| `components/stock/stock-workspace.tsx:249` | b | Map construite depuis la même liste que les lignes. Mettre le produit dans la ligne (`rows = products.map(p => ({ …, product: p }))`) et lire `row.product`. Absent : impossible par construction ; aujourd'hui TypeError au rendu. |
| `components/stock/stock-workspace.tsx:273` | b | Map construite depuis la même liste que les lignes. Mettre le produit dans la ligne (`rows = products.map(p => ({ …, product: p }))`) et lire `row.product`. Absent : impossible par construction ; aujourd'hui TypeError au rendu. |
| `components/stock/stock-workspace.tsx:321` | b | Map construite depuis la même liste que les lignes. Mettre le produit dans la ligne (`rows = products.map(p => ({ …, product: p }))`) et lire `row.product`. Absent : impossible par construction ; aujourd'hui TypeError au rendu. |
| `components/stock/stock-workspace.tsx:376` | b | Map construite depuis la même liste que les lignes. Mettre le produit dans la ligne (`rows = products.map(p => ({ …, product: p }))`) et lire `row.product`. Absent : impossible par construction ; aujourd'hui TypeError au rendu. |
| `components/ui/agent-question.tsx:142` | a | `const el = grid.current; if (!el) return;` en tête du gestionnaire (cards vient de grid.current, donc i ≥ 0 implique el non nul). Même comportement. |
| `components/ui/hex-density.tsx:237` | a | `next = placed[placed.length - 1].id` (liste non vide, retour anticipé ligne 220). Même valeur. |
| `components/ui/stat-grid.tsx:350` | a | Réutiliser `lx` déjà calculé ligne 333 : `${d}L${lx},${h}…`. Même valeur (mesuré : tsc et stat-grid.test passent). |
| `components/ui/status-pill.tsx:149` | a | `const glyph = … ? glyphs.get(IconComponent) : undefined;` puis `glyph ? <Glyph glyph={glyph} /> : …`. Même rendu. |
| `hooks/useSQLite.ts:788` | a | `() => safeTableName ? !tableSnapshotCache.has(safeTableName) : false`. Même booléen (mesuré tsc). |
| `lib/invoice-pdf.ts:37` | b | `char.codePointAt(0) ?? 0` : un caractère issu de for…of a toujours un point de code, la branche ?? ne sert jamais. |
| `main.tsx:107` | b | `const root = document.getElementById("root"); if (!root) throw new Error("#root absent de index.html");`. Aujourd'hui createRoot(null) lève aussi au démarrage ; seul le message change. |
| `modules/assistant-answers/answer.ts:580` | a | `kept` est filtré par `patients.has` : passer par `flatMap` avec `const patient = patients.get(…); if (!patient) return [];`. Même résultat. |
| `modules/care-tasks/hooks.ts:44` | a | Appelé seulement après la transition « fait » qui pose completed_at et execute_par. Garde `if (!task.completed_at \|\| !task.execute_par) return;` : si absent, l'événement n'est plus émis (aujourd'hui il partirait avec null). Changement seulement dans un cas impossible. |
| `modules/care-tasks/hooks.ts:45` | a | Appelé seulement après la transition « fait » qui pose completed_at et execute_par. Garde `if (!task.completed_at \|\| !task.execute_par) return;` : si absent, l'événement n'est plus émis (aujourd'hui il partirait avec null). Changement seulement dans un cas impossible. |
| `modules/care-tasks/store.ts:333` | a | assertCareTransition exige un motif pour « annule ». `reason?.trim() ?? null`. Absent : null au lieu d'une TypeError, cas impossible. |
| `modules/clinic-network/clinic-network-settings.tsx:320` | a | Capturer `const key = host.key` et tester `key`. Même rendu. |
| `modules/consultations/components/local-consultation-assistant.tsx:496` | a | `const text = ai.transcription; if (text) setTranscript(prev => prev ? `${prev}\n${text}` : text)`. Même valeur (tsc refuse sans `!`, mesuré). |
| `modules/consultations/local-ai/embedding-index.ts:387` | a | La regex de la ligne 384 garantit 6144 caractères hexadécimaux. `Uint8Array.from({ length: hex.length / 2 }, (_, i) => Number.parseInt(hex.slice(2 * i, 2 * i + 2), 16))`. Même octets. |
| `modules/consultations/local-ai/generate-soap.ts:56` | a | byRubric n'est appelé que si `retryParts?.length`. Passer `retryParts` en paramètre depuis l'appel gardé. `?? []` est à éviter : il rendrait une note vide en silence. |
| `modules/consultations/local-ai/passage-search.ts:97` | a | `current[current.length - 1]` (current.length testé juste avant). Même valeur. |
| `modules/consultations/local-ai/patient-mentions.ts:20` | r | Retirer le `!` : tsc compile sans lui (mesuré). Aucun effet à l'exécution, le `!` est effacé à la compilation. |
| `modules/consultations/local-ai/patient-mentions.ts:21` | r | Retirer le `!` : tsc compile sans lui (mesuré). Aucun effet à l'exécution, le `!` est effacé à la compilation. |
| `modules/consultations/local-ai/soap-layout.ts:60` | b | SOAP_SECTIONS est une constante qui couvre les quatre clés. Table `Record<keyof LocalSoapNote, string>` des titres, ou garde qui lève. Absent : impossible. |
| `modules/consultations/local-ai/treatment-routing.ts:283` | b | `/^[.!?]*/` correspond toujours (chaîne vide au pire). `/^[.!?]*/u.exec(after)?.[0] ?? ""`. Même valeur. |
| `modules/consultations/services/ai-model-provisioning.ts:41` | b | Le manifeste JSON livré contient les cinq identifiants. Garde qui lève avec l'identifiant manquant. Aujourd'hui : TypeError au chargement du module ; après : erreur nommée au même moment. |
| `modules/consultations/workers/soap.worker.ts:141` | a | loadedUrl est posé avec model. `if (!loadedUrl) throw new Error("Aucun modèle chargé.")`. Aujourd'hui openWeights(null) échouerait plus loin. |
| `modules/dashboard/model/clinical-dashboard.ts:120` | a | `completed` est filtré sur une date valide. `const date = parseDashboardDate(row.startTime); return date !== null && date >= from && date <= to;`. Même résultat. |
| `modules/documents/components/consultation-documents-assistant.tsx:667` | a | Rendu sous `selectedManaged?.attachment?.textState === "image"`. Capturer `const attachment = selectedManaged?.attachment` et `if (!attachment) return;`. Même comportement. |
| `modules/documents/components/document-preview-dialog.tsx:334` | a | Bouton désactivé si `!pdf`. `if (!pdf) return;` en tête du clic. Même comportement. |
| `modules/documents/components/document-preview-dialog.tsx:474` | r | Retirer le `!` : tsc compile sans lui (mesuré). Aucun effet à l'exécution, le `!` est effacé à la compilation. |
| `modules/documents/document-store.ts:595` | c | consultation_id vient de la base. `if (!document.consultationId) throw new Error("La source de ce document est introuvable.")`. Aujourd'hui clinicalSource reçoit null ; l'erreur obtenue n'est pas mesurée. |
| `modules/documents/document-store.ts:812` | a | Avec un authorId, actor lève au lieu de rendre null. Ajouter `requireActor(db, authorId): Promise<DocumentRow>` (ou une surcharge) et l'appeler ici. Même comportement. |
| `modules/documents/document-store.ts:907` | a | Avec un authorId, actor lève au lieu de rendre null. Ajouter `requireActor(db, authorId): Promise<DocumentRow>` (ou une surcharge) et l'appeler ici. Même comportement. |
| `modules/documents/document-store.ts:949` | a | Avec un authorId, actor lève au lieu de rendre null. Ajouter `requireActor(db, authorId): Promise<DocumentRow>` (ou une surcharge) et l'appeler ici. Même comportement. |
| `modules/documents/document-store.ts:1000` | a | Avec un authorId, actor lève au lieu de rendre null. Ajouter `requireActor(db, authorId): Promise<DocumentRow>` (ou une surcharge) et l'appeler ici. Même comportement. |
| `modules/documents/document-store.ts:1025` | a | Avec un authorId, actor lève au lieu de rendre null. Ajouter `requireActor(db, authorId): Promise<DocumentRow>` (ou une surcharge) et l'appeler ici. Même comportement. |
| `modules/documents/document-store.ts:1095` | a | Avec un authorId, actor lève au lieu de rendre null. Ajouter `requireActor(db, authorId): Promise<DocumentRow>` (ou une surcharge) et l'appeler ici. Même comportement. |
| `modules/finances/components/invoices-table.tsx:120` | b | Map construite depuis la même liste que les lignes. Mettre la facture dans la ligne et lire `row.invoice`. Absent : impossible par construction. |
| `modules/finances/components/invoices-table.tsx:138` | b | Map construite depuis la même liste que les lignes. Mettre la facture dans la ligne et lire `row.invoice`. Absent : impossible par construction. |
| `modules/finances/components/invoices-table.tsx:157` | b | Map construite depuis la même liste que les lignes. Mettre la facture dans la ligne et lire `row.invoice`. Absent : impossible par construction. |
| `modules/finances/components/invoices-table.tsx:182` | b | Map construite depuis la même liste que les lignes. Mettre la facture dans la ligne et lire `row.invoice`. Absent : impossible par construction. |
| `modules/finances/components/invoices-table.tsx:210` | b | Map construite depuis la même liste que les lignes. Mettre la facture dans la ligne et lire `row.invoice`. Absent : impossible par construction. |
| `modules/finances/components/invoices-table.tsx:227` | b | Map construite depuis la même liste que les lignes. Mettre la facture dans la ligne et lire `row.invoice`. Absent : impossible par construction. |
| `modules/finances/components/invoices-table.tsx:316` | b | Map construite depuis la même liste que les lignes. Mettre la facture dans la ligne et lire `row.invoice`. Absent : impossible par construction. |
| `modules/finances/receivables-aging.ts:59` | b | bucketOf rend un seau de AGING_BUCKETS, et rows est construit depuis AGING_BUCKETS. Garde qui lève. Absent : impossible. |
| `modules/finances/receivables-aging.ts:69` | r | Retirer le `!` : tsc compile sans lui (mesuré). Aucun effet à l'exécution, le `!` est effacé à la compilation. |
| `modules/flow-board/flow-board-page.tsx:208` | a | minutesSince(null) rend null et la fonction sort avant. Capturer `const since = card.since` et tester `since` avec minutes. Même rendu. |
| `modules/flow-board/flow-board-page.tsx:209` | a | minutesSince(null) rend null et la fonction sort avant. Capturer `const since = card.since` et tester `since` avec minutes. Même rendu. |
| `modules/hospitalizations/stays/agenda-stays.tsx:35` | a | Calculer `const exit = stay.discharged_at \|\| stay.planned_discharge_at` une fois et tester `exit`. Même tableau. |
| `modules/hospitalizations/stays/stay-billing.tsx:57` | c | Le parent rend ce composant si status = « sorti » ; discharged_at vient de la base. `if (!stay.discharged_at) return null;`. Aujourd'hui `new Date(null)` donne le 1er janvier 1970 et un nombre de jours faux, sans erreur ; après, rien n'est rendu. |
| `modules/hospitalizations/stays/store.ts:301` | a | `discharge` est une date quand to = « sorti ». `discharge ?? clock().toISOString()`. Même valeur dans le cas réel. |
| `modules/hospitalizations/stays/store.ts:307` | a | assertStayTransition exige le motif pour « annule ». `options.reason?.trim() ?? ""`. Cas absent impossible. |
| `modules/invoices/components/invoice-pdf-preview.tsx:82` | r | Retirer le `!` : tsc compile sans lui (mesuré). Aucun effet à l'exécution, le `!` est effacé à la compilation. |
| `modules/patients/components/patient-header.tsx:125` | r | Retirer le `!` : tsc compile sans lui (mesuré). Aucun effet à l'exécution, le `!` est effacé à la compilation. |
| `modules/patients/components/patient-timeline.tsx:700` | a | Capturer `const weight = entry.weightEntry` (et `piece`) avant le JSX conditionnel. Même rendu. |
| `modules/patients/components/patient-timeline.tsx:709` | a | Capturer `const weight = entry.weightEntry` (et `piece`) avant le JSX conditionnel. Même rendu. |
| `modules/patients/components/patients-table.tsx:139` | b | Map construite depuis la même liste que les lignes. Mettre l'entrée dans la ligne. Absent : impossible par construction. |
| `modules/patients/components/patients-table.tsx:171` | b | Map construite depuis la même liste que les lignes. Mettre l'entrée dans la ligne. Absent : impossible par construction. |
| `modules/patients/components/patients-table.tsx:212` | b | Map construite depuis la même liste que les lignes. Mettre l'entrée dans la ligne. Absent : impossible par construction. |
| `modules/patients/components/patients-table.tsx:260` | b | Map construite depuis la même liste que les lignes. Mettre l'entrée dans la ligne. Absent : impossible par construction. |
| `modules/patients/components/patients-table.tsx:310` | b | Map construite depuis la même liste que les lignes. Mettre l'entrée dans la ligne. Absent : impossible par construction. |
| `modules/patients/components/patients-table.tsx:321` | b | Map construite depuis la même liste que les lignes. Mettre l'entrée dans la ligne. Absent : impossible par construction. |
| `modules/patients/export/patient-record-data.ts:654` | a | Le filtre juste au-dessus teste `clinicalDocument(note)`. Passer par `flatMap` qui garde la paire { note, metadata }. Même résultat, un seul appel. |
| `modules/patients/export/patient-record-export-dialog.tsx:440` | a | `progress?.pages ? <p>{progress.pages}…</p> : null` : TypeScript rétrécit. Même rendu. |
| `modules/patients/export/patient-record-export-dialog.tsx:441` | a | `progress?.pages ? <p>{progress.pages}…</p> : null` : TypeScript rétrécit. Même rendu. |
| `modules/patients/export/patient-record-pdf.ts:487` | a | layout.page() appelle current() qui crée doc. Rendre current() public ou faire rendre doc par page(). Même comportement. |
| `modules/patients/export/patient-record-pdf.ts:787` | a | Cette branche ne voit que les pages vectorielles, celles mises dans vectors. Garde qui lève. Même comportement. |
| `modules/patients/health-card/health-card-pdf.ts:266` | a | Calculer `const format = identity.photoDataUrl ? imageFormat(identity.photoDataUrl) : null` et tester `format`. Même rendu. |
| `modules/patients/health-card/health-card-pdf.ts:627` | b | buildWeight (health-card-data.ts) ne garde que des dates valides. Garde qui lève, ou faire porter le temps par le point. `?? NaN` est à éviter : il fausserait la courbe en silence. |
| `modules/patients/health-card/health-card-pdf.ts:629` | a | points.length ≥ 2 testé juste avant. `times[times.length - 1]`, `points[points.length - 1]`. Même valeur. |
| `modules/patients/health-card/health-card-pdf.ts:666` | a | points.length ≥ 2 testé juste avant. `times[times.length - 1]`, `points[points.length - 1]`. Même valeur. |
| `modules/patients/lib/vaccination-status.ts:78` | a | Le filtre juste avant exclut nextDueAt vide. Écrire le filtre en garde de type `(v): v is … & { nextDueAt: string }`. Même tri. |
| `modules/patients/lib/vaccination-status.ts:78` | a | Le filtre juste avant exclut nextDueAt vide. Écrire le filtre en garde de type `(v): v is … & { nextDueAt: string }`. Même tri. |
| `modules/patients/lib/vaccination-status.ts:88` | a | Le filtre juste avant exclut nextDueAt vide. Écrire le filtre en garde de type `(v): v is … & { nextDueAt: string }`. Même tri. |
| `modules/patients/lib/vaccination-status.ts:88` | a | Le filtre juste avant exclut nextDueAt vide. Écrire le filtre en garde de type `(v): v is … & { nextDueAt: string }`. Même tri. |
| `modules/patients/patient-detail-page.tsx:1225` | a | Capturer `const count = sectionCounts[section.value]` et tester `count`. Même rendu. |
| `modules/shell/model/palette-suggestions.ts:23` | a | `Date.parse(b.lastVisit ?? "") \|\| 0` : Date.parse("") vaut NaN, donc 0, comme aujourd'hui (mesuré : palette-suggestions.test passe). |
| `modules/shell/model/palette-suggestions.ts:23` | a | `Date.parse(b.lastVisit ?? "") \|\| 0` : Date.parse("") vaut NaN, donc 0, comme aujourd'hui (mesuré : palette-suggestions.test passe). |
| `modules/stock/components/purchasing-panel.tsx:1035` | a | Bouton désactivé si la valeur manque. `if (!currentUser) return;` (ou `!supplier`, `!cancelling`) en tête du clic. Même comportement. |
| `modules/stock/components/purchasing-panel.tsx:1064` | a | Bouton désactivé si la valeur manque. `if (!currentUser) return;` (ou `!supplier`, `!cancelling`) en tête du clic. Même comportement. |
| `modules/stock/components/purchasing-panel.tsx:1299` | a | Bouton désactivé si la valeur manque. `if (!currentUser) return;` (ou `!supplier`, `!cancelling`) en tête du clic. Même comportement. |
| `modules/stock/components/purchasing-panel.tsx:1301` | a | Bouton désactivé si la valeur manque. `if (!currentUser) return;` (ou `!supplier`, `!cancelling`) en tête du clic. Même comportement. |
| `modules/stock/services/clinical-stock-store.ts:179` | b | La facture est créée avec une ligne. Garde qui lève une StockError. Aujourd'hui TypeError plus loin. |
| `modules/stock/services/clinical-stock-store.ts:331` | a | La garde des lignes 300 à 307 lève si un article n'a pas de ligne. Construire une Map par prescriptionItemId et lever si absent. Même comportement. |
| `modules/stock/services/clinical-stock-store.ts:358` | a | row.line vient d'un article de items. Garder l'article dans `prepared` et lire `row.item.medication_name`. Même valeur. |
| `modules/stock/services/inventory-store.ts:316` | a | La garde de la ligne 195 assure old quand create est faux. Dans la branche else, `if (!existing) throw …`. Même comportement. |
| `modules/stock/services/lot-store.ts:228` | b | Les allocations sont calculées depuis ces mêmes buckets. Garde qui lève une StockError. Absent : impossible. |
| `modules/stock/services/lot-store.ts:599` | a | La garde des lignes 591 à 596 exige receivedAt en réception. `input.mode === "receive" && input.receivedAt ? stockTimestamp(input.receivedAt) : null`, puis garde avant l'appel. Même valeur. |
| `modules/stock/services/lot-store.ts:660` | a | La garde des lignes 591 à 596 exige receivedAt en réception. `input.mode === "receive" && input.receivedAt ? stockTimestamp(input.receivedAt) : null`, puis garde avant l'appel. Même valeur. |
| `modules/stock/services/lot-store.ts:799` | c | balanceId vient de l'entrée, bucket de la base. `if (!bucket) throw new StockError("PRODUCT_MISSING", "Ce stock n’existe plus.")`. Aujourd'hui : TypeError (lecture de quantity sur undefined) au lieu du message métier. |
| `services/licenseRuntime.ts:204` | a | `typeof stored.lastSeen === "number" && Number.isFinite(stored.lastSeen) ? stored.lastSeen : 0`. Même valeur. |
| `services/licenseService.ts:8` | a | La longueur 16 ou 20 est testée juste avant. `(clean.match(/.{1,4}/g) ?? [clean]).join("-")`. Même valeur. |

</details>

- **Exemples travaillés (les plus sûrs) :**

`components/ui/stat-grid.tsx:350`
```tsx
// avant
const [lx, ly] = pts[pts.length - 1];            // ligne 333
animate={{ d: `${d}L${pts.at(-1)![0]},${h}L${pts[0][0]},${h}Z` }}
// après
animate={{ d: `${d}L${lx},${h}L${pts[0][0]},${h}Z` }}
```
`lx` est déjà le premier nombre du dernier point. La chaîne est identique.

`modules/shell/model/palette-suggestions.ts:23`
```ts
// avant
(Date.parse(b.lastVisit!) || 0) - (Date.parse(a.lastVisit!) || 0)
// après
(Date.parse(b.lastVisit ?? "") || 0) - (Date.parse(a.lastVisit ?? "") || 0)
```
`Date.parse(undefined)` et `Date.parse("")` valent tous deux `NaN`, que `|| 0` change en 0. Le tri est le même, même si le filtre d'avant venait à laisser passer une valeur vide.

`components/LicenseGate.tsx:41` à `:45`
```ts
// avant
return Boolean(a) && a!.allowed === b.allowed && a!.message === b.message && …;
// après
return a !== null && a.allowed === b.allowed && a.message === b.message && …;
```
`a` est typé `LicenseAccess | null`, donc `Boolean(a)` et `a !== null` donnent le même résultat. TypeScript rétrécit avec la seconde forme, et les cinq `!` tombent.

`modules/finances/receivables-aging.ts:69`
```ts
// avant
(invoice.issuedAt ?? invoice.createdAt)!,
// après
invoice.issuedAt ?? invoice.createdAt,
```
`createdAt` est typé `string`. Le `!` ne faisait rien ; tsc compile sans lui.

- **La mesure :**
  1. Retrait des 108 `!` d'un coup : 153 erreurs tsc. Isolés, 6 retraits ne donnent aucune erreur (classe r) ; un septième candidat (`local-consultation-assistant.tsx:496`) en donne une et reste en (a).
  2. Essai des exemples ci-dessus avec les 6 retraits redondants, `useSQLite.ts:788` en plus (15 sites) : 0 erreur tsc. Biome passe de 108 à 93 remarques. Les tests `palette-suggestions`, `receivables-aging`, `stat-grid` et `local-ai` (qui couvre `patient-mentions`) passent, 51 sur 51.
  3. Les autres remplacements ont été lus sur le code, pas essayés.
- **Ma recommandation :** appliquer (r) et (a) (78 sites), chacun avec sa réécriture qui laisse TypeScript prouver. Pour (b) (27 sites), préférer porter la donnée dans la ligne du tableau (19 sites de `byId.get(row.id)!`), et ailleurs une garde qui lève une erreur nommée. Ne pas utiliser `?? valeur` quand l'absence serait un bogue (`generate-soap.ts:56`, `health-card-pdf.ts:627`) : il le cacherait. Pour (c) (3 sites), ajouter une garde qui lève l'erreur métier, ou ne rend rien dans `stay-billing.tsx`. Ces 3 sites changent vraiment le comportement quand la donnée manque, et c'est le but.
- **Ce qui n'est pas prouvé.** Les remplacements de (a), (b) et (c), sauf les 15 essayés, n'ont été ni compilés ni testés. Les garanties de (b) supposent que les identifiants des listes sont uniques et que le manifeste ne change pas. Pour `document-store.ts:595`, je n'ai pas mesuré l'erreur que donne aujourd'hui `clinicalSource` avec un `consultationId` nul. Pour `stay-billing.tsx:57`, l'effet de `new Date(null)` sur `stayDays` est déduit du code, pas mesuré.

### `useExhaustiveDependencies`, 41 sites

- **Ce qui change :** ajouter une dépendance relance l'effet (ou recalcule le `useMemo`) chaque fois qu'elle change. Si c'est une fonction déclarée dans le composant, c'est à chaque rendu, et une boucle est possible si l'effet pose un état. Retirer une dépendance « en trop » supprime un déclenchement voulu : l'effet ne se relance plus quand la vue, la note ou le compteur de nouvel essai change.
- **ESLint :** `eslint.config.js` active `react-hooks` (`configs.flat.recommended`). Sur les 28 fichiers concernés, ESLint ne signale aucun des 41 sites (0 remarque `react-hooks` active, mesuré). Il en masque 11 par 7 commentaires `eslint-disable-next-line react-hooks/exhaustive-deps`. Les 30 autres ne relèvent pas de sa règle : il ne signale pas une dépendance en trop dans un `useEffect`, ni un setter en trop.
- **Les sites, par risque croissant :**

| Classe | Nombre | Ce qui la définit |
|---|---|---|
| Sûr | 7 | Valeur stable (setter de `useState`, constante de module passée en prop), effet vide, fonction pure à sortir du composant, ou fonction à passer par `useEffectEvent`. Mesuré sans changement. |
| Manque, sans commentaire | 3 | Fonction du composant recréée à chaque rendu. L'ajouter telle quelle relancerait l'effet à chaque rendu (boucle probable pour `read`). `useEffectEvent` donne le même comportement. |
| Omission documentée par eslint-disable | 11 | Choix écrit dans le code (commentaire et `eslint-disable`). Ajouter ou retirer change le comportement : recalcul à chaque rendu, formulaire d'ordonnance remis à zéro, minuteur d'écoute faussé. |
| Déclencheur volontaire (en trop) | 20 | La dépendance n'est pas lue dans le corps, mais elle sert à relancer l'effet : nouvel essai (`retry`, `attempt`), navigation, changement de note, de jour, de texte. La retirer est un vrai changement. |

<details><summary>Liste complète des 41 sites, avec la dépendance et la proposition</summary>

**Sûr, 7 :** `components/Parametres.tsx:705`, `components/QuickPatientPicker.tsx:60`, `components/ui/sidebar.tsx:120`, `components/ui/sidebar.tsx:163`, `modules/dashboard/hooks/usePostOpFollowUp.ts:113`, `modules/hospitalizations/components/hospitalization-print-layout.tsx:37`, `modules/invoices/components/invoice-settings-panel.tsx:86`

**Manque, 3 :** `components/Parametres.tsx:361`, `components/Tasks.tsx:616`, `modules/finances/hooks/use-finances-page-model.tsx:266`

**eslint-disable, 11 :** `modules/agenda/components/agenda-calendar.tsx:237`, `modules/agenda/components/agenda-calendar.tsx:237`, `modules/agenda/components/agenda-calendar.tsx:249`, `modules/agenda/components/agenda-calendar.tsx:249`, `modules/consultations/components/local-consultation-assistant.tsx:327`, `modules/consultations/components/local-consultation-assistant.tsx:485`, `modules/dashboard/components/premium-analytics.tsx:571`, `modules/dashboard/components/premium-analytics.tsx:571`, `modules/prescriptions/components/prescription-builder.tsx:239`, `modules/prescriptions/components/prescription-builder.tsx:239`, `modules/prescriptions/components/prescription-builder.tsx:239`

**Déclencheur, 20 :** `components/NotesPro.tsx:382`, `components/Parametres.tsx:721`, `components/app-sidebar.tsx:70`, `components/ui/agent-composer.tsx:94`, `components/ui/agent-status.tsx:75`, `modules/agenda/hooks/use-agenda-page-model.tsx:817`, `modules/assistant-answers/clinic-answers.tsx:145`, `modules/care-tasks/care-page.tsx:316`, `modules/clinique/components/clinique-shared.tsx:543`, `modules/clinique/components/clinique-shared.tsx:617`, `modules/consultations/components/local-consultation-assistant.tsx:844`, `modules/consultations/components/soap-panel.tsx:255`, `modules/dashboard/use-alert-care.ts:54`, `modules/flow-board/open-in-flux.ts:55`, `modules/flow-board/use-flow-board.ts:90`, `modules/patients/export/patient-record-preview.tsx:26`, `modules/patients/health-card/health-card-dialog.tsx:131`, `modules/shell/app-shell.tsx:220`, `modules/shell/app-shell.tsx:246`, `modules/stock/components/consultation-products.tsx:39`

| Site | Classe, dépendance | Proposition |
|---|---|---|
| `components/NotesPro.tsx:382` | déclencheur, en trop selectedNoteId | Le nettoyage écrit l'édition en attente quand on change de note (commentaire au-dessus). Le retirer casserait cet enregistrement. Retirer la dépendance supprime ce déclenchement. Garder, avec `// biome-ignore lint/correctness/useExhaustiveDependencies: <raison>`. |
| `components/Parametres.tsx:361` | manque, manque read | read pose des états (liste, chargement) et est recréée à chaque rendu : l'ajouter relancerait la lecture à chaque rendu, boucle probable. Proposer `useEffectEvent(read)` comme pour usePostOpFollowUp. |
| `components/Parametres.tsx:705` | sûr, manque sanitizeAvatarValue | Fonction pure recréée à chaque rendu. La sortir du composant (niveau module) : Biome ne la demande plus, l'effet garde ses déclencheurs. Mesuré. |
| `components/Parametres.tsx:721` | déclencheur, en trop currentTheme | Réapplique le thème quand le thème clair/sombre change (l'effet lit la classe du DOM). Retirer la dépendance supprime ce déclenchement. Garder, avec `// biome-ignore lint/correctness/useExhaustiveDependencies: <raison>`. |
| `components/QuickPatientPicker.tsx:60` | sûr, manque normalize | Fonction pure. La sortir du composant. Le useMemo garde ses déclencheurs. Mesuré. |
| `components/Tasks.tsx:616` | manque, manque toggleSelected | Recréée à chaque rendu : l'ajouter réabonnerait l'écouteur clavier à chaque rendu (pas de boucle, travail inutile). toggleSelected ne lit que setSelectedIds : la sortir en useCallback([]) ou en useEffectEvent. |
| `components/app-sidebar.tsx:70` | déclencheur, en trop currentView, isCollapsed | Ramène l'élément actif en vue quand la vue ou la largeur change. Retirer la dépendance supprime ce déclenchement. Garder, avec `// biome-ignore lint/correctness/useExhaustiveDependencies: <raison>`. |
| `components/ui/agent-composer.tsx:94` | déclencheur, en trop value | Recalcule la hauteur du champ quand le texte change. Retirer la dépendance supprime ce déclenchement. Garder, avec `// biome-ignore lint/correctness/useExhaustiveDependencies: <raison>`. |
| `components/ui/agent-status.tsx:75` | déclencheur, en trop startedAt | Relance le minuteur à chaque nouvelle exécution. Retirer la dépendance supprime ce déclenchement. Garder, avec `// biome-ignore lint/correctness/useExhaustiveDependencies: <raison>`. |
| `components/ui/sidebar.tsx:120` | sûr, en trop setOpenMobile | Setter de useState, stable. Le retirer ne change rien. Mesuré. |
| `components/ui/sidebar.tsx:163` | sûr, en trop setOpenMobile | Setter de useState, stable. Le retirer ne change rien. Mesuré. |
| `modules/agenda/components/agenda-calendar.tsx:237` | eslint-disable, manque place | place est recréée à chaque rendu : l'ajouter recalculerait à chaque rendu. Option : `place` en useCallback sur [days, getAppointmentsForDate] (équivalence non mesurée). Sinon biome-ignore à côté du eslint-disable. |
| `modules/agenda/components/agenda-calendar.tsx:237` | eslint-disable, en trop days, getAppointmentsForDate | Ce sont les vraies entrées de place (commentaire). Les retirer figerait le placement. Même traitement que la ligne ci-dessus. |
| `modules/agenda/components/agenda-calendar.tsx:249` | eslint-disable, manque place | Idem 237. |
| `modules/agenda/components/agenda-calendar.tsx:249` | eslint-disable, en trop days, getAppointmentsForDate | Idem 237. |
| `modules/agenda/hooks/use-agenda-page-model.tsx:817` | déclencheur, en trop patientsById, ownersById, selectedDate | Les gestionnaires sont des useEffectEvent ; ces valeurs relancent la lecture du rendez-vous en attente quand les données arrivent. Retirer la dépendance supprime ce déclenchement. Garder, avec `// biome-ignore lint/correctness/useExhaustiveDependencies: <raison>`. |
| `modules/assistant-answers/clinic-answers.tsx:145` | déclencheur, en trop turns.length | Fait défiler vers la nouvelle question. Retirer la dépendance supprime ce déclenchement. Garder, avec `// biome-ignore lint/correctness/useExhaustiveDependencies: <raison>`. |
| `modules/care-tasks/care-page.tsx:316` | déclencheur, en trop tasks | Relit l'historique du soin sélectionné quand les soins changent. Retirer la dépendance supprime ce déclenchement. Garder, avec `// biome-ignore lint/correctness/useExhaustiveDependencies: <raison>`. |
| `modules/clinique/components/clinique-shared.tsx:543` | déclencheur, en trop appointment.id, patient.id | Recharge le formulaire depuis sourceRef quand on change de rendez-vous ou de patient. Retirer la dépendance supprime ce déclenchement. Garder, avec `// biome-ignore lint/correctness/useExhaustiveDependencies: <raison>`. |
| `modules/clinique/components/clinique-shared.tsx:617` | déclencheur, en trop autosaveKey | Programme l'enregistrement automatique quand le contenu change. Retirer la dépendance supprime ce déclenchement. Garder, avec `// biome-ignore lint/correctness/useExhaustiveDependencies: <raison>`. |
| `modules/consultations/components/local-consultation-assistant.tsx:327` | eslint-disable, manque dictationNote | Fonction recréée à chaque rendu ; le commentaire dit que fullTranscript porte les mêmes réponses. L'ajouter recalculerait la note à chaque rendu. biome-ignore. |
| `modules/consultations/components/local-consultation-assistant.tsx:485` | eslint-disable, manque ai.seconds | Volontaire : seul le début de l'écoute compte. L'ajouter remettrait l'heure de départ à chaque seconde. Option sûre : `useEffectEvent` pour lire ai.seconds. |
| `modules/consultations/components/local-consultation-assistant.tsx:844` | déclencheur, en trop activeTab, sectionIndex, setupOpen, ai.phase, visibleError | Garde la dictée défilée en bas quand l'écran change. Retirer la dépendance supprime ce déclenchement. Garder, avec `// biome-ignore lint/correctness/useExhaustiveDependencies: <raison>`. |
| `modules/consultations/components/soap-panel.tsx:255` | déclencheur, en trop saveStatus | Réarme l'enregistrement quand l'état de sauvegarde change. Retirer la dépendance supprime ce déclenchement. Garder, avec `// biome-ignore lint/correctness/useExhaustiveDependencies: <raison>`. |
| `modules/dashboard/components/premium-analytics.tsx:571` | eslint-disable, manque updatedAt | Volontaire : updatedAt est une date neuve à chaque rendu sans prop. L'ajouter recalculerait à chaque rendu. biome-ignore. |
| `modules/dashboard/components/premium-analytics.tsx:571` | eslint-disable, en trop now | now est l'horloge qui doit faire bouger les chiffres (même commentaire). biome-ignore. |
| `modules/dashboard/hooks/usePostOpFollowUp.ts:113` | sûr, manque loadPatients | Ajouter la fonction la relancerait à chaque rendu et chaque chargement pose un état : boucle probable. Passer par `useEffectEvent(loadPatients)` : même comportement, Biome accepte. Mesuré. |
| `modules/dashboard/use-alert-care.ts:54` | déclencheur, en trop dayKey | Relance la lecture des soins au changement de jour. Retirer la dépendance supprime ce déclenchement. Garder, avec `// biome-ignore lint/correctness/useExhaustiveDependencies: <raison>`. |
| `modules/finances/hooks/use-finances-page-model.tsx:266` | manque, manque openInvoiceDetail | Recréée à chaque rendu : l'ajouter relancerait consume() à chaque rendu. Proposer `useEffectEvent(openInvoiceDetail)`. |
| `modules/flow-board/open-in-flux.ts:55` | déclencheur, en trop appointmentById | latest est une ref ; la dépendance relance la lecture de la demande quand les rendez-vous changent. Retirer la dépendance supprime ce déclenchement. Garder, avec `// biome-ignore lint/correctness/useExhaustiveDependencies: <raison>`. |
| `modules/flow-board/use-flow-board.ts:90` | déclencheur, en trop appointments.data | Relit le tableau de flux quand les rendez-vous changent. Retirer la dépendance supprime ce déclenchement. Garder, avec `// biome-ignore lint/correctness/useExhaustiveDependencies: <raison>`. |
| `modules/hospitalizations/components/hospitalization-print-layout.tsx:37` | sûr, en trop hospitalization.id | L'effet ne fait rien (il sort dans tous les cas). Mettre `[]`, ou supprimer l'effet. Mesuré avec `[]`. |
| `modules/invoices/components/invoice-settings-panel.tsx:86` | sûr, manque keys | Les deux appels passent une constante de module (IDENTITY_KEYS, INVOICE_KEYS) : ajouter `keys` ne relance rien. Retirer le eslint-disable. Mesuré ; fait apparaître 2 avertissements react-hooks/todo (try/finally), coupés en CI. |
| `modules/patients/export/patient-record-preview.tsx:26` | déclencheur, en trop retry | Le bouton Réessayer incrémente retry pour relancer le rendu PDF. Retirer la dépendance supprime ce déclenchement. Garder, avec `// biome-ignore lint/correctness/useExhaustiveDependencies: <raison>`. |
| `modules/patients/health-card/health-card-dialog.tsx:131` | déclencheur, en trop attempt | Le bouton Réessayer incrémente attempt pour relancer la préparation du carnet. Retirer la dépendance supprime ce déclenchement. Garder, avec `// biome-ignore lint/correctness/useExhaustiveDependencies: <raison>`. |
| `modules/prescriptions/components/prescription-builder.tsx:239` | eslint-disable, manque itemsRepo.forPrescription | Volontaire (eslint-disable). Si la méthode change d'identité à chaque rendu, l'effet remettrait le formulaire à zéro à chaque rendu et effacerait la saisie. biome-ignore. |
| `modules/prescriptions/components/prescription-builder.tsx:239` | eslint-disable, manque prescriptionsRepo.forAppointment | Idem. |
| `modules/prescriptions/components/prescription-builder.tsx:239` | eslint-disable, en trop prescriptionsRepo.data.length, itemsRepo.data.length | Ce sont les déclencheurs réels (arrivée des données). Les retirer empêcherait de charger l'ordonnance existante. biome-ignore. |
| `modules/shell/app-shell.tsx:220` | déclencheur, en trop currentView, currentPatientId, navigationTick | Remet le panneau en haut à chaque navigation. Retirer la dépendance supprime ce déclenchement. Garder, avec `// biome-ignore lint/correctness/useExhaustiveDependencies: <raison>`. |
| `modules/shell/app-shell.tsx:246` | déclencheur, en trop currentView, currentPatientId | Recalcule la géométrie de défilement à chaque navigation. Retirer la dépendance supprime ce déclenchement. Garder, avec `// biome-ignore lint/correctness/useExhaustiveDependencies: <raison>`. |
| `modules/stock/components/consultation-products.tsx:39` | déclencheur, en trop revision | Relit les produits utilisés quand revision change. Retirer la dépendance supprime ce déclenchement. Garder, avec `// biome-ignore lint/correctness/useExhaustiveDependencies: <raison>`. |

</details>

- **Exemples travaillés (les plus sûrs) :**

`components/ui/sidebar.tsx:120` (et `:163`)
```tsx
// avant
const [openMobile, setOpenMobile] = React.useState(false);
… React.useCallback(() => …, [isMobile, setOpen, setOpenMobile]);
// après
… React.useCallback(() => …, [isMobile, setOpen]);
```
React garantit que le setter de `useState` garde la même identité. Il ne changeait jamais, donc il ne déclenchait jamais rien.

`components/QuickPatientPicker.tsx:60`
```tsx
// avant (dans le composant)
const normalize = (value: string) => value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
// après (au niveau du module, même corps)
const normalize = (value: string) => …;
```
`normalize` ne lit ni prop ni état. Hors du composant, elle est stable, et Biome ne la demande plus. Le `useMemo` garde ses déclencheurs (`ownersById`, `patients`, `query`). On traite `sanitizeAvatarValue` (`Parametres.tsx:705`) de la même façon.

`modules/dashboard/hooks/usePostOpFollowUp.ts:113`
```ts
// avant
useEffect(() => { loadPatients(); const id = setInterval(loadPatients, REFRESH_INTERVAL_MS); return () => clearInterval(id); }, []);
// après
const onRefresh = useEffectEvent(loadPatients);
useEffect(() => { onRefresh(); const id = setInterval(() => onRefresh(), REFRESH_INTERVAL_MS); return () => clearInterval(id); }, []);
```
L'effet tourne toujours une seule fois, au montage. `useEffectEvent` (React 19.2, déjà employé dans `use-agenda-page-model.tsx`) appelle la dernière version de `loadPatients`. Biome accepte cette forme. Ajouter `loadPatients` tel quel aurait relancé l'effet à chaque rendu.

`modules/hospitalizations/components/hospitalization-print-layout.tsx:37`
```tsx
// avant
useEffect(() => { if (!ref.current) { return; } }, [hospitalization.id]);
// après
useEffect(() => { if (!ref.current) { return; } }, []);
```
L'effet ne fait rien dans aucun cas. On peut aussi le supprimer.

- **La mesure :** les 7 sites sûrs ont été appliqués ensemble : retrait de `setOpenMobile` (2), effet vide (1), `normalize` et `sanitizeAvatarValue` sorties du composant (2), ajout de `keys` sans le eslint-disable (1), `useEffectEvent` dans `usePostOpFollowUp` (1). Résultat : 0 erreur tsc. Biome ne signale plus ces 7 sites ; il signale toujours les 2 autres sites des mêmes fichiers (`Parametres.tsx:361` et `:721`), que je n'ai pas touchés. `sidebar-tone.test.ts` et `theme-clean-charter.test.ts` passent (51 sur 51). ESLint ne donne aucune erreur. Il ajoute 2 avertissements `react-hooks/todo` (try/finally) dans `invoice-settings-panel.tsx` : avant, le `eslint-disable` faisait sauter ce hook au compilateur React. Ces avertissements sont coupés en CI (`process.env.CI`).
- **Ma recommandation :** appliquer les 7 sites sûrs. Traiter les 3 « manque » avec `useEffectEvent`, comme dans `usePostOpFollowUp`. Pour les 31 autres (déclencheurs et eslint-disable), garder les dépendances telles quelles avec `// biome-ignore lint/correctness/useExhaustiveDependencies: <raison>` : la raison est déjà écrite dans 7 commentaires, et pour les déclencheurs c'est le nom de ce qui doit relancer l'effet. Une autre voie est de mettre la règle en avertissement, ou de la couper, puisque `react-hooks` d'ESLint couvre déjà les dépendances manquantes.
- **Ce qui n'est pas prouvé.** Les boucles annoncées (`Parametres.tsx:361` si on ajoute `read`, `usePostOpFollowUp.ts:113` si on ajoute `loadPatients`) sont déduites du code (fonction recréée à chaque rendu qui pose un état), pas observées. Les 3 conversions `useEffectEvent` des sites « manque » n'ont pas été essayées. Le passage de `place` en `useCallback` dans `agenda-calendar.tsx` n'a pas été essayé non plus. Le caractère volontaire des 20 déclencheurs est lu sur le code ; un seul (`NotesPro.tsx:382`) a un commentaire qui le dit. Aucun test de composant ne couvre ces effets, et je n'ai pas lancé l'application.
