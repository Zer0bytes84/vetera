# Référence patient ID-0011 et remise en ordre du dossier

## Chantier 1 : la référence patient

Migration 041 (`src/modules/patients/reference/migration.ts`) :

- une table `patient_reference_counter` d'une ligne porte le compteur ;
- une table `patient_references` porte la correspondance patient vers référence ;
- le numéro et le texte sont chacun sous contrainte UNIQUE ;
- la table `patients` n'est pas modifiée.

Un déclencheur attribue la référence dans l'INSERT du patient. Tous les chemins de création en reçoivent donc une, y compris le poste secondaire en réseau, qui écrit dans la même base. Le compteur n'avance que d'un pas à la fois. Une référence ne se modifie pas et ne se supprime pas : un dossier supprimé garde son numéro, qui n'est jamais redonné. La « Réinitialisation des données locales » recrée tout le schéma, et le compteur repart alors de zéro.

### Sauvegardes

Elles sont dans `~/Library/Application Support/com.baitari.vetera/sauvegarde-avant-id-patient-2026-10-31/`, et chacune a été vérifiée par `integrity_check` ok, par 73 tables et 922 lignes identiques à la source, et par un hash de dump identique pour patients, propriétaires et migrations :

- `baitari-avant-migration-041.db` ;
- `baitari-juste-avant-passe-041.db`.

### Copie

- 11 patients et 11 références, avec 0 doublon de numéro, 0 doublon de texte et 0 trou.
- Le compteur est à 11 et l'ordre de création est respecté.
- 8 écrivains simultanés ont créé 200 patients : 200 références, 0 doublon, 0 trou.
- Après suppression d'un patient, la création suivante reçoit le numéro suivant ; l'ancien n'est pas réutilisé.
- Les tentatives de modification, de suppression ou d'insertion hors compteur sont refusées par la base.

### Base réelle

Le rapprochement donne :

| Contrôle | Résultat |
| --- | --- |
| Patients | 11 |
| Références | 11 |
| Patients sans référence | 0 |
| Doublons | 0 |
| Compteur | 11 |
| Ordre de création | respecté |
| `integrity_check` | ok |
| `user_version` | 41 |

ID-0001 Rifka, ID-0002 Mocha, ID-0003 Kjounti, ID-0004 Loulou, ID-0005 et ID-0006 Boby, ID-0007 Nika, ID-0008 Lisa, ID-0009 Maya, ID-0010 Kejounti, ID-0011 Dora.

### Recherche

Dans la palette, « 0010 », « ID-0010 » et « ID0010 » placent tous les trois Kejounti en premier, d'après une capture sur une copie de la base réelle (voir `mesures-capture.json`). La liste des patients filtre aussi sur la référence.

## Chantier 2 : le dossier

L'ordre est le suivant :

1. **Entête.** Le nom du patient et celui du propriétaire sont en gras, avec la référence à côté du nom. La puce, le tatouage et la date d'enregistrement ne sont plus que dans « Identité », pour éviter le doublon.
2. **Zone sécurité.** Elle suit l'entête. L'allergie est le seul bloc rouge. Le traitement en cours (ordonnances signées encore actives) et les antécédents sont neutres. Le bandeau de rappel vaccinal orange a été retiré, car les rappels vont dans Prévention.
3. **Repères.** La carte « Dernière consultation » est retirée, car la synthèse l'affiche déjà. Le « Prochain RDV » ne figure plus que dans « Parcours de soins ».
4. **Synthèse.** Elle s'ouvre avec la dernière consultation et sa conclusion. À côté, la **Prévention** affiche des comptes à rebours neutres, en rouge seulement en cas de retard. Un rappel vaccinal suivi par un rappel médical n'y figure qu'une fois.
5. **Chronologie.** Elle suit la synthèse sur le même onglet, sous forme de timeline verticale groupée par mois, avec un repère par type d'événement. Les ordonnances, factures émises, pièces jointes et documents sont accrochés à la visite qui les a produits. Une pièce sans visite apparaît comme un événement à part. L'onglet « Chronologie » séparé disparaît, et les liens qui y menaient font défiler jusqu'à elle.

### Référence sur les documents

- Facture (PDF et aperçu) : « Patient : Kejounti · ID-0010 ».
- Ordonnance imprimée : « Réf. ID-0010 » sous le nom.
- Documents gérés : la variable `{{patient.reference}}` et « Réf. patient » en tête de chaque page.
- Carnet de santé et export PDF du dossier : la référence apparaît dans l'identité.

## Ce qui n'est pas prouvé

- **Contention.** Aucun champ n'existe dans la base. L'ajouter est un changement de schéma, qui n'est pas accordé ; la zone sécurité ne l'affiche donc pas.
- **Documents déjà finalisés.** Leur PDF et leurs valeurs sont figés et ne recevront pas la référence. Seuls les nouveaux documents l'auront.
- **PDF imprimés.** Le rendu des PDF (facture, ordonnance, carnet, export, documents) n'a pas été contrôlé visuellement. Seules les données et les types ont été vérifiés.
- **Prévention avec des rappels réels.** Elle n'a été vue que vide pour Kejounti. Le cas avec rappels est couvert par les tests unitaires.
- **Captures Stitch v5.** Elles sont introuvables sur ce Mac ; la hiérarchie suit la consigne écrite.
- **Mode sombre et largeur mobile.** Ils n'ont pas été capturés.
- **Instance de l'utilisateur.** Celle qui tourne sur 5180 a la nouvelle interface par rechargement à chaud. Elle n'a pas été relancée.
