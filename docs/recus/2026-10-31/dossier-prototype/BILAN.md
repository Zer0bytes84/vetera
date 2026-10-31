# Dossier patient : la présentation du prototype, portée dans le produit

Le 31/10/2026, sur Kejounti (ID-0010). La présentation suit le prototype validé, avec le système du produit : thème Clean, échelle de tailles imposée, et la police du thème (Inter Clean, mesurée dans la page). **Le fonctionnel ne change pas** : aucune action n'a été ajoutée ni retirée, et aucune donnée ni aucun schéma n'a été modifié.

## Captures

- `avant/` : l'état au commit 3e54ad4, en clair et en sombre (haut, synthèse, chronologie, bas).
- `apres/` : la même copie de la base réelle, mêmes vues.
- `apres-rempli/` : une **seconde copie** où Kejounti reçoit des données de démonstration, pour voir les colonnes pleines. Elles ne sont jamais écrites dans la base réelle : antécédent « Insuffisance rénale chronique (stade II) », contention « Muselière, manipuler à deux », une ordonnance signée (Bénazépril au long cours, Méloxicam 30 jours) et deux rappels (un vaccin en retard, un vermifuge à venir).
- `apres/mesures-*.json` : erreurs console (aucune) et liste des éléments qui défilent à l'horizontale (aucun, sur toutes les vues et dans les deux thèmes).

## Ce qui a été porté

| Zone | Rendu |
| --- | --- |
| Entête de page | Fil d'Ariane « Patients / Kejounti · ID-0010 ». « Patients » ramène à la liste, comme le faisait le bouton « Liste des patients », qu'il remplace. |
| Carte patient | Le nom en gras, la référence en une seule pastille et le statut à côté. Une ligne de détails sobre : espèce · race · sexe · âge · puce. Le propriétaire en gras avec son téléphone. À droite, « Solde du propriétaire 3 000 DA » en texte neutre, puis le bouton noir. Les autres actions restent dans la barre sous la carte. |
| Zone sécurité | Une bande plate unique : « Sécurité », l'allergie en pastille rouge (seul rouge du dossier), puis la contention en pastille neutre sur la même ligne. Les traitements n'y figurent plus. |
| Synthèse clinique | Trois colonnes : Affections suivies, Traitements en cours (produit, dose · rythme · fin), Rappels et prévention (échéance, rouge seulement en cas de retard). Les liens « Ordonnances » et « Vaccinations » ouvrent les onglets existants. |
| Chronologie | Inchangée depuis 3e54ad4 : colonnes nettes, 3 événements puis « Afficher plus » par 3, titre = type, pièces en étiquettes, aucune référence LEGACY, la dernière visite en format compact. Sur la copie remplie, l'ordonnance apparaît en pièce « Ordonnance signée » du 18 octobre. |
| Largeur | Les onglets passent à la ligne au lieu de défiler. Le bouton « Ouvrir la consultation » ne dépasse plus le bord droit, qu'il débordait de 10 px. Aucun défilement horizontal mesuré. |

Le solde est une lecture des factures existantes : la somme des `balanceAmount` des factures émises au nom du propriétaire, tous ses animaux compris. Aucune écriture n'est faite.

## Ce que le prototype montre et que le produit n'a pas

Je ne l'ai pas inventé, puisque le fonctionnel ne change pas. Chaque point demanderait une décision et un chantier à part :

- **« Nouvelle consultation »** : la page n'a pas cette action. Le bouton noir reste l'action principale existante, « Note clinique » quand une visite est en cours, sinon « Note hors visite ».
- **« Renouveler »** une ordonnance : aucune fonction de renouvellement.
- **« Relancer SMS »** et **« dernier rappel envoyé »** : les rappels médicaux n'ont ni envoi ni date d'envoi.
- **Robe et couleur des yeux** : aucun champ.
- **Affections suivies avec date d'apparition, valeur clé et conduite** : le dossier n'a qu'un champ texte « Antécédents ». La colonne l'affiche tel quel, en une ligne.
- **Constantes vitales avec courbes et normes**, **filtres et saut par année dans la chronologie**, **onglets Analyses et Facturation** : hors de cette passe. Les repères existants (RDV, actions, poids, parcours) sont gardés.

## Fichiers

- `patient-detail-page.tsx` : le fil d'Ariane, la synthèse clinique branchée, et la zone sécurité sans les traitements.
- `components/patient-header.tsx` : le solde du propriétaire (lecture) et l'action principale à droite.
- `components/medical-record-summary.tsx` : la ligne de détails, et le propriétaire avec son téléphone.
- `components/patient-safety-zone.tsx` : la bande plate.
- `components/patient-overview.tsx` : `PatientClinicalSummary`, trois colonnes.
- `components/patient-prevention.tsx` : le titre « Rappels et prévention ».
- `medical-record.css` : les styles correspondants, et les onglets qui passent à la ligne.
- `scripts/eval-local-ai/capture-dossier.ts` : le relevé des éléments qui défilent à l'horizontale.

## Portes

- `npx tsc -p tsconfig.app.json --noEmit` : 0.
- `npx eslint .` : 0.
- `npx vitest run` : 175 fichiers, 1341 tests verts.

## Ce que les captures ne prouvent pas

- **Les colonnes pleines sur des données réelles.** Elles ne sont vues que sur la copie de démonstration ; le Kejounti réel n'a ni antécédent, ni traitement, ni rappel.
- **Le solde** « 3 000 DA » est celui de la copie, pris au moment de la copie. Je ne l'ai pas rapproché de l'écran Finances.
- **Les largeurs étroites** (< 900 px, où les colonnes s'empilent, et mobile) n'ont pas été capturées. Seule la fenêtre de 1400 × 774 points l'a été.
- **L'aperçu patient** ouvert depuis la liste reprend la nouvelle ligne de détails, mais n'a pas été capturé.
- **Les captures du prototype** ne m'ont pas été transmises comme images, seulement le code HTML. La comparaison s'est faite contre ce code.
- **Le toast de licence** couvre le bas de chaque vue.
