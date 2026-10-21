# Vérification sur les données réelles (tauri:dev, lecture seule)

Date : 21 octobre 2026, 15 h. Un commit local de corrections (`e365a9b`), aucun push.

## Méthode, et ce qu'elle n'a pas permis

- **Aucune écriture dans la base réelle.**
  - Afficher Soins ou Rappels peut écrire : facturation des soins faits, synchronisation des rappels du planning. L'instance `tauri:dev` déjà ouverte depuis 9 h 53 sur la base réelle n'a donc pas servi à naviguer.
  - J'ai fait une copie cohérente de la base avec la sauvegarde SQLite, ouverte en lecture seule (`mode=ro`).
  - J'ai lancé une seconde instance sur cette copie (`BAITARI_DATA_DIR`).
- **Le pilotage de l'interface n'a pas été possible.** Les outils de contrôle de l'ordinateur ne sont pas disponibles dans cette session.
  - **Premier essai, AppleScript.** Les deux instances portent le même nom, et macOS a mis au premier plan l'instance réelle au lieu de la copie. Deux saisies sont parties vers le premier plan avant que je m'en aperçoive : un clic au point (150, 850) de l'écran suivi d'une ligne de texte, puis la lettre « a ». J'ai arrêté immédiatement.
  - **Contrôle de la base réelle, aussitôt fait :** son contenu complet, comparé à la sauvegarde, ne diffère que par deux réglages techniques (date de recherche de mise à jour, jeton de licence) renouvelés automatiquement. **Aucun patient, rendez-vous, soin, facture, règlement, note ou rappel n'a changé.** Un dernier contrôle en fin de séance montre la même chose.
  - **Deuxième essai, envoi d'événements ciblé par processus :** refusé par le mode automatique. Je ne l'ai pas contourné.
- **Ce que j'ai fait à la place :**
  - j'ai recalculé, à partir des données réelles, ce que chaque écran doit afficher selon le code des greffes ;
  - je l'ai comparé à ce qui était visible à l'écran quand c'était possible ;
  - j'ai lu le code des chemins concernés.

  Les écrans qu'il faudrait ouvrir à la main sont signalés plus bas.

## Incident et suites (mise à jour de 15 h 20)

- **Incident :** aucune donnée clinique n'a été modifiée, dans aucune instance. Le détail, les preuves et les étapes de remise en état (préparées, non exécutées) sont dans `INCIDENT.md`. Depuis le constat, l'app réelle n'a plus été touchée.
- **Corrections `e365a9b` :** validées sur le principe. Il reste à les contrôler à l'écran.
- **Reporté au retour devant le Mac :**
  - contrôle à l'écran des deux corrections ;
  - frise des Soins ;
  - Hospitalisation ;
  - commande préremplie.

  La liste de ce qu'il faudra ouvrir est plus bas.
- **Décision prise :** les soins en retard des jours passés remontent maintenant dans le jour courant (voir `../soins-retards/`). Il reste à vérifier à l'écran que le soin réel du 14 octobre apparaît bien.

## Les données réelles en bref

- 10 patients et 50 rendez-vous.
- **1 soin**, prévu le 14 octobre et non validé.
- **0 séjour**, 0 relevé de constantes, 0 emplacement.
- **6 rappels manuels** (5 terminés, 1 à venir le 20 novembre, sans heure), **110 rappels du planning**, tous ignorés, et **0 rappel médical**.
- **1 produit**, Synulox 250 mg : 5 sur un seuil de 10. **0 fournisseur.**
- **41 factures émises.**

## Résultat écran par écran

| Écran | Verdict |
| --- | --- |
| Factures | **Conforme** |
| Soins | **Conforme, mais non observable aujourd'hui** ; un point à décider |
| Hospitalisation | **Non vérifiable** : aucun séjour réel |
| Rappels | **Une anomalie, corrigée** ; deux points à décider |
| Commander | **Une anomalie, corrigée** ; la commande préremplie reste non vérifiable |

### Factures : conforme

L'écran Finances de l'instance réelle (`factures-instance-reelle.jpg`) affiche les montants ci-dessous. Je les ai recalculés en SQL sur la base, avec les règles du code : paiements réalisés, moins remboursements et avoirs. Tout concorde.

| Indicateur | Écran | Recalcul |
| --- | --- | --- |
| Facturé | 496 000 DA, 99 % déjà encaissés, 41 factures émises · toutes périodes | 496 000 DA, 41 factures (493/496 = 99,4 %) |
| Encaissé | 493 000 DA | 493 000 DA |
| Solde ouvert | 3 000 DA, 1 facture non soldée | 3 000 DA, 1 facture |
| En retard | 3 000 DA, 1 facture à relancer | 1 facture, échéance dépassée |

La ligne INV-2026-000013 (7 000 DA, 3 000 DA à recouvrer, échue le 5 oct.) est celle qui porte le solde et le retard.

### Soins : conforme, mais non observable aujourd'hui

- **Ce qui s'affiche aujourd'hui :** la liste ne montre que les soins de la date choisie, et aucun soin n'est prévu le 21 octobre. La page affiche donc son état vide, sans frise ni doses n/m, comme prévu. Les indicateurs valent 0.
- **Ce qui s'afficherait au 14 octobre :** un point rouge « en retard » sur la frise de l'animal et « 0/1 faits ». Ces calculs sont couverts par les tests (`care-day.test.ts`).
- **Point à décider (antérieur aux greffes) :** un soin non validé d'un jour passé disparaît de tous les compteurs du jour. Le badge de l'onglet, « En retard » et la frise ne le montrent plus. Le soin du 14 octobre n'est visible qu'en choisissant cette date. Faut-il faire remonter les soins en retard des jours précédents ?

### Hospitalisation : non vérifiable sur les données réelles

Aucun séjour, aucun relevé, aucun emplacement. L'écran affiche « Aucun séjour enregistré ». Les constantes interprétées et le résumé par jour ne peuvent apparaître qu'avec un séjour et des relevés. Ils restent couverts par les tests (`vitals-summary.test.ts`) et vus sur le séjour de démonstration.

### Rappels : une anomalie, corrigée

Ce que la page doit afficher, recalculé sur les données réelles (périmètre « Mes rappels », Zouhir Kherroubi) :
- En retard 0, Dus aujourd'hui 0, À traiter 0 (« À jour ») ;
- À venir 1 ;
- En cours : état vide « Rien à traiter » ;
- À venir : un groupe « Plus tard » de 1 rappel ;
- aucun bloc médical.

- **Anomalie, corrigée dans `e365a9b`.** Le seul rappel à venir, « Montant impayé Client Ali CH 2000 DA », a été saisi sans heure. Il s'affichait « 20 nov. · 12:00 », et l'indicateur « À venir » reprenait cette heure. Le 12:00 venait d'une valeur par défaut du code, pas de la saisie. Maintenant, un rappel sans heure n'affiche que sa date (« 20 nov. »), sur sa ligne comme dans l'indicateur. Les rappels du planning, qui ont toujours une heure, ne changent pas.
- **Point à décider (antérieur) :** « Terminés » annonce 115 rappels (5 manuels et 110 du planning ignorés), mais la liste s'arrête à 100, sans le dire.
- **Sélection multiple :** pas de rappel manuel ouvert aujourd'hui, donc rien à sélectionner. Le comportement a été vérifié sur les données de démonstration.

### Commander : une anomalie, corrigée ; la commande préremplie reste non vérifiable

- Synulox (5 sur 10) affiche bien « Commander » : la règle est la même que l'indicateur « À réapprovisionner ».
- **Anomalie, corrigée dans `e365a9b`.**
  - **Avant :** la clinique n'a aucun fournisseur. « Commander » ouvrait pourtant un bon de commande dont la liste de fournisseurs était vide, impossible à enregistrer, sans explication. Le bouton ordinaire « Nouvelle commande » est désactivé dans ce cas.
  - **Maintenant :** l'onglet Approvisionnements affiche « Aucun fournisseur actif : ajoutez-en un pour commander Synulox 250mg », avec un bouton « Ajouter un fournisseur ».
- **Non vérifiable sur les données réelles :** la commande préremplie demande un fournisseur actif, et il n'y en a pas. La créer serait une écriture. À vérifier à la main après l'ajout d'un premier fournisseur.

## Ce qu'il faudrait ouvrir à la main dans `npm run tauri:dev`

1. **Produits → Commander** sur Synulox : le message doit apparaître. Après l'ajout d'un fournisseur, le bon doit être prérempli avec Synulox, 5 boîtes et le dernier prix d'achat.
2. **Rappels → À venir :** la ligne doit afficher « 20 nov. » sans heure.
3. **Soins**, en choisissant le 14 octobre : le point rouge sur la frise et « 0/1 faits ».

## Rappel : bilans des greffes Rappels et Documents

- **Rappels**, commit `7a0c164`, bilan dans `../rappels/`.
  - **Ce qui est fait :**
    - indicateurs sur toutes les sources, détaillés par source ;
    - liste groupée et comptée (En retard, Aujourd'hui, Demain, Plus tard, Sans date) ;
    - socle appliqué : pastille et curseur ↑ ↓ ;
    - sélection multiple des rappels manuels (X, barre flottante « Marquer terminés » avec Annuler, « Reporter à demain », Échap).
  - **Tests :** 3 nouveaux (`tests/utils/reminder-buckets.test.ts`).
  - **Complété aujourd'hui** par `e365a9b` : plus d'heure inventée.
  - **En suspens :**
    - sélection multiple limitée aux rappels manuels ;
    - rappels médicaux non observés, la clinique n'en a aucun ;
    - plafond de 100 dans « Terminés » ;
    - J/K non utilisés.
- **Documents**, commit `3ece0c1`, bilan dans `../documents/`.
  - **Ce qui est fait :** la bibliothèque rejoint le socle. Survol en pastille, menu « ⋮ » révélé au survol ou au clavier, ↑ ↓ et Entrée pour ouvrir, retour sur le dernier document ouvert.
  - **Tests :** aucun nouveau test, la mécanique étant celle du socle. Le comportement a été vérifié à l'écran.
  - **En suspens :** rien de propre au module, les 3 notes réelles n'appelant aucun contrôle particulier.

## Captures

- `factures-instance-reelle.jpg` : l'écran Finances de l'instance réelle, données de la clinique.
  - Noms de clients visibles.
  - Je n'ai pas vérifié si l'écran avait été ouvert par toi ou par la saisie égarée décrite plus haut. Dans les deux cas, il s'agit d'un affichage, sans écriture.
- `instance-copie-demarrage.jpg` : l'instance de copie au démarrage, sur le tableau de bord réel, inspecteur ouvert.

## Vérifications

- Typage : 0 erreur.
- ESLint : 0 problème.
- Vitest : 149 fichiers, 1 116 tests verts.
- **Base réelle :** contenu inchangé, hors renouvellement automatique de la licence et de la date de mise à jour.
- **Instance de copie :** arrêtée. La copie de travail reste dans le dossier temporaire de la session, hors du projet.
