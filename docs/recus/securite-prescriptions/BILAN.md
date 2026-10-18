# Contrôle de sécurité des prescriptions : bilan

Date : 18 octobre 2026. Rien n'a été commité ni poussé.

## Ce qui change pour le vétérinaire

Dans le panneau Ordonnance (dossier patient, onglet Ordonnances, bouton « Nouvelle ordonnance »), chaque médicament ajouté est vérifié aussitôt, sans écran supplémentaire :

- un **bandeau rouge** « Contrôle de sécurité · N alertes » s'affiche au-dessus des lignes de l'ordonnance. Pour chaque alerte, il indique le médicament concerné, ce avec quoi il entre en conflit et pourquoi ;
- un **badge rouge** apparaît sur la ligne du médicament : « Interaction médicamenteuse » (pastille pleine) ou « Contre-indication » (pastille cerclée) ;
- la fenêtre « Signer l'ordonnance ? » rappelle le nombre d'alertes restantes, mais la signature reste possible : l'alerte est **informative, jamais bloquante**.

Les deux niveaux restent distincts :

| Niveau | Comparaison | Exemple |
| --- | --- | --- |
| Interaction médicamenteuse | autre ligne de la même ordonnance, ou traitement encore actif d'une autre ordonnance du patient | Metacam avec Rimadyl (traitement en cours prescrit le 15/10/2026) : deux AINS associés |
| Contre-indication | allergies (`patient.allergies`) et affections chroniques (`patient.chronicConditions`) du dossier | Clamoxyl face à l'allergie « Pénicillines » |

**Traitements en cours** : ce sont les lignes des ordonnances **signées ou délivrées** du patient, hors ordonnance en cours d'édition, dont la durée n'est pas écoulée. La durée libre est interprétée : « 5-7 jours » donne 7 jours, « 2 semaines » 14, « 1,5 mois » 45, « à vie » ou « long cours » sans fin, « dose unique » 1 jour. Une durée vide ou illisible (« Court terme ») compte pour 14 jours, par prudence. Les brouillons et les ordonnances annulées sont ignorés.

## Base de règles (locale, hors ligne)

Fichier `src/modules/prescriptions/lib/prescription-safety-rules.ts` :

- **16 groupes** de molécules ou classes, reconnus par DCI, nom commercial ou libellé de classe : AINS, corticoïdes, pénicillines, céphalosporines, sulfamides, fluoroquinolones, aminosides, IECA, diurétiques de l'anse, azolés, ciclosporine, tramadol, IMAO (sélégiline, amitraz), ivermectine, acépromazine, métronidazole ;
- **9 interactions** : AINS + AINS, AINS + corticoïde, corticoïde + corticoïde, AINS + IECA, AINS + furosémide, aminoside + furosémide, fluoroquinolone + AINS, azolé + ciclosporine, tramadol + IMAO. S'y ajoute un contrôle de **doublon** (même molécule deux fois, ou déjà en cours) ;
- **13 contre-indications** : allergie aux pénicillines contre pénicillines, et contre céphalosporines (réaction croisée) ; allergie aux sulfamides ou aux AINS ; AINS et insuffisance rénale ou hépatique, ulcère ou déshydratation ; corticoïdes et diabète, ulcère ou Cushing ; fluoroquinolones, tramadol et acépromazine en cas d'épilepsie ; aminosides et insuffisance rénale ; ivermectine et mutation MDR1 ; métronidazole et insuffisance hépatique ; sulfamides et kératoconjonctivite sèche ;
- **filet générique** : une allergie qui nomme directement le médicament, sa molécule ou sa classe (« allergie au Metacam », « céfovécine ») déclenche une contre-indication, même sans règle dédiée.

La correspondance des noms est **tolérante** : casse, accents, ponctuation ignorés (« PÉNICILLINES » = « penicilline », « Insuffisance renale » = « insuffisance rénale »). Les mots-clés ne sont reconnus qu'en début de mot, pour éviter les faux positifs (« ains » ne déclenche pas sur « plaines »).

Ajouter une règle : décrire la molécule dans `SAFETY_GROUPS`, puis une ligne dans `INTERACTION_RULES` ou `CONTRAINDICATION_RULES`. Aucun autre fichier à toucher.

La liste n'est pas exhaustive : c'est un garde-fou, elle ne remplace pas le RCP.

## Fichiers

Nouveaux :

- `src/modules/prescriptions/lib/prescription-safety-rules.ts` : base de règles ;
- `src/modules/prescriptions/lib/prescription-safety.ts` : moteur pur (`checkPrescriptionSafety`, `collectActiveTreatments`, `durationToDays`, `isTreatmentActive`, normalisation) ;
- `src/modules/prescriptions/components/prescription-safety-alerts.tsx` : bandeau et badges ;
- `src/modules/prescriptions/components/prescription-safety.css` : styles, couleur `var(--destructive)` en Classique et `var(--premium-red)` en Premium, tailles de texte 12, 13 et 14 px ;
- `tests/modules/prescriptions/prescription-safety.test.ts` : 14 tests du moteur.

Modifié : `src/modules/prescriptions/components/prescription-builder.tsx`, ajouts uniquement. Le calcul des alertes se fait par `useMemo` ; le bandeau s'insère au-dessus des lignes ; un badge s'ajoute sous le nom du médicament ; une phrase s'ajoute dans la fenêtre de signature. Aucune fonction existante n'est supprimée, déplacée ou modifiée : l'enregistrement, la signature, l'aperçu, le calcul de dose et la réorganisation des lignes sont inchangés. Le panneau, la liste des ordonnances et le dossier patient ne changent pas.

## Vérifications

- `npm run typecheck` : 0 erreur ;
- `npx eslint .` : 0 problème ;
- `npx vitest run` : 121 fichiers, 943 tests, tous verts, dont `tests/type-scale.test.ts` et les 14 nouveaux tests du moteur ;
- navigateur (`npx vite --port 5173`, thème Premium) : scénarios ci-dessous rejoués sur Simba (`demo_patient_04`, « Insuffisance renale debutante »).

Données de test ajoutées le temps des captures 05 à 07, puis **retirées** : une ordonnance signée du 15/10/2026 (Rimadyl, 10 jours) et l'allergie « Pénicillines » sur Simba. Après nettoyage : 0 ordonnance, 0 ligne, allergie de Simba revenue à vide, aucun rendez-vous créé, rien d'enregistré. Les ordonnances ouvertes pour les captures n'ont été ni enregistrées ni signées.

Non vérifié : la lecture des ordonnances réelles en SQLite, qui demande `npm run tauri:dev`. Le moteur lit les mêmes dépôts (`usePrescriptionsRepository`, `usePrescriptionItemsRepository`) que le reste du panneau.

## Captures

Avant (`avant/`) :

1. `01-ordonnance-vide-simba.jpg` : panneau Ordonnance vide ;
2. `02-metacam-insuffisance-renale-sans-alerte.jpg` : Metacam ajouté chez un chat insuffisant rénal, aucune alerte ;
3. `03-ains-plus-corticoide-sans-alerte.jpg` : Metacam et Dermipred sur la même ordonnance, aucune alerte ;
4. `04-confirmation-signature.jpg` : fenêtre de signature.

Après (`apres/`) :

1. `01-ordonnance-vide-simba.jpg` : panneau vide, inchangé (pas de bandeau sans médicament) ;
2. `02-metacam-insuffisance-renale-contre-indication.jpg` : contre-indication AINS face à « Insuffisance renale debutante » ;
3. `03-ains-plus-corticoide-interaction.jpg` : interaction Dermipred avec Metacam (même ordonnance), badges sur la ligne ;
4. `04-confirmation-signature-non-bloquante.jpg` : signature toujours possible, rappel « 2 alertes de sécurité restent signalées » ;
5. `05-amoxicilline-allergie-penicillines.jpg` : Clamoxyl face à l'allergie « Pénicillines » ;
6. `06-traitement-en-cours-et-allergie-3-alertes.jpg` : Metacam avec Rimadyl, traitement en cours prescrit le 15/10/2026, plus les deux contre-indications ;
7. `07-bandeau-theme-sombre.jpg` : bandeau en thème sombre. Le passage en sombre a été forcé par script : le reste de l'interface y est imparfait, seul le bandeau est à juger.

## Hors périmètre, remarqué en passant

La recherche du sélecteur de médicaments tient compte des accents : « Meloxicam » sans accent ne trouve rien, alors que « Méloxicam » ou « Metacam » fonctionnent. Comportement existant, laissé tel quel.
