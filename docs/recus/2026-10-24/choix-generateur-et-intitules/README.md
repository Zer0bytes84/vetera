# Choix du générateur et intitulés de la trame (24 octobre 2026)

Gemma 3 reste le modèle par défaut (`DEFAULT_GENERATOR` inchangé). Recherche, index, calibrations, Whisper : intouchés. Options A et B : non appliquées.

## 1. Le choix du modèle, comportement officiel

Vérifié de bout en bout dans le vrai moteur (WKWebView, M1 8 Go). La préférence est posée par la **vraie interface** : un clic sur l'interrupteur de la carte « Vos outils IA », sans aucun forçage. Les notes sont ensuite générées par le pipeline réel.

| Position | Préférence enregistrée | Modèle qui a rédigé les notes (3 cas) |
|---|---|---|
| Interrupteur activé | `gemma4` (lue après le clic) | Gemma 4 pour chaque essai, sans repli |
| Activé, mais Gemma 4 inutilisable (fichier invalide de même taille) | `gemma4` | Gemma 3 : repli silencieux à la 1re note, les suivantes vont directement à Gemma 3, sans aucune erreur |
| Interrupteur désactivé | `gemma3` | Gemma 3 pour chaque essai |

- **Captures** de la carte avant et après chaque clic (thème clair) : [captures/](captures/).
- **Mise en page corrigée.** La première capture a révélé une carte écrasée dans ce panneau étroit, avec le titre affiché un mot par ligne. Elle reprend désormais la structure des trois autres cartes : titre, description, puis une ligne d'état et de commande.
- **Tests ajoutés.** Carte non installée (bouton « Télécharger (2 Go) »), carte installée (interrupteur, sans nom technique), indication « l'assistant actuel a pris le relais » seulement quand la nouvelle version est choisie et a échoué.
- **Contrôle IPC sous isolation.** Une erreur `ipc://` vue dans la console de debug venait du rechargement de page fait par le scénario de capture. Une requête directe au protocole IPC obtient bien une réponse HTTP dans la page isolée : COEP ne bloque pas l'IPC de Tauri.
- **Fin de mesure.** La préférence et le thème du poste ont été remis dans leur état d'origine (préférence absente, thème sombre).

## 2. Option D : la trame reconnaît « S · », « O · », « A · », « P · »

Ce sont les intitulés que l'app écrit elle-même dans la trace de la dictée guidée. Le texte transmis au modèle est mis sur une seule ligne : ils arrivaient donc au milieu des phrases, et rien ne les reconnaissait. Désormais, un intitulé (lettre seule, ou lettre suivie de son titre officiel) fait changer de rubrique, et son libellé n'est pas recopié comme une observation. Un « A » ordinaire (« Vitamine A ») n'est pas un intitulé. Fidélité, posologies et citations sont inchangées : un test vérifie qu'une posologie reste écartée et qu'un fait déplacé reste refusé.

Mêmes 4 cas, mêmes conditions que la phase B (12 notes par modèle, vrai moteur) :

| | Gemma 3 avant D | Gemma 3 après D | Gemma 4 avant D | Gemma 4 après D |
|---|---|---|---|---|
| Acceptées au 1er essai | 3/12 (25 %) | **6/12 (50 %)** | 3/12 (25 %) | **6/12 (50 %)** |
| Acceptées au final | 6/12 (50 %) | **9/12 (75 %)** | 9/12 (75 %) | 9/12 (75 %) |
| Mots altérés / posologies inventées (notes livrées) | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| Note complète, médiane | 7,1 s | 6,4 s | 36,5 s | 39,1 s |

Ce que D change : la dictée réelle passe au premier essai pour les deux modèles. Elle est désormais pré-découpée en Subjectif « Fier et vomissement du patient », Objectif « L'examen clinique a montré… », Évaluation « Cause bactérienne » et Plan « antibiotique… ». Avant, Gemma 3 était refusée et Gemma 4 ne passait qu'au second essai, avec tout en Subjectif. L'écart entre les deux modèles au premier essai reste nul (+0 point). Les cas restants n'ont pas d'intitulés : le cas fictif et la note rénale, où Gemma 4 met l'ordonnance en Plan. Ils relèvent de l'option A, non décidée.

## Tests

Suite complète : **158 fichiers, 1 231 tests unitaires verts** (6 nouveaux : 3 pour les intitulés, 3 pour la carte et l’indication de relais), typecheck et ESLint sans erreur. Rust inchangé dans ce chantier.

## Données

[donnees/](donnees/) contient les rapports du banc : avant D (`pb3f`, `pb4f`), après D (`pbD3`, `pbD4`), bout en bout (`e2e-on`, `e2e-repli`, `e2e-off`) et contrôle IPC (`ipc`). On y trouve des identifiants, des durées et des scores, sans texte clinique.

Commit : COMMIT_LIGNE
