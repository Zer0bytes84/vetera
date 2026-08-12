# Direction produit proposee - Baitari Clinical Core

## Positionnement

Baitari doit devenir un outil veterinaire desktop-first, local-first et fiable pour le cabinet independant. Le produit ne doit pas chercher a gagner par le nombre de widgets ou de variantes d'interface: il doit gagner par la rapidite, la clarte et la confiance clinique.

La prochaine etape ne doit donc pas etre une nouvelle refonte visuelle. Elle doit etre une phase `Clinical Core`: rendre un parcours de soin complet, simple et difficile a casser.

## Principes de decision

1. Une action clinique importante doit etre faisable en quelques etapes visibles, sans chercher le bon ecran.
2. Les donnees ne doivent jamais etre perdues, dupliquees ou rendues ambiguës par une mise a jour.
3. L'interface doit servir le flux de travail. Les details visuels viennent apres la justesse, la vitesse et la lisibilite.
4. L'IA reste un assistant local de redaction et de synthese. Elle ne prescrit pas, ne diagnostique pas et ne remplace jamais la validation du veterinaire.
5. Le mobile, le cloud et le multi-cabinet sont des extensions futures; ils ne doivent pas ralentir le pilote desktop local.

## Cap propose

### Phase 0 - Stabiliser la fondation

- Definir une source unique de migrations SQLite et une strategie de mise a niveau sans perte.
- Retirer toute base locale versionnee apres verification de son contenu.
- Ajouter des tests automatises pour les services de donnees et le parcours critique.
- Centraliser les permissions metier et choisir les roles exposes au cabinet.
- Corriger les avertissements de lint les plus proches des modules pilotes.
- Reporter le chargement de l'IA locale et des dependances lourdes jusqu'a leur utilisation.

### Phase 1 - Rendre le parcours clinique complet

- Proprietaire: coordonnees, contact secondaire, preferences et historique financier.
- Patient: identite clinique, alertes, statut, historique et documents.
- Agenda: statuts complets, conflits de planning, arrivee et lancement de consultation.
- Consultation: SOAP, actes, ordonnances et documents relies au dossier.
- Rappels: vaccination, suivi et relance avec une file claire.

#### Etat du jalon Phase 1 - 1 aout 2026

- Termine: contrats proprietaire/patient normalises, y compris contact secondaire, preference de contact et notes de communication.
- Termine: historique financier du foyer construit depuis les rendez-vous et les ecritures liees existantes.
- Termine: cycle du rendez-vous centralise (`planifie`, `confirme`, `arrive`, `en cours`, `termine`, `annule`, `absent`, `reporte`) avec transitions et conflits controles.
- Termine: consultation autosauvegardee, historique clinique, ordonnances et documents relies au patient.
- Termine: rappels automatiques recalcules apres modification du planning et suivi des echeances vaccinales.
- Termine: migrations SQLite versionnees jusqu'a la version 14 et tests de non-regression du parcours critique.
- Frontiere volontaire: facture, paiement, avoir et remboursement restent dans la Phase 2; l'historique actuel n'est qu'une lecture des transactions existantes.

### Phase 2 - Construire une vraie facturation

- Introduire les entites facture, ligne de facture, paiement, avoir et remboursement.
- Garantir numerotation, historique, totaux et solde patient/proprietaire.
- Generer les documents PDF depuis la facture, pas depuis une transaction generique.
- Relier chaque paiement a son contexte clinique et a son audit.

### Phase 3 - Pilote reel et durcissement

- Faire utiliser le flux complet par un cabinet pilote sur des donnees reelles.
- Corriger les blocages observes avant d'ajouter de nouvelles fonctions.
- Tester sauvegarde, restauration, mise a jour, permissions et installation Windows.
- Mesurer le demarrage, la navigation et les ecritures SQLite sur une machine modeste.

### Phase 4 - Assistance intelligente et evolution

- Stabiliser l'assistant IA comme outil de brouillon, synthese de dossier et aide a la recherche interne.
- Ajouter ensuite la synchronisation cloud et le mobile seulement avec une architecture serveur definie et des garanties de confidentialite.
- Reprendre les dashboards et l'analytique a partir des donnees de facturation et de soins devenues fiables.

## Ce que nous gelons temporairement

- Nouvelles variantes de dashboard et nouveaux widgets hors besoin pilote.
- Refonte globale du design systeme.
- Synchronisation mobile ou cloud.
- Nouvelles capacites IA lourdes et telechargement automatique de modeles locaux.
- Fonctionnalites multi-cliniques avancees.

Ce gel n'est pas un recul. Il protege la qualite du produit et permet de livrer une application qu'un veterinaire peut vraiment utiliser chaque jour.

## Premier livrable recommande

Le premier jalon doit etre une tranche verticale complete, pas une liste de sous-pages isolees:

`Proprietaire -> Patient -> Rendez-vous -> Consultation -> Ordonnance -> Facture -> Paiement -> Rappel`

Cette tranche doit etre accompagnee de tests, de migrations reelles, de droits explicites et d'un scenario de sauvegarde/restauration. Une fois ce jalon valide, les ameliorations UX et les widgets auront une base de donnees digne de confiance.

## Decisions a prendre ensemble

1. Confirmer les roles exposes lors du pilote: administrateur, veterinaire et accueil, avec une correspondance claire vers les roles techniques existants.
2. Confirmer les regles de facturation du premier cabinet pilote: devise, TVA, numerotation et documents obligatoires.
3. Choisir le cabinet et les cas reels qui serviront de test d'acceptation du flux clinique.
4. Valider que l'IA reste en mode brouillon et assistant, sans action clinique automatique.
