# Tour guidé du premier patient : bilan

Un vétérinaire qui ouvre Baitari pour la première fois, ou le rouvre après cette mise à jour, voit une carte sur le tableau de bord. Un clic lance un tour de quatre étapes qui lui fait accomplir, dans sa vraie application et sur ses vraies données, le circuit complet : **dossier patient, rendez-vous, consultation validée, facture payée**. Rien n'est imposé, rien n'est créé à sa place.

Développé dans le clone Linux (branche `chantier/tour-guide-2026-11-12`), un commit reporté sur `master` de l'original, rien poussé.

## En deux minutes

- **Ce qui existe.** Une carte d'invitation sur le tableau de bord ; une carte d'étape flottante avec un repère visuel (l'anneau de focus de l'app) sur l'élément à cliquer ; une ligne « Tour guidé » dans Paramètres > Apparence ; un état par poste. Aucune bibliothèque de visite guidée ajoutée.
- **Le choix qui change tout : le tour lit les données, pas les clics.** L'étape 1 s'ouvre « faite » quand un patient créé après le départ existe, quel que soit le chemin pris pour le créer. Idem pour le rendez-vous, la note **validée** (écrire ne suffit pas) et la facture **réglée**. Les chemins d'écran ne servent qu'à afficher la bonne consigne.
- **Prouvé dans la vraie application de bureau**, au clic, sur de vraies données marquées `ZZ-TEST` : tour complet d'un bout à l'autre (jusqu'à la facture `INV-2026-000021` réglée, puis, après correction, une seconde fois avec bascule **en direct 1,1 s après le paiement**), invitation vue une fois, carte fermée, tour quitté au milieu, relance depuis les Paramètres, poste à thème Premium disparu. Base sauvegardée avant, **restaurée après deux fois, 76 compteurs identiques, aucune ligne `ZZ-TEST`, `integrity_check` ok**.
- **La vraie application m'a fait corriger six défauts** que les tests unitaires n'avaient pas vus, et l'équipe rouge un septième (voir « Ce que la vraie application a appris »). C'est la raison d'être de cette règle de test.
- **Non prouvé** : un vrai débutant qui fait le tour seul ; une installation sur base vide ; WebKit (Mac) ; des captures de la vraie fenêtre (GNOME les refuse). Voir « Ce qui n'a pas pu être prouvé ».

## Vos quatre questions, et ce que j'en ai fait

### 1. Ce qu'un professionnel de premier plan ferait sans que vous le demandiez

| Idée | Retenue ? | Comment / pourquoi |
|---|---|---|
| Définir la réussite par un fait observable (« un premier patient facturé et payé »), pas par « a cliqué sur Suivant » | **Oui** | Chaque étape s'évalue sur les données (`tour-progress.ts`), idempotente : relire deux fois donne le même résultat. |
| Pas de piège : le tour ne doit jamais coincer ni nagger | **Oui** | Étape passable à tout moment, tour quittable, état illisible = jamais d'invitation, patient supprimé en route = repli sans blocage. |
| Tester les états hostiles (stockage corrompu, deux fenêtres, fenêtre étroite, clic répété) | **Oui** | 18 attaques dans le navigateur + 72 tests. |
| Un état intermédiaire quand le geste est à moitié fait | **Oui** | Facture émise mais non payée : la consigne change (déduit des données). Trouvé en conditions réelles. |
| Accessibilité : clavier, région nommée, texte annoncé, pas de mouvement | **Oui, en partie** | Boutons au clavier, `role="region"` + `aria-label`, `aria-live`, aucune animation. Pas testé avec un lecteur d'écran. |
| Langues de l'app (FR, EN, AR en écriture de droite à gauche, ES) | **Non** | Les textes sont en français, comme « Quoi de neuf » et les Paramètres. Les propriétés CSS sont logiques (`inset-inline-end`), mais l'arabe n'a pas été testé. |
| Test avec de vrais débutants | **Non** | Hors de ma portée : voir « Ce qui n'a pas pu être prouvé ». |
| Mesure d'usage (qui termine le tour) | **Non, volontairement** | L'app est locale et sans télémétrie ; en ajouter une n'est pas une décision à prendre à votre place. |

### 2. La matière brute dont je suis parti

Pas la documentation : **les chemins de création réels dans le code** (`soap-review.ts`, `billingService`, `useSQLite`, `app-shell`, la barre « + »), puis **le comportement de la vraie application** lancée avec le pilote. Deux faits que seule la matière brute pouvait donner : les horodatages SQLite sont écrits sans fuseau, en UTC (un tour qui les lit tels quels se tromperait d'une ou deux heures) ; la liste de factures du tableau de bord ne se rafraîchit pas quand on enregistre un paiement. La matière qui m'a manqué : le retour mot à mot du testeur qui bute sur le circuit, et un débutant.

### 3. Méthodes et outils

Un automate d'états persisté et testé (`tour-state.ts`) ; une progression déduite des données (`tour-progress.ts`) ; un repère ancré sur un sélecteur stable, avec contrôle que la cible est réellement visible (`elementFromPoint`) ; Playwright + Chromium pour l'interface ; le pilote `H` dans la vraie fenêtre Tauri pour le parcours au clic ; sauvegarde `VACUUM INTO`, compteurs de 76 tables avant/après, restauration ; `vitest`, `tsrs`, `tsc -b`, `eslint`, `knip`. Les scripts sont dans `outils/`.

### 4. Ce qui, en dehors de vous et de moi, prouve le résultat

Un vétérinaire débutant qui fait le tour seul, sans aide ; le testeur qui bute sur le circuit ; la CI (pas de push). **Je n'en ai aucun.** Mon substitut : des parcours exécutés dans l'application réelle, des outils qui mesurent (compteurs, tests) et des attaques. Ce n'est pas équivalent, et le bilan le dit.

## L'équipage

| Métier convoqué | Ce qu'il a fait (méthode) |
|---|---|
| **Concepteur de parcours d'apprentissage** | Quatre étapes dans l'ordre du circuit, une consigne courte puis ce qu'il reste à faire sur l'écran, « Passer » et « Quitter » toujours visibles ; Soins et Hospitalisation absents (un test le garantit). |
| **Ingénieur de données** | Détection par les données ; lecture des horodatages stockés (UTC naïf) ; invariants : « créé après le départ », « validé » = note relue et non modifiée depuis, « payé » = règlement enregistré. |
| **Ingénieur d'état et de persistance** | Automate pur, un enregistrement par poste, lecture qui ne lève jamais, écriture refusée = pas d'invitation, suivi d'une autre fenêtre. |
| **Ingénieur d'interface** | Réemploi de `Shell`/`Panel`, de la barre « + », de l'anneau de focus et de la vitre de « Quoi de neuf » ; portail sur `<body>` pour passer au-dessus des menus. |
| **Testeur en conditions réelles** | Parcours au clic dans la vraie application, sauvegarde avant, données `ZZ-TEST`, nettoyage complet, compteurs. |
| **Équipe rouge** | Ses attaques et leurs issues sont plus bas. |
| **Rédacteur de la livraison** | Ce bilan, les captures, les journaux. |

## Ce qui a été fait

Tout est dans `src/modules/tour/` (aucune écriture dans la base : un test le vérifie) :

| Fichier | Rôle |
|---|---|
| `tour-state.ts` | L'état (invitation, statut, étape, heure de départ, deux repères) et ses transitions pures ; lecture tolérante. |
| `tour-store.ts` | La persistance par poste (`baitari-guided-tour-v1`), l'abonnement React, les drapeaux de session. |
| `tour-progress.ts` | « L'étape est-elle réellement faite ? » à partir des données. |
| `tour-steps.ts` | Les quatre étapes et leurs textes. |
| `tour-target.ts` | Quelle cible entourer, est-elle à l'écran, est-elle recouverte. |
| `tour-guide.tsx` | Le tour (carte d'étape, repère, lecture des données pendant le tour seulement) et la carte de fin. |
| `tour-invitation.tsx`, `tour.css` | La carte d'invitation et le style. |

Branchements : `app-shell.tsx` (monte le tour), `dashboard-page.tsx` (la carte d'invitation), `Parametres.tsx` (la ligne « Tour guidé »).

**Comportement.**
- **Invitation** : au premier lancement de cette version, installation neuve ou existante. « Faire le tour » démarre ; la fermer la fait disparaître pour de bon. Montrée une fois : elle reste sur le tableau de bord tant qu'on ne l'a pas fermée **pendant cette session**, et ne revient pas au lancement suivant (même règle que « Quoi de neuf »).
- **Étapes** : 1 « + » › Patient. 2 « + » › Rendez-vous. 3 Agenda › menu « ⋯ » › Ouvrir › note SOAP › « Valider la note pour les documents ». 4 « + » › Facture › émettre › « Régler ». L'étape suivante ne s'ouvre que sur la donnée réelle.
- **Relance** : Paramètres > Apparence > Affichage, ligne **« Tour guidé »** (« Revoir le tour de prise en main, dossier, rendez-vous, consultation, facture »), bouton **« Revoir le tour »**, depuis l'étape 1 et le tableau de bord.
- **Jamais de relance automatique** après fermeture, fin ou abandon.

## Preuves

### Dans la vraie application de bureau (`outils/application-reelle/`)

Application lancée avec `BAITARI_TEST_HARNESS=1 npm run tauri:dev`, sur la copie de la vraie base ; base sauvegardée avant ; données `ZZ-TEST`.

| Cas demandé | Résultat |
|---|---|
| **Installation existante : invitation vue une seule fois** | Carte affichée sur le tableau de bord ; après redémarrage de la fenêtre, absente ; état `shown`. |
| **Carte fermée : elle ne revient pas, l'app est libre** | « Fermer » : disparaît, état `closed`, la barre « + » répond ; après redémarrage, absente. |
| **Installation neuve (aucun historique du tour) : invitation vue, tour complet d'un bout à l'autre** | Clé absente → invitation → « Faire le tour ». Étape 1 : dossier `ZZ-TEST-Rex` créé au formulaire, étape 2 s'ouvre toute seule, patient retenu. Étape 2 : rendez-vous créé, étape 3. Étape 3 : rendez-vous ouvert (menu « ⋯ » › Ouvrir), note SOAP écrite **sans avancer**, puis validée : étape 4. Étape 4 : facture `INV-2026-000021` (3 000 DA) émise puis réglée : tour terminé, carte de fin. |
| **Tour quitté au milieu : rien de cassé, rien relancé** | « Passer » puis « Quitter » : état `quit`, ni carte ni repère ; après redémarrage rien ne revient ; les données créées sont intactes. |
| **Relance depuis les Paramètres** | Ligne et bouton avec le texte demandé ; clic : tour recommencé à l'étape 1, repères effacés, retour au tableau de bord. |
| **Poste dont le thème a disparu** | `theme-config` = `{"skin":"premium","cleanFont":"geist"}` : Clean + Geist, `theme-config` réécrit `{"cleanFont":"geist"}`, aucun `data-visual-style`, aucune erreur ; le tour se comporte normalement. La migration déjà livrée n'est pas perturbée (un test unitaire le garantit aussi). |
| **Bascule en direct à la fin (seconde passe, après correction)** | Facture émise : la consigne passe à « La facture est émise… » sans rechargement ; paiement confirmé : **tour terminé 1 139 ms plus tard**, carte de fin, aucune erreur. |

**Nettoyage et compteurs** (`preuves/base-compteurs-*.json`). Les deux parcours ont créé des lignes dans 8 à 12 tables (propriétaires, patients, rendez-vous, notes, factures, lignes, règlements, transactions, journal, etc.). Après restauration de la sauvegarde, **les 76 tables ont exactement leurs compteurs d'avant, aucune ligne `ZZ-TEST` ne reste, `PRAGMA integrity_check` donne `ok`**, deux fois de suite. L'état local de la fenêtre a été remis à celui d'avant (`theme-config` `{"cleanFont":"inter"}`, tour jamais vu).

### Dans le navigateur (Chromium)

- **Parcours d'interface : 45 contre 45** (`preuves/interface-navigateur.txt`), en clair et en sombre : invitation, absence au lancement suivant, fermeture, démarrage, repère exactement sur le bouton « + » puis sur l'entrée « Patient », effacement pendant le formulaire, avancement sur création réelle, quitter, relance depuis Apparence, quatre « Passer », carte de fin, aucune erreur console.
- **Équipe rouge : 18 contre 18** (voir plus bas).
- **Captures** (`captures/`, clair et sombre) : invitation, chaque étape, le formulaire ouvert, l'Agenda, l'étape 4, la carte de fin, et la ligne « Tour guidé » dans Apparence.

### Qualité

| Contrôle | Avant (`master`) | Après |
|---|---|---|
| Tests (`vitest`) | 213 fichiers, 1 749 tests | **217 fichiers, 1 821 tests, tous verts** (+4 fichiers, +72 tests) |
| `tsrs -b` et `tsc -b` | propres | **propres** |
| `eslint .` | 0 erreur, 181 avertissements | **0 erreur, 181 avertissements, les mêmes** |
| `knip` | 624 constats | **0 constat nouveau lié au tour** (deux types exportés inutilement ont été corrigés ; 8 constats nouveaux ne viennent pas d'ici : ce sont les scripts `outils/` du chantier Premium, absents de ma référence) |

## L'équipe rouge : attaques et issues

### Dans le navigateur (`preuves/equipe-rouge-navigateur.txt`) : 18 attaques sur 18 repoussées

| Attaque | Issue |
|---|---|
| Enregistrement du tour hostile : JSON invalide, tableau, `null`, statut inconnu, « en cours » sans heure, étape démesurée, `__proto__` piégé, 200 000 caractères | Application libre, aucune invitation intempestive, aucune erreur. **Le statut inconnu avait rouvert l'invitation : corrigé.** |
| Deux fenêtres : l'une démarre le tour | L'autre le suit (événement `storage`), sans le relancer. |
| Fenêtre étroite (700 px) | La carte reste entièrement dans l'écran, le repère suit le bouton. |
| Clavier seul | Entrée sur « Passer », barre d'espace sur « Quitter » ; la carte est une région nommée. |
| Double-clic sur « Faire le tour », « Passer » martelé 12 fois | Un seul tour ; le tour se termine sans jamais dépasser la fin. |
| Patient du tour supprimé en route | L'étape ne se bloque pas : un rendez-vous neuf la fait avancer. |
| Un tour complet à coups de « Passer » | **Aucune donnée créée** (compteurs identiques). |
| Chercher animation ou transition sur le repère et la carte | Aucune (« aucun nouveau langage visuel »). |

### En test unitaire (72 tests, `tests/tour/`)

Enregistrements corrompus de toutes formes, valeurs hors limites, tour « en cours » sans heure, stockage illisible ou refusant l'écriture, horodatages SQLite sans fuseau, patient créé avant le départ, dossier archivé, rendez-vous annulé, **note non validée, brouillon d'IA, note modifiée après validation, note d'un autre patient**, facture non payée, facture d'un autre client, facturation inconnue ; et la **garde statique** : aucune écriture dans la base, aucun mot « soin » ni « hospitalisation » dans les textes, aucune bibliothèque de visite guidée, clé de stockage distincte de « Quoi de neuf ».

### Ce que la vraie application a appris (défauts trouvés et corrigés)

Aucun des six premiers n'était visible aux tests unitaires ; le septième est venu de l'équipe rouge :

1. **Le repère passait sous le menu « + »** (la coque est un contexte d'empilement ; le menu est dans un portail) : carte et repère rendus dans `<body>`.
2. **Le repère disparaissait dès qu'un panneau non bloquant était ouvert** (la feuille du patient créé) : il disparaît maintenant seulement quand la cible est réellement recouverte.
3. **Après un formulaire annulé, le repère ne revenait pas** : il revient quand la cible reste dégagée un instant (un voile qui s'anime ne compte pas).
4. **En consultation (« Flux »), la carte répétait « Ouvrez l'Agenda »** : l'étape 3 a désormais trois consignes (Agenda, menu « ⋯ » › Ouvrir, note SOAP).
5. **Facture émise mais non payée : la carte reprenait « Cliquez sur + puis Facture »** : état intermédiaire déduit des données.
6. **Le règlement n'avançait pas l'étape 4** : la liste de factures du tableau de bord ne se rafraîchit pas sur un paiement. Le tour relit lui-même les factures émises (lecture seule, toutes les 2,5 s, seulement pendant cette étape).
7. **Un statut inconnu dans l'enregistrement rouvrait l'invitation** (équipe rouge) : corrigé.

Mon premier script de test du navigateur figeait l'horloge, ce qui donnait la même heure aux données de démonstration et au départ du tour ; c'est un artefact de mon test, mais il confirme que le critère « créé après le départ » est déterminant.

## Décisions, écarts et points qui vous reviennent

1. **Emplacement du bouton.** Comme demandé : Paramètres > Apparence, section « Affichage », ligne « Tour guidé » après « Police ». Les Paramètres n'ont pas d'onglet « Général » : « Apparence » est bien l'onglet de l'interface. Je n'ai pas trouvé d'emplacement plus naturel. Une réserve : la section « Affichage » regroupe des réglages d'apparence, et cette ligne est la seule qui n'en est pas un. Une petite section à part, juste dessous, ne coûterait rien si cela vous gêne.
2. **« Invitation vue une seule fois ».** Je l'ai lu comme « une fois par lancement où elle a été montrée, pas au suivant » : si on l'ignore, elle reste sur le tableau de bord pendant la session, puis ne revient plus ; la ligne des Paramètres reste. L'autre lecture (elle revient jusqu'à ce qu'on la ferme) est possible, mais je l'ai écartée pour ne pas relancer quelqu'un qui n'a rien demandé.
3. **Étape 4 : « payée ».** L'étape se termine dès qu'un règlement est enregistré pour ce client sur une facture émise après le départ, même partiel. « Facture payée » au sens strict (soldée) n'est pas exigé.
4. **Étape 3 : « Ouvrir ».** Le chemin Agenda › menu « ⋯ » › Ouvrir est ce que l'écran offre. Le bouton « + » › Consultation ouvre le même cas ; il fait avancer l'étape de la même façon (c'est la donnée qui compte).
5. **Textes en français seulement**, comme « Quoi de neuf ».
6. **Le clone.** Il a été aligné sur `master` de l'original (ses commits locaux, de même contenu, sont gardés sur la branche `clone-avant-sync-2026-11-12`).
7. **Rien d'autre n'a changé** dans l'application : le tableau de bord n'a de différence visible que la carte d'invitation, quand elle est montrée.

## Ce qui n'a pas pu être prouvé

- **Un vrai débutant** qui fait le tour seul, et le testeur qui bute sur le circuit : le critère de réussite réel reste à vérifier avec eux.
- **Une installation sur base vide** (assistant de configuration, puis tour) : « neuve » a été testée comme « sans historique du tour » sur la copie de la vraie base.
- **Les captures de la vraie fenêtre** : GNOME refuse la capture d'écran ; les captures sont celles du navigateur (Chromium), avec les données de démonstration du navigateur. Dans la vraie fenêtre, j'ai lu le DOM, les états et les rectangles.
- **WebKit** (votre Mac) : tout est en Chromium et Tauri/WebKitGTK sous Linux.
- **Lecteur d'écran et arabe** : non testés.
- **Persistance de la fenêtre après arrêt brutal** : j'ai remis l'état local (`theme-config`, tour jamais vu) puis arrêté l'application quelques secondes plus tard ; je n'ai pas relancé l'application pour constater que l'écriture a bien été conservée. Si le tour apparaît comme « déjà vu » à votre prochain lancement, c'est la seule raison.

## Reproduire

Scripts dans `outils/` : `tourui.mjs` (interface), `tourrt.mjs` (équipe rouge), `apparence.mjs`, `counts.py` (compteurs de 76 tables), et `application-reelle/*.js` (le parcours au clic, à jouer avec `npm run harness -- fichier.js` pendant `BAITARI_TEST_HARNESS=1 npm run tauri:dev`). Règle suivie : sauvegarde avant (`VACUUM INTO` en lecture seule), données `ZZ-TEST`, restauration et compteurs après.
