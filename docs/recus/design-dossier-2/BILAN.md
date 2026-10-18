# Dossier patient : bas de page et Synthèse

Aucun commit. Vérifications : `npm run typecheck` 0 erreur, ESLint 0 erreur 0 avertissement, Vitest 120 fichiers et 929 tests réussis (3 nouveaux).

Captures : `avant/` (dont ta capture) et `apres/`, thème clair Premium, 1440 px.

## Bloc « Informations permanentes »

Avant, ce bloc ressemblait à des onglets ratés : trois bandeaux gris de largeurs différentes avec des trous entre eux, et une quatrième colonne (Complétude) sans bandeau, présentée comme une carte à part.

Maintenant :

- un seul cadre et un seul en-tête « Informations permanentes » ;
- quatre colonnes égales, séparées par un trait fin : Identité, Propriétaire, Notes générales, Complétude du dossier ;
- chaque colonne porte le même petit libellé en capitales grises ;
- plus de carte dans la carte.

Sur les écrans moyens, les colonnes passent à 2, puis à 1 sur mobile. Le contenu ne change pas : date de naissance, puce et tatouage, coordonnées, notes, « Modifier les informations », liste de complétude.

## Onglet Synthèse

Avant, la liste « Actes & Dernières consultations » montrait 4 grandes cartes presque identiques. Chacune répétait « Consultation · Terminée » et un motif qui n'était que le titre généré (« Kejounti - Consultation »).

Maintenant, deux colonnes (composant `patient-overview.tsx`) :

1. **Dernière consultation**, mise en avant :
   - date et heure, type d'acte en pastille de couleur ;
   - le motif en grand ;
   - l'**Évaluation** et le **Plan** tirés de la note clinique (3 lignes au plus chacun), c'est-à-dire ce que le vétérinaire a conclu ;
   - sans note : « Pas encore de note rédigée pour cette consultation » ;
   - « Ouvrir la consultation » ouvre la note, comme le clic sur une ligne avant.
2. **Consultations précédentes** :
   - une liste compacte des 5 suivantes : date, type, motif, flèche ;
   - les lignes sont séparées par un trait fin, sans carte ;
   - « Voir tout l'historique » mène à la Chronologie ; au-delà de 5, une ligne indique combien restent dans la chronologie.

Règles d'affichage :

- **Statut** : « Terminée » n'est plus affiché, puisque tout l'historique l'est. Seuls « En cours », « Arrivé » et « En attente » apparaissent.
- **Motif** : un titre généré « Patient - Type » n'est plus pris pour un motif (`lib/visit-reason.ts`, testé). Le motif saisi passe en premier, sinon un titre écrit à la main, sinon rien dans la liste et « Motif non renseigné » dans la carte principale.

Rien ne disparaît : toutes les consultations restent ouvrables, et l'historique complet reste dans la Chronologie.

## Vérifié à l'écran

- Synthèse de Bella sans note, puis avec une note de test (évaluation et plan affichés). La note de test a été retirée du stockage du navigateur.
- Bloc permanent aligné sur 4 colonnes.
