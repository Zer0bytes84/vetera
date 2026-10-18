# Refonte du dossier patient

Aucun commit.

Vérifications :

- `npm run typecheck` : 0 erreur.
- ESLint : 0 erreur, 0 avertissement.
- Vitest : 119 fichiers et 926 tests réussis, dont 5 nouveaux sur la variation de poids.

Captures : `avant/` et `apres/`, thème clair Premium, 1440 px.

## Ordre de lecture, de haut en bas

1. **En-tête** : bouton Retour (flèche), titre « Dossier patient », sous-titre.
2. **Identité du patient**, avec toutes les actions : Note clinique, Planifier un rendez-vous, Ouvrir les soins, Modifier, Exporter en PDF.
3. **Indicateurs**, sur une seule ligne : RDV aujourd'hui, Actions à suivre, Dernière consultation, Poids, Parcours de soins.
4. **Alertes** : allergies, antécédents, rappel vaccinal en retard ou dû dans les 30 jours.
5. **Onglets cliniques** : Synthèse, Chronologie, Ordonnances, Hospitalisations, Anesthésies, Vaccinations, Poids, Documents.
6. **Informations permanentes**, en colonnes : date de naissance (avec puce et tatouage s'ils existent), propriétaire, notes générales, complétude du dossier.

## Les 7 points

1. **Retour.** C'est un bouton flèche de 40 px placé dans la ligne du titre, à la place de la tuile d'icône. Il a un libellé accessible et une infobulle « Retour à la liste des patients ». Il n'y a plus de bouton au-dessus de l'en-tête. La zone `back` de `PageHeader` se place désormais dans la ligne du titre ; seul le dossier patient l'utilise.
2. **Ouvrir les soins.** Le bouton quitte l'en-tête de page et rejoint les actions du patient, après « Planifier un rendez-vous ». Le comportement ne change pas : il ouvre Clinique > Soins filtré sur ce patient.
3. **« Dossier clinique ».** Le titre et le sous-titre sont supprimés : les onglets suivent directement. La section garde un libellé accessible.
4. **Actions sans doublon.** Chaque action n'apparaît qu'une fois, vérifié à l'écran :
   - « Note clinique » : dans les actions du patient. « Dernière note clinique » ouvrait la même note : bouton retiré.
   - « Ajouter un vaccin » : dans l'onglet Vaccinations.
   - « Ajouter une pesée » : dans l'onglet Poids.
   - « Planifier une visite » (carte Parcours) et « Planifier la première consultation » (Synthèse) : retirés. « Planifier un rendez-vous » fait la même chose.

   La liste de complétude décrit maintenant un état au lieu de répéter une action : « Aucune pesée : onglet Poids », « Aucun vaccin : onglet Vaccinations », « Race à renseigner »… Un clic mène toujours au bon endroit. Elle corrige aussi un défaut : « Ajouter une pesée » de cette liste ouvrait la modification du profil, faute de reconnaître son libellé.
5. **Poids à « -95,00 kg ».** Le calcul était juste ; ce sont les données qui posent problème. Dans ta base locale (`baitari.db`), un patient a deux pesées : 100 kg le 29 juillet, puis 5 kg le 2 août. La première est sans doute une faute de frappe.
   - Désormais, quand le poids triple ou tombe au tiers entre deux pesées, la carte n'affiche plus de variation colorée mais une pastille neutre « Écart à vérifier ». Au survol, elle indique la pesée précédente. Un clic ouvre l'onglet Poids pour corriger.
   - Une vraie variation reste affichée, par exemple un chiot qui double son poids.
   - Les pesées d'un même jour sont classées dans leur ordre de saisie.
   - Le tout est testé (`tests/modules/patients/weight-change.test.ts`).
   - Pour corriger la donnée elle-même, modifie ou supprime la pesée de 100 kg dans l'onglet Poids de ce patient. Je n'ai pas touché à la base.
6. **Un seul endroit pour les vaccins** : l'onglet Vaccinations (carnet, rappels, ajout, modification). La carte « Vaccination » des indicateurs est retirée. Son information utile, un rappel en retard ou proche, passe dans les alertes ; un clic ouvre l'onglet.
7. **Hiérarchie.** Les alertes sortent du bloc d'identité et viennent après les indicateurs. La colonne de droite (propriétaire, notes, complétude) et « Informations permanentes » de la Synthèse sont réunies sous les onglets, en une seule colonne de lecture. La « dernière pesée » de la Synthèse faisait doublon avec la carte Poids : retirée.

## Tests faits dans le navigateur

Avec des données de test ajoutées puis retirées du stockage du navigateur :

- deux pesées, 30 kg puis 3 kg, donnent bien « Écart à vérifier » ;
- un vaccin avec un rappel à 10 jours donne bien l'alerte « Rappel vaccinal à prévoir » ;
- les allergies de Milo s'affichent sous les indicateurs.

## Remarque

« Mesuré le 17 oct. » pour une pesée saisie le 18 : la date choisie est enregistrée à minuit UTC. Dans un fuseau en retard sur UTC, elle s'affiche donc la veille. En Algérie (UTC+1), elle s'affiche bien le 18. Je n'ai rien changé ; c'est à corriger à part si tu veux.
