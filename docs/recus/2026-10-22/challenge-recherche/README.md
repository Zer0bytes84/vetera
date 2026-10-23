# Challenge : recherche sémantique de Baitari (22 octobre 2026)

Hypothèse de départ (phase A du [plan](../plan-assistant-gemma4/03-verdict-et-plan.md)) : remplacer EmbeddingGemma v1 fp32 par EmbeddingGemma 2 texte en q8. Consigne reçue en cours de route : arrêter les mesures, décider avec ce qui est recueilli, et prendre EmbeddingGemma 2 q8 **si aucun gagnant net ne ressort**. Aucun code applicatif modifié ; rien ne sera implémenté avant ta validation.

## Verdict

1. **Le gagnant net n'est pas un modèle : c'est la logique de classement.** Sur le jeu décisif (Alloprof), la recherche actuelle de l'app, reproduite avec son vrai code, donne un Rappel@5 de **51,5 %**. Le **même modèle** donne **79 %** dès qu'on classe par score vectoriel au lieu de placer d'office les correspondances textuelles en tête. Découper en extraits supprime en plus les 9,3 % de documents refusés, sans perte de qualité. Aucun changement de modèle ne rapporte autant. Cette correction est le cœur de la phase A, quel que soit le modèle.
2. **Côté modèle, aucun gagnant net parmi les modèles à licence permissive.** Le meilleur en texte français sur les données recueillies est EmbeddingGemma **v1** en q8 : même qualité que le fp32 actuel, 4 fois plus léger, meilleur qu'EmbeddingGemma 2 sur deux jeux sur trois. **Mais il est exclu par ta contrainte de licence.** EmbeddingGemma v1 est publié sous les conditions d'utilisation « Gemma » de Google (politique d'usages interdits, accès sur acceptation), qui ne sont ni libres ni permissives. EmbeddingGemma 2 est sous Apache 2.0. Parmi les modèles permissifs, arctic-embed-l-v2 (Apache 2.0) est en tête sur les deux petits jeux, mais il n'a été mesuré ni sur Alloprof ni dans le moteur réel, et il pèse le double. Ce n'est pas un gagnant net.
3. **Donc, conformément à ta consigne : EmbeddingGemma 2 texte q8 pour la phase A**, associé au classement corrigé et au découpage. Ce choix a deux avantages annexes : il prépare les photos de la phase C (texte et images dans le même espace), et il sort la recherche des conditions Gemma.

Au passage : **le modèle actuellement livré (EmbeddingGemma v1) et le générateur actuel (Gemma 3 1B) relèvent tous deux des conditions Gemma.** Ta contrainte de licence n'est donc pas respectée aujourd'hui. Les phases A (EmbeddingGemma 2) et B (Gemma 4, Apache 2.0) règlent les deux.

## 1. Ce qui a été mesuré, et comment

- **Jeux publics en français**, issus de MTEB-French :
  - PublicHealthQA : santé, 85 documents, 85 questions ;
  - Syntec : convention collective, 90 documents, 100 questions ;
  - Alloprof : documents longs, médiane de 706 tokens et maximum 4 537 ; sous-échantillon fixe de 677 documents et 200 questions.

  Pourquoi pas ta base ici : elle compte 13 textes cherchables (9 notes SOAP courtes, 3 notes, 1 document). N'importe quel modèle y ferait près de 100 %. Elle servira de contrôle de non-régression avec tes questions annotées, pas de juge.
- **Fichiers exacts qu'on embarquerait** (ONNX q8 ou q4), encodés avec transformers.js 3.8.1 (4.3.1 pour EmbeddingGemma 2), dans un dossier isolé du dépôt.
- **Recherche actuelle reproduite avec le code de l'app** (`rankPatientChunks`, `matchesSearchTerms`, compilés tels quels) : sections de plus de 2 048 tokens non indexées, correspondances textuelles placées d'abord, seuil cosinus de 0,30.
- **Variantes testées** :
  - « entier » : un vecteur par document, tronqué à 2 048 tokens ;
  - « extraits » : extraits d'environ 800 caractères (≈ 200 tokens) coupés aux fins de phrase, avec une phrase de chevauchement ; le score d'un document est celui de son meilleur extrait ;
  - BM25 français, avec le radical de l'app ;
  - fusion RRF simple et pondérée ;
  - lexique vétérinaire en **bonus** (+0,05) au lieu d'une priorité absolue.
- **Arrêtées avant la fin, sur consigne** :
  - Alloprof pour arctic-embed-l-v2, bge-m3, Qwen3, e5 ;
  - le reclasseur ;
  - les mesures de latence et de mémoire dans le moteur WASM réel.

Données brutes : [donnees/scores.json](donnees/scores.json) (147 lignes) ; scripts : [donnees/banc/](donnees/banc/).

## 2. Comparatif chiffré

### 2.1 Le jeu décisif : Alloprof (677 documents longs, 200 questions)

| Configuration | Rappel@5 | MRR@10 | nDCG@10 | Documents refusés à l'indexation |
|---|---|---|---|---|
| **Actuel : app, EmbeddingGemma v1 fp32** | **51,5 %** | **42,8** | **45,4** | **9,3 %** (63 sur 677) |
| v1 fp32, classement vectoriel, entier | 79,0 % | 60,6 | 66,8 | 9,3 % (tronqués ici) |
| v1 fp32, extraits | 78,5 % | 61,1 | 66,8 | 0 % |
| v1 fp32, extraits + bonus lexical | 78,5 % | 61,1 | 66,8 | 0 % |
| v1 fp32, RRF BM25 + extraits | 73,5 % | 57,7 | 63,4 | 0 % |
| v1 fp32, RRF pondérée (BM25 × 0,5) | 76,5 % | 60,1 | 65,5 | 0 % |
| BM25 seul | 55,5 % | 41,9 | 46,9 | 0 % |
| v1 q8, entier *(licence Gemma, exclu)* | 80,5 % | 60,8 | 67,0 | 9,3 % (tronqués ici) |
| v1 q8, extraits + bonus lexical *(licence Gemma, exclu)* | 77,5 % | 60,7 | 66,2 | 0 % |
| **v2 q8 (EmbeddingGemma 2), extraits + bonus lexical** | **73,5 %** | **56,0** | **62,0** | **0 %** |
| v2 q8, entier | 76,0 % | 60,4 | 65,9 | 9,3 % (tronqués ici) |
| v2 q8, logique actuelle de l'app | 52,0 % | 44,1 | 46,9 | 9,3 % |

Lecture :
- La variante « entier » tronque les documents trop longs ; **l'app, elle, les refuse et les perd**. La variante « extraits » indexe tout et désigne en plus le passage précis : c'est le vrai but (« retrouver le bon passage »).
- Avec EmbeddingGemma 2, les extraits coûtent 2,5 points de Rappel@5 et 4,4 points de MRR par rapport au document entier tronqué. C'est le prix de zéro refus et de l'affichage du passage. L'étape A1 vérifiera si des extraits un peu plus longs (1 200 caractères) réduisent cet écart.

### 2.2 Les deux petits jeux (tous les modèles), mode extraits

| Modèle (fichier embarqué) | Disque | Licence | PublicHealthQA R@5 / MRR | Syntec R@5 / MRR | Encodage par extrait* |
|---|---|---|---|---|---|
| EmbeddingGemma v1 fp32 (actuel) | 1 235 Mo | Gemma (non permissive) | 94,1 / 83,1 | 97,0 / 81,8 | 0,15 s |
| EmbeddingGemma v1 q8 | 309 Mo | Gemma (non permissive) | 94,1 / 82,1 | 96,0 / 82,4 | 0,22 s |
| EmbeddingGemma v1 q4 | 197 Mo | Gemma (non permissive) | 94,1 / 82,7 | 95,0 / 81,0 | 0,12 s |
| **EmbeddingGemma 2 texte q8** | **346 Mo** | **Apache 2.0** | **95,3 / 85,9** | **88,0 / 72,4** | 0,31 s |
| snowflake-arctic-embed-l-v2.0 q8 | 570 Mo | Apache 2.0 | 95,3 / 84,9 | 100 / 85,9 | 0,14 s |
| bge-m3 q8 | 570 Mo | MIT | 91,8 / 83,3 | 94,0 / 81,5 | 0,16 s |
| multilingual-e5-base q8 | 279 Mo | MIT | 94,1 / 80,5 | 89,0 / 71,7 | 0,05 s |
| multilingual-e5-small q8 | 118 Mo | MIT | 91,8 / 75,7 | 94,0 / 73,4 | 0,02 s |
| Qwen3-Embedding-0.6B q8 | 614 Mo | Apache 2.0 | 88,2 / 75,3 | 81,0 / 66,2 | 0,25 s |
| *Logique actuelle de l'app (v1 fp32)* | | | *89,4 / 79,0* | *92,0 / 82,5* | |

\* Temps relevés dans Node (onnxruntime natif, plusieurs threads, M1) : ils ordonnent les modèles mais ne prédisent pas le moteur WASM de l'app sur un seul thread, où ils ne sont pas mesurés.

Lecture des petits jeux :
- Proches du plafond, ils départagent peu : 1 question vaut environ 1 point.
- EmbeddingGemma 2 est le meilleur des Gemma sur la santé (PublicHealthQA, MRR 85,9), mais il perd 8 à 9 points sur Syntec, un texte juridique.
- arctic-embed-l-v2 est le candidat permissif le plus fort ici ; il reste à le mesurer là où ça compte.
- Qwen3 0.6B en q8 décroche nettement, peut-être à cause de la quantification d'un modèle décodeur ; je ne l'ai pas vérifié.

### 2.3 Tes critères, état actuel contre recommandation

| Critère | Actuel (v1 fp32, logique de l'app) | **Recommandé : v2 q8, extraits, bonus lexical** |
|---|---|---|
| Rappel@5 Alloprof | 51,5 % | **73,5 %** (+22) |
| MRR@10 Alloprof | 42,8 | **56,0** (+13,2) |
| nDCG@10 Alloprof | 45,4 | **62,0** (+16,6) |
| Rappel@5 / MRR PublicHealthQA | 89,4 / 79,0 | **95,3 / 85,9** |
| Rappel@5 / MRR Syntec | 92,0 / 82,5 | 88,0 / 72,4 (**−4 / −10** : seule régression mesurée) |
| Sections refusées | 9,3 % | **0 %** |
| Taille disque | 1 261 Mo | **346 Mo** (−915 Mo) |
| Pic mémoire en recherche | ≈ 3,3 Go (phase 0) | attendu nettement inférieur (poids 4 fois plus légers), **non mesuré** |
| Latence à chaud | ≈ 0,1 s (phase 0) | attendue du même ordre, **non mesurée** |
| Coût de réindexation | — | une passe en arrière-plan, index parallèle par `model_key` ; 0,31 s par extrait dans Node, **WASM non mesuré** |
| Licence | Gemma (non conforme) | **Apache 2.0** |
| Risque sur la dictée | — | transformers.js 4.3.1 en alias, réservé au worker de recherche ; Whisper reste sur la 3.8.1 |

La régression sur Syntec (texte juridique) est réelle. Elle ne remet pas en cause le gain global : +22 points sur Alloprof et un mieux sur la santé, le domaine le plus proche du nôtre. Ton corpus annoté dira si elle se retrouve sur des dossiers vétérinaires.

## 3. Pourquoi les autres pistes ne passent pas, sur ces chiffres

- **Fusion RRF avec BM25** : elle fait perdre 5 points de Rappel@5 sur Alloprof quand le vectoriel est bon ; la version pondérée en perd encore 2. Le BM25 seul plafonne à 55,5 %. Je ne la recommande pas comme mécanisme principal. **Le lexique vétérinaire reste**, en bonus de score : il ne coûte rien sur ces questions rédigées, et il garde son rôle sur les recherches par mots-clés (DCI, marques, acronymes) que les jeux publics ne testent pas.
- **EmbeddingGemma v1 q8** : meilleur en texte, mais non conforme à ta contrainte de licence. Il serait le bon choix si tu acceptais les conditions Gemma, ce qui reviendrait à prolonger la situation actuelle.
- **arctic-embed-l-v2 (Apache 2.0)** : le seul autre candidat crédible. Il reste à le mesurer sur Alloprof et en WASM, pour un coût de 568 M de paramètres, environ le double d'EmbeddingGemma 2 texte. Sans espace commun avec des images, il ne prépare pas non plus la phase C.
- **bge-m3 (MIT)** : au niveau d'EmbeddingGemma v1 sur les petits jeux, avec le même poids qu'arctic ; non mesuré sur Alloprof.
- **Reclasseur** (bge-reranker-v2-m3, 571 Mo) : non mesuré, faute de temps. Un modèle de 568 M de paramètres appliqué à 20 paires par requête, en WASM sur un seul thread, s'annonce à plusieurs secondes : incompatible avec « instantané » sur 8 Go. C'est une estimation, pas une mesure.
- **Dimensions réduites (Matryoshka)** : sans objet à l'échelle d'une clinique. 20 000 extraits × 768 dimensions représentent 60 Mo et un parcours complet de quelques millisecondes.
- **Contexte long** (8 192 tokens) : le découpage le rend inutile. Encoder 8 192 tokens d'un coup coûterait par ailleurs plusieurs Go d'attention, hors de portée du WASM sur 8 Go.

## 4. Plan recommandé, à valider avant tout code

| Étape | Contenu | Durée | Critère de passage |
|---|---|---|---|
| **A1. Classement et découpage** (indépendant du modèle, l'essentiel du gain) | Extraits d'environ 800 caractères (1 200 à comparer), une phrase de chevauchement ; score de document = meilleur extrait ; lexique en bonus (+0,05) au lieu d'une priorité absolue ; garde-fou numérique conservé (`matchesNumericConstraints`) ; plus aucun refus à 2 048 tokens ; affichage du passage trouvé. Nouvel index en parallèle (nouveau `model_key`), l'ancien conservé pour le retour arrière. Les trois jeux publics sont intégrés au banc de la phase 0. | 3 à 4 j | Jeux publics : ≥ les valeurs de ce document. Tes questions annotées : aucune régression contre l'actuel. |
| **A2. EmbeddingGemma 2 texte q8** | transformers.js 4.3.1 sous alias, importé seulement par le worker de recherche (preuve de concept le premier jour, sinon repli et retour vers toi) ; composant texte seul (vision et audio non chargés) ; manifeste (346 Mo) ; réindexation en arrière-plan ; suppression de la v1 (1 261 Mo) après validation. | 3 à 4 j | Pic mémoire et latence à chaud mesurés dans le webview : pic < 3,3 Go, latence ≤ 0,2 s. Qualité ≥ le tableau 2.3. Dictée inchangée (tests et essai réel). |
| A3 (option) | Mesurer arctic-embed-l-v2 sur Alloprof et en WASM ; ne l'envisager que s'il bat nettement EmbeddingGemma 2 sans doubler latence ni mémoire, en renonçant à l'espace commun avec les images. | 0,5 j de mesure | Gain net sans dégradation forte. |

**Gain attendu de A1 + A2 sur Alloprof : Rappel@5 de 51,5 à 73,5 %, 0 section refusée, 915 Mo de moins sur le disque, licence conforme.**

## Limites

- Les jeux publics sont des questions rédigées. Les recherches réelles d'un vétérinaire sont plus courtes, par mots-clés, et le lexique vétérinaire y pèse davantage. Tes questions annotées et le corpus d'Aissa trancheront.
- Ni la mémoire ni la latence n'ont été mesurées dans le moteur WASM réel pour les nouveaux modèles : la série a été arrêtée avant.
- Le sous-échantillon Alloprof (200 questions) donne environ ±3 points d'incertitude sur le Rappel@5. Les écarts de 22 à 27 points entre la logique actuelle et les variantes corrigées sont bien au-delà ; les écarts de 4 points entre modèles sont à la limite.
- Les fichiers téléchargés pour ces mesures (3,7 Go) ont été supprimés.
