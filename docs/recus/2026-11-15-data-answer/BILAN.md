# Données : l'onglet « Données » du panneau assistant, dans master

16 novembre 2026. Commit `05da45e` sur `master` (au-dessus de `3473f40`, le lint à zéro). Rien n'est poussé, aucun bump, aucun tag.
Réécriture dans le produit de ce que le banc du 11 novembre (`banc/fable-agent-2026-11-11`, bilan `docs/recus/2026-11-11-fable/BILAN.md`) avait prouvé : le code du banc a servi de référence, pas de source.

## En bref

- Le panneau assistant a un quatrième onglet, **Données**. Le vétérinaire pose une question en français ; il reçoit, dans l'ordre : les étapes de lecture, une phrase, un tableau, « Ce que j'ai lu », et une carte à valider quand une action est proposée.
- **Aucun modèle ne produit de chiffre.** Il n'y a aucun modèle dans ce chemin : le code calcule, et la phrase est écrite par le code à partir des chiffres calculés.
- **Réconciliation au centime** avec le tableau de bord et avec le filtre de dates du journal de Finances : rejouée sur 400 lignes générées et sur la base réelle de test (voir plus bas). Dans la page : trésorerie 37 500 DA des deux côtés, 8 rendez-vous des deux côtés.
- **Garde des doses** testée : 25 formulations, une seule réponse possible (refus), avant toute lecture.
- **Lint à zéro, typecheck sans message nouveau, 1944 tests verts** (+ 78 tests ajoutés à l'onglet).
- **Non prouvé** : l'app de bureau (Tauri) n'a pas été lancée ; la carte à valider n'a été cliquée que dans le navigateur ; l'écran Finances lui-même n'est pas disponible dans le navigateur (voir « Ce qui n'est pas prouvé »).

## Les quatre principes, et ce qui les tient

| Principe | Ce qui le tient | Preuve |
|---|---|---|
| 1. Seulement ce qui a été prouvé au banc, catalogue fermé | Quatre sujets, rien d'autre. Tout le reste est refusé en mots (liste plus bas). | `answer.test.ts` : « catalogue fermé », « autres refus et attaques » |
| 2. Aucun chiffre produit par un modèle | Pas de modèle dans le chemin. Sommes en **centimes entiers**. La phrase est écrite depuis un **modèle de phrase sans aucun chiffre** : `{income}` renvoie au chiffre nommé `income`. Un chiffre tapé en dur dans une phrase est impossible, et le contrôle le refuse. | « chaque chiffre a sa provenance » (6 tests), « équipe rouge » (6 tests) |
| 3. Chaque réponse montre ses sources | Chaque chiffre porte une source qui doit figurer dans « Ce que j'ai lu » (table lue, lignes lues et retenues, filtre, heure). `verifyAnswer` refuse la réponse sinon. | `verifyAnswer` : source listée, jeton résolu, phrase réécrite identique, chiffres retrouvés dans le tableau affiché |
| 4. Équipe rouge | Voir « Équipe rouge ». | Les attaques sont écrites en tests ; **trois ont percé pendant le développement** (chiffre juste mal placé, SQL lu comme une question, période partielle lue en entier) et sont refermées |

### Comment la vérification fonctionne (`verifyAnswer`, dernière garde avant l'écran)
1. chaque chiffre nomme une source listée et est un entier ;
2. chaque modèle de phrase est sans chiffre (sauf la note fixe « 30 derniers jours »), tous ses jetons nomment un chiffre ou un libellé, et son écriture redonne **exactement** le texte affiché (un chiffre retouché après coup est refusé) ;
3. chaque chiffre lié au tableau (lignes, recettes, dépenses, total par espèce) est recalculé **depuis le tableau tel qu'il est affiché** ; le solde net doit être recettes moins dépenses.
Si l'un manque, la réponse devient un refus « je n'affiche pas cette réponse : un de ses chiffres ne se retrouve pas dans ce que j'ai lu ». Un chiffre faux ou sans source n'existe pas dans cet écran.

## Ce qui est livré

| Fichier | Rôle |
|---|---|
| `src/modules/assistant-answers/language.ts` | Lecture de la question : normalisation, **trois gardes** (dose, rappels vaccinaux, écriture/SQL), périodes non lues. |
| `src/modules/assistant-answers/period.ts` | La période nommée, en jours entiers, bornée à 731 jours comme le tableau de bord. |
| `src/modules/assistant-answers/answer.ts` | Le catalogue (recettes et dépenses, rendez-vous et absences, tâches, patients), les chiffres, les phrases, `verifyAnswer`. **Pur et en lecture seule** : n'importe ni magasin, ni dépôt, ni réseau, ni modèle (test sur la liste exacte des imports). |
| `src/modules/assistant-answers/save-proposal.ts` | La **seule écriture**, appelée par le bouton « Valider » d'une carte. Revérifie les tâches ouvertes au moment de valider : une deuxième validation ne crée rien en double ; une écriture refusée est comptée, pas cachée. |
| `src/modules/assistant-answers/clinic-answers.tsx` | L'écran, composé des composants existants du panneau (aucun composant nouveau, aucune couleur écrite en dur). |
| `src/components/ui/agent-composer.tsx` | `submitOnEnter` (Entrée envoie, Maj + Entrée va à la ligne, pas pendant une composition de saisie). Seule modification d'un composant partagé. |
| `local-consultation-assistant.tsx` | L'onglet « Données ». La carte « Modèles IA » est masquée sur cet onglet (il n'utilise aucun modèle). |

Un seul sujet par question ; la période est **toujours dite** (30 derniers jours par défaut, avec la note qui le dit). Le patient se filtre par son nom dans la question, ou « ce patient » quand un dossier est ouvert.

## Réconciliation au centime, rejouée

Oracles : la carte Trésorerie du tableau de bord (`buildPremiumAnalytics`) et le **filtre de dates du journal de Finances** (`isDateInRange`, lignes réglées).

| Rejeu | Résultat |
|---|---|
| 400 lignes générées (dates locales et dates seules, trois statuts, deux types), 30 derniers jours : recettes, dépenses, solde net | Assistant = tableau de bord = Finances, **écart 0 centime** (`answer.test.ts`, « rapprochement au centime »). Les recettes ne sont pas nulles : le test ne compare pas deux zéros. |
| Tableau affiché | Recettes = somme des lignes positives, dépenses = somme des lignes négatives, au centime. |
| Rendez-vous et dossiers créés | Assistant = tableau de bord (nombre, terminés, absences, nouveaux dossiers). |
| **Base réelle de test** (60 lignes de caisse, `outils/mesure-base-reelle.test.ts.txt`), quatre périodes : 30 jours, ce mois, l'année dernière, 2026 | Écart **0 centime** entre assistant, journal de Finances et (pour 30 jours) tableau de bord. Fuseaux `Africa/Algiers` et `America/New_York`. Mesures dans `outils/mesure-*.json`. |
| **Dans la page** (navigateur, `outils/resultat-parcours-navigateur.json`) | Trésorerie du tableau de bord **37 500 DA** = assistant **37 500 DA** sur 7 lignes ; rendez-vous **8** = **8**. |

**Nuance sur l'oracle « Finances ».** L'écran Finances ne fournit pas de fonction exportée de totaux de caisse : ses totaux sont dans le hook de la page. L'oracle utilisé est donc le **filtre de dates du journal** (`isDateInRange`, repris tel quel) et le **tableau de bord** (qui lit le même journal). L'écran Finances lui-même n'est pas disponible dans le navigateur (facturation réservée au bureau).

**Une différence réelle entre Finances et le tableau de bord, constatée, non corrigée.** Finances attribue une ligne au jour de sa date **UTC** (`slice(0, 10)`), le tableau de bord (et donc l'assistant) au jour **local**. Sur la base réelle, **4 lignes sur 60** (fuseau d'Alger) et **12 sur 60** (New York) tombent un autre jour selon la règle. Aucune ne tombe sur une borne de période testée, d'où l'écart nul ; mais une ligne payée entre 23 h et minuit UTC, à une borne de mois, serait comptée dans un mois par Finances et dans l'autre par le tableau de bord et l'assistant. L'assistant suit le tableau de bord (« comme le tableau de bord », dit la note de période).

## Garde des doses

Une question de dose est refusée **avant tout**, y compris mêlée à une question valide, en majuscules, avec accent, ou collée à son unité.
- 25 formulations testées (`it.each`) : « dose », « posologie amoxicilline », « 5mg/kg », « 0,2 ml par kilo », « DOSE D'ANTIBIOTIQUE », « Dose ? et recettes du mois », « µg/kg », « 1 cp matin et soir », « débit de perfusion », « prescrire du tramadol », « tâches en retard et dose de Rex »… : **25 refus, motif `dose`**.
- Le refus **ne contient aucun chiffre** et **ne lit rien** : le test passe un jeu de données piégé (accès interdit) et la garde répond sans y toucher.
- Pas de refus à tort sur « Tâches importantes », « Recettes de ce mois », « Rendez-vous de Rex ».
- Dans la page : « quelle dose de rimadyl pour Rex ? » → « Je ne calcule et ne propose aucune dose… », puis les questions de départ.

## Équipe rouge : comment afficher un chiffre faux ou sans source malgré les gardes ?

| Attaque | Issue |
|---|---|
| **Un chiffre juste mais mal placé** (la phrase dit « 5 lignes » avec le chiffre d'une autre ligne) | **A percé dans la première version** du contrôle (il comparait les chiffres écrits à l'ensemble des chiffres connus). Remplacé par les modèles de phrase à jetons : un chiffre ne peut plus être écrit qu'en nommant le chiffre voulu. |
| Un nom de patient qui ressemble à un jeton (`{income} 99`, `{period}`) ou porte des chiffres | Les noms entrent par des emplacements, jamais dans un modèle : rien n'est substitué, la phrase les reproduit tels quels. |
| Un montant à virgule ou illisible (12,5 ; NaN ; « 12 DA ») | La réponse est **refusée** (« ne se retrouve pas dans ce que j'ai lu »), jamais arrondie. |
| Un tableau amputé d'une ligne, une phrase retouchée d'un seul chiffre, un modèle avec un chiffre en dur ou un jeton inconnu, un solde net faux, une source absente | Tous rejetés. |
| **« DROP TABLE patients »** | **A percé dans le développement** : lu comme une question sur les patients. Les mots SQL sont maintenant refusés comme une demande d'écriture. Rien n'était exécuté. |
| **« du 1er au 15 novembre »** | **A percé** : lu comme tout novembre, en silence. Les jours d'un mois, « entre… et… », les jours de la semaine, trimestre, semestre, quinzaine sont refusés : « Je ne lis pas cette période ». |
| Écrire par une question (« supprime », « annule le rendez-vous de Rex », « peux-tu ajouter… ») | Refusé. « Rendez-vous annulés ce mois » reste une lecture. |
| Vaccins, rappels, vermifuge | Refusés : leur source n'est pas lue ici. |
| Deux sujets | L'assistant demande lequel. |
| Hors catalogue, vide, « ça va ? » | Refus, sans chiffre. |
| Patient nommé « Chat », « .* », « ( » | Ne détourne pas le sujet et ne casse rien. |
| 400 000 caractères, HTML dans la question | Coupée à 300 caractères, réponse en moins d'une seconde, la question n'est jamais reprise. |
| Base vide, dates illisibles, 31 février, période de 999 jours, objets « TEST ZO » | Aucune exception ; lignes ignorées ; période bornée à 731 jours ; objets de test exclus comme sur le tableau de bord. |
| Faire écrire le moteur | Impossible : test sur la liste exacte de ses imports. |
| Double validation de la carte | La deuxième écrit 0 ligne ; une écriture refusée est comptée. |
| Balayage : 21 questions variées | Toute réponse produite par le moteur passe sa propre vérification. |

## Parcours dans la page (navigateur, données réelles de test, clair et sombre)

Captures : `captures/` (sept images). Script : `outils/data-answer-onglet.mjs`.
- Onglet ouvert, questions de départ ; recettes des 30 derniers jours ; absences avec la carte à valider ; carte validée (« 1 tâche ajoutée aux Rappels · Enregistré »).
- **Aucune requête sortante** pendant le parcours (mesurée : liste vide). **Aucune erreur** dans la console.
- La carte a été cliquée dans la page sur une absence ajoutée à la copie de test (`ZZ absence`) ; la tâche créée ne l'est que dans le magasin du navigateur de ce parcours, qui est éphémère. Rien n'a été écrit dans la vraie base.

## Ce que le catalogue ne couvre pas

Tout ce qui suit est **refusé en mots**, jamais approché :
- **Stock et produits** (disponibilité par lots) ; **factures, impayés, créances** ; **ventilation** des recettes par catégorie ou moyen de paiement ; **moyennes, paniers, ratios** ; **comparaison à la période précédente** ; **classements** (meilleurs clients, actes les plus fréquents).
- **Rappels vaccinaux et médicaux**, relances, vermifuges (leur source n'est pas lue) ; **hospitalisations, soins, ordonnances, documents, notes**.
- **Par vétérinaire** ; coordonnées d'un propriétaire ; antécédents d'un patient.
- **Périodes** : jours d'un mois (« le 15 octobre »), plages explicites (« du 3 au 9 »), jours de la semaine, trimestres, semestres, « depuis le début ».
- **Plusieurs sujets** dans une même question ; **suivi de conversation** (« et le mois dernier ? » n'a pas de mémoire : chaque question est lue seule) ; **autre langue** que le français.
- **Toute dose**, tout calcul clinique ; **toute modification** autrement que par la carte validée.
- **Les recettes issues des factures émises** (créances) : l'onglet ne lit que le journal de caisse, comme la carte Trésorerie.

## Ce qui n'est pas prouvé

- **L'app de bureau (Tauri) n'a pas été lancée** : le binaire n'existe plus sur la VM et le recompiler dépasse les 3,3 Go de RAM. Les lectures passent par `useSQLite`, comme le reste de l'app ; en bureau, les tables et les écritures de la carte passent par SQLite natif, **non constaté ici**.
- **L'écran Finances** n'est pas disponible dans le navigateur : le rapprochement avec lui est fait par son filtre de dates et par le tableau de bord, pas par ses chiffres affichés.
- **La double validation** d'une carte n'est prouvée que par test (la page a eu deux cartes, une seule a été cliquée).
- **Le refus de répondre quand une table est illisible** (bloc d'erreur, bouton « Relire les données ») n'a pas de test ; il tient au code (`blocked`).
- **Une capture vide, transitoire**, vue à plusieurs reprises, 0,9 s après une réponse, dans le navigateur sans carte graphique : le DOM était complet et opaque, la capture à 3 s est juste. Je l'attribue à la rastérisation logicielle de Chromium après un grand défilement ; je ne l'ai pas prouvé, et je ne l'ai pas vue dans l'app réelle (non testée). Les captures du dossier sont prises après 2,2 s d'attente.
- **Le mode clair/sombre** est vérifié à l'œil sur les sept captures, pas par mesure de contraste.

## Écarts avec le banc, et décisions prises

- **Pas de modèle, même pour la phrase.** Le principe 2 autorise un modèle à formuler la phrase ; je n'en ai mis aucun. Une phrase écrite par le code à partir de jetons est vérifiable ; une phrase d'un modèle ne l'est pas sans relire chaque mot. Si vous voulez un jour une formulation libre, elle devra passer par le même contrôle (jetons obligatoires, aucun chiffre en dur).
- **Garde « harnais agent » : il n'en existe pas dans master.** Le harnais d'agent est dans la copie de test (`harnais-agent`) et n'a pas été porté, faute d'aval. Les lectures de l'onglet passent par les magasins ordinaires (`useSQLite`), **en lecture seule**, derrière les trois gardes de ce bilan. Si le harnais est porté plus tard, il devra être inséré avant `useSQLite`.
- **Dossiers actifs** : ni décédés **ni archivés** (le banc ne connaissait pas l'archivage).
- **Ce qui est refusé en plus du banc** : les jours d'un mois, plages, jours de la semaine, trimestres ; les mots SQL ; les montants non entiers.
- **Les vaccins restent refusés**, comme au banc. Le tableau de bord de master lit désormais les rappels médicaux ; je n'ai pas branché l'onglet dessus (hors catalogue).

## Mesures

| Mesure | Résultat |
|---|---|
| Lint (`npm run lint -- --max-warnings=0`) | 0 message, code de sortie 0 |
| Typecheck | aucun message nouveau par rapport à la référence de master (15 messages préexistants, sans rapport) |
| Tests | 1944 verts (227 fichiers) ; +78 pour l'onglet (`answer.test.ts` 72, `clinic-answers.test.tsx` 6) |
| Build de production | passe. Morceau de l'assistant : 108,8 → 136,4 Ko (chargé à l'ouverture du panneau). Chargement initial inchangé : 1 029,4 Ko, 311,7 Ko gzip, **identique à master sans l'onglet** |
| Budget de démarrage | **311,7 Ko gzip pour un budget de 300 : déjà dépassé sur master avant cet onglet** (même chiffre). Non traité, hors périmètre |
| Test `tests/modules/dashboard/dashboard-widgets.test.ts` | instable sous charge (échoue quand la VM est occupée, passe seul, 21 sur 21) ; déjà vu avant cet onglet |

## À décider

1. **Finances / tableau de bord : le jour d'une ligne de caisse** (UTC pour l'un, local pour l'autre) : lequel fait foi ? L'assistant suit le tableau de bord.
2. Porter le harnais d'agent avant de brancher d'autres lectures ? (Aucune lecture supplémentaire n'est prévue.)
3. Étendre le catalogue (les sujets listés plus haut) : chaque ajout demande ses propres chiffres, ses refus et son oracle.
