# 4. Jeu d'évaluation en français : mesurer que c'est mieux

Principe : **aucun changement de modèle n'est livré sans un « avant/après » chiffré sur de vraies données, avec le moteur et les garde-fous réels de l'application.** Le jeu est construit une fois (phase 0) puis rejoué à l'identique à chaque phase.

## 4.1 Contraintes de conception

- **Vraies données, lecture seule.** Le banc ouvre une *copie* de `baitari.db` en `SQLITE_OPEN_READONLY`. Il n'écrit jamais dans la base de la clinique : ni brouillon, ni index, ni journal. Les vecteurs de l'évaluation vivent dans un fichier temporaire séparé, supprimé à la fin.
- **Rien ne quitte le poste.** Le banc s'exécute sur la machine de la clinique. Le rapport exporté ne contient que des agrégats et des identifiants opaques (hachés), jamais de texte clinique. Les exemples qualitatifs restent sur le poste, pour relecture par le vétérinaire.
- **Aucune donnée inventée.** Les entrées viennent de la base, et les références aussi (notes validées par un vétérinaire) ou d'une annotation humaine explicite. Les quelques cas fictifs du banc de latence sont étiquetés « fictif » et ne comptent dans aucun score de qualité.
- **Mêmes garde-fous que l'application.** Le banc appelle les vraies fonctions : `createSoapPrompt`, `buildDictationScaffold`, `prepareModelDictation`, `parseGeneratedSoap`, `assertFaithfulSoap`, `generateValidatedSoap`, `createDocumentReadingPrompt`, `parseDocumentAnswer`, `searchAllPatientsClinical`. On mesure ce que l'utilisateur verrait, pas un modèle nu.
- **Déterminisme.** Température 0, `topK` 1, graine fixe. Chaque cas tourne 3 fois pour la latence ; la qualité est mesurée sur le premier passage, puisqu'à température 0 elle est stable.

## 4.2 Le corpus et son point dur

La base de ce poste compte **9 notes SOAP, 1 dictée conservée, 1 document, 0 photo ou PDF de dossier**. C'est inutilisable pour conclure. Il faut la base d'une clinique en activité ; celle d'Aissa est le candidat naturel, puisque la demande photos/PDF vient de là. Cela suppose son accord écrit pour une exécution locale, en lecture seule, sur son poste.

Taille minimale pour départager deux modèles avec une confiance raisonnable :

| Tâche | Minimum | Source des entrées | Source de la référence |
|---|---|---|---|
| A. Note SOAP depuis une dictée | **60 cas** | `consultation_soaps.transcript` (dictée Whisper brute) | les 4 sections finales validées par le vétérinaire, et `ai_draft` comme base Gemma 3 historique |
| B. Questions sur un dossier (recherche) | **40 questions** | rédigées par un vétérinaire de la clinique à partir de dossiers réels | liste des extraits pertinents (patient, source, section), annotée par ce vétérinaire |
| C. Lecture de document avec citations | **30 questions** sur 15 documents | PDF et images réels de `consultation_documents`, notes et documents générés | page(s) et passage(s) attendus, annotés à la main |
| D. Images (préparation de la demande d'Aissa) | **30 requêtes** | photos réelles des dossiers | photo(s) attendue(s) |

S'il y a moins de 60 dictées conservées, on complète la tâche A avec des **dictées lues à voix haute** par un vétérinaire à partir de notes réelles. Ce sont de vraies notes et une vraie voix, passées dans le vrai Whisper ; l'origine de chaque cas est notée dans le rapport. On ne génère jamais une dictée par IA.

Annotation : environ **une demi-journée de vétérinaire** pour les tâches B, C et D. C'est le coût humain incompressible de l'évaluation, à prévoir dans le calendrier.

## 4.3 Métriques

### A. Note SOAP

| Métrique | Définition | Seuil de livraison |
|---|---|---|
| Acceptation au 1er essai | part des cas qui passent zod, fidélité et posologie sans second essai | **≥ +15 points** par rapport à l'avant |
| Acceptation finale | après le second essai | jamais inférieure à l'avant |
| Fidélité | phrases de la trame retrouvées mot pour mot (normalisées), en moyenne par cas | ≥ 0,98 |
| Mots altérés | mots de la sortie absents de la dictée et de la trame (repère « croânial », « vomition ») | divisé par 2 au moins |
| Bon rangement | phrases rangées dans la même section que dans la note validée | ≥ l'avant |
| **Posologie inventée** | posologie présente en sortie et absente de la dictée | **0, éliminatoire** |
| **Fait inventé** | affirmation clinique absente de la dictée (relecture humaine des cas signalés) | **0, éliminatoire** |
| Latence ressentie | du clic « Préparer la note » au brouillon affiché, second essai inclus ; médiane et 90e centile | médiane ≤ 15 s sur la machine de référence 8 Go |

### B. Questions sur un dossier (recherche)

| Métrique | Définition | Seuil |
|---|---|---|
| Rappel@5 | au moins un extrait pertinent dans les 5 premiers | ≥ l'avant, idéalement +10 points |
| MRR@10 | rang moyen réciproque du premier extrait pertinent | ≥ l'avant |
| nDCG@10 | qualité de l'ordre | ≥ l'avant |
| Questions sans réponse | la bonne réponse est « rien dans le dossier » : aucun extrait au-dessus du seuil de score | ≥ l'avant |
| Latence d'une recherche | médiane et 90e centile, modèle déjà chargé ou non | ≤ 1 s chargé, ≤ 4 s à froid |
| Couverture | sections refusées pour dépassement de longueur (aujourd'hui > 2 048 tokens) | 0 |

Le jeu est rejoué sur trois configurations : lexical seul, hybride avant, hybride après. Cela isole l'apport réel du vectoriel, qui pourrait être faible face à la recherche lexicale française existante.

### C. Lecture de document avec citations (ancrage)

| Métrique | Définition | Seuil |
|---|---|---|
| Citations exactes | citations retrouvées mot pour mot à la page indiquée (le contrôle de `parseDocumentAnswer`) | 100 % des réponses affichées, déjà garanti par le code |
| Citations pertinentes | citations qui répondent à la question (annotation) | ≥ +10 points |
| Réponses obtenues | réponses qui passent le contrôle, après 2 essais au plus | ≥ l'avant |
| Abstention correcte | question sans réponse dans le document : aucune citation inventée | 100 % |
| Latence | médiane et 90e centile par nombre de pages | à publier, sans seuil en phase 0 |

### D. Images

Rappel@5 texte→photo (« radio du grasset de Rocky », « photo de la plaie ») et photo→photo. Il n'y a pas d'« avant » : aujourd'hui, les photos ne sont pas cherchables. Le seuil de livraison est fixé avec Aissa, par exemple Rappel@5 ≥ 70 %.

## 4.4 Mémoire et latence : protocole

- Machines de référence : (1) **un PC Windows 8 Go à GPU intégré Intel**, le poste de clinique typique, en WebView2 ; (2) le Mac M1 8 Go de ce rapport, en WKWebView via `tauri:dev`, pas Chromium. Une variante qui ne tient pas sur (1) ne peut pas être le modèle par défaut.
- Mesures : empreinte du processus de rendu et du processus GPU, échantillonnée chaque seconde ; swap avant/après ; durée du premier lancement à froid (après redémarrage) et à chaud.
- Scénario « consultation réelle » : l'application ouverte avec un dossier, la dictée de 2 minutes, puis la note, puis une recherche. Ce sont les enchaînements que le verrou `model-lease` sérialise.

## 4.5 Rapport attendu à chaque phase

Un fichier `docs/recus/<date>/eval-<phase>/RAPPORT.md` :

1. La configuration exacte (modèles, empreintes SHA-256, versions des moteurs, machine).
2. Le tableau avant/après de chaque métrique, avec intervalle de confiance par bootstrap sur les cas.
3. La décision « livrer / ne pas livrer », appliquée mécaniquement à partir des seuils ci-dessus.
4. Les cas en régression, listés par identifiant opaque, à relire sur le poste de la clinique.

## 4.6 Ce que l'on peut déjà dire, sans le jeu complet

Sur la note de test fictive du banc (voir [mesures/](mesures/)), Gemma 3 1B altère un mot de la trame à chaque essai. Ce seul symptôme suffit à faire échouer le contrôle de fidélité, donc à doubler la latence. **C'est l'indicateur le plus prometteur pour départager les modèles** : peu coûteux à mesurer, directement lié à ce que vit le vétérinaire, et indépendant de toute appréciation subjective du style.
