# Session widgets du tableau de bord (28-29 octobre 2026)

Branche `feat/dictee-turbo-native`. Commit local, aucun push.

**Matière première :**
- le prototype Google AI Studio (« Widgets prototypes ») : lu, jamais copié ni importé ;
- la base SQLite réelle : lue en lecture seule, puis travaillée sur des copies.

## 0. L'écart entre la demande et le code réel

Le brief décrit un `Dashboard.tsx` avec ces widgets :
- 4 cartes statistiques ;
- À surveiller ;
- Rendez-vous du jour ;
- Chiffre d'affaires sur 7 jours ;
- Répartition des patients actifs (donut) ;
- Taux de remplissage sur 22 créneaux.

**Ce fichier n'existe pas.** Le tableau de bord réel est `src/modules/dashboard/components/premium-analytics.tsx`, en vue « Vue d'ensemble ». Ni « Répartition des patients actifs », ni donut, ni « Taux de remplissage » n'existent nulle part dans `src/`.

J'ai donc appliqué les mécaniques aux widgets qui existent :

| Brief | Widget réel |
|---|---|
| 4 cartes statistiques | Trésorerie, Consultations, Patients suivis, Actions à suivre |
| Chiffre d'affaires sur 7 jours | Recettes & activité (période choisie au-dessus : aujourd'hui, 7, 30, 90 jours, 12 mois) |
| Rendez-vous du jour | Partie basse de la carte « Cette semaine » |
| À surveiller | Rappels à venir, Stock à surveiller, Hospitalisés |
| Répartition des patients actifs | **N'existe pas** (voir § 4) |
| Taux de remplissage, 22 créneaux | **Pas de donnée** (voir § 1) |

## 1. Les quatre questions, et ce qui en a été retenu

### (1) Ce que ferait un professionnel de premier plan

Il partirait de la question que se pose le vétérinaire à 8 h, pas du widget. Il ne mettrait aucun chiffre sans source vérifiable. Il refuserait une prévision sans assez de recul, et dirait pourquoi. Enfin, il éprouverait chaque widget dans tous ses états : vide, rempli et petit format.

**Retenu :**
- chaque calcul est une fonction pure testée ;
- la prévision refuse de parler avant 7 jours, ou sans encaissement, et le dit ;
- chaque widget est vérifié vide, rempli et en petit format.

**Non retenu :** un entretien avec un vétérinaire utilisateur. C'est hors de ma portée ; c'est ta validation qui en tient lieu.

### (2) La matière la plus brute

Les tables SQLite, plutôt que la description du brief ou le prototype. Lue en lecture seule le 29/10, la base réelle contient :
- 11 patients ;
- 52 rendez-vous, dont **aucun aujourd'hui** ;
- 55 encaissements ;
- 1 produit.

Elle n'a **ni horaires d'ouverture, ni durée de créneau, ni nombre de créneaux**. Les « 22 créneaux du jour » n'ont donc aucune source : je ne les ai pas inventés.

### (3) Méthodes et outils

- **Modèles purs testés** dans `model/dashboard-widgets.ts` : unités du jour, parts entières qui somment à 100, prévision.
- **Recalcul SQL** de ce que l'écran affiche (§ 6).
- **Instance isolée :**
  - un HOME à part, donc un stockage WebKit à part ;
  - une sauvegarde de la base réelle en lecture seule (`.backup`) ;
  - le scénario de capture `tableau` (`scripts/eval-local-ai/capture-tableau.ts`) ;
  - des captures de fenêtre par `screencapture -l`.
- **Mesure automatique dans la page,** pour chaque rangée et chaque apparence :
  - le texte qui sort de sa carte ;
  - le texte coupé sans points de suspension ;
  - les lignes de texte qui se chevauchent, comparées ligne à ligne (`getClientRects`).

Le petit format est la même fenêtre avec les outils de développement ouverts à côté : 612 px de rangée au lieu de 1 096. Le redimensionnement de fenêtre par System Events m'a été refusé (pas d'accès d'assistance).

### (4) La preuve hors de toi et moi

Quatre preuves :
- les chiffres recalculés en SQL, égaux à l'écran ;
- 1 277 tests ;
- les mesures de chevauchement et de débordement (fichiers `mesures.json`) ;
- les captures.

**Non fait :** une revue par un utilisateur tiers.

## 2. Mécanique par mécanique

### 2.1 Grille d'unités (Disk usage, Throughput by hour)

**Pris du prototype :**
- des cases comptables d'un coup d'œil ;
- une infobulle par case au survol ;
- un chiffre héros (« 2 sur 5 rendez-vous terminés ») ;
- une légende chiffrée en dessous.

**Chez nous :** une case par rendez-vous du jour, dans l'ordre des heures :
- pleine : terminé ;
- teintée : en cours ;
- vide et cerclée : à venir.

L'infobulle donne l'heure, le patient, le motif et l'état. Les annulations et les absences ne comptent pas.

**Écarté :**
- les couleurs, le seuil d'auto-scale et la bulle « incident » du prototype ;
- les 22 créneaux, faute de donnée (§ 1-2).

La grille compte donc des rendez-vous réels, pas un remplissage. Les places d'hospitalisation, elles, avaient déjà leur grille depuis le 22/10 (vue Occupation et carte Hospitalisés). Elles n'ont pas changé.

### 2.2 Barre segmentée et prévision hachurée

**Pris du prototype :**
- la barre, avec l'encaissé en plein, la prévision hachurée et un repère vertical ;
- la phrase qui annonce l'échéance.

**Chez nous :** la phrase est **calculée**, jamais écrite en dur.
- **Encaissé :** les encaissements payés du mois en cours, avec la même règle que la carte Trésorerie.
- **Prévision :** linéaire, au rythme du mois, encaissé ÷ jours écoulés × jours du mois. Elle est libellée « Prévision linéaire, au rythme des N premiers jours de … ».
- **Repère :** le total du mois précédent.

La phrase change selon le cas :
- « Septembre (25 000 DA) est déjà dépassé. À ce rythme, octobre finit vers 55 052 DA. »
- « … et dépasse septembre (30 000 DA) vers le 30 oct. »
- « … sous septembre (…) »
- Avant le 7 du mois : « trop tôt pour prévoir ».
- Sans encaissement : « rien à prévoir ».

Pas de prévision tant que le journal charge.

**Où :** en pied de la carte « Recettes & activité ».

**Écarté :** la prévision « atteint son seuil le … » pour le stock. Elle demanderait une consommation journalière fiable, et la base réelle n'a qu'un produit et ses mouvements. Ce serait une prévision sur presque rien.

### 2.3 Chiffre héros et comparaison juste dessous

**Déjà en place** dans les quatre cartes statistiques depuis le 22/10 : variation en pastille et valeur de la période précédente réelle juste sous le chiffre. Rien n'est noyé dans la carte.

Cette passe ajoute la même structure aux nouveaux widgets :
- unités du jour : « 2 sur 5 rendez-vous terminés » ;
- prévision : la phrase, puis la barre.

### 2.4 Lignes de catégories alignées (légende Database, WAL, System)

**Pris du prototype :** pastille, nom, nombre et part, chiffres en colonnes à droite et alignés (`tabular-nums`). Le composant est `CategoryRows`.

Les parts sont des entiers qui somment toujours à 100 (plus grand reste) : jamais 33 + 33 + 33.

**Où :**
- sous la grille du jour : Terminés, En cours, À venir, avec nombre et part ;
- sous la barre de prévision : Encaissé, Prévision d'ici la fin du mois, mois précédent.

### 2.5 Densité

**Pris du prototype :**
- espacement entre rangées de 48 à 20 px ;
- gouttières de 24 à 16 px ;
- lignes de liste de 12/22 à 10/20 px ;
- tailles 12, 13 et 24 px seulement dans les nouveaux éléments.

**Aucun chevauchement ni débordement mesuré** après la passe, sur les cinq jeux de captures :
- données réelles, vides et « jour » ;
- grand et petit format ;
- Clean clair, Clean sombre et Premium.

Soit 45 mesures, toutes vides, et 72 après la deuxième passe, survols compris (§ 9).

**Avant la passe,** la mesure relevait :
- en Premium, le texte de comparaison qui passe à la ligne sous la pastille (« +106 % contre 25 000 DA la période / précédente ») ;
- les cadres gravés des cartes, dépassant de 10 px.

Ces relevés « avant » viennent d'une première version de la mesure, qui comparait les boîtes englobantes : le texte à la ligne y passait pour un chevauchement, le cadre gravé pour un débordement. La version finale compare ligne à ligne et vérifie que le texte reste dans sa carte. Je n'ai pas remesuré « avant » avec elle : les fichiers `avant/*/mesures.json` gardent l'ancienne mesure.

**Non atteint : « un seul écran bento sans défilement ».** À 1 400 × 900, le tableau de bord défile encore, car l'en-tête d'accueil, la rangée « À surveiller » et « Gestion du cabinet » restent. Les retirer aurait supprimé ou déplacé des fonctions, ce que le périmètre interdit.

## 3. Widget par widget

| Widget | Changement |
|---|---|
| Cartes statistiques | Structure inchangée : la comparaison sur la période précédente réelle y était déjà. Espacements resserrés autour. |
| Recettes & activité | La période précédente est désormais celle **des recettes**, en pointillé **gris**, dans tous les thèmes : légende « Recettes, période précédente » et valeur en DA dans l'infobulle. Barre de prévision en pied. |
| Cette semaine → Rendez-vous du jour | Grille d'unités, lignes de catégories, puis les 3 prochains rendez-vous en lignes. Chaque ligne a un sous-titre en clair (« En cours · avec … », « Prochain · avec … »), et toute la ligne ouvre la visite dans Flux, comme le faisait la flèche. Une seule action, la pilule « Agenda ». États vides : « Aucun rendez-vous aujourd'hui. », « Tous les rendez-vous du jour sont terminés. » |
| À surveiller | « Rappels », « Produits » et « Soins » deviennent une pilule, seule action de chaque carte. « + N autres » devient un texte (« + 2 autres dans Rappels »), car la pilule mène au même endroit. |

**Écarts assumés :**
- **Le pointillé des consultations précédentes quitte le graphique** au profit de celui des recettes, que le brief demande. Deux pointillés plus deux courbes rendaient le graphique illisible. La valeur précédente des consultations reste lisible dans l'infobulle.
- **Le sélecteur de période n'est pas recopié dans la carte.** Il est juste au-dessus et pilote aussi les quatre cartes statistiques. Un second sélecteur sur le même état ferait deux commandes pour une seule décision.
- **« Pilule sombre » suit le bouton principal du thème.** Elle est noire en Clean clair et en Premium. En Clean sombre, elle prend le bleu du bouton principal : une pilule noire disparaîtrait sur la carte sombre.

## 4. Ce qui n'a pas été fait faute de donnée réelle

- **Taux de remplissage (créneaux occupés et libres sur 22) :** aucun horaire d'ouverture, aucune durée ni aucun nombre de créneaux dans la base. Il faudrait d'abord un réglage « horaires et créneaux » dans l'Agenda, donc toucher l'Agenda et le schéma : hors périmètre.
- **Répartition des patients actifs (donut) :** pas faite dans la première passe, car le widget n'existait pas. Créée dans la deuxième, à ta demande (§ 9).
- **Prévision de rupture de stock :** pas assez de mouvements réels (§ 2.2).

## 5. Ce qui n'a pas été touché

- **La recherche n'a pas été touchée.** Aucun fichier de recherche, de palette ni de barre latérale n'est modifié (`git diff --name-only`). La recherche (⌘K) apparaît, inchangée, sur chaque capture.
- Rien n'a changé dans ces domaines :
  - dictée, Gemma, Agenda (bouton Ouvrir), lot 3 ;
  - tableaux patients, navigation ;
  - schéma de base, vue « Clinique » du tableau de bord.
- **La base réelle** n'a reçu aucune écriture : lecture `mode=ro`, puis sauvegarde dans un dossier temporaire.

## 6. Vérification sur données réelles et cas vide

**Données réelles** (copie du 29/10) :

| Écran | SQL sur la base réelle |
|---|---|
| Encaissé en octobre : 51 500 DA | `SUM(amount)` payés du 1er au 29/10 : 51 500 |
| Septembre, repère : 25 000 DA | Payés en septembre : 25 000 |
| « octobre finit vers 55 052 DA » | 51 500 × 31 / 29 = 55 051,7, arrondi à 55 052 |
| Rendez-vous du jour : aucun | 0 rendez-vous le 29/10 |

**Cas vide** (copie vidée de toute activité clinique : rendez-vous, encaissements, factures, stock, rappels, hospitalisations, patients) :
- les cartes disent « Rien à comparer » ;
- la prévision dit « Aucun encaissement en octobre : rien à prévoir. » ;
- Rendez-vous du jour : « Aucun rendez-vous aujourd'hui. » ;
- les trois cartes « À surveiller » ont leur phrase vide.

Pour vider la copie, j'ai retiré ses déclencheurs d'audit, la copie seulement : ils interdisent d'effacer la facturation.

**Journée remplie (jeu « jour ») :** la base réelle n'ayant aucun rendez-vous aujourd'hui, la copie recale ses 5 derniers rendez-vous réels sur aujourd'hui, avec 2 terminés, 1 en cours et 2 à venir. **C'est une mise en scène de la copie**, signalée comme telle. Elle ne sert qu'à photographier l'état rempli.

## 7. Captures

Les captures sont dans `avant/` et `apres/`, rangées par jeu :

| Jeu | Contenu |
|---|---|
| `reel-large` | Données réelles, grand format |
| `reel-petit` | Données réelles, petit format |
| `vide-large` | Cas vide |
| `jour-large`, `jour-petit` | Journée remplie (après seulement) |

Chaque jeu contient `<apparence>-<rangée>.jpg`, avec :
- **apparence :** `clean-light`, `clean-dark`, `premium-light` ;
- **rangée :** `kpi`, `recettes`, `surveiller`.

Ses mesures sont dans `mesures.json`.

À comparer en priorité :
- `avant/reel-large/clean-light-recettes.jpg` et `apres/jour-large/clean-light-recettes.jpg` : courbe, prévision, rendez-vous du jour ;
- `apres/reel-large/clean-light-recettes.jpg` : le jour réel, sans rendez-vous ;
- `avant/reel-large/clean-light-surveiller.jpg` et `apres/reel-large/clean-light-surveiller.jpg` : les pilules ;
- `apres/vide-large/*` : les états vides ;
- `apres/jour-petit/*` : le petit format.

**Limite :** il n'y a pas de capture Premium sombre. Premium sombre n'est pas le thème d'usage, et les mêmes jetons y servent.

## 8. Tests

**1 277 verts** (1 263 avant la session). Typecheck et ESLint à zéro.

Nouveaux tests, dans `tests/modules/dashboard/dashboard-widgets.test.ts` :
- unités du jour : ordre, états, annulations et absences exclues, journée vide ;
- parts entières qui somment à 100 ;
- prévision :
  - rythme et date de dépassement ;
  - déjà dépassé, ou pas atteint ;
  - dépenses, impayés et dates futures ignorés ;
  - refus avant 7 jours ou sans encaissement ;
- phrase de prévision écrite depuis les chiffres. Ce test a attrapé un double point après « 30 oct. ».

`theme-clean-charter` vérifie désormais le pointillé dans `premium-analytics.css`, où il vit pour tous les thèmes.

## 9. Deuxième passe : patients par espèce et finition des références

Tu m'as envoyé des captures de référence pour fixer le niveau de finition attendu :
- Snowflake ;
- Net profit ;
- Rollout ;
- A/B test ;
- Deploy ;
- Time tracking ;
- Disk usage ;
- AI assistant.

Puis tu as demandé le widget « Répartition des patients » par espèce.

### Ce que je retiens des références

Les mêmes gestes reviennent d'une capture à l'autre :
- un chiffre héros suivi de son libellé en gris ;
- des lignes alignées : pastille, nom, valeurs en colonnes ;
- un pied de carte avec une phrase d'état à gauche et une seule action à droite ;
- des marqueurs étiquetés au-dessus des barres ;
- des infobulles qui finissent par la conclusion (« B ahead by 0.86 pts ») ;
- des cases vides en pointillé pour ce qui n'est pas encore là.

Tout passe par nos jetons :
- tailles 12, 13 et 24 px au plus ;
- l'encre et ses paliers, la couleur d'accent `series-1` ;
- Clean et Premium.

### Ce qui est fait

| Mécanique de référence | Chez nous |
|---|---|
| Donut et légende alignée (Net profit, Disk usage) | **Nouvelle carte « Patients par espèce »**, à côté de « Hospitalisés ». Elle compte les patients actifs, décédés exclus. Les espèces sont classées de la plus fréquente à la moins fréquente : au-delà de quatre, les plus petites se regroupent en « Autres (n) », et une espèce non renseignée reste comptée. La plus fréquente prend la couleur d'accent, les suivantes des paliers d'encre. Les parts sont entières et somment à 100. |
| Le centre qui répond au survol (Time tracking, Rollout) | Survoler un arc ou une ligne allume les deux ensemble, éteint les autres et affiche au centre « 8 · Chien · 73 % ». Le centre est mis en page en flex, jamais positionné : le chiffre et son libellé ne peuvent pas se chevaucher, même en Premium. C'est le défaut « 32.2 % sur 100 % » du prototype, mesuré puis évité. |
| Pied de carte : phrase d'état et action unique (Disk usage, Rollout, A/B) | Sur les cartes Rappels, Stock, Hospitalisés, Espèces et « Cette semaine » : phrase à gauche (« 1 à traiter », « Prochain : 11:00 · Mocha », « Chien : 73 % des patients actifs · 1 nouveau sur 30 jours »), pilule à droite. Les pieds de carte sont alignés dans la grille 2 × 2. |
| Cases encore libres en pointillé (Disk usage) | Les rendez-vous à venir sont des cases en pointillé. Les cases font 20 px, arrondies à 5 px. |
| Marqueur étiqueté sur la barre (Disk usage « Oct 24 · 90% ») | « Septembre · 25 000 DA » s'affiche au-dessus du repère, avec un axe « 0 … 55 052 DA » sous la barre. L'étiquette reste dans la carte, quelle que soit la position du repère. |
| Infobulle qui finit par la conclusion (A/B test) | L'infobulle de la courbe se termine, sous un filet, par l'écart de la tranche : « +8 000 DA sur la même tranche ». Elle s'ouvre du côté où il y a de la place : avant, elle sortait de la carte sur la droite, et la mesure l'a relevé. |

**Corrigé en passant :** la date survolée sous l'axe s'affichait brouillée (« 27 ((. »). Deux causes :
- l'étiquette normale restait dessous ;
- WebKit peint le contour du texte SVG par-dessus les lettres, quoi que dise `paint-order`.

L'étiquette normale s'efface désormais au survol, et le contour est retiré.

**Disposition :** la rangée du bas passe de 3 colonnes à une grille 2 × 2 :
- Rappels et Stock ;
- Hospitalisés et Espèces.

Le donut a besoin de la largeur d'une demi-rangée. Sous 1 100 px, les cartes passent sur une colonne.

### Ce qui n'est pas repris, et pourquoi

| Élément | Pourquoi |
|---|---|
| Chiffres héros de 60 à 80 px | Ta charte plafonne à 24 px. Le chiffre héros reste à 24 px, le contraste vient du libellé gris à côté. |
| Police mono pour les valeurs | Geist Mono n'est pas chargée dans l'app. Les valeurs sont en chiffres tabulaires de Geist, alignés en colonnes. |
| Thème sombre télémétrie et vert « profit » | Les couleurs du design system l'emportent. |
| Waterfall, jauge, chronologie de déploiement, heatmap 24 × 7 | Aucune donnée réelle n'y correspond sur ce tableau de bord. Une heatmap des consultations par heure et par jour serait possible sur les rendez-vous réels, mais avec 52 rendez-vous elle serait presque vide. |

### Preuve

- **Mesures :** 72 au total, toutes vides, sur 5 jeux, dont les survols de la courbe et du donut, en Clean clair, Clean sombre et Premium, grand et petit format.
  - Les captures sont dans `apres/` ; les fichiers `*-survol.jpg` montrent l'infobulle et le donut allumé.
  - La mesure a trouvé trois défauts, corrigés avant ce commit : l'infobulle hors de sa carte, la date d'axe en double, le centre du donut en Premium.
- **Tests :** 3 nouveaux sur la répartition par espèce :
  - patients actifs seulement, noms regroupés ;
  - « Autres (n) » et espèce non renseignée ;
  - aucun patient actif.
- **Chiffres :** ceux de la base réelle, soit 11 patients actifs : Chien 8 (73 %), Chat 1, Cheval 1 et Lapin 1 (9 % chacun).
