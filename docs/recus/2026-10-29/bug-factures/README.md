# Deux factures INV-2026-000017 : diagnostic (29 octobre 2026)

Branche `feat/dictee-turbo-native`. Diagnostic le 29/10 au matin, puis correctifs A et B appliqués à ta demande (§ 7). Commit local, aucun push.

## Conclusion

**La base réelle n'a jamais émis deux fois le même numéro.** Sa séquence est continue, de 1 à 17, et son compteur est à 18. Les fichiers 000015, 000016 et 000017 du Bureau ont d'abord été exportés depuis **une autre base** : une copie de la base réelle, faite pour une instance de test. Cette copie a continué la numérotation à partir du même compteur, de son côté.

Plus tard, la base réelle a émis ses propres factures 15, 16 et 17. Elle a proposé les mêmes noms de PDF, dans le même dossier. Le panneau d'enregistrement de macOS a demandé de remplacer le fichier existant, et `writeFile` l'a réécrit sur place. Le fichier garde donc sa date de création d'origine, ce qui a laissé l'empreinte.

**Cause prouvée pour 16 et 17.** Le 20/10, l'instance de test, lancée avec `BAITARI_DATA_DIR=…/phase3/data`, a émis :
- `INV-2026-000016` (5 000 DA) ;
- `INV-2026-000017` (Mocha, 3 000 DA).

Sa base était une copie de la base réelle, prise à 10:52 UTC alors que le compteur était à 16.

**Pour le 000015, même empreinte, origine non retrouvée.** Le fichier a été créé le 12/10. Aucun transcript antérieur au 17/10 n'existe, et cette base n'existe plus.

## 1. Les quatre questions, et ce qui en a été retenu

| Question | Réponse | Retenu ? |
|---|---|---|
| (1) Ce que ferait un professionnel de premier plan | Lire les données (lignes, dates, journal d'audit) avant le code ; comparer le contenu des PDF ; vérifier les sauvegardes, pour savoir s'il y a eu une restauration ; ne jamais renuméroter une facture émise. | **Retenu**, sauf la consultation de Time Machine : les sauvegardes de l'app suffisaient pour dater le compteur. |
| (2) La matière la plus brute | Les lignes `invoices`, `billing_sequences` et `audit` ; les dates système des PDF (création et modification) ; leur texte ; les sauvegardes `BAITDB` ; les transcripts des sessions de test. | **Retenu.** La date de création des PDF a ouvert la piste. Le fichier WAL n'a pas été analysé à part : `.backup` l'intègre. |
| (3) Méthodes et outils | `sqlite3` en lecture seule sur une sauvegarde ; `stat -f %SB/%Sm` ; `strings` sur les PDF (`pdftotext` est absent du Mac) ; extraction du SQLite des conteneurs `BAITDB` ; `grep` du code ; reproduction dans des instances isolées. | **Retenu.** `git log -S` n'a pas servi : il n'existe qu'un seul générateur de numéros. |
| (4) Ce qui prouve le résultat, hors de nous deux | La base elle-même ; les dates système, alignées à la seconde avec le journal de la session de test ; le contenu des PDF ; une reproduction qui redonne le même doublon. | **Retenu**, voir § 2 à 4. |

## 2. Les requêtes et leurs résultats

Toutes les requêtes portent sur une sauvegarde de la base réelle, faite en lecture seule (`sqlite3 "file:…?mode=ro" ".backup"`).

```sql
SELECT id, number, document_status, issued_at FROM invoices WHERE number LIKE 'INV-2026%';
```

Résultat : 17 lignes, de `INV-2026-000001` à `INV-2026-000017`, **une seule par numéro**, toutes `issued`. Les dernières :

| number | issued_at (UTC) | Patient | Montant |
|---|---|---|---|
| INV-2026-000015 | 2026-10-18 00:10:36 | Kejounti | 6 000 DA |
| INV-2026-000016 | 2026-10-25 21:12:40 | Dora | 3 000 DA |
| INV-2026-000017 | 2026-10-27 17:34:05 | Rifka | 16 000 DA |

```sql
SELECT * FROM billing_sequences;
```

Résultat : `invoice|2026|18`. Le compteur est cohérent avec le maximum émis, 17.

**Sauvegardes automatiques** (`backups/`, conteneurs `BAITDB` non chiffrés, SQLite à l'octet 40) :

| Sauvegarde | Dernière facture | `next_value` |
|---|---|---|
| 17/10 19:58Z, puis 20:04Z et 20:10Z | 000014 | 15 |
| 18/10 01:44Z, puis 15:43Z et 20:49Z | 000015 | 16 |

Le compteur n'est jamais revenu en arrière.

**Dates système des PDF, comparées à la base réelle.** Heure du Mac : EDT, UTC−4.

| Fichier | Créé le | Modifié le | Émission dans la base réelle | Émission dans la base de test du 20/10 |
|---|---|---|---|---|
| Bureau 000015 | **12/10 09:52** | 17/10 20:10:41 | 17/10 20:10:36 | origine inconnue |
| Bureau 000016 | **20/10 18:09:04** | 25/10 17:12:45 | 25/10 17:12:40 | **20/10 18:08:51** (journal d'audit `issue-invoice`) |
| Bureau 000017 | **20/10 18:14:44** | 27/10 13:34:50 | 27/10 13:34:05 | **20/10 18:14:26** (`billing → done`) |
| Documents 000008, 09, 10, 13 | — | = création | à la même minute | — |

- **Date de création :** elle correspond à l'émission dans la base de test.
- **Date de modification :** elle correspond à l'émission dans la base réelle.
- **Contenu actuel des trois PDF du Bureau** (lu avec `strings`) : celui des factures réelles (6 000, 3 000 et 16 000 DA). Les PDF de test ont été écrasés.

## 3. Les hypothèses

| Hypothèse | Verdict | Preuve |
|---|---|---|
| **Retenue : une copie de la base (instance de test) numérote en parallèle de la base réelle, et exporte vers les mêmes noms et le même dossier** | **Prouvée pour 16 et 17** | Dates système alignées à la seconde avec le journal de la session du 20/10. La reproduction redonne le doublon (§ 4). |
| (1) Un second chemin d'émission utilise un compteur hors de `billing_sequences` | Écartée | `INV-` n'est fabriqué qu'à un seul endroit, `formatOfficialNumber`, appelé par `allocateOfficialNumber` (`billingService.ts:969`). Aucun compteur dans `invoice-settings-panel` ni en `localStorage` (son seul numéro est `EXEMPLE-001`, pour l'aperçu). |
| (2) `billing_sequences` perdu ou restauré | Écartée | Aucune restauration : les sauvegardes montrent un compteur qui ne recule jamais, et la base n'a ni trou ni doublon. |
| (3) Deux processus ouvrent la même base | Écartée pour ce symptôme | La base réelle n'a aucun doublon, ce que `invoices.number UNIQUE` aurait d'ailleurs refusé. L'instance de test tournait sur sa propre copie. |

## 4. Reproduction

**Scénario :** `scripts/eval-local-ai/capture-factures.ts`. Il émet de vraies factures par `createInvoiceDraft` puis `issueInvoice`, le chemin de l'écran de facturation, dans une instance isolée. Les deux bases sont deux copies de la même sauvegarde de la base réelle, avec un compteur à 18. Le code de facturation est identique dans la copie du Bureau et dans l'original (`billingService.ts`, `invoice-pdf.ts`, `save-pdf.ts`, `schema.ts`, `clinic_database.rs`) : la reproduction tourne avec celui de l'original.

| Étape | Base | Numéros émis | Compteur après | Nom de PDF proposé |
|---|---|---|---|---|
| 1. Deux factures à la suite | copie | 000018, 000019 | 20 | `Facture-INV-2026-000018.pdf`, `…000019.pdf` |
| 2. Une facture | original | 000018 | 19 | `Facture-INV-2026-000018.pdf` |
| 3. Une facture, après relance | original | 000019 | 20 | `Facture-INV-2026-000019.pdf` |

Preuves : `repro-*.json` et `repro-*.txt`.

- **Dans une même base :** les numéros sont distincts et croissants, y compris après une relance. La première moitié du critère d'acceptation est déjà vraie.
- **Entre les deux bases :** deux factures différentes portent `INV-2026-000018` (ids `mvtrb8c2…` et `mvtrbnvu…`), puis `000019`, avec le même nom de PDF. C'est le symptôme du 27/10.

La partie « après » est au § 7.

## 5. Correctif proposé (appliqué ensuite, voir § 7)

Le numéro officiel est correct dans chaque base. Il ne faut pas toucher à la numérotation des factures déjà émises. Ce qui manque :
- un nom de PDF unique ;
- une séparation claire entre les bases de test et la base réelle.

**A. Nom de PDF unique** (`src/lib/invoice-pdf.ts`, une ligne, sans schéma). Ajouter au nom un court extrait de l'identifiant interne de la facture, propre à chaque ligne de chaque base :

```
Facture-INV-2026-000017-mvqwrp8a.pdf
```

Deux factures différentes ne proposent plus jamais le même nom, même venant de deux bases. Le numéro légal reste en tête, pour le classement.

**B. Factures de test reconnaissables** (debug seulement, sans schéma). Quand l'app tourne en build debug sur un dossier de données de test (`BAITARI_DATA_DIR`), le PDF porte la mention « TEST — sans valeur » et son nom commence par `TEST-`. Le numéro officiel en base n'est pas modifié. Ce point touche `clinic_database.rs`, qui doit exposer l'information, et le rendu du PDF.

**Non proposé :** préfixer le numéro officiel en base par installation. Cela changerait le format légal et demanderait un changement de schéma : je te le signale, mais je ne le recommande pas.

Je recommande **A**. **B** est un complément. Après application, je rejouerai la même reproduction pour la partie « après » : numéros inchangés, noms de PDF distincts.

## 6. Limites

- L'origine exacte du 000015 du 12/10 n'est pas retrouvée.
- Les PDF de test des 12 et 20/10 sont perdus, écrasés. Seul le journal de la session du 20/10 en garde le contenu (montants et patient).
- Aucun changement dans le code de l'app. Seuls le scénario de reproduction et son branchement dans `capture-scenario.ts` ont été ajoutés. Typecheck et ESLint à zéro.

## 7. Correctifs A et B appliqués (29/10, après ton choix)

Le numéro enregistré en base ne change pas, et l'historique des factures émises n'est pas touché : aucune ligne n'est réécrite, et il n'y a ni migration ni changement de schéma. Seul le **nom proposé** à l'export change, y compris quand on réexporte une ancienne facture.

### Écart avec la proposition, et pourquoi

La proposition A parlait d'un extrait de l'**identifiant interne**. L'identifiant seul ne suffit pas : une facture de rendez-vous a pour id `appointment-invoice-<rendez-vous>`. Deux copies qui facturent la même visite auraient donc le même id et le même numéro.

L'extrait est donc une **empreinte courte (7 caractères) de l'identifiant et de l'instant d'émission**. Elle reste stable pour une même facture : la réexporter propose toujours le même nom. Deux émissions différentes, en revanche, donnent deux empreintes différentes. La reproduction couvre ce cas (même visite, § ci-dessous).

### Changements

| Fichier | Changement |
|---|---|
| `src/lib/invoice-pdf.ts` | Ajoute `invoiceFileKey(id, issuedAt)`, une empreinte FNV-1a sur 7 caractères en base 36. Ajoute `invoicePdfFileName(data, { test, sample })`, qui donne `[TEST-][Exemple-]Facture-<numéro>-<empreinte>.pdf`. `buildInvoicePdf(…, { test })` ajoute le bandeau rouge « TEST — sans valeur… » et un grand « TEST » translucide sur chaque page, et préfixe le titre du document. `exportInvoicePdf` se renseigne sur le dossier de données. |
| `src/lib/invoice-document.ts` | Ajoute `fileKey` aux données du PDF. |
| `src/modules/invoices/components/invoice-pdf-preview.tsx` | Le second chemin d'export, l'aperçu de Finances, fabriquait son propre nom. Il passe désormais par `invoicePdfFileName`, avec le marquage. |
| `src/lib/test-data-folder.ts` | Ajoute `isTestDataFolder()`, posée une seule fois, qui vaut toujours `false` hors Tauri. |
| `src-tauri/src/clinic_database.rs`, `main.rs` | Ajoute la commande `is_test_data_folder`. Elle répond **vrai seulement en build debug**, quand `BAITARI_DATA_DIR` est donné, ou quand le HOME diffère de celui du compte (lu par `getpwuid`, pas dans `$HOME`). En release, elle répond toujours **faux**. |
| `src-tauri/Cargo.toml` | Ajoute `libc = "0.2"` pour Unix. La bibliothèque était déjà dans `Cargo.lock`, à travers les dépendances existantes. |

Un `npm run tauri:dev` sur ta base réelle (debug, ton propre HOME) n'est **pas** marqué TEST : ce sont tes vraies données.

### Reproduction après

Même méthode qu'au § 4 : chaque base est une copie de la même sauvegarde de la base réelle, avec un compteur à 18. Les PDF sont produits par le chemin réel d'export (`invoiceDocument`, puis `invoicePdfFileName` et `buildInvoicePdf`).

| Étape | Lancement | Facture | Numéro | Nom de PDF proposé |
|---|---|---|---|---|
| 4. Copie, deux à la suite | HOME emprunté | id `appointment-invoice-memevisite-1`, puis `-2` | 000018, puis 000019 | `TEST-Facture-INV-2026-000018-1f88mg5.pdf`, `TEST-Facture-INV-2026-000019-1fi0htw.pdf` |
| 5. Original, **même visite** | HOME emprunté | id `appointment-invoice-memevisite-1` | 000018 | `TEST-Facture-INV-2026-000018-1d08nee.pdf` |
| 6. Lancement du 20/10 | `BAITARI_DATA_DIR` | id aléatoire | 000018 | `TEST-Facture-INV-2026-000018-0upg2b9.pdf` |

- **Numéros :** inchangés. Ils restent distincts et croissants dans chaque base.
- **Noms :** même numéro, et même id de facture aux étapes 4 et 5, mais trois noms différents. Deux copies de la même sauvegarde ne proposent plus le même nom.
- **Marquage :** les trois lancements de test sortent marqués, dans le nom comme sur le PDF (`pdf-apres/apercu-test.jpg`).
- **Base réelle :** intacte après tout cela. `next_value` vaut toujours 18, avec 17 factures `INV-2026`.

Preuves : `repro-4…6-*.json` et `.txt`, ainsi que les PDF dans `pdf-apres/`.

### Vérifications

- **Vitest :** 1 283 verts, dont 4 nouveaux (`tests/services/invoice-pdf-file-name.test.ts`) qui couvrent :
  - l'empreinte stable ;
  - deux factures d'un même numéro ;
  - une même visite dans deux copies ;
  - le marquage TEST, et son absence hors test ;
  - le passage des deux chemins d'export par la même fonction.
- **Rust :** `account_home_is_the_unborrowed_home` est vert : le HOME du compte n'est pas pris pour un dossier de test.
- **Typecheck et ESLint :** zéro.
- **Clippy :** 2 avertissements, déjà présents, dans `dictation.rs` et hors périmètre.

### Non couvert

- Les PDF de test déjà exportés avant ce correctif ne sont pas renommés : les 15, 16 et 17 du 12 et du 20/10 sont de toute façon écrasés.
- Le build release n'a pas été recompilé. La commande y renvoie `false` par construction (`cfg(debug_assertions)`).
