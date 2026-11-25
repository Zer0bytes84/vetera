# Modales : une seule charte de finition

Remarque d'Aissa : les fenêtres n'étaient pas au niveau du reste de l'application. Toutes les fenêtres à en-tête
(dialogues, confirmations, panneaux latéraux) passent désormais par la même coque. Le comportement et les données
ne changent pas. La fenêtre « Quoi de neuf » et la palette de commandes n'ont pas d'en-tête de charte : elles
gardent leur rendu actuel (vérifié, aucune n'a `data-chrome`).

## La charte, telle qu'elle est mesurée

Le banc (`outils/modale.mjs`, fonction `finition()`) ouvre chaque fenêtre dans le navigateur et relève :

| Règle | Mesure |
| --- | --- |
| Aucun trait de bordure foncé | toute bordure visible dont la couleur diffère du fond de l'élément |
| Aucune ombre | toute `box-shadow` non transparente (anneaux de focus et onglets sélectionnés exclus) |
| Rayons concentriques 22/16 | rayon de la fenêtre = 22 px, rayon du panneau = 16 px |
| En-tête homogène | tuile d'icône 36 px, titre et sous-titre dans la première bande |
| Action principale en pilule à droite dans la bande | bouton plein dans `modal-actions`, rayon 999, à droite des secondaires |
| Fermeture toujours visible | croix présente dans la bande |
| Hauteur plafonnée, défilement interne | `max-height: calc(100dvh - 32px)`, seul le panneau défile (relevé aussi à 640 px de haut) |

## Résultats

- **Avant (master)** : 44 fenêtres relevées sur 44 en écart avec la charte (traits, ombres, rayons de 10 à 16 px,
  bannières de hauteurs diverses, action principale sous le contenu, croix absente sur une partie).
- **Après, thème clair** : 43 sur 44 conformes. Seul écart restant : `ordonnance-apercu`, dont le filet de 2 px
  sous l'en-tête fait partie de la mise en page imprimée de l'ordonnance (la page, pas la fenêtre). Il est gardé
  volontairement.
- **Après, thème sombre** : mêmes résultats (`releves/apres-sombre.json`, captures dans `sombre/`).
- **Comportement** (`outils/comportement.mjs`, `releves/comportement-*.json`) : identique avant et après pour
  l'envoi au clic, l'envoi par Entrée, Échap, ⌘↵ et les états désactivés. Les boutons montés dans la bande restent
  liés à leur formulaire par l'attribut `form`.
- **Focus à l'ouverture** : la même cible qu'avant sur les 44 fenêtres (croix pour les formulaires qui la
  plaçaient en premier, premier champ sinon, « Annuler » pour les confirmations). `patients-fiche` était déjà hors
  fenêtre sur master et le reste.
- Seule différence visible voulue : la croix est désormais présente partout.

## Ce qui change dans le code

- `src/components/ui/modal-chrome.tsx` (nouveau) : tri des enfants (en-tête dans la bande, actions du pied montées
  dans la bande, mentions et erreurs sous le contenu), coque bande et panneau, focus d'ouverture.
- `dialog.tsx`, `alert-dialog.tsx`, `sheet.tsx` : passent par la coque dès qu'un en-tête est présent, sinon
  rendu d'avant.
- `form-dialog.tsx` : `FormDialogHeader` devient un en-tête standard ; `ModalBanner` est supprimé (ses 88 blocs
  CSS aussi).
- `src/design-system/modal-charter.css` (nouveau) : la charte, en un seul fichier.
- Fenêtres : icône d'en-tête ajoutée là où il n'y en avait pas, pieds faits maison remplacés par `DialogFooter`
  ou `SheetFooter`, actions d'en-tête existantes passées dans la bande.
- `tests/components/modal-chrome.test.tsx` : tri des enfants et focus d'ouverture.

## Inventaire

Capturées avant et après (`planches/`, une image par fenêtre) : nouveau patient (deux entrées), coordonnées du
propriétaire (deux entrées), fiche du patient, dossier créé, archiver le dossier, export PDF, carnet de santé,
nouvelle ordonnance, signer, modèles d'ordonnance, aperçu d'ordonnance, nouvelle hospitalisation, nouvelle
anesthésie, vaccin, suppression d'un vaccin, pesée, lecture des documents, aperçu du flux, arrivée sans RDV,
planifier un soin (deux entrées), consultation rapide, admission, emplacement, rendez-vous (nouveau, modifier,
supprimer), nouveau produit, modifier le produit, réapprovisionner, inventaire, facture, équipe (nouveau, modifier,
réinitialiser, mot de passe temporaire, supprimer), lien de document, modèles de documents (nouveau, supprimer),
réinitialisation des données, aperçu de facture.

Modifiées mais non atteintes au banc, parce que la donnée de démonstration du navigateur ne permet pas de les
ouvrir (il faut un séjour en cours, un document généré, un règlement ou une licence) : détail, règlement et avoir
des finances et leurs trois confirmations ; éditeur (2) ; administration des licences (4) ; feuille de soins et
annulation de validation ; planification des soins ; plan, constantes et relevés d'un séjour ; rappels médicaux ;
surveillance et journal d'anesthésie ; panneaux d'anesthésie et d'hospitalisation ; rédaction et aperçu de
document ; aperçu d'image ; détail de produit. Elles utilisent les mêmes composants que les fenêtres capturées et
passent par la même coque ; le typecheck et les tests couvrent leur code.

## Rejouer

Serveurs : `outils/vite.banc.config.ts` sur la branche (port 5199) et sur master (port 5198).
`node outils/modales.mjs <port> <dossier> [filtre] [light|dark] [hauteur]`, puis `node outils/resume.mjs <dossier>`
et `python3 outils/planche.py <avant> <après> <sortie>`.
