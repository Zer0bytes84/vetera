# Phase 0 : banc d'évaluation et fin des rechargements (22 octobre 2026)

Aucun modèle n'a changé. Aucun push. Vérifications : typecheck 0 erreur, ESLint 0 erreur, Vitest 154 fichiers et 1 189 tests réussis, dont 10 nouveaux.

## Ce qui a changé

| Élément | Fichiers | Effet |
|---|---|---|
| Un seul chargement par note | `workers/soap.worker.ts`, `local-ai/token-capacity.ts` | Le moteur est dimensionné dès le premier chargement à partir d'une estimation prudente (3 caractères par token, contre environ 4 mesurés), puis vérifié avec le vrai tokenizer. Les poids ne sont relus que si l'estimation était trop courte. Le moteur reste chargé pour le second essai de la même note ; il est libéré à la fin de la note, quand la session ferme le worker. |
| Modèle de recherche gardé chargé | `workers/embedding.worker.ts`, `local-ai/inference-client.ts` (`park`, `resume`), `local-ai/model-lease.ts` (`parkIdleModel`), `local-ai/embedding-store.ts` | Après une recherche, le worker garde son modèle mais **rend le verrou**. Une dictée, une note ou une lecture de document l'évince avant de démarrer : le principe « un seul modèle à la fois » est conservé. Il est libéré après 2 minutes d'inactivité, ou dès qu'il plante. |
| Pipeline de note partagé | `local-ai/soap-pipeline.ts` (`prepareSoapDraft`), `hooks/use-local-consultation-ai.ts` | Le cœur de la génération de note est sorti du hook React, sans changement de comportement, pour que l'écran et le banc exécutent exactement le même code et les mêmes garde-fous. |
| Banc d'évaluation | `scripts/eval-local-ai/` | Extraction en lecture seule, page d'évaluation dans le webview de bureau, scores, rapport avant/après avec bootstrap. Mode d'emploi : [scripts/eval-local-ai/README.md](../../../../scripts/eval-local-ai/README.md). Hors bundle de production, mais inclus dans le typecheck. |

## Mesures dans le vrai webview (WKWebView, M1 8 Go)

Binaire de debug Tauri, dossier de données vide (la base réelle n'est pas ouverte), modèles installés réels (Gemma 3 1B, EmbeddingGemma 300M fp32). Corpus de ce poste : **1 dictée réelle**, plus le cas fictif répété 3 fois. Données brutes : [donnees/](donnees/) ; tableau généré par le banc : [donnees/tableau-banc.md](donnees/tableau-banc.md).

| | Avant | Après |
|---|---|---|
| Modèle prêt (cas fictif, médiane) | 8,7 s (7,7 à 10,1) | **4,5 s** (4,0 à 5,0) |
| Modèle prêt (dictée réelle) | 9,6 s | **6,5 s** |
| **Second essai d'une note** | **échoue toujours au rechargement** (« L'assistant n'a pas pu être chargé… ») | **s'exécute** : environ 3,8 s, sans rechargement |
| Recherche, 1re requête | 7,9 s | 7,3 s |
| Recherches suivantes | 5,9 à 7,8 s **chacune** | **0,08 à 0,12 s** |
| Pic mémoire WebKit pendant les notes | 4,06 Go | **3,24 Go** |
| Swap gagné pendant la série de notes | +2,9 Go | **+1,4 Go** |
| Pic mémoire pendant les recherches | 3,50 Go | 3,32 Go |

### Bug découvert : le second essai ne pouvait jamais aboutir

Dans WKWebView, l'ancien worker fermait le moteur après le premier essai puis tentait de le recréer pour le second, et **cette recréation échouait à chaque fois** : 4 notes sur 4, dans 3 lancements distincts. Le banc Chromium du 22 octobre ne pouvait pas le voir, car il recréait un worker à chaque passage. Conséquence en clinique : chaque fois que le contrôle de fidélité rejetait le premier jet, ce qui arrive systématiquement avec Gemma 3 1B sur nos cas, le vétérinaire recevait un message d'erreur de chargement au lieu d'un brouillon. C'est corrigé par le maintien du moteur entre les deux essais.

J'ai vérifié que la réutilisation du moteur ne fausse pas la sortie : sur le même moteur, une génération répétée et une génération après une autre donnent exactement le texte d'un moteur neuf (MediaPipe ne garde pas de contexte entre deux `generateResponse`).

### Ce que le second essai révèle maintenant

Le second essai s'exécute, mais **Gemma 3 1B y produit un JSON non conforme** au prompt « recopie exacte » : 4 cas sur 4 (« format non conforme », « JSON invalide »). Aucune note n'est donc acceptée, ni avant ni après. Avant, c'était à cause du bug ; après, c'est à cause du modèle. C'est la mesure la plus directe obtenue jusqu'ici en faveur de la phase B, mais sur 1 dictée réelle et 1 cas fictif, ce n'est pas une preuve statistique.

### Coût à surveiller

Le modèle de recherche gardé chargé occupe environ 3 Go pendant au plus 2 minutes après la dernière recherche, tant qu'aucune autre tâche locale ne l'évince. Sur 16 Go, c'est indolore. Sur 8 Go, c'est le prix des recherches à 0,1 s. Il deviendra négligeable avec la phase A (q8, environ 0,35 Go sur disque).

## Ce qui reste de la phase 0

| Élément | État |
|---|---|
| 0.1 Banc d'évaluation | **Fait**, éprouvé dans le vrai webview |
| 0.4 Un seul chargement par note | **Fait**, mesuré |
| 0.5 Modèle de recherche gardé chargé | **Fait**, mesuré |
| 0.2 Corpus et annotations | **À faire chez toi, puis chez Aissa** : accord, puis une demi-journée de vétérinaire avec `annotations.example.json`. Les tâches B et C n'ont pas pu tourner ici, faute de questions annotées. |
| 0.3 Plancher : PC Windows 8 Go, GPU intégré Intel | **À faire.** Le banc tourne aussi sous WebView2 ; seul l'échantillonnage mémoire diffère. |
| 0.6 Rapport « avant » sur corpus réel | Après 0.2 |

## Les 16 Go d'Aissa changent-ils le choix d'E2B ?

**Le choix par défaut reste E2B. Les 16 Go font d'E4B un candidat sérieux pour ces postes, à départager par la mesure de qualité.**

- Sur 8 Go, E4B était éliminé pour une raison de mémoire : +4,4 à +4,7 Go en génération, swap +3,8 Go, premier mot à 8–14 s. Ces latences venaient du swap, pas du calcul. Sur 16 Go, E4B tient sans swap.
- Sans swap, E4B reste plus lent qu'E2B. Les repères officiels en WebGPU donnent 44 contre 73 tokens/s et un premier mot à 1,75 contre 1,09 s. Sur notre M1, E2B rédige à 30 tokens/s : E4B devrait tourner autour de 15 à 20 tokens/s, soit environ 8 à 10 s de génération par note au lieu de 5 à 6 s. C'est **à mesurer sur le portable d'Aissa** : ce Mac n'a que 8 Go.
- Sur la tâche actuelle, une recopie extractive, E2B était déjà fidèle à 100 % sur le cas mesuré. Un modèle plus gros n'a de marge que sur les dictées difficiles et sur la lecture de documents (tâche C). Si le corpus d'Aissa ne montre pas de gain net d'E4B sur A et C, E2B reste préférable même sur 16 Go, parce qu'il est plus rapide.
- Le plancher 8 Go impose de toute façon E2B comme modèle commun : un seul modèle par défaut pour tout le parc, et E4B seulement en option sur les postes à 16 Go et plus, si le banc le justifie.

**Conséquence sur le plan :** la phase B évalue E2B **et** E4B sur le portable d'Aissa, et E2B seul sur le plancher 8 Go. Elle n'ajoute l'option E4B que si les seuils du jeu A et C sont dépassés nettement, avec une médiane de note de 15 s au plus sur 16 Go.
