# Chantier fondations, phase 2 : prototype de recherche sémantique native

Reçu du 26 novembre 2026, copie `work-fondations-mac`, commit `258c888f`. La spécification est celle de `docs/recus/2026-11-26-exploration-rust/PROPOSITION.md` (« Le prototype minimal ») ; la référence à battre est le chemin TypeScript **réparé** de la phase 1 (`BILAN-PHASE-1.md`).

## Verdict

**Réussite, au sens des critères fixés**, mesurée dans la vraie fenêtre Tauri (WKWebView), Rust compilé en release, sur ce Mac M1 de 8 Go, avec la clinique synthétique.

| Critère (1 000 patients) | Seuil | Mesuré |
|---|---|---|
| Recherche à chaud | < 100 ms | **87,9 ms** médiane, 96,7 ms p95, 108,7 ms au pire (1 appel sur 40) |
| Premier appel après le lancement | < 1 s | **290 ms** (dont 241 ms de lecture de l'index) |
| Mémoire en plus | ≤ 100 Mo | **+52,6 Mo** (processus Rust) |
| Mêmes résultats, 200 questions | 5 premiers, même ordre, écart ≤ 1e-6 | **200/200**, écart maximal **2,4e-15** |
| Abandon si > 300 ms à chaud ou résultats différents | | non atteint |

Le même chemin à 3 000 patients : 212 ms à chaud (médiane, p95 238 ms), premier appel 974 ms, +139 Mo, 200/200 identiques (écart 3,0e-15). À ce palier, le budget de 100 ms n'est pas tenu, ni celui de 100 Mo ; le seuil d'abandon (300 ms) non plus n'est pas atteint.

## Chiffres dans la vraie fenêtre

Release, WKWebView. `mesures/2-tauri-1000.json`, `mesures/2-tauri-3000.json` ; script `outils/tauri-mesures.js` (pilote de test).

| | 1 000 patients | 3 000 patients |
|---|---|---|
| Appel Tauri vide / `SELECT 1` | 0,2 ms / 0,3 ms | 0,2 ms / 0,3 ms |
| Fiche patient, tables entières (avant 1.1) | 157 à 162 ms | 517 à 573 ms |
| Fiche patient, lecture par patient (après 1.1) | **18 à 22 ms** | **43 à 53 ms** |
| Sémantique, chemin d'origine (une lecture par patient) | 5,57 s | 18,7 s |
| Sémantique, TypeScript réparé (fin de phase 1, référence) | 1,83 à 1,95 s | 8,6 s |
| Sémantique, natif, à chaud | **87,9 ms** | **212 ms** |
| Commande Rust seule (calcul et frontière) | 18,8 ms (calcul 15 ms) | 54 ms (calcul 44 ms) |
| Recherche par mots (après 1.3), médiane de 10 questions | 127 ms | 351 ms |

L'IPC du Mac en release est bien plus rapide que celle de la VM en debug (0,2 ms par appel, contre 1,1 ms). Le chemin d'origine prend donc 5,6 s ici au lieu de 22,6 s. L'ordre des gains reste le même : à 1 000 patients, le natif répond **21 fois plus vite** que le TypeScript réparé et **63 fois plus vite** que le chemin d'origine.

## Ce qui a été construit

- `src-tauri/src/vector_search.rs` : la commande `recherche_vecteurs`.
  - Index en mémoire : les vecteurs d'une génération en `f32`, lus par pages de 2 000 lignes, pour ne jamais tenir deux copies.
  - Calcul : cosine en double précision, opération pour opération comme `passageCosine` côté TypeScript.
  - Sortie : rowids et cosinus seulement.
  - Tests : décodage et refus (longueur, valeur non finie, vecteur nul), formule, seuil et lignes demandées, rechargement.
- `src/modules/consultations/local-ai/native-vector-search.ts` : l'interrupteur (`localStorage` `baitari:recherche-vecteurs-native` = `1`, éteint par défaut) et l'appel.
- `rankAllPatientsPassagesNatively` (`embedding-store.ts`) lit les textes des seuls candidats, puis le classement commun aux deux chemins (`rankPassageCandidates`), avec `rankPassages` **inchangé**. Si Rust refuse (hôte plus ancien, pas d'index de mots, erreur), la recherche TypeScript prend le relais, avec le même résultat.
- **Mode réseau, traité dans le prototype.** Un poste client envoie la recherche au poste principal (`POST /v1/vectors`, même clé et même filtre réseau que `/v1/query`). Celui-ci l'exécute sur la connexion de la session et sur **le même index en mémoire** que pour ses propres recherches. Un hôte sans cette route répond 404 : le client retombe sur le TypeScript. Test Rust : `secondary_workstation_runs_the_vector_search_on_the_host` (hôte et client sur une seule machine, en boucle locale).

## Écarts à la spécification, et pourquoi

1. **Invalidation : `count(*)` et un compteur de génération, au lieu de `max(updated_at)`.**
   - Mesuré : `count(*) + max(updated_at)` coûte 53 ms à 1 000 patients et 124 à 228 ms à 3 000, à chaque appel. Il faut lire chaque ligne au-delà de son vecteur de 3 Ko, puisque `updated_at` est rangé après.
   - Le seul substitut gratuit (`count + sum(rowid)`, index couvrant, 3,6 ms) laisse passer un cas courant : réindexer la dernière consultation supprime puis réinsère ses extraits sous les **mêmes rowids**.
   - Retenu : la migration 047 ajoute un compteur que des déclencheurs incrémentent à chaque écriture dans `embeddings`. C'est exact et coûte une lecture d'une ligne. Le cas des rowids réutilisés a son test (`reloads_when_a_passage_is_replaced_under_the_same_rowid`).
2. **Le canal des termes exacts.**
   - Sous le seuil bas, un extrait compte quand il porte les termes exacts de la question. La proposition ne le prévoyait pas : sans lui, les résultats auraient différé.
   - Ces extraits sont désignés par l'index de mots de la phase 1.3. Rust rend aussi leur cosinus. Ils sont lus **par cosinus décroissant**, par lots de 200, et la lecture s'arrête dès que le 5ᵉ résultat dépasse ce que le suivant pourrait atteindre (cosinus + bonus). Rien de ce qui suit ne pourrait alors entrer dans la réponse.
   - Sur la clinique synthétique, ce canal touche environ 10 000 extraits sur 20 780 (des textes tirés de 70 mots). Sans l'arrêt, le natif complet prenait 1,2 s pour 19 ms de Rust ; avec, 88 ms.
3. **Égalité au bit près, sauf au passage par JSON.** `serde_json`, sans sa fonctionnalité `float_roundtrip`, peut relire le dernier bit d'un nombre décimal autrement. La question arrive en JSON ; en mode réseau, les cosinus aussi. Les écarts mesurés valent 2,2e-16 (TS réparé contre natif, dans l'app) et 2,4e-15 (contre la référence), très en dessous de 1e-6.

## Preuves

- 200 questions, contre la référence enregistrée avant la phase 1 et prouvée identique au chemin réparé : 200/200 à 1 000 et à 3 000 patients, dans l'app.
- Directement dans l'app, TS réparé contre natif sur 40 questions : 40/40, aux deux paliers.
- Tests TypeScript : un faux `native` qui suit la règle de la commande doit rendre exactement le chemin TypeScript, y compris quand l'arrêt anticipé joue. Une mutation qui force l'arrêt casse le test.
- Tests Rust : 34 réussis (`cargo test`, 5 ignorés comme avant : téléchargements, mDNS).

## Build et méthode

- `tauri dev --release` (profil release : LTO, `codegen-units = 1`) : environ 9,5 minutes depuis zéro, sans erreur, rien d'autre de lourd en parallèle. Le même binaire a servi aux mesures des phases 1 et 2.
- L'app tournait avec un `HOME` d'emprunt dans le dossier temporaire de la session. En release, `BAITARI_DATA_DIR` n'existe pas : seul ce `HOME` garantissait que la base réelle de ce compte ne serait pas ouverte. `CARGO_HOME` et `RUSTUP_HOME` pointaient sur les vrais dossiers.
- Mémoire : mesurée par le RSS du processus Rust avant et après le premier appel, sur une app fraîchement lancée.
- rust-anything n'a pas servi : la méthode record/diff a été refaite ici (références JSON enregistrées avant, puis vérifications).

## Limites, et ce qui n'est pas prouvé

- **Données synthétiques.** Vecteurs aléatoires voisins de 1 à 3 extraits par question ; textes tirés de 70 mots. Dans une vraie clinique, le canal des termes exacts devrait toucher bien moins d'extraits, et davantage d'extraits passeront le seuil sémantique.
- **Mode réseau :** testé sur une seule machine. Aucun essai entre deux postes réels.
- **Mémoire au-delà de 1 000 patients :** +139 Mo à 3 000 patients, environ 3 Ko par extrait. Si l'hôpital dépasse 100 000 extraits, passer en `f16` ou ne garder que la génération active (c'est déjà le cas : un seul modèle à la fois).
- `cargo test --release` ne compile pas, pour une raison antérieure à ce chantier : le test `account_home_is_the_unborrowed_home` (`clinic_database.rs`) appelle une fonction qui n'existe qu'en debug. Les tests Rust tournent en debug.
- La recherche par mots n'a pas de mesure « avant » dans la vraie fenêtre ; sa comparaison avant/après est celle de Node (phase 1).
- L'interrupteur est éteint par défaut. Rien n'est publié.

## Suite proposée

1. Allumer l'interrupteur sur un poste de l'hôpital, sur sa vraie base, pour mesurer la sélectivité réelle et le temps à chaud.
2. Essai réseau sur deux postes réels.
3. Ensuite seulement, le second chantier de la proposition : le moteur d'embeddings natif.
