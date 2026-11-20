# Release de fin de semaine (5.2.0 proposée) : intégration locale, 19 novembre 2026

**Où :** branche `integration/release-2026-11-19`, worktree `~/work/integration-wt`, partie de master (`0226fdc`, la 5.1.1 publiée).

**Ce qui n'est pas fait :** rien n'est poussé, publié ni tagué, et master n'a pas bougé. La version n'est pas encore montée : c'est la première étape de la publication, sur ton go (§ 6).

## 1. Les fusions, dans l'ordre décidé

| # | Commit | Contenu | Conflit | Suite entière |
|---|---|---|---|---|
| 1 | `7cdc8aa` | lot Hospitalisation et premières rangées de widgets | aucun | **2 120 / 2 120** (2e passage) |
| 2 | `f0caa39` | Recherche | aucun (`clean.css` fusionné automatiquement) | **2 120 / 2 120** |
| 3 | `f41cfe4` | gardes du Data Answer et panneau assistant corrigé | `clean.css` | **2 189 / 2 189** |
| 4 | `49ad478` | tranche 1 du Data Answer et squelette Cards du tableau de bord | `stat-grid.tsx` | **2 211 / 2 211** (2e passage) |
| 5 | `9764272` | doses validées dans l'ordonnance | aucun | **2 225 / 2 225** |
| + | `874039a` | brouillon de la note « Quoi de neuf » de la 5.2.0 (§ 5) | | **2 225 / 2 225** (2e passage) |

**Après chaque fusion :** typecheck 0, lint `--max-warnings=0` 0, suite entière au vert.

**Le « 2e passage »** : trois fois, un test de durée déjà connu a dépassé son délai sous la charge de la VM (`dashboard-widgets`, ou `patient-record-pdf`). Il passe seul, et la suite entière relancée est verte. Le journal complet est dans `releves/journal-des-fusions.txt`.

**Les deux conflits sont des ajouts côte à côte, résolus en gardant les deux côtés :**
- **`clean.css`** : le lot ajoute la règle « aucune ombre sur les cartes d'une première rangée » ; le Data Answer retire le dégradé du panneau assistant. Les deux sont gardés.
- **`stat-grid.tsx`** : le lot ajoute `data-slot="stat-grid"`, le squelette ajoute la région de chargement, sur le même élément. Les deux sont gardés.
- **Effet utile :** la règle sans ombre du lot couvre aussi les cartes en squelette, qui restent identiques aux vraies.

**Hors de cette release, comme décidé :**
- les repères de temps du démarrage (`chantier/reperes-demarrage-2026-11-19`) ;
- le chantier erreurs, dont la liste à valider reste garée.

## 2. Ce qui change pour le vétérinaire

1. **Ordonnance :** pour les 24 molécules relues par Aïssa, la dose de référence pour le poids, avec son calcul, la voie, la fréquence, la durée et la mise en garde mot pour mot. Quand la référence ne donne pas de dose pour le cas, le panneau dit pourquoi.
2. **Assistant, onglet Données :**
   - une réponse seulement si toute la question est comprise ;
   - des cartes de chiffre, un graphique, un tableau triable ;
   - un panneau ancré, sans dégradé.
3. **Tableau de bord :** les Chiffres clés montrent un squelette pendant la lecture, au lieu de « 0 DA ».
4. **Hospitalisation et premières rangées :** au standard du Tableau de bord, sans cadre, sans trait ni ombre.
5. **Recherche :** les actions rapides en tête, le passage trouvé mis en avant.

## 3. Les preuves sur l'arbre intégré

**Les contrôles de la CI** (`desktop-builds.yml`) :
- typecheck 0 ;
- `npm test` : 2 225 / 2 225 ;
- `npm run test:licenses` : 13 / 13 ;
- en plus, lint 0.

**Le build groupé, celui que lance la CI** (`vite build` en production, minifié). C'est là qu'apparaissait la panne de la 5.1.0 :
- **aucun cycle entre morceaux**, et le point d'entrée n'importe pas `vendor-charts` ;
- **13 vues, en clair et en sombre (26 ouvertures), sans aucune panne ni erreur console** : Tableau de bord, Patients, Agenda, Flux, Rappels, Soins, Hospitalisation, Documents, Produits, Finances, Équipe, dossier patient, Recherche. Captures dans `captures/vues/` ;
- **le même parcours sur la 5.1.1** (master, construit de la même façon) donne les mêmes messages, vue par vue (26 sur 26). Ce sont ceux du navigateur, qui n'a pas le pont natif : « Les séjours n'ont pas pu être chargés » dans l'Agenda et l'Hospitalisation, « Facturation indisponible » dans Finances, et d'autres de ce type. Ils ne viennent pas de la release ;
- **le poids au démarrage** est inchangé : 483,4 Ko compressés, comme la 5.1.1 (+0,1 Ko brut).

**Chaque chantier rejoué sur l'arbre intégré, comparé au relevé de sa branche :**

| Chantier | Rejeu | Résultat |
|---|---|---|
| premières rangées | mesure des 11 pages, clair et sombre (bordures, ombres, rayons, marges, écarts) | **22 / 22 identiques** à la mesure du lot |
| Recherche | tous les états de la palette, inventaire et finition | **identiques** à la branche |
| Data Answer | une question par sujet : cartes, graphique, tri au clic | **8 / 8 réponses identiques**, sans erreur |
| tableau de bord | lecture retardée de 1,5 s | squelette pendant la lecture, **jamais de valeur fausse**, hauteur inchangée (264 / 262 px) |
| ordonnance | Tolfedine 4 kg, Capstar 12 kg, Antisedan | **12 / 12 textes identiques**, sans erreur |

Tous les relevés sont dans `releves/`, et le parcours des vues dans `outils/tour.mjs`.

## 4. Avant ton go : une décision que je te recommande de prendre

**Le calculateur de dose existant contredit la référence d'Aïssa** (bilan des doses, § 4). Il préremplit la ligne qui part sur l'ordonnance imprimée :
- **le cas grave :** Glucantime chez le chien, 27 mg au total au lieu de 27 mg/kg, soit un sous-dosage de 10 fois à 10 kg ;
- Capstar et Prilium hors de leur tranche de poids ;
- 0 mg pour Galastop, Antisedan et Karsivan.

**Ce défaut existe déjà dans la 5.1.1.** Cette release le rend visible : le panneau refuse, et dit « la dose saisie ne vient pas de cette référence ».

**Ma recommandation, puisque la release porte les doses :** pour les 24 molécules, préremplir la ligne depuis la référence, ou la laisser vide quand la référence refuse. C'est un petit chantier, avec ses tests et son équipe rouge, puis une fusion de plus dans cette intégration. **Je ne l'ai pas fait sans ton mot.**

**Les autres points ouverts, aucun bloquant :**
- La rangée « Recettes & activité » montre encore « 0 DA » pendant la lecture. Même traitement possible, sur ton mot.
- Une question pour Aïssa : la référence donne parfois plusieurs doses selon le cas. Le panneau met la dose principale en gros, et les autres dans la mise en garde, mot pour mot.
- Le démarrage : les propositions A à D attendent ta décision. Le contrôle `check:startup` du dépôt échoue de la même façon sur la 5.1.1 et sur l'intégration (`vendor-charts` au démarrage, budget de 300 Ko compressés dépassé). Ce n'est pas une étape de la CI.

## 5. La note « Quoi de neuf », en brouillon

Elle est en `draft` dans `src/modules/release-notes/release-notes.ts` : **elle ne s'affiche pas**, ni dans ton test en tauri dev ni ailleurs. Quatre points :
1. « Les doses relues par une vétérinaire, sur l'ordonnance »
2. « Vos données du cabinet en chiffres et en graphiques »
3. « Plus de chiffres faux pendant le chargement » (avec Hospitalisation et les premières rangées)
4. « Une recherche plus directe »

**La version proposée, 5.2.0 :** la release ajoute des fonctions (doses, Données), ce n'est pas qu'un correctif. Si tu préfères un autre numéro, il ne se change qu'à la publication.

## 6. La publication, sur ton go seulement

1. Monter la version aux quatre endroits (`package.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/tauri.conf.json`).
2. Passer la note en `published`, avec la date.
3. Relancer les contrôles de la CI sur l'arbre exact.
4. Avancer master sur l'intégration (fast-forward), puis poser le tag `v5.2.0`.
5. Pousser master et le tag. La CI « Versioned Release » construit et publie, puis je vérifie la release publiée comme pour la 5.1.1.

**Pour ton test à l'œil en tauri dev :** le dossier original est garé sur les repères (`edcdd8b`). Pour tester l'intégration, il faut y lancer `git switch --detach integration/release-2026-11-19` : la branche est déjà ouverte dans mon worktree, et Git refuse de l'ouvrir deux fois autrement. Je ne touche pas au dossier original : la bascule est de ton côté.

## 7. Ce qui n'est pas prouvé

- **L'app de bureau (WebKit, pont natif SQLite) n'a pas été lancée,** car la VM ne construit pas Tauri. Ton test en tauri dev est la preuve qui manque, en particulier pour :
  - le squelette Message de l'onglet Données, que le navigateur lit trop vite pour l'afficher ;
  - le squelette Cards sur une vraie lecture lente ;
  - les vues qui lisent par le pont natif : Finances, séjours, rappels.
- **Le build signé de la CI** n'a pas tourné. Il ne tournera qu'au tag.
- **Aucun lecteur d'écran réel** n'a été écouté.
