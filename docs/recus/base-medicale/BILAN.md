# Base médicale enrichie et unités de dose : bilan

Date : 19 octobre 2026. Rien n'a été commité ni poussé.

## 1. Unités de dose

**Avant**, trois défauts arrivaient ensemble à l'ajout d'une ligne d'ordonnance :

- **mL/kg et UI/kg refusées** : `parsePosology` met le texte en minuscules avant de le comparer à des unités écrites avec des majuscules (« mL/kg », « UI/kg »). Le lactulose (0.5 mL/kg) et les insulines (0.25-0.5 UI/kg) arrivaient donc sans dose ;
- **unité forcée** : la ligne recevait toujours « mg/kg », quelle que soit l'unité du catalogue ; sans le correctif suivant, le lactulose aurait affiché 0,5 mg/kg au lieu de 0,5 mL/kg ;
- **dose totale traitée comme une dose par kg** : le méthimazole du chat (« 2.5 mg ») et le sucralfate du chat (« 250-500 mg ») passaient en « mg/kg ». Pour un chat de 4 kg, le calcul affichait 10 mg de méthimazole au lieu de 2,5 mg.

**Après** :

- la comparaison des unités ignore la casse, et l'unité renvoyée garde son écriture canonique (`mL/kg`, `UI/kg`) ;
- la ligne reçoit l'unité exacte : `prescriptionUnitFor` transforme « mg » en « mg/tot » et laisse la dose vide pour une unité sans équivalent (« mL » total, « mg/mL ») plutôt que de deviner ;
- lactulose : 0,5 mL/kg, volume calculé de 2 mL pour 4 kg ; Caninsulin : 0,25 UI/kg (plage 0,25–0,5) ; méthimazole : 2,5 mg/tot.

Inchangé : les posologies qui proposent plusieurs doses au choix restent vides (lot précédent), comme celles en µg/kg, en g ou « par chat ».

## 2. Base médicamenteuse

### Méthode et sources

Aucune valeur n'a été écrite de mémoire. Chaque donnée vient du **résumé des caractéristiques du produit (RCP) officiel** publié par l'**Index des RCP de l'ANMV (Anses)**, <https://www.ircp.anmv.anses.fr/>, consulté le 19 octobre 2026 :

- RCP en français, à jour (format du règlement (UE) 2019/6 : rubriques 3.1 espèces, 3.2 indications, 3.3 contre-indications, 3.6 effets indésirables, 3.8 interactions, 3.9 posologie, 3.12 temps d'attente) ;
- chaque molécule porte un champ `sources` : titre du RCP, lien, rubriques utilisées, date de consultation ;
- chaque règle de sécurité ajoutée porte un champ `source`, affiché dans le bandeau (« Source : RCP Vidalta 10 mg (ANMV) »). Le lien complet apparaît au survol ;
- le texte des 27 RCP consultés est archivé dans `rcp-consultes/`, pour vérifier chaque valeur même si un RCP est modifié plus tard.

Sources écartées et pourquoi :

- les RCP des produits à **autorisation centralisée** (Galliprant, Librela, Senvelgo, Credelio…) ne sont plus hébergés par l'EMA, mais par la base européenne UPD. Son téléchargement passe par un formulaire de vérification anti-robot, que je n'ai pas contourné. Ces molécules ne sont donc pas ajoutées, faute de source lisible ;
- les molécules sans RCP local (torasémide, clomipramine, fluoxétine) ne sont pas ajoutées non plus.

### Choix des molécules

L'index complet de l'ANMV (3 225 produits) a été croisé avec les 78 molécules existantes. J'ai retenu les **substances seules**, destinées au **chien ou au chat** (plus quelques espèces de rente quand le même RCP les couvre), d'usage courant en clientèle et absentes de la base. Pour chacune, un produit de référence. Le thiamazole sort de la liste : c'est le méthimazole, déjà présent.

### 24 molécules ajoutées

Fichier `src/data/vet-knowledge/medications-rcp.json`, chargé en plus des deux fichiers existants, qui ne sont pas modifiés (78 + 24 = 102 molécules).

Quand une dose n'est pas calculable par kg, elle est écrite telle que le RCP la donne, et la ligne d'ordonnance la laisse vide plutôt que de la deviner. C'est le cas de l'atipamézole (multiple de la dose de sédatif), de la propentofylline (mg/kg/jour en deux prises), de l'antimoniate de méglumine (mg d'antimoine/kg) et de la cabergoline (µg/kg). Les doses totales (carbimazole 15 mg, nitenpyrame 11,4 mg) passent en mg/tot.

| Molécule | Classe | Espèces | RCP de référence |
| --- | --- | --- | --- |
| Acide tolfénamique | Anti-inflammatoire non stéroïdien (AINS) | chien, chat | [TOLFEDINE 40 MG/ML SOLUTION INJECTABLE POUR CHIENS ET CHATS](https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=TOLFEDINE+40+MG%2FML+SOLUTION+INJECTABLE+POUR+CHIENS+ET+CHATS) ; [TOLFEDINE 60 MG COMPRIMES CHIENS](https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=TOLFEDINE+60+MG+COMPRIMES+CHIENS) ; [TOLFEDINE 6 MG COMPRIMES CHATS-PETITS CHIENS](https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=TOLFEDINE+6+MG+COMPRIMES+CHATS-PETITS+CHIENS) |
| Kétoprofène | Anti-inflammatoire non stéroïdien (AINS) | bovins, equins, porcins | [KETOFEN 10 %](https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=KETOFEN+10+%25) |
| Butorphanol | Analgésique opioïde - Agoniste-antagoniste | chien, chat, equins | [ALVEGESIC VET. 10 MG/ML, SOLUTION INJECTABLE POUR CHEVAUX, CHIENS ET CHATS](https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=ALVEGESIC+VET.+10+MG%2FML%2C+SOLUTION+INJECTABLE+POUR+CHEVAUX%2C+CHIENS+ET+CHATS) |
| Atipamézole | Antagoniste des récepteurs alpha-2 | chien, chat | [ANTISEDAN SOLUTION INJECTABLE POUR CHIENS ET CHATS](https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=ANTISEDAN+SOLUTION+INJECTABLE+POUR+CHIENS+ET+CHATS) |
| Xylazine | Sédatif/Analgésique - Alpha-2 agoniste | chien, chat, bovins, equins | [ROMPUN 2 %](https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=ROMPUN+2+%25) |
| Telmisartan | Antagoniste des récepteurs de l'angiotensine II (ARA II) | chat | [TELMITRAXX 4 MG/ML SOLUTION BUVABLE POUR CHATS](https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=TELMITRAXX+4+MG%2FML+SOLUTION+BUVABLE+POUR+CHATS) |
| Ramipril | Inhibiteur de l'enzyme de conversion (IECA) | chien | [VASOTOP P 2,5 MG COMPRIMES POUR CHIENS](https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=VASOTOP+P+2%2C5+MG+COMPRIMES+POUR+CHIENS) |
| Imidapril | Inhibiteur de l'enzyme de conversion (IECA) | chien | [PRILIUM POUDRE POUR SOLUTION BUVABLE POUR PETITS CHIENS](https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=PRILIUM+POUDRE+POUR+SOLUTION+BUVABLE+POUR+PETITS+CHIENS) |
| Carbimazole | Antithyroïdien | chat | [VIDALTA 10 MG COMPRIMES A LIBERATION PROLONGEE POUR CHATS](https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=VIDALTA+10+MG+COMPRIMES+A+LIBERATION+PROLONGEE+POUR+CHATS) |
| Bromure de potassium | Antiépileptique | chien | [LIBROMIDE 325 MG COMPRIMES POUR CHIENS](https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=LIBROMIDE+325+MG+COMPRIMES+POUR+CHIENS) |
| Sélégiline | Inhibiteur de la monoamine oxydase B (IMAO-B) | chien | [SELGIAN 20 KG COMPRIME PELLICULE](https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=SELGIAN+20+KG+COMPRIME+PELLICULE) |
| Phénylpropanolamine | Sympathomimétique | chien | [PROPALIN 40,28 MG/ML, SIROP POUR CHIENS](https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=PROPALIN+40%2C28+MG%2FML%2C+SIROP+POUR+CHIENS) |
| Cabergoline | Agoniste dopaminergique (antiprolactinique) | chien | [GALASTOP](https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=GALASTOP) |
| Métamizole | Analgésique antispasmodique (pyrazolone) | chien, chat, bovins, equins | [CALMAGINE SOLUTION INJECTABLE](https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=CALMAGINE+SOLUTION+INJECTABLE) |
| Oxfendazole | Antiparasitaire - Benzimidazolé | chien | [DOLTHENE CHIEN M SUSPENSION BUVABLE](https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=DOLTHENE+CHIEN+M+SUSPENSION+BUVABLE) |
| Nitenpyrame | Antiparasitaire externe - Néonicotinoïde | chien, chat | [CAPSTAR 11,4 MG COMPRIMES POUR CHATS ET PETITS CHIENS](https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=CAPSTAR+11%2C4+MG+COMPRIMES+POUR+CHATS+ET+PETITS+CHIENS) |
| Miltéfosine | Antiparasitaire - Antileishmanien | chien | [MILTEFORAN 20 MG/ML SOLUTION BUVABLE POUR CHIENS](https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=MILTEFORAN+20+MG%2FML+SOLUTION+BUVABLE+POUR+CHIENS) |
| Antimoniate de méglumine | Antiparasitaire - Antileishmanien (antimonié) | chien | [GLUCANTIME SOLUTION INJECTABLE](https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=GLUCANTIME+SOLUTION+INJECTABLE) |
| Imidocarbe | Antiparasitaire - Antibabésien | chien, bovins | [CARBESIA SOLUTION INJECTABLE POUR BOVINS ET CHIENS](https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=CARBESIA+SOLUTION+INJECTABLE+POUR+BOVINS+ET+CHIENS) |
| Propentofylline | Dérivé xanthique - Vasodilatateur | chien | [KARSIVAN 100 COMPRIMES PELLICULES POUR CHIENS](https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=KARSIVAN+100+COMPRIMES+PELLICULES+POUR+CHIENS) |
| Phytoménadione (vitamine K1) | Antidote - Vitamine K | chien | [VITAMIVET K1 10 MG/ML SOLUTION INJECTABLE POUR CHIENS](https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=VITAMIVET+K1+10+MG%2FML+SOLUTION+INJECTABLE+POUR+CHIENS) ; [VITAMIVET K1 50 MG COMPRIMES PELLICULES POUR CHIENS](https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=VITAMIVET+K1+50+MG+COMPRIMES+PELLICULES+POUR+CHIENS) |
| Cimétidine | Anti-H2 - Antisécrétoire gastrique | chien | [ZITAC 100 MG COMPRIMES POUR CHIENS](https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=ZITAC+100+MG+COMPRIMES+POUR+CHIENS) |
| Lopéramide | Antidiarrhéique - Opioïde périphérique | chien | [LOPERAL 0,93 MG COMPRIMES PELLICULES POUR CHIENS](https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=LOPERAL+0%2C93+MG+COMPRIMES+PELLICULES+POUR+CHIENS) |
| Butylbromure de scopolamine | Antispasmodique - Anticholinergique | chien, chat | [SCOPALGINE 1,38 MG COMPRIMES POUR CHIENS ET CHATS](https://www.ircp.anmv.anses.fr/rcp.aspx?NomMedicament=SCOPALGINE+1%2C38+MG+COMPRIMES+POUR+CHIENS+ET+CHATS) |


### Règles de sécurité : 25 interactions et 15 contre-indications sourcées

Fichier `src/modules/prescriptions/lib/prescription-safety-rules.ts` :

- 34 groupes de molécules ajoutés (agonistes alpha-2, opiacés, antithyroïdiens, benzimidazoles, sympathomimétiques, diurétiques d'épargne potassique…) ; l'acide tolfénamique rejoint le groupe AINS ;
- les règles existantes ne changent pas ;
- doublons évités : l'acide tolfénamique et le kétoprofène sont des AINS ; leurs interactions et contre-indications déjà couvertes par les règles AINS génériques ne sont pas répétées, pour ne pas afficher deux alertes pour le même couple ;
- chaque raison reprend ce que dit le RCP cité, sans rien ajouter ; les alertes restent informatives, jamais bloquantes.

**Interactions (rubrique 3.8)**

| Règle | Raison | Source |
| --- | --- | --- |
| ketoprofene + diuretique | Kétoprofène : contre-indiqué en association avec des diurétiques. | RCP Ketofen 10 % |
| butorphanol + opioideAgonistePur | Le butorphanol, antagoniste µ, peut supprimer l'effet analgésique des agonistes µ purs (morphine…) ou imposer des doses plus élevées. | RCP Alvegesic vet. 10 mg/mL |
| butorphanol + alpha2Agoniste | Butorphanol et agoniste alpha-2 : effets synergiques, réduire la posologie de chacun. | RCP Alvegesic vet. 10 mg/mL |
| butorphanol + benzodiazepine | Butorphanol et autre dépresseur du système nerveux central : effets potentialisés, utiliser avec prudence. | RCP Alvegesic vet. 10 mg/mL |
| atipamezole + benzodiazepine | Atipamézole : administration simultanée avec le diazépam (médicaments actifs sur le système nerveux central) non recommandée. | RCP Antisedan |
| atipamezole + acepromazine | Atipamézole : administration simultanée avec l'acépromazine non recommandée. | RCP Antisedan |
| atipamezole + opiace | Atipamézole : administration simultanée avec les opiacés non recommandée. | RCP Antisedan |
| ieca + diuretiqueEpargneK | IECA et diurétique d'épargne potassique : surveiller la kaliémie (risque d'hyperkaliémie). | RCP Vasotop P 2,5 mg |
| ara2 + ieca | Telmisartan et autre agent du système rénine-angiotensine-aldostérone (IECA) : l'association peut modifier la fonction rénale chez le chat insuffisant rénal. | RCP Telmitraxx 4 mg/mL |
| antithyroidien + phenobarbital | Le phénobarbital peut réduire l'efficacité clinique du carbimazole. | RCP Vidalta 10 mg |
| antithyroidien + benzimidazole | Carbimazole et benzimidazole (fenbendazole, mébendazole) : association non recommandée (oxydation hépatique réduite, taux circulants augmentés). | RCP Vidalta 10 mg |
| bromure + diuretiqueAnse | Les diurétiques de l'anse (furosémide) augmentent l'excrétion du bromure : bromurémie diminuée, risque de crises. | RCP Libromide 325 mg |
| sympathomimetique + imao | Phénylpropanolamine : ne pas utiliser chez l'animal traité par un IMAO non sélectif ; prudence avec un IMAO de type B (sélégiline). | RCP Propalin 40,28 mg/mL |
| sympathomimetique + anticholinergique | Phénylpropanolamine et anticholinergique : association à manier avec précaution. | RCP Propalin 40,28 mg/mL |
| sympathomimetique + tricyclique | Phénylpropanolamine et antidépresseur tricyclique : association à manier avec précaution. | RCP Propalin 40,28 mg/mL |
| sympathomimetique + sympathomimetique | Phénylpropanolamine et autre sympathomimétique : association à manier avec précaution. | RCP Propalin 40,28 mg/mL |
| metamizole + corticoide | Métamizole : ne pas utiliser en association avec des glucocorticoïdes. | RCP Calmagine |
| metamizole + diuretique | Métamizole : ne pas utiliser en association avec des diurétiques. | RCP Calmagine |
| metamizole + phenobarbital | Métamizole : ne pas utiliser en association avec des barbituriques. | RCP Calmagine |
| metamizole + neuroleptique | Métamizole : ne pas utiliser en association avec des neuroleptiques (acépromazine, chlorpromazine). | RCP Calmagine |
| metamizole + phenylbutazone | Métamizole : ne pas utiliser en association avec la phénylbutazone. | RCP Calmagine |
| cimetidine + faibleIndiceCyp | La cimétidine inhibe le cytochrome P-450 : élimination ralentie de ce médicament à marge thérapeutique étroite, sa dose peut devoir être réduite. | RCP Zitac 100 mg |
| loperamide + inhibiteurCalcique | Lopéramide : utilisation concomitante d'inhibiteurs calciques contre-indiquée. | RCP Loperal 0,93 mg |
| vitamineK + salicyle | Les salicylés réduisent l'effet de la vitamine K1 en inhibant son recyclage. | RCP Vitamivet K1 |
| propentofylline + xanthique | Propentofylline : ne pas associer d'autres dérivés xanthiques (théophylline, aminophylline). | RCP Karsivan 100 |

**Contre-indications (rubrique 3.3)**

| Règle | Mention du dossier recherchée | Raison | Source |
| --- | --- | --- | --- |
| tolfenamique (affection) | insuffisance cardiaque, cardiopathie, saignement digestif, hemorragie digestive, dyscrasie | Acide tolfénamique contre-indiqué en cas d'insuffisance cardiaque, de saignement digestif ou de dyscrasie sanguine. | RCP Tolfedine 40 mg/mL |
| butorphanol (affection) | insuffisance hepatique, hepatopathie, insuffisance renale, lesion cerebrale, traumatisme cranien, maladie respiratoire obstructive, obstruction respiratoire, insuffisance cardiaque, cardiopathie | Butorphanol contre-indiqué en cas de dysfonctionnement hépatique ou rénal sévère, de lésion cérébrale, de maladie respiratoire obstructive ou de dysfonctionnement cardiaque. | RCP Alvegesic vet. 10 mg/mL |
| atipamezole (affection) | insuffisance hepatique, hepatopathie, insuffisance renale, maladie renale, insuffisance cardiaque, cardiopathie, reproducteur, gestation, gestante | Atipamézole : ne pas utiliser chez les reproducteurs ni en cas de maladie hépatique, rénale ou cardiaque. | RCP Antisedan |
| xylazine (affection) | insuffisance renale, insuffisance hepatique, insuffisance cardiaque, obstruction oesophagienne, torsion gastrique, dilatation torsion, hernie | Xylazine contre-indiquée en cas d'insuffisance rénale, hépatique ou cardiaque sévère, d'obstruction œsophagienne, de torsion gastrique ou de hernie (chien, chat). | RCP Rompun 2 % |
| telmisartan (affection) | gestation, gestante, lactation, allaitante | Telmisartan : ne pas utiliser pendant la gestation ou la lactation. | RCP Telmitraxx 4 mg/mL |
| imidapril (affection) | hypotension, insuffisance renale aigue, cardiopathie congenitale, stenose aortique, stenose mitrale, stenose pulmonaire, cardiomyopathie hypertrophique | Imidapril contre-indiqué en cas d'hypotension, d'insuffisance rénale aiguë, de cardiopathie congénitale, de sténose valvulaire ou de cardiomyopathie hypertrophique obstructive. | RCP Prilium |
| antithyroidien (affection) | diabete, hepatite, anemie, neutropenie, lymphopenie, thrombocytopenie, coagulopathie, maladie auto-immune, auto-immun | Carbimazole contre-indiqué en cas de diabète sucré, d'hépatite primaire grave, de maladie auto-immune, d'anémie, de neutropénie, de lymphopénie, de thrombocytopénie ou de coagulopathie. | RCP Vidalta 10 mg |
| antithyroidien (allergie) | carbimazole, thiamazole, methimazole, mercapto-imidazole | Hypersensibilité aux mercapto-imidazoles (carbimazole, thiamazole) déclarée. | RCP Vidalta 10 mg |
| bromure (affection) | insuffisance renale, irc, maladie renale | Bromure de potassium contre-indiqué en cas d'insuffisance rénale sévère. | RCP Libromide 325 mg |
| cabergoline (affection) | gestation, gestante | Cabergoline contre-indiquée chez la femelle gestante (risque d'avortement). | RCP Galastop |
| metamizole (affection) | ulcere, insuffisance renale, irc, maladie renale, asthme, lesion hematopoietique, aplasie medullaire, gastro-enterite chronique, enteropathie chronique | Métamizole contre-indiqué en cas d'ulcération ou de trouble gastro-intestinal chronique, d'insuffisance rénale, d'asthme ou de lésion hématopoïétique. | RCP Calmagine |
| antimonie (affection) | insuffisance hepatique, hepatopathie, insuffisance renale, irc, maladie renale, insuffisance cardiaque, cardiopathie | Antimoniate de méglumine contre-indiqué en cas d'insuffisance hépatique, rénale ou cardiaque. | RCP Glucantime |
| propentofylline (affection) | cardiopathie, insuffisance cardiaque | Propentofylline : ne pas administrer en cas de cardiopathie à un stade avancé. | RCP Karsivan 100 |
| loperamide (affection) | mdr1, abcb1, colley | Lopéramide : ne pas utiliser chez les Colleys et apparentés (mutation MDR1, toxicité neurologique). | RCP Loperal 0,93 mg |
| loperamide (affection) | occlusion, obstruction intestinale, enterite hemorragique, gastro-enterite hemorragique | Lopéramide contre-indiqué en cas d'occlusion intestinale (ou de suspicion) et d'entérite hémorragique. | RCP Loperal 0,93 mg |

## Fichiers

- `src/modules/prescriptions/lib/dose-calculator.ts` : unités insensibles à la casse et canoniques ; `prescriptionUnitFor` ;
- `src/modules/prescriptions/components/prescription-builder.tsx` : unité de ligne reprise du catalogue ;
- `src/data/vet-knowledge/medications-rcp.json` (nouveau) : 24 molécules sourcées ;
- `src/services/vetKnowledgeService.ts` : chargement du nouveau fichier, type `MedicationSource` ;
- `src/modules/prescriptions/lib/prescription-safety-rules.ts` : groupes et règles sourcés ;
- `src/modules/prescriptions/lib/prescription-safety.ts` : la source suit l'alerte ;
- `src/modules/prescriptions/components/prescription-safety-alerts.tsx` et `prescription-safety.css` : ligne « Source : … » sous la raison ;
- tests : `tests/modules/prescriptions/catalog-posology.test.ts` (+4) et `sourced-knowledge.test.ts` (8, nouveau). Ils vérifient la présence d'une source ANMV sur chaque molécule et chaque règle, l'absence de collision d'identifiant, la cohérence des unités, le déclenchement des interactions et contre-indications, et l'absence de fausse alerte (l'atipamézole n'est pas un agoniste alpha-2 ; une seule alerte par couple d'AINS).

## Vérifications

- `npm run typecheck` : 0 erreur ;
- `npx eslint .` : 0 problème ;
- `npx vitest run` : 129 fichiers, **1000 tests**, tous verts ;
- navigateur (port 5174), ordonnance de Simba (chat, « Insuffisance renale debutante ») : lactulose 0,5 mL/kg et volume de 2 mL ; Caninsulin 0,25 UI/kg ; méthimazole 2,5 mg/tot ; carbimazole présent dans le catalogue (15 mg/tot) ; interaction carbimazole + fenbendazole et contre-indication métamizole + insuffisance rénale affichées avec leur source. Panneau fermé sans enregistrer : 0 ordonnance, 8 rendez-vous, comme au départ.

Non vérifié : SQLite réel (`npm run tauri:dev`).

## Captures

- `avant/01-lactulose-insuline-dose-vide-unite-mg-kg.jpg` : doses vides, unité forcée en mg/kg ;
- `apres/01-lactulose-ml-kg-caninsulin-ui-kg.jpg` : 0,5 mL/kg (volume 2 mL) et 0,25 UI/kg ;
- `apres/02-methimazole-dose-totale-2-5-mg.jpg` : 2,5 mg/tot ;
- `apres/03-interaction-sourcee-carbimazole-benzimidazole.jpg` : alerte et sa source ;
- `apres/04-nouvelle-molecule-dans-le-catalogue.jpg` : carbimazole (Vidalta) dans le sélecteur ;
- `apres/05-contre-indication-sourcee-metamizole-rein.jpg` : contre-indication et sa source.

Il n'y a pas de capture « avant » pour les nouvelles molécules et règles : elles n'existaient pas, une recherche « Vidalta » ne renvoyait rien.

## Limites, à garder en tête

- C'est un **garde-fou**, pas une base exhaustive : seuls les produits à RCP local de l'ANMV sont couverts, et une molécule peut avoir plusieurs RCP (génériques) aux libellés légèrement différents. La source citée est le produit de référence retenu ;
- les 78 molécules d'origine **n'ont pas de source** (fichiers existants non modifiés). Les vérifier une à une contre les RCP serait un chantier à part ;
- les règles s'appuient sur les mots-clés des noms (DCI, noms commerciaux, classes) et du dossier : une mention du dossier écrite autrement (« IR » au lieu de « insuffisance rénale ») ne déclenche pas d'alerte.

## Remarqué en passant, non modifié

- La forme proposée par défaut à l'ajout d'une ligne est toujours « Comprimé », y compris pour une insuline injectable ou un sirop. Comportement existant.
- Une dose en UI/kg est affichée mais pas multipliée par le poids (pas de total en UI). Comportement existant du calcul.
