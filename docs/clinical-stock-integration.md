# Produits et activité clinique

## Périmètre et ordre de livraison

1. Consommation réelle lors de la validation d’un soin ou d’une utilisation en consultation. Mouvement daté, quantité explicite, origine et utilisateur. Aucune consommation à la signature d’une ordonnance.
2. Dispensation humaine d’une ordonnance signée : stock et facture brouillon dans une seule transaction, traçabilité et protection contre le double clic.
3. Lots avec numéro, quantité et péremption, sélection à la dispensation, FIFO sur la date de réception, exclusion des lots périmés, alerte de péremption.
4. Fournisseurs, commandes depuis les besoins de réapprovisionnement, réception transactionnelle et historique.
5. Code-barres, consommation issue des mouvements réels, proposition de seuil, emplacements et transferts conservant le stock total.

## Analyse REA du périmètre

**Ressources.** Le produit porte son unité, son tarif et son stock. Les prestations ne sont pas suivies en stock. Le mouvement est le registre d’une consommation, réception, correction ou transfert. Un lot et un emplacement précisent l’origine physique. L’ordonnance conserve les instructions cliniques, la facture les valeurs financières. Une quantité à sortir est saisie dans l’unité du stock : aucune conversion implicite des doses ni extraction d’une quantité depuis le texte libre.

**Événements.** Planifier ne consomme rien. Valider un soin consomme une fois, dans la transaction qui change son statut. Une insuffisance annule la transaction et conserve le statut antérieur. Dispenser crée ensemble les mouvements, les lignes de facture et la trace de dispensation. Émettre, modifier ou annuler une facture ne consomme pas une seconde fois. Réceptionner et transférer sont rejouables sans doubler les quantités. Les caches sont invalidés uniquement après commit.

**Agents.** Le vétérinaire confirme l’acte ou la dispensation et la quantité physique. L’équipe réceptionne et compte le stock. Le fournisseur est la source d’une réception. Le système contrôle disponibilité et cohérence, sans calculer de posologie. Les données patients et fournisseurs restent dans SQLite local.

## Direction UI (Operate, extension de l’existant)

- Audience : vétérinaire et équipe pendant les soins, au comptoir et à la réception.
- Tâche : trouver le produit, saisir la quantité, vérifier la disponibilité, confirmer une action traçable.
- Identité : composants Shadcn et tokens Baitari existants, thèmes Classique et Premium conservés, mascottes intactes.
- Hiérarchie : nom du produit et quantité au premier plan, unité et stock disponibles au second, origine et dates dans les détails.
- Interactions : recherche clavier, labels visibles, action principale précise, état occupé, erreur française explicite et conservation du formulaire si échec.
- Composition : ajouts compacts aux formulaires et panneaux existants, tableaux lisibles et messages utiles, aucune décoration ni nouveau chrome global.

## Invariants de données

- Écritures de stock sérialisées en transaction SQLite IMMEDIATE, lecture de la quantité actuelle dans la transaction.
- Un stock suivi ne devient jamais négatif par consommation. Les quantités décimales sont explicites et contrôlées.
- L’idempotence vérifie aussi le contenu de l’opération, pas seulement sa référence.
- Les soins déjà faits avant cette migration ne sont pas consommés rétroactivement.
- Les prix de facture restent modifiables en brouillon. La consommation physique reste indépendante des corrections financières.
- Aucun test n’ajoute de données à la base de la clinique.

## Preuves exigées

Après chaque lot cohérent : typecheck, lint strict, tests concernés, puis suite complète aux jalons. Tests SQLite réels en mémoire pour rollback, double consommation, séparation prescription/dispensation, facture, lots et FIFO, réception et transfert. Vérification rendue des surfaces modifiées, en passes bornées selon impeccable. Le périmètre complet n’est terminé qu’après validation de toutes les priorités ci-dessus.

## Extension REA : approvisionnement, lecture de codes et emplacements

**Ressources.** Le fournisseur possède une fiche archivable. Le bon de commande conserve ses lignes et les instantanés de nom, unité et coût d’achat. Une réception référence le bon, les lignes effectivement reçues et leurs mouvements. Le code-barres est une référence exacte et unique du produit, en conservant ses zéros initiaux. L’emplacement porte une identité stable; les allocations mémorisent son nom historique.

**Événements.** Préparer ou confirmer une commande ne modifie pas le stock. Une réception partielle ou complète ne peut dépasser le restant commandé et crédite le stock une seule fois. Une erreur sur une ligne annule toute la réception. Un bon reçu n’est pas effacé; annuler le reliquat d’un bon partiel conserve ses réceptions. Scanner identifie un produit, mais ne fait aucune écriture avant confirmation de l’entrée ou de la sortie et de la quantité. Transférer débite un emplacement et crédite l’autre en conservant lot, péremption, date de réception FIFO et total du produit. Un emplacement contenant du stock ne peut pas être désactivé. Les propositions de seuil reposent sur les sorties réelles d’une période explicite et ne s’appliquent qu’après clic humain.

**Agents et présentation.** L’équipe choisit fournisseur, quantités, date de réception et emplacement; le vétérinaire valide les utilisations cliniques. Le scanner est une saisie clavier, sans cloud ni caméra imposée. Les fiches fournisseurs, bons et réceptions prolongent les onglets Produits, avec formulaires recherchables, unités visibles, confirmation et erreurs françaises. L’historique fournisseur relie les bons, réceptions et mouvements existants, sans recréer leurs données. Les thèmes, mascottes et le header global restent hors périmètre.

## État

Le 15 octobre 2026, le nouvel objectif utilisateur demande explicitement l’intégration de la préparation des lots et l’achèvement des cinq priorités. Il remplace le maintien temporaire en isolation. L’autorisation finale **« Oui, activer la migration 033 et terminer »** couvre son raccordement. Les migrations **031 (lots), 032 (approvisionnements) et 033 (codes-barres et transferts)** sont enregistrées dans le projet principal, avec leurs services et interfaces. Les cinq priorités sont implémentées dans la version **3.3.15** : voir le [bilan complet et les preuves de livraison](clinical-stock-complete-2026-10-15.md). Les contrôles finaux rapportent typecheck sans erreur, lint sans erreur ni avertissement, **673 tests Vitest dans 87 fichiers**, 13 tests de licences, 13 tests Rust et **37 contrôles WebKit**. Trois tests Rust optionnels nécessitant des modèles IA ou le réseau sont exclus de cette passe. Aucun test n’écrit dans la base de la clinique. Les migrations s’appliquent au prochain démarrage normal de cette version; elles n’ont pas été exécutées sur la base de la clinique pendant les vérifications.

**Archive antérieure à l’autorisation d’intégration.** L’utilisateur avait choisi **« Garder la préparation isolée pour le moment »**. À ce stade seulement, la [préparation des lots et ses preuves](stock-lots-validation-2026-10-15.md) n’était pas intégrée : migration 031 non enregistrée et patch non appliqué. Son verdict UI borné portait sur deux corrections; le build livré était **3.3.14** et le principal comptait **642 tests dans 84 fichiers**. Ces éléments restent historiques et ne décrivent plus le statut courant.


## Bilan borné des priorités 1 et 2 — 14 octobre 2026

La revue fraîche de fin donne le verdict **ship** pour les parcours de consommation clinique et de dispensation décrits ici. Ce verdict porte sur ces deux priorités uniquement.

### Comportements implémentés

**Soins.** Le produit et la quantité physique sont enregistrés avant validation, dans l’unité du stock, sans calcul depuis la posologie. Planifier ou corriger un soin ne consomme rien. Une correction conserve son auteur dans l’historique. Toute modification de produit ou de quantité non enregistrée bloque « Valider le soin » et affiche l’action à effectuer. Au passage à « Fait », quantité disponible, mouvement, statut et historique sont traités dans la même transaction SQLite `IMMEDIATE`. Une insuffisance conserve le statut et le stock antérieurs. Un soin terminé ne peut plus changer de produit ou de quantité; les soins historiques ne sont pas consommés rétroactivement.

La facturation du soin suit le commit clinique : `billCompletedCareTask` crée un brouillon durable par soin et relie ses lignes au mouvement. Ce brouillon est idempotent; un échec de facturation est signalé et récupéré lors de l’actualisation des soins. Il ne déclenche aucune nouvelle consommation. Cette étape financière n’est pas dans la transaction qui valide le soin.

**Consultations.** La section « Produits utilisés » accepte un produit actif et une quantité explicite. La validation réunit consommation, mouvement, trace clinique et ligne de facture brouillon dans une seule transaction `IMMEDIATE`. Elle ajoute au brouillon de la consultation quand il existe, en conservant ses lignes; sinon, elle le crée. Un identifiant rejoué avec le même contenu retrouve l’utilisation enregistrée, tandis qu’un produit, patient, consultation ou quantité différents sont refusés. Les prestations sans suivi de stock ne produisent pas de mouvement physique.

**Ordonnances.** La signature ne consomme rien. « Dispenser » demande une ordonnance signée, un produit physique actif et une quantité humaine pour chaque ligne. Les quantités d’un même produit sont additionnées avant le contrôle de disponibilité. Stock, brouillon, liens aux lignes de facture, trace de dispensation et statut `dispensed` (« Délivrée ») sont enregistrés ensemble; un échec annule l’ensemble. Le bouton occupé, l’unicité de la dispensation par ordonnance et la comparaison du contenu protègent contre le double clic et les réessais divergents. Des triggers SQLite protègent aussi le contenu de l’ordonnance dispensée.

**Traçabilité et tarifs.** Les mouvements conservent date, origine Soin/Consultation/Ordonnance, patient, auteur et liens de facture. Les nouveaux mouvements mémorisent le nom et l’unité du produit; « Variation » et « Solde » affichent cette unité près du nombre, même si le catalogue change ensuite. Les mouvements anciens sans instantané utilisent encore le catalogue comme repli. Les tarifs restent modifiables en brouillon, avec recalcul du total et conservation des identifiants de lignes; modifier ou émettre la facture ne consomme pas le stock une seconde fois. Les quantités physiques acceptent jusqu’à six décimales; les lignes financières restent en milli-unités et conservent la quantité physique dans le libellé lorsqu’elle est plus précise.

### Migrations enregistrées

| Version | Portée effective |
| --- | --- |
| 028 — `clinical-stock-consumption` | Suivi physique du produit, quantité du soin, origine et relations du mouvement, index d’unicité des consommations cliniques. |
| 029 — `clinical-stock-dispensing` | Utilisations en consultation, dispensations et lignes associées, unicité par ordonnance, protection SQLite du contenu dispensé. |
| 030 — `stock-movement-identity-snapshots` | Colonnes de nom et d’unité mémorisés, renseignées par les nouveaux mouvements. |

Sources : [service clinique](../src/modules/stock/services/clinical-stock-store.ts), [transactions de stock](../src/modules/stock/services/stock-store.ts), [soins](../src/modules/care-tasks/store.ts), [récupération de facturation](../src/modules/care-tasks/service.ts), [facturation](../src/services/billingService.ts) et [registre des migrations](../src/services/sqlite/migrations.ts).

### Concordance avec le système existant

Le contrat [Stock clinique, mode Operate](../.impeccable/surfaces/src-modules-stock-pages-stock-page-tsx.md) est respecté par l’extension des formulaires et tableaux existants : produit recherchable, quantité et unité voisines, disponibilité avant confirmation, puis origine et lien de facture. Les captures conservent surfaces neutres, labels visibles, nombres tabulaires, focus visible, états désactivés et erreurs écrites. Clair et sombre gardent les mêmes informations; la consultation reste lisible à 820 px. Aucun concept alternatif, comp ou nouvel asset raster n’est requis pour cette extension ordinaire.

[PRODUCT.md](../PRODUCT.md), [DESIGN.md](../DESIGN.md) et [le sidecar](../.impeccable/design.json) servent d’autorité existante et restent inchangés. Les limites préexistantes déjà consignées sur les vues classiques et la vérification native ne sont pas requalifiées par ces captures ciblées. Aucun rafraîchissement ni réparation de drift n’a été effectué.

### Preuves vérifiées

Le dossier [clinical-stock-2026-10-14](../.impeccable/review/clinical-stock-2026-10-14/) contient des captures des composants réels dans WebKit, avec SQLite isolée et données de validation. Chaque vue porte la mention d’isolation. Les vues desktop sont à 1400 × 800; `consultation-compacte.png` est à 820 × 800. Ces preuves ne constituent pas une validation du rendu Tauri natif ni une écriture dans la base de la clinique.

| Parcours observé | Captures |
| --- | --- |
| Quantité réelle en consultation, puis trace et facture | [avant validation](../.impeccable/review/clinical-stock-2026-10-14/consultation-avant-validation.png), [utilisation validée](../.impeccable/review/clinical-stock-2026-10-14/consultation-stock-valide.png) |
| Soin, quantité visible, insuffisance, correction enregistrée et validation | [liste](../.impeccable/review/clinical-stock-2026-10-14/soins-quantite-et-insuffisance.png), [insuffisance](../.impeccable/review/clinical-stock-2026-10-14/soin-detail-stock-insuffisant.png), [correction](../.impeccable/review/clinical-stock-2026-10-14/soin-detail-quantite-corrigee.png), [soin validé](../.impeccable/review/clinical-stock-2026-10-14/soin-valide.png) |
| Correction de revue : validation bloquée tant que l’édition n’est pas enregistrée | [modification non enregistrée](../.impeccable/review/clinical-stock-2026-10-14/soin-modification-non-enregistree.png) |
| Dispensation explicite, confirmation et trace | [à relire](../.impeccable/review/clinical-stock-2026-10-14/dispensation-a-relire.png), [enregistrée](../.impeccable/review/clinical-stock-2026-10-14/dispensation-enregistree.png), [thème sombre](../.impeccable/review/clinical-stock-2026-10-14/dispensation-sombre.png) |
| Facture exacte et accès aux tarifs du brouillon | [facture liée](../.impeccable/review/clinical-stock-2026-10-14/facture-trace.png) |
| Correction de revue : unité mémorisée près des variations et soldes | [mouvements clairs](../.impeccable/review/clinical-stock-2026-10-14/mouvements-clair.png), [mouvements sombres](../.impeccable/review/clinical-stock-2026-10-14/mouvements-sombre.png) |
| Largeur réduite en sombre | [consultation à 820 px](../.impeccable/review/clinical-stock-2026-10-14/consultation-compacte.png) |

[verification.json](../.impeccable/review/clinical-stock-2026-10-14/verification.json) rapporte **9 contrôles réussis**, aucune erreur JavaScript, `productionWrites: false`, trois mouvements et un solde final de **4,25 ml** après 2,25 ml en consultation, 1,5 ml dispensé et 2 ml lors du soin. Le lien de facture et la modification de tarif ont été exercés dans la vraie UI. `failure.png` est un diagnostic d’un passage interrompu antérieur et est exclu de la preuve finale.

Le passage final du 14 octobre, consigné dans l’historique de la tâche, a terminé avec typecheck réussi, ESLint strict sans erreur ni avertissement et **622 tests Vitest réussis dans 83 fichiers**, dont le test de conservation du nom et de l’unité après modification du catalogue. Les tests SQLite couvrent notamment l’insuffisance et le rollback, le rejeu, la séparation prescription/dispensation, la facture et ses liens. Aucun journal dédié n’a été créé pour ce passage.

### Suite du périmètre

Le bilan du 14 octobre ci-dessus reste historique et limité aux deux premières priorités. Le [bilan complet du 15 octobre](clinical-stock-complete-2026-10-15.md) couvre les lots intégrés, les approvisionnements, les codes-barres, les propositions de seuil, les transferts et le build 3.3.15. Les preuves anciennes sont conservées sans être présentées comme la validation de la nouvelle version.
