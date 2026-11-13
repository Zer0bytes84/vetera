# Banc Fable : coup de fraîcheur du design Clean

Branche `banc/fable-fraicheur-2026-11-12`, partie de `master` à `8174718`. Rien n'est poussé ni mergé.

## Round 1 : verdict honnête

Douze commits, 75 lignes : de la finition typographique et deux corrections d'interaction. **La différence ne se voit pas en une seconde.** Le diff de pixels le dit lui-même : entre 0,04 % et 3,6 % des pixels changent selon l'écran (plancher de bruit : 0 pixel). L'objectif du brief, une différence visible d'un coup d'œil, n'est pas atteint par ce round. Ce qu'il apporte est réel mais se lit au zoom ; le round 2 traite le terrain laissé de côté (mouvement, profondeur, matière).

## Les quatre questions du préambule

| Question | Réponse donnée | Retenu | Écarté, et pourquoi |
| --- | --- | --- | --- |
| Ce qu'un professionnel ferait en plus | Mesurer avant de toucher ; régler la police par ses axes ; habiller sélection et focus ; tenir un plancher de bruit | Relevé typographique de 2 079 textes sur 9 écrans, audit de géométrie, plancher de bruit à 0 pixel, sélection et focus traités | Variantes de glyphes d'Inter : le fichier embarqué n'en contient aucune (voir « matière brute ») ; compensation de graisse en sombre : rien à corriger au zoom |
| La matière la plus brute | Styles calculés et pixels de l'app en marche, tables du fichier de police, base de test, tests de charte | Tout | `DESIGN.md` écarté comme source : il décrit encore Geist par défaut et Premium |
| Méthodes et outils | Relevé par rôle, captures déterministes, diff de pixels, lecture des tables de police, règles CSS remontées par CDP, un commit par proposition | Tout (scripts dans `outils/`) | WebKit : aucun moteur WebKit pilotable dans la VM |
| Preuve extérieure | Tests de charte, contrastes calculés, alignement mesuré, diff de pixels, détecteur Impeccable | 217 fichiers de test verts, montants alignés au centième de pixel, 0 constat du détecteur sur mes lignes | Rendu macOS : non prouvable ici |

Ce que la matière brute a appris, et qui ne figurait nulle part :

- **Dans le fichier Inter embarqué, `tnum` élargit le trait d'union de 41 %** (942 → 1 328 unités), les parenthèses et la ponctuation. Partout où les chiffres tabulaires sont posés sur du texte, « rendez-vous » s'ouvre en « rendez - vous ».
- **Ce fichier ne contient que `calt`, `tnum`, `pnum`, `frac`** : pas de `case`, `zero`, `ss0x`, `cv0x`. Aucune variante de glyphe n'est disponible sans changer de fichier de police.
- **L'axe optique va de 14 à 32** : en dessous de 14 px, Inter ne s'adapte plus.
- **Les tableaux et les boutons portaient un interlettrage de titre** (−0,02 em), reste de l'ancienne base Premium, contraire à la règle du 11 novembre.

## Équipage

| Métier | Ce qu'il a fait |
| --- | --- |
| Typographe | Lecture des tables d'Inter, relevé des couples taille/graisse/interligne/tracking, portée des chiffres tabulaires |
| Designer d'interface | Revue des 18 captures, cohérence des rôles entre pages (chiffres clés), casse française, séparateurs |
| Ingénieur d'interaction | Audit des transitions (durées, courbes), mesure image par image de la pression des boutons |
| Spécialiste accessibilité | Audit clavier de 9 écrans, contrastes calculés |
| Ingénieur de test | Banc déterministe, pont SQL en lecture seule sur la base de test, plancher de bruit |
| Équipe rouge | Attaques ci-dessous |

Skills : Impeccable (contexte, typeset, polish, craft-floor, détecteur), Emil (catalogue d'audit : la pression à 160 ms vient de là), Taste (règles des écrans d'application : interlettrage nul au corps, tabulaire pour les nombres de tableau). Les consignes « refonte » ou « lecture seule » de ces skills ont cédé au brief.

## Les propositions, une ligne chacune

| Commit | Ce qui change | Pourquoi | Comment on le voit ou le mesure |
| --- | --- | --- | --- |
| `edb42dc` | L'entrée active de la barre latérale montre son focus clavier | Seul arrêt clavier sans anneau | `zooms/focus-entree-active.png` ; audit : 1 focus perdu par écran → 0 |
| `2430491` | La pression des boutons s'anime (160 ms, `cubic-bezier(0.23, 1, 0.32, 1)`) | Le retrait à 0,97 tombait d'un coup (`transform` listé, `scale` animé) | Échelle 1 → 0,975 → 0,971 → 0,9706 sur 200 ms ; avant : 0,9706 dès 0 ms |
| `7c65a3b` | Les pastilles gardent leur interlettrage | −0,528 px hérité du titre de 24 px, soit −4,4 % à 12 px | `zooms/*-titre-et-pastilles.png` |
| `856ccb3` | Tableaux : interlettrage normal | −0,26 px hérité à 12, 13 et 14 px | 192 textes passent à 0 ; `zooms/*-tableau-factures.png` |
| `73d8695` | Boutons : interlettrage normal | −0,28 px sur des libellés de 13 px | `zooms/*-boutons.png` |
| `7bdaeae` | En-têtes de colonne sans chiffres tabulaires | Trait d'union élargi de 41 % | `zooms/*-entete-de-colonne.png` |
| `a43a037` | Fil d'Ariane sans chiffres tabulaires | Même cause | `zooms/*-fil-d-ariane.png` |
| `2a4783d` | « Jeudi 12 novembre 2026 » | Le mois ne prend pas de capitale en français | `zooms/*-date-agenda.png` |
| `2ed83c8` | Points médians réguliers dans la ligne d'identité | Marge de 8 px au lieu d'une espace | `zooms/*-points-medians.png` |
| `3026119` | Chiffres clés : même dosage sur toutes les pages | Un composant, deux réglages (14/500 au tableau de bord, 13/450 ailleurs) | `zooms/*-chiffres-cles.png` |
| `310c76e` + `9b55151` | Texte sélectionné sous un voile, en encre forte | Aplat noir ou violet plein ; la première version laissait le gris à 3,5:1 | `zooms/selection.png` ; 10,7:1 en clair, 10,2:1 en sombre |

Durées et courbes retenues : pression 160 ms `cubic-bezier(0.23, 1, 0.32, 1)`, sans effet sous « réduire les animations ». Le reste des transitions existantes (150 à 160 ms, mêmes courbes) n'a pas été touché au round 1.

## Équipe rouge

| Attaque | Issue |
| --- | --- |
| Faire tomber un contraste | **Réussie** : sous le premier voile de sélection, le gris discret tombait à 3,5:1 (clair) et 3,8:1 (sombre). Corrigé par `9b55151` |
| Trouver un focus perdu | Trouvé sur master (entrée active de la navigation), corrigé ; après : 0 sur 494 arrêts clavier |
| Faire déborder un texte | **Partiellement réussie**, voir le verdict ci-dessous |
| Casser l'échelle typographique | Échec : `type-scale.test.ts` vert, le 14 px des libellés est dans l'échelle |
| Rogner un chiffre roulant passé en semibold | Échec : aucune valeur ne dépasse sa carte |
| Désaligner les montants | Échec : les 10 montants d'une colonne partagent un seul bord droit (1 084,39 px avant, 1 088,13 px après) |
| Faire bouger la barre latérale ou la structure de l'en-tête | Échec : 0 pixel changé dans la barre latérale ; dans l'en-tête, seul le texte du fil d'Ariane |
| Ignorer « réduire les animations » | Échec : la pression reste instantanée dans ce mode |

### Verdict : la colonne qui sort du cadre avec un nom très long

**Préexistant, et aggravé par mes changements.** Sur master, un nom de 59 caractères dans la liste Patients pousse déjà la dernière colonne hors du cadre : l'en-tête est coupé à « Prochain rendez-vou » (capture `rouge` de master, même injection). Sur la branche, la coupe tombe à « Prochain rendez- » : la colonne Propriétaire commence à x = 859 au lieu de 843, soit 16 px de plus. La cause de l'aggravation est le commit `856ccb3` (interlettrage normal des tableaux, texte environ 2 % plus large). La cause première n'est pas de mon fait : la cellule du nom ne se tronque pas. Je ne l'ai pas corrigée (ce serait un changement de comportement du tableau, hors mandat de finition) ; si tu veux garder `856ccb3`, la troncature du nom est le correctif à lui adjoindre.

## Contrôles

- **Typecheck** : vert.
- **Tests** : 217 fichiers, 1 821 tests, verts. Aucun test modifié.
- **Lint** : 192 problèmes dont 11 erreurs, **identique à master**. Origine exacte des 11 erreurs : les onze scripts `docs/recus/2026-11-12-tour-guide/outils/application-reelle/01…11-*.js`, ajoutés par le commit `8174718` (tour guidé, sur master). Ce sont des corps de fonction pour le pilote de test, avec un `return` au niveau du fichier : ESLint y lit `Parsing error: 'return' outside of function`. Aucune ne vient de `src/` ni de ce banc. Les 181 avertissements sont les `react-hooks/todo` déjà connus.
- **Détecteur Impeccable** : 0 constat sur mes lignes ; 25 constats consultatifs dans du code existant.

## Ce qui n'a pas pu être prouvé

- **Le rendu sur macOS.** La VM rend avec FreeType et Chromium ; l'app tourne sous WKWebView avec le moteur de texte du Mac. Lissage, graisse perçue et interlettrage sont à confirmer sur le Mac.
- **Factures et Journal** : le mode navigateur ne sait pas lire les factures. Le banc sert au navigateur deux fichiers retouchés à la volée (jamais dans le dépôt) pour que les lectures SQL passent par une copie en lecture seule de la base de test. Les données sont réelles, le chemin de lecture est celui du banc.
- **Sélection de texte sous WebKit** : vérifiée sous Chromium seulement.

## Non retenu

- **Chiffres tabulaires des cellules de tableau** : le trait d'union large reste dans les noms composés et dans « INV-2026-000020 ». Le lever demande soit un fichier Inter complet, soit de savoir quelles colonnes alignent des nombres ; trop risqué pour l'alignement des montants.
- **Équilibrage des retours à la ligne** (`text-wrap`) : aucun texte sur deux lignes dans les neuf écrans, donc rien à montrer. Retiré.
- **Épaisseur de trait des icônes** : mesurée de 0,75 à 1,5 px rendus selon les icônes (Lucide, Hugeicons et Heroicons mêlés). Non touché : les icônes se proposent une par une.
- **Sous-titre de bande du tableau de bord** : en clair il a le même poids que son titre (14/500), en sombre non. C'est un effet de l'essai du 11 novembre, laissé tel quel ; décision ouverte.

## Reproduire

`outils/` contient le banc : `base-vers-navigateur.py` (base de test → magasin navigateur, sans mots de passe ni licence), `setup.mjs` et `parcours.mjs` (page déterministe, écrans atteints au clic), `tour.mjs` (captures), `releve.mjs` et `analyse.py` (typographie), `audit.mjs`, `focus.mjs`, `pression.mjs`, `rouge.mjs`, `zooms.mjs`, `diff.py`, `planche.py`, `police.py`. Référence sur le port 5198, branche sur le port 5199.

---

# Round 2 : mouvement, profondeur, matière, et le réglage d'hospitalisation

Même branche, onze commits après le round 1 (`9faa33c..38efcd5`). Référence « avant » : la fin du round 1. Preuves dans `round2/`.

## Verdict honnête

Ce round se voit là où il agit et pas ailleurs. Le panneau de l'assistant change à l'œil (maille, ombre, sortie) : 4,9 à 6,4 % de ses pixels. Les pages à bande de chiffres gagnent une ombre de contact visible au zoom, discrète à taille réelle : 0,2 à 0,7 %. Trois écrans ne bougent pas d'un pixel au repos (Documents, dossier patient, Paramètres) : leurs gains sont dans le mouvement, que les captures fixes ne montrent pas. **Le mouvement se juge dans l'app, pas ici** : je l'ai mesuré image par image, je ne l'ai pas ressenti sur ton Mac.

## Les propositions, une ligne chacune

| Commit | Ce qui change | Pourquoi | Comment on le voit ou le mesure |
| --- | --- | --- | --- |
| `b9f521b` (+ `91b8614`) | Réglage « Mon cabinet propose l'hospitalisation » | Demande ferme | Parcours au clic, `round2/hospitalisation/` |
| `fe99458` | Une page arrive sans faire clignoter « Chargement du module » | Le code de la page attendait le clic ; la ligne s'affichait dès 0 ms | 290 à 665 ms d'affichage avant, 30 à 150 ms après (en développement) |
| `054ae30` | La page suivante se pose en 120 ms d'opacité | Coupe sèche entre deux pages | Opacité 0,34 à 23 ms, 0,93 à 61 ms, 1 à 120 ms |
| `b797689` | L'assistant part avec son contenu, en 200 ms | Une plaque grise vide glissait 300 ms à la fermeture | `round2/animations/assistant-fermeture-*.jpg` |
| `6bf881d` | Navigation et onglets segmentés répondent à l'appui | État pressé identique à l'état survolé | Sonde `presse.mjs` : « aucune réponse » → fond actif, échelle 0,968 |
| `2ff09f6` | Ombre de contact sous les panneaux blancs | Proposition contre « ni trait ni ombre » | `round2/ombres/panneaux-avant-apres.png` |
| `04e85fe` | Ombre du panneau assistant en trois couches | Une ombre large à 18 % salissait la page sur 60 px | `round2/ombres/panneau-assistant-avant-apres.png` |
| `3362082` | Maille en haut du panneau assistant | Seule surface qui est une présence, pas un outil de saisie | `round2/maille/panneau-assistant-avant-apres.png` |
| `0dac39b` | Maille légère sur l'invitation au tour guidé | Moment rare, sans donnée, qui se ferme d'un clic | `round2/maille/invitation-tour-avant-apres.png` |
| `38efcd5` | Trois mascottes proposées, à part | Demande du round 2 | `round2/mascottes/planche-clair.png`, `planche-sombre.png` |

## 1. Animations

**Ce que la mesure a trouvé, avant de dessiner quoi que ce soit :**

- À la fermeture, le contenu de l'assistant disparaissait à la première image : c'est une plaque grise vide qui glissait. C'était le vrai défaut du slideout.
- La page ne se resserre pas quand l'assistant s'ouvre, contrairement à ce que le code annonce : la marge prévue (`sm:mr-[var(--assistant-width)]`) est annulée par `!m-0` sur le même élément. Le panneau recouvre la page, bouton Assistant de l'en-tête compris. **Je n'y ai pas touché** (c'est un choix de structure), mais c'est à trancher : soit la page doit se pousser, soit la classe morte est à retirer.
- Changer de page n'avait aucune transition, par décision écrite dans le code (« la nouvelle vue est simplement là »). Je l'ai respectée sur le fond : rien ne bouge, rien ne glisse.

**Durées et courbes retenues :**

| Mouvement | Durée | Courbe |
| --- | --- | --- |
| Assistant, entrée | 300 ms | `cubic-bezier(0.32, 0.72, 0, 1)` (courbe de tiroir, inchangée) |
| Assistant, sortie | 200 ms | `cubic-bezier(0.23, 1, 0.32, 1)` |
| Page suivante | 120 ms, opacité seule | `cubic-bezier(0.23, 1, 0.32, 1)` |
| Pression (boutons, onglets) | 160 ms, échelle 0,97 | `cubic-bezier(0.23, 1, 0.32, 1)` |
| Pression (navigation) | 0 ms à l'aller, 150 ms au retour | fond de l'entrée active |
| Ligne de chargement | attend 150 ms | aucune animation |

Tout est en transitions CSS (interruptibles), sur `transform`, `scale` et `opacity` seulement, et sans effet sous « réduire les animations ».

**Skills.** Emil (`animate`, catalogue d'audit) : sortie plus rapide que l'entrée, pression à 160 ms, pas de mouvement sur une action faite des dizaines de fois par jour. `gestures` : consulté, **verdict négatif** : un panneau de bureau fermé à la souris par une croix ne gagne rien à suivre le pointeur ; j'en ai gardé la règle d'interruptibilité (transition, jamais d'images clés).

## 2. Maille

Deux endroits, et seulement ceux-là : le haut du panneau de l'assistant et la carte d'invitation au tour guidé. Trois halos aux couleurs des graphiques (bleu, indigo, sarcelle), 12 à 26 %, en CSS seul, éteints avant le premier champ. Retirés sous « contraste accru » et « transparence réduite ». La lueur de la barre latérale, masquée deux fois dans le code de Clean, n'a pas été réveillée. Tableaux, dossiers et formulaires restent sans dégradé.

## 3. Ombres

- **Panneaux blancs sur leur bande** (`--clean-panel-shadow`) : filet de 0,5 px à 6 %, 1 px à 5 %, 12 px à 10 % décalée de 6 px. En sombre, pas d'ombre portée (le test de charte l'interdit, je ne l'ai pas contourné) : un filet de lumière à 7 % sur l'arête haute.
- **Panneau assistant** (`--clean-slideout-shadow`) : trois couches fines au lieu d'une large.
- **Limite** : l'ombre ne couvre que le composant `Panel` (bandes de chiffres, tableaux, widgets). Le dossier patient pose explicitement `box-shadow: none` sur ses cartes et les Paramètres portent déjà un filet : 0 pixel changé sur ces deux écrans. Si l'ombre est retenue, il faudra l'y étendre pour ne pas avoir deux finitions.

## 4. Mascottes

Chouette, âne, furet, chacune en neutre, joyeux et réflexion, dans `round2/mascottes/` : neuf SVG autonomes, leurs définitions au format `LineAnimal` de l'app, et une planche où les actuelles sont rendues par leur vrai composant. **Rien n'est branché, rien n'est remplacé.**

Mon avis sur la qualité, puisque c'est ton critère : la chouette et le furet tiennent la comparaison avec les actuelles et se lisent à 28 px ; l'âne est correct, mais proche du cheval existant par la forme de la tête. Un dromadaire a été dessiné deux fois puis écarté : de face, en gros plan, il se lisait comme une vache. Le furet a demandé un écart au format (contour d'œil en papier, sinon les yeux se perdent dans le masque) : un champ à ajouter si on le retient. Elles n'ont pas le mouvement des actuelles (clignement, regard qui suit) : ce sont des images fixes.

## 5. Réglage d'hospitalisation

Paramètres > Mon cabinet > Services du cabinet : interrupteur « Mon cabinet propose l'hospitalisation », activé par défaut, enregistré au clic (clé `clinic.hospitalization_enabled`).

Décoché, vérifié au clic en clair et en sombre :

- l'entrée de navigation devient « Soins », sans sous-page ;
- la page Soins n'affiche plus d'onglets, le fil d'Ariane dit « Soins » ;
- la palette de commandes ne propose plus « Nouvelle hospitalisation » ;
- le choix survit au rechargement, et tout revient en recochant.

**Pour master.** Une seule règle, `isClinicTabVisible(tab, enabled)` dans `src/modules/clinique/clinic-services.ts`. Sur la barre latérale de master (`clinicItems`, entrées directes), elle s'applique en donnant à chaque entrée son `tab` et en filtrant la liste ; si Soins reste seul sous le titre « Clinique », le titre peut rester. Ce branchement n'est pas fait : ma branche n'a pas la barre latérale de master.

**Ce que le réglage ne masque pas** : l'onglet Hospitalisation du dossier patient, le compteur « hospitalisé » des chiffres clés Patients, la nature « Hospitalisation » des factures. Un séjour déjà enregistré reste accessible par son lien : rien n'est supprimé.

## Équipe rouge, round 2

| Attaque | Issue |
| --- | --- |
| Demander l'onglet Hospitalisation de l'extérieur, réglage décoché | Échec : la page reste sur Soins |
| Faire survivre l'entrée après rechargement | Échec : elle reste masquée |
| Faire passer une ombre portée en sombre | Refusé par le test de charte (`rgb(0 0 0` interdit) ; remplacée par un filet de lumière |
| Glisser une erreur de lint | **Réussie puis corrigée** : ma première version du panneau lisait une ref pendant le rendu (2 erreurs `react-hooks/refs`) ; réécrite sans ref |
| Tromper mon propre film | **Réussie** : au ralenti, la minuterie de démontage (temps réel) coupait la sortie avant sa fin. Artefact du banc ; remesuré en temps réel, la sortie va à son terme |

## Contrôles

- **Typecheck** : vert.
- **Tests** : 218 fichiers, 1 826 tests, verts (5 nouveaux pour le réglage). Aucun test existant modifié.
- **Lint** : 192 problèmes dont 11 erreurs, identique à master (mêmes onze scripts du tour guidé).
- **Console** : aucune erreur sur les 20 captures.
- **Détecteur Impeccable** : un constat consultatif, `#000` dans un `mask-image` (c'est un masque de transparence, pas une couleur affichée).

## Ce qui n'a pas pu être prouvé

- **Le ressenti.** Fluidité, stabilité, justesse d'une durée : tout a été mesuré dans Chromium sans carte graphique, rien n'a été ressenti dans l'app réelle.
- **La ligne de chargement dans l'app construite** : mesurée en développement seulement, où les pages se chargent bien plus lentement.
- **`@starting-style`** (fondu de page) : compris par les WebKit récents ; sur un macOS plus ancien, la page arrive simplement sans fondu.
- **Le réglage d'hospitalisation dans l'app de bureau** : vérifié dans le navigateur ; l'écriture passe par le même service de réglages, mais je ne l'ai pas cliqué sous Tauri.
