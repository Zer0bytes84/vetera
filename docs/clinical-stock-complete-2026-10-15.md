# Produits et clinique, livraison 3.3.15

## Périmètre livré

Les cinq priorités de l’objectif sont implémentées dans le projet principal. L’accord humain final autorise la migration 033 et l’onglet Opérations; il complète l’objectif qui a remplacé le maintien temporaire de la préparation des lots en isolation. La base de la clinique n’est jamais utilisée comme base de test.

| Priorité | Comportement livré |
| --- | --- |
| Consommation clinique | Un soin validé consomme une seule fois la quantité explicitement saisie dans l’unité du stock. Statut, historique et mouvement sont transactionnels. Une insuffisance conserve le statut et le stock antérieurs. La consultation propose aussi une utilisation explicite avec trace et facture. |
| Lots et péremptions | Stocks existants repris sans inventer de lot ni modifier le total. Identification du stock existant, réception, comptage par réception, péremption et quantités utilisables. Le FIFO suit la date de réception. Les lots périmés et les réceptions futures sont exclus de la consommation clinique. |
| Dispensation et facturation | Signer une ordonnance ne consomme rien. La dispensation demande produit, quantité réelle et choix de lot, puis enregistre ensemble consommation, trace, facture brouillon et statut. Les tarifs du brouillon restent modifiables; émettre la facture ne consomme pas de nouveau le stock. |
| Approvisionnements | Fiches fournisseurs archivables, historique, bons brouillon puis confirmés, bon PDF local, réceptions partielles ou complètes avec date, heure, lot, péremption et emplacement. Une réception ne peut dépasser le restant commandé. Annulation de commande ou de reliquat avec confirmation nommée et conservation des réceptions. |
| Opérations | Association exacte des codes-barres, zéros initiaux conservés; identification sans écriture, puis entrée ou sortie explicitement confirmée. Consommation sur 30 jours issue des sorties réelles, proposition de seuil couvrant 14 jours appliquée uniquement par l’utilisateur. Emplacements et transferts conservent lot, péremption, date FIFO et total du produit. |

Les quantités sont physiques et explicites, avec jusqu’à six décimales. Aucune conversion de conditionnement ni extraction depuis une posologie. Les quantités financières en milli-unités conservent la quantité physique plus précise dans le libellé. Aucun calcul de dose n’est introduit.

## Écritures, conservation et reprise

Les transactions de stock utilisent SQLite `IMMEDIATE`. Les consommations, réceptions et transferts relisent leurs données dans la transaction; une erreur annule l’opération. Le rejeu compare aussi son contenu afin de refuser une référence réutilisée pour une autre quantité ou une autre sélection.

La facturation d’un soin intervient **après** le commit clinique, avec une référence idempotente et une récupération des facturations en attente. Elle ne fait pas partie de la transaction qui change le statut du soin et ne consomme jamais une seconde fois. En consultation et en dispensation, consommation, trace et facture sont atomiques.

Les historiques conservent noms, unités, lots et emplacements mémorisés. Un produit portant du stock ou des relations historiques reste archivable; les contraintes empêchent les suppressions qui casseraient ces relations. Un emplacement contenant du stock ne peut pas être désactivé. Les soins terminés avant la mise en place du suivi ne sont pas débités rétroactivement.

| Migration | Raccordement principal |
| --- | --- |
| 028, 029, 030 | Consommation clinique, dispensation et instantanés des mouvements. |
| 031 | Lots, emplacements, soldes par réception, allocations, comptage et opérations d’inventaire. |
| 032 | Fournisseurs, commandes, lignes, réceptions et liens aux mouvements. |
| 033 | Codes-barres et transferts entre emplacements. |

Les migrations sont enregistrées dans [le registre](../src/services/sqlite/migrations.ts) et testées sur SQLite isolée. Leur activation sur la base de la clinique se produit au démarrage normal du nouveau build; aucune migration de cette base n’a été lancée pendant les tests. La version 3.3.14 déjà ouverte a été préservée.

## Vérifications finales

| Contrôle | Résultat |
| --- | --- |
| `npm run typecheck` | 0 erreur. |
| `npm run lint -- --max-warnings 0` | 0 erreur, 0 avertissement. |
| `npm test` | **673 tests réussis dans 87 fichiers**. |
| `npm run test:licenses` | **13 tests réussis**. |
| `cargo test --manifest-path src-tauri/Cargo.toml` | **13 tests réussis**, 3 tests optionnels IA/réseau ignorés. |
| Frontend de production | Build réussi, 3 893 modules transformés. |
| `npm run check:startup` | Réussi : JavaScript initial **274,8 kB gzip**, sous la limite du projet. |
| Parcours WebKit | **37 contrôles réussis**, aucune erreur JavaScript, aucune écriture de production. |

Les trois exclusions Rust exigent explicitement des fichiers de modèles IA ou un téléchargement réel; elles ne sont pas présentées comme des tests passés. Les avertissements de Vite sur les imports dynamiques et les gros chunks restent distincts d’ESLint. Le contrôle du bundle initial passe.

Les validations par priorité ont été conduites séparément : soins et stock clinique, lots/FIFO, dispensation/tarifs, approvisionnements, puis opérations. Les contrôles ciblés sont inclus dans la suite globale; ils ne sont pas ajoutés aux 673 pour gonfler le total.

| Parcours rendu | Contrôles | Ce qui est effectivement vérifié |
| --- | --- | --- |
| Clinique et facturation | 9 | Consultation, dispensation, quantité d’un soin, blocage avant enregistrement, facture exacte, tarif éditable, mouvements et unités. |
| Lots | 8 | Identification sans augmenter le stock, réception, comptage isolé, sélection insuffisante, lot dispensé et périmé exclu. |
| Approvisionnements | 8 | Fournisseur, commande depuis le manque réel, PDF généré, réception partielle puis reliquat, confirmations d’annulation et conservation des données. |
| Opérations | 12 | Onglet principal et migration 033, code exact, entrée/sortie, erreur de quantité accessible, détail des allocations, seuil manuel, transfert, second emplacement et consommation clinique après transfert. |

Sources de tests : [clinique](../tests/modules/stock/clinical-stock.test.ts), [FIFO](../tests/modules/stock/fifo.test.ts), [lots](../tests/modules/stock/lots.test.ts), [dispensation](../tests/modules/stock/dispensing.test.ts), [approvisionnements](../tests/modules/stock/purchasing.test.ts), [opérations](../tests/modules/stock/operations.test.ts), [alertes](../tests/modules/stock/alerts.test.ts) et [migrations](../tests/sqlite/migration-runner.test.ts).

## Preuves visuelles et revue

Le [reçu consolidé](../.impeccable/review/clinical-stock-complete-2026-10-15/receipt.json) inventorie **50 captures** avec dimensions et SHA-256. Elles montrent les composants React réels dans WebKit, avec l’adaptateur de stockage vers une base SQLite en mémoire et un libellé explicite de validation isolée. Les captures clair/sombre utilisent 1 400 px et 820 px de largeur. L’hôte de capture déplie temporairement hauteur et débordement du document pour photographier les formulaires complets, sans modifier leurs styles.

| Sujet | Capture de référence |
| --- | --- |
| Réception de commande avec lot | [Formulaire à confirmer](../.impeccable/review/clinical-stock-complete-2026-10-15/purchasing/reception-partielle-a-confirmer.png) |
| Commande et reliquat | [Confirmation nommée](../.impeccable/review/clinical-stock-complete-2026-10-15/purchasing/confirmation-annuler-reliquat.png) |
| Quantité insuffisante | [Message et champ associés](../.impeccable/review/clinical-stock-complete-2026-10-15/operations/sortie-stock-insuffisant.png) |
| Traçabilité physique | [Lot et emplacement du mouvement](../.impeccable/review/clinical-stock-complete-2026-10-15/operations/mouvement-lots-emplacements.png) |
| Consommation en sombre | [Tableau et seuil proposé](../.impeccable/review/clinical-stock-complete-2026-10-15/operations/consommation-premium-sombre.png) |
| Transfert à largeur réduite | [Formulaire à 820 px](../.impeccable/review/clinical-stock-complete-2026-10-15/operations/transfert-compact-sombre.png) |

La revue fraîche indépendante des nouvelles surfaces Approvisionnements et Opérations a examiné les 22 captures initiales requises. Elle a demandé trois corrections matérielles : confirmation nommée des annulations, insuffisance de stock explicitement annoncée et associée au champ, contraste des liens en sombre. Le verdict a scoré ces trois corrections **resolved**. La régression de contraste du nouveau bouton de confirmation a ensuite été corrigée et scorée **resolved**, avec le verdict final **ship** limité à cette correction. Les contrastes mesurés sont de 9,60:1 et 8,45:1 pour les liens sombres, 5,06:1 et 5,05:1 pour les confirmations.

Le rôle spécialisé de revue n’étant pas exposé, un agent général indépendant a appliqué le contrat dégradé. Le documenteur séparé a échoué sur une limite de session; la vérification documentaire a donc été réalisée directement selon son contrat dégradé. Ces substitutions sont déclarées, sans présenter la documentation comme une deuxième revue indépendante.

## Concordance avec le design existant

Cette extension code-led respecte [le contrat Stock clinique en mode Operate](../.impeccable/surfaces/src-modules-stock-pages-stock-page-tsx.md). [PRODUCT.md](../PRODUCT.md), [DESIGN.md](../DESIGN.md) et [le sidecar](../.impeccable/design.json) sont conservés. Aucun nouveau raster de livraison n’est ajouté; les PNG du reçu sont des preuves de test, pas des assets de l’app.

1. Palette : surfaces neutres existantes et bleu Premium, couleurs sémantiques réservées aux états.
2. Typographie : familles configurées existantes, hiérarchie compacte et nombres tabulaires.
3. Rythme : champs de 44 px, groupes espacés et séparateurs fins.
4. Composition : onglets Produits étendus, tableaux adaptatifs, formulaires en ligne et confirmations des actions sensibles.
5. États : quantité et unité voisines, disponibilité avant validation, erreurs françaises accessibles, focus et état occupé.

Le descriptif global du primaire violet et de Geist ne couvre pas tous les overrides Premium préexistants, qui utilisent notamment le bleu et la police système. Cet écart de couverture est signalé sans modifier les tokens ou réécrire le système. Le header global, les mascottes et les autres modules ne sont pas repolis dans ce chantier.

## Build macOS et lancement

Le binaire **3.3.15** est compilé pour **arm64**. Le paquet `.app` passe `codesign --verify --deep --strict`. Le DMG passe la vérification d’intégrité, puis son application a été contrôlée après montage en lecture seule : signature valide, version 3.3.15, contenu identique au paquet signé et raccourci Applications présent. La compilation Rust a été effectuée une seule fois, en 4 minutes. Le conditionnement initial a nécessité une correction de signature locale; le DMG final a ensuite été recréé depuis l’app signée, sans recompiler Rust.

- [Application signée](../src-tauri/target/aarch64-apple-darwin/release/bundle/macos/Baitari.app)
- [DMG Apple Silicon, 57,8 Mo](../src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/Baitari_3.3.15_aarch64.dmg)
- [Reçu de compilation et de vérification](../.impeccable/review/clinical-stock-complete-2026-10-15/release.json)

SHA-256 du DMG : `725cc6e7c64c9b78388353eca5e2ffb44b9b25b53304cbc4741098403066b9e9`.

Commande de lancement après fermeture de l’ancienne version :

```sh
open "/Users/zohir/Documents/08 - Projets numériques/Projects 2026/BAITARI 2.1/bAItari/src-tauri/target/aarch64-apple-darwin/release/bundle/macos/Baitari.app"
```

Le build test est signé **ad hoc**, sans notarisation Apple. Les contrôles rendus décrits ici portent sur WebKit isolé; ils ne constituent pas une validation exhaustive de l’interface native Tauri et ne prétendent pas avoir migré la base de la clinique.

## Parcours de validation humaine

Fermer la version 3.3.14 avant d’ouvrir la nouvelle version. Dans Produits :

1. **Lots** : identifier un stock existant, réceptionner un lot avec quantité réelle et péremption, puis vérifier le disponible et le journal.
2. **Approvisionnements** : préparer un bon, le confirmer, réceptionner une partie puis le reliquat; vérifier que l’annulation du reliquat préserve les réceptions.
3. **Opérations** : associer un code, l’identifier, confirmer une sortie; vérifier le lien vers les mouvements et leurs lots/emplacements.
4. **Emplacements** : transférer une quantité et vérifier que le total global est conservé. Un emplacement contenant du stock reste protégé contre la désactivation.
5. Valider un soin ou une utilisation en consultation, puis retrouver la consommation et la facture brouillon. Vérifier le tarif avant émission. Une signature d’ordonnance seule ne doit pas modifier le stock.
