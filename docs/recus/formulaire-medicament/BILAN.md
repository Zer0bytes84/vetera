# Formulaire médicament de l'ordonnance : bilan

Date : 18 octobre 2026. Rien n'a été commité ni poussé.

## Problèmes constatés (captures `avant/`)

- Deux libellés « Posologie » : le champ de dose réutilisait le libellé de la fréquence, suivi de « (mg/kg) ».
- Textes coupés : « Selon beso », « Court tem », « Selon ind », « Ex. 1 boîte de 3C ». Dans la capture de l'application de bureau, le champ dose ne laissait voir que ses flèches, sans la valeur, et l'unité n'apparaissait pas.
- Huit champs affichés d'un coup dans une colonne étroite. La calculette de dose prenait 280 px sur le côté, même quand la carte était étroite.
- Libellé « Médicament (concentration mg/mL) » pour la concentration.
- Une voie venue du catalogue (« PO/SC », « IV/IM/SC ») absente de la liste : le menu affichait « Orale (PO) » alors que la valeur enregistrée était autre.

## Ce qui change (captures `apres/`)

1. **L'essentiel d'abord** : sous le nom du médicament, une seule ligne Dose · Fréquence · Durée.
   - **Dose** est un champ unique, avec son menu d'unité (mg/kg, mg/tot, mL/kg, UI/kg). La valeur est désormais visible.
   - **Fréquence** remplace le second « Posologie » (« 1x/jour », « Selon besoin »).
   - **Durée** ne change pas.
2. **Le détail ensuite** : Forme, Voie, Quantité à délivrer, Concentration (mg/mL), Instructions au propriétaire et Précautions sont regroupés sous « Détails », replié par défaut. Une fois replié, il affiche un résumé de ce qui est renseigné, par exemple « Comprimé · PO/SC · 1 flacon de 10 mL · Précautions renseignées ». Rien n'est donc masqué sans être signalé. Un clic déplie ou replie la section (bouton accessible au clavier, `aria-expanded`).
3. **Plus de texte coupé** :
   - la carte s'adapte à sa propre largeur (requêtes de conteneur) : la calculette ne se place sur le côté que si la carte dépasse 768 px, sinon elle passe dessous ;
   - les champs prennent toute la largeur, sur trois colonnes, puis deux, puis une ;
   - Fréquence, Durée et Quantité affichent leur contenu complet en infobulle si besoin.
4. **Valeur hors liste conservée** : si la forme ou la voie ne figure pas dans la liste (« PO/SC »), elle est ajoutée comme option et reste sélectionnée. Elle n'est plus remplacée visuellement par « Orale (PO) ».

## Aucune donnée perdue

- Tous les champs restent présents et modifiables. Aucun n'est supprimé, aucun champ de données n'est renommé, l'enregistrement est inchangé.
- La calculette de dose, le bandeau de sécurité, les badges, le réordonnancement et la suppression d'une ligne sont inchangés.
- Une saisie faite dans « Détails » est conservée quand on replie la section : capture 04, la quantité « 1 flacon de 10 mL » apparaît dans le résumé.

## Fichiers modifiés

- `src/modules/prescriptions/components/prescription-builder.tsx` : composant `ItemRow` réorganisé, `DoseField` relibellé et élargi, petit utilitaire `optionLabel`.
- `src/i18n/config.ts` : libellés FR et EN ajoutés (`dose`, `concentration`, `details`, `instructionsFilled`, `warningsFilled`). En français, `frequency` passe de « Posologie » à « Fréquence ». Ce libellé n'est utilisé que dans ce formulaire.

## Vérifications

- `npm run typecheck` : 0 erreur ;
- `npx eslint .` : 0 problème ;
- `npx vitest run` : 121 fichiers, 943 tests, tous verts, dont `tests/type-scale.test.ts` ;
- navigateur, Simba, avec Metacam, Atropine et Dimazon, à 1440 et 1000 px de large. Les ordonnances ouvertes n'ont pas été enregistrées : 0 ordonnance, 0 ligne et 0 rendez-vous créé après fermeture.

Non vérifié : l'application de bureau (`npm run tauri:dev` ou un nouveau build). Le build 3.3.29 produit plus tôt ne contient pas ce changement.

## Captures

Avant :

- `00-capture-utilisateur-app-bureau.webp` : votre capture (Kejounti, application de bureau) ;
- `01-ligne-metacam.jpg` : double « Posologie », « Court tem », « Ex. 1 boîte de 3C » ;
- `02-atropine-dimazon-textes-coupes.jpg` : « Selon bes », « Selon ind ».

Après :

- `01-ligne-metacam-fenetre-1000px.jpg` : Dose · Fréquence · Durée, « Court terme recommandé » en entier, détail replié avec son résumé ;
- `02-atropine-dimazon-textes-entiers.jpg` : « Selon besoin », « Selon indication », valeurs de dose visibles ;
- `03-details-deplies-tous-les-champs.jpg` : détail déplié avec les six champs, voie « IV/IM/SC » conservée ;
- `04-resume-details-replies-avec-quantite.jpg` : quantité saisie, puis section repliée, la quantité apparaît dans le résumé.

## Remarqués en passant, non modifiés

- Pour Metacam, la dose reste vide : la posologie du catalogue (« 0.1 mg/kg J1 puis 0.05 mg/kg ») n'est pas lue par l'analyseur. Comportement existant.
- Les champs vides utilisent un tiret cadratin (« — ») comme texte d'exemple, comme le reste de l'application (champ poids notamment).
