# Lot de 3 petits fix : bilan

Date : 19 octobre 2026. Rien n'a été commité ni poussé.

## 1. Dose du méloxicam chat vide à l'ajout

**Cause** : la posologie du catalogue est « 0.1 mg/kg J1 puis 0.05 mg/kg ». Le calcul (`parsePosology`) n'accepte qu'une dose seule, sans texte autour, donc il ne lisait rien.

**Correction** : à l'ajout d'un médicament, la ligne utilise `parseCatalogPosology` (nouveau, dans `dose-calculator.ts`). Elle reprend la dose placée en tête quand le reste du texte est :

- un schéma d'attaque puis d'entretien (« J1 puis 0.05 mg/kg ») ;
- ou un simple qualificatif sans autre valeur (« IV (prémédiqué) »).

Méloxicam chat : la dose devient **0,1 mg/kg** (dose de J1). Le schéma complet est recopié dans les instructions de la ligne : « Schéma : 0.1 mg/kg J1 puis 0.05 mg/kg ». Sans cela, la ligne suggérerait la dose d'attaque pour toute la durée, soit le double de la dose d'entretien. Ce champ s'intitule « Instructions au propriétaire » et reste modifiable.

**Laissé volontairement vide** : les posologies à alternatives (« 5-10 mg/kg IM ou 2-4 mg/kg IV », « 4-6 mg/kg (après prémédication), 6-8 mg/kg (sans) », « 1-2 mg/kg (minimum 1 mg/kg) »). Le choix revient au vétérinaire.

`parsePosology` n'est pas modifiée : le sélecteur de médicaments et le reste du calcul se comportent comme avant.

## 2. Pas d'assombrissement sous les fenêtres du panneau Ordonnance

**Cause** : le panneau Ordonnance est lui-même une fenêtre (Sheet). Base UI n'affiche pas le voile d'une fenêtre imbriquée dans une autre, sauf avec l'option `forceRender`. La fenêtre de signature et celle des modèles n'avaient donc aucun voile dans le DOM.

**Correction** : `AlertDialogContent` et `DialogContent` acceptent une option `forceBackdrop`, désactivée par défaut. Elle est activée pour la fenêtre « Signer l'ordonnance ? » et la fenêtre « Modèles d'ordonnance ». Le voile est celui des autres modales (`.modal-backdrop` : fond clair translucide et flou, version sombre en thème sombre). Toutes les autres fenêtres de l'application sont inchangées.

## 3. Nouveau rendez-vous depuis un dossier : « Aucun dossier trouvé »

**Cause** : depuis un dossier, la recherche rapide du modal est pré-remplie avec « nom du patient + nom du propriétaire », et le patient est sélectionné. Le nom venait de `formatOwnerName` (version du module Clinique), qui écrit **« Propriétaire non lié »** quand le propriétaire n'a ni prénom ni nom. Ces mots ne figurent dans aucun dossier : la recherche ne trouvait rien et affichait « Aucun dossier trouvé », alors que le patient était bien sélectionné. Le cas courant (propriétaire avec un nom, Milo, Simba) fonctionnait déjà.

**Correction** :

- le texte pré-rempli ne reprend que des noms réels (`selectedDossierSearchLabel` : patient, prénom et nom du propriétaire, sans libellé de remplacement) ;
- filet de sécurité : tant que ce texte pré-rempli n'est pas modifié, le patient sélectionné reste affiché dans la liste, même si la recherche ne le trouve pas. Dès que l'utilisateur tape autre chose, la recherche fonctionne comme avant.

## Fichiers

- `src/modules/prescriptions/lib/dose-calculator.ts` : `parseCatalogPosology` (ajout) ;
- `src/modules/prescriptions/components/prescription-builder.tsx` : pré-remplissage de la ligne, option `forceBackdrop` sur la signature ;
- `src/modules/prescriptions/components/prescription-templates.tsx` : option `forceBackdrop` ;
- `src/components/ui/alert-dialog.tsx`, `src/components/ui/dialog.tsx` : option `forceBackdrop`, désactivée par défaut ;
- `src/modules/agenda/quick-search.ts` : `selectedDossierSearchLabel` ;
- `src/modules/agenda/hooks/use-agenda-page-model.tsx` : texte pré-rempli et patient sélectionné conservé ;
- tests : `tests/modules/prescriptions/catalog-posology.test.ts` (4, nouveau), `tests/modules/agenda/quick-search.test.ts` (+2).

## Vérifications

- `npm run typecheck` : 0 erreur ;
- `npx eslint .` : 0 problème ;
- `npx vitest run` : 128 fichiers, 988 tests, tous verts (6 nouveaux) ;
- navigateur (port 5174) : méloxicam ajouté chez Simba (chat) avec 0,1 mg/kg et le schéma dans les instructions. Voile présent sous « Signer » et « Modèles ». Rendez-vous depuis le dossier d'un patient de test au propriétaire sans nom : patient pré-rempli et sélectionné. Depuis Milo : inchangé.

**Données de test** : un propriétaire sans nom et son patient « Pistache » (identifiants `test_fix_…`), retirés à la fin. Une séance temporaire créée par l'ouverture d'une ordonnance, restée parce que j'avais quitté la page sans fermer le panneau, a été retirée après vérification qu'aucune donnée n'y était rattachée. État final : 4 propriétaires, 5 patients, 8 rendez-vous, 0 ordonnance, 0 vaccination, comme au départ. Aucun rendez-vous n'a été créé, aucune ordonnance n'a été enregistrée ni signée.

**Non vérifié** : SQLite réel (`npm run tauri:dev`).

## Captures

Avant (`avant/`) :

- `1-meloxicam-chat-dose-vide.jpg` ;
- `2a-signature-sans-voile.jpg`, `2b-modeles-sans-voile.jpg` ;
- `3-rdv-aucun-dossier-trouve.jpg` : « Pistache Propriétaire non lié », aucun dossier.

Après (`apres/`) :

- `1a-meloxicam-chat-dose-reprise.jpg` : dose 0,1 mg/kg ;
- `1b-meloxicam-chat-schema-dans-instructions.jpg` : « Schéma : 0.1 mg/kg J1 puis 0.05 mg/kg » ;
- `2a-signature-avec-voile.jpg`, `2b-modeles-avec-voile.jpg` ;
- `3a-rdv-patient-pre-rempli.jpg` : Pistache pré-rempli et sélectionné ;
- `3b-rdv-cas-normal-inchange.jpg` : Milo, inchangé.

## Remarqué en passant, non modifié

- **33 posologies sur 152** dans le catalogue ne sont pas lues par le calcul. La plupart sont des alternatives (laissées vides volontairement), des doses en µg/kg, en g ou par animal (« mg/chat »). Mais **deux unités sont refusées à tort** : « mL/kg » et « UI/kg ». `parsePosology` met le texte en minuscules avant de le comparer à des unités écrites avec majuscules. Conséquence : le lactulose (0.5 mL/kg) et les insulines (0.25-0.5 UI/kg) arrivent aussi avec une dose vide. La correction est simple, mais elle touche le calcul partagé, et l'unité renvoyée doit garder sa casse (« mL/kg », « UI/kg ») pour le calcul en mL. Je ne l'ai pas faite sans votre accord.
- Ouvrir « Nouvelle ordonnance » crée une séance temporaire, supprimée seulement quand on ferme le panneau. Si l'on quitte la page avec le panneau ouvert, la séance reste dans l'agenda (« Consultation - Simba », en cours). Comportement existant, laissé tel quel.
