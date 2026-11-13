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
