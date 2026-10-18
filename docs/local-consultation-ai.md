# Dictée et note SOAP locales — phase 1

La fiche consultation propose le bouton **Assistant**. Le panneau droit non modal `ConsultationAssistantPanel`, ajouté par l’utilisateur, accueille `LocalConsultationAssistant` et laisse la note SOAP et le dossier en page. Les échanges utilisent **Message** et **Bubble**, la conversation défile avec **MessageScroller**, et les opérations de travail utilisent **Marker** dans un bloc repliable. Le composant historique `ConsultationSessionDialog` conserve son nom mais ne rend plus de Dialog ; l’ancien drawer de consultation a été supprimé. Le nouveau panneau de l’assistant est volontairement distinct de ce drawer historique.

Whisper transcrit en français par défaut ; le choix **Automatique** reconnaît localement la langue dominante. Gemma exécuté par MediaPipe produit ensuite les quatre sections SOAP. Cette phase est volontairement **extractive** : elle conserve les observations dictées et ne propose pas de diagnostic ou de soin supplémentaire. Le changement de modèle et les limites constatées sur le français/darija sont détaillés dans [la vérification Whisper](local-whisper-quality.md).

Références des composants : [Message](https://ui.shadcn.com/docs/components/base/message), [Marker](https://ui.shadcn.com/docs/components/base/marker), [composants chat Shadcn](https://ui.shadcn.com/docs/changelog/2026-06-chat-components).

## Installer les modèles depuis le disque

Dans une consultation, ouvrir **Assistant**, puis la petite icône **Configurer l’assistant**. La configuration s’affiche dans le fil si l’installation est incomplète.

1. **Installer la dictée** : choisir un dossier Transformers.js/ONNX **multilingue quantifié q8**, **Whisper small au minimum**. Whisper medium est installé pour le test de qualité ; small reste une alternative plus rapide. Les anciens modèles tiny/base et les modèles `*.en` sont refusés.
2. **Installer les notes** : choisir **Gemma 3 1B IT, au format MediaPipe `.task`**. Les formats GGUF et les poids Hugging Face bruts ne sont pas interchangeables avec ce fichier.
3. Les fichiers sélectionnés sont copiés dans le dossier `local-ai` du répertoire de données de Baitari. Une importation ratée conserve le modèle précédent.

Le dossier Whisper doit contenir :

```text
config.json
generation_config.json
tokenizer.json
tokenizer_config.json
preprocessor_config.json
onnx/
   encoder_model_quantized.onnx
   decoder_model_merged_quantized.onnx
```

`generation_config.json` doit déclarer `is_multilingual: true` et un identifiant de langue `<|fr|>`. Le prétraitement doit déclarer `sampling_rate: 16000`. Le modèle doit avoir au moins 12 couches d’encodeur/décodeur et une dimension de 768. Les fichiers auxiliaires connus, y compris les éventuels fichiers ONNX externes `.onnx_data`, la licence et le manifeste d’empreintes, sont également copiés.

Baitari ne télécharge aucun poids et ne charge aucun runtime depuis un CDN. Il faut donc préparer ces fichiers sur le disque avant le premier essai. Les runtimes ONNX et MediaPipe sont intégrés au build. La génération MediaPipe nécessite une WebView avec **WebGPU disponible** ; si ce moteur est absent, un message l’indique et aucun service distant ne prend le relais.

Documentation des formats : [Transformers.js — modèles locaux](https://huggingface.co/docs/transformers.js/custom_usage), [MediaPipe LLM Inference — Web et Gemma 3](https://ai.google.dev/edge/mediapipe/solutions/genai/llm_inference/web_js).

## Tester une consultation

1. Ouvrir la fiche d’une consultation et cliquer sur **Assistant**. L’ouverture du panneau ne démarre pas le microphone.
2. Choisir **Français** pour une dictée française, ou **Automatique** pour reconnaître la langue dominante d’une prise multilingue, puis cliquer sur **Dicter**. Autoriser le micro dans macOS. Attendre la fin du chargement, puis parler. **Arrêter et transcrire** affiche le texte. Le mélange français/darija reste susceptible d’erreurs même avec medium et doit être soigneusement relu. Une dictée est limitée à trois minutes ; elle peut être complétée par une nouvelle prise. Pour annoncer les rubriques, dire par exemple « À l’examen, température 38,5 degrés. Évaluation, toux à surveiller. Plan, contrôle dans sept jours. »
3. Relire et corriger la transcription **avant** de l’envoyer avec la flèche. Saisir `@` pour l’autocomplétion des patients ; le texte reconnu « arobase Rex » ou « arobas Rex » est transformé en `@Rex`. Un nom mal transcrit n’est jamais deviné. Pour un nom composé, utiliser par exemple `@"Rex Junior"`.
4. En cas d’homonymes, choisir explicitement la fiche. Une mention inconnue ou désignant un autre patient bloque la génération : ouvrir sa consultation pour travailler sur sa note.
5. Cliquer sur **Confirmer et préparer la note**. Le contexte contient la fiche clinique et les trois dernières consultations disponibles du patient, en excluant la consultation actuelle, les visites futures, annulées et les absences. Les anciennes observations sont limitées en longueur et ne sont pas transformées en constats actuels. Le bloc repliable montre les opérations effectuées et le nombre réel de caractères produits pendant la génération ; il ne simule pas un raisonnement médical.
6. Relire et modifier S, O, A et P. La note manuelle existante est conservée dans les champs proposés. Cocher l’attestation de relecture, puis **Valider et enregistrer**. Toute modification révoque cette attestation.
7. Après confirmation de l’écriture, le panneau se ferme et une notification confirme l’enregistrement. Une erreur de sauvegarde conserve le brouillon dans le panneau. Fermer puis rouvrir la fiche pour vérifier la persistance. Le texte validé, la transcription et la date de validation sont enregistrés dans la table SQLite existante `consultation_soaps`.

Pour vérifier les limites : essayer un homonyme, une mention d’un autre patient, une dictée silencieuse et une fermeture avec **Abandonner sans enregistrer**. Aucune nouvelle note ne doit être enregistrée dans ces cas. Une erreur d’écriture conserve la proposition dans le panneau pour permettre une nouvelle tentative.

## Garanties de fonctionnement

- Audio, transcription et brouillon restent en mémoire pendant la relecture ; le brouillon IA n’est pas autosauvegardé. L’audio n’est pas enregistré sur le disque.
- La saisie manuelle SOAP garde son autosauvegarde existante ; elle est suspendue pendant l’ouverture du fil de dictée. Le brouillon de l’assistant ne remplace la note qu’après validation explicite.
- Whisper est libéré et son worker terminé avant le chargement du modèle SOAP. L’ancien moteur de chat est également libéré avant l’entrée dans ce parcours. Une tâche simultanée ou une libération incertaine bloque un nouveau chargement.
- Les accès `fetch` et XHR des workers sont limités aux modèles importés et aux runtimes embarqués, sans redirections externes.
- L’identité du patient est résolue par le code, jamais choisie par le modèle.
- La capture est mono, rééchantillonnée depuis la fréquence réelle du périphérique vers 16 kHz. Le code retire le décalage continu, ajuste le niveau avec une amplification plafonnée à ×4 et une crête cible de 0,8, puis rejette le silence. Cette normalisation n’altère pas les mots et ne corrige pas les erreurs de reconnaissance.
- Dans Transformers.js 3.8.1, omettre `language` revient à l’anglais : ce n’est pas une détection automatique. Le mode Automatique calcule les probabilités des seuls identifiants de langues du modèle au premier pas du décodeur, puis passe explicitement la langue reconnue à la transcription. Cela choisit une langue dominante, sans garantir la reconnaissance des changements de langue à l’intérieur d’une phrase.
- Le code construit une trame à partir des rubriques explicitement dictées et des intentions de soins exprimées. Les observations sans rubrique explicite restent dans S, à classer par le vétérinaire. Une rubrique absente reste vide.
- Le prompt contient la trame comme exemple strict de JSON à quatre clés. La température est nulle, `topK` vaut 1. Le budget total est mesuré avec le tokenizer du modèle : tokens de l’entrée + réserve de sortie basée sur la trame (au minimum 256 tokens, puis taille de la trame + 64). Les courtes notes ne reçoivent plus une réserve de plusieurs milliers de tokens.
- Zod exige exactement quatre chaînes non nulles. Un deuxième contrôle compare chaque section à la trame source : aucune observation ajoutée, supprimée, déplacée ou mesure modifiée n’est acceptée. Les variations de casse, d’accents, d’espaces et de ponctuation courante sont tolérées ; les signes, décimales, pourcentages et comparateurs restent contrôlés.
- Un échec de format ou de fidélité entraîne **une seule** nouvelle génération, avec un prompt de copie simplifié. Après un deuxième échec, la dictée reste disponible et un message indique la vraie cause. Les erreurs du moteur ou les posologies ne déclenchent pas de tentative susceptible de contourner le contrôle.
- Une posologie détectée dans la dictée bloque la génération avant le modèle ; elle n’est pas supprimée silencieusement. Une posologie dans la réponse du modèle est également rejetée avant la relecture. Les calculs de doses restent dans le module d’ordonnance déterministe. Le vétérinaire garde la responsabilité de la validation clinique.

## Vérification de la phase initiale, avant le nouveau panneau

Les tests automatisés couvrent la résolution des mentions, le contexte des trois consultations, le schéma JSON, les rubriques vides, les observations inventées ou omises, les mesures et négations, la tentative unique de réparation, les posologies, les refus d’accès réseau, le rééchantillonnage audio, les annulations et l’exclusivité des modèles.

Le premier contrôle isolé montait seulement `SoapPanel` : il ne vérifiait pas ses parents dans Clinique et ne démontrait donc pas l’absence de tiroir dans le vrai parcours. Le contrôle corrigé ouvre la consultation depuis la vraie page Clinique, et séparément depuis la fiche Patient, puis inspecte toute la chaîne des ancêtres de l’assistant. Les autres contrôles d’interface vérifient les vrais composants Message/Marker, les homonymes, l’abandon et l’enregistrement après relecture. Les modèles sont simulés uniquement dans les scénarios UI destinés à provoquer les erreurs de façon déterministe.

Les essais de fidélité utilisent séparément les **vrais poids Gemma 3 1B IT** déjà installés. Trois dictées fictives sont contrôlées : le court cas d’allergies avec O/A vides, une dictée avec les quatre rubriques, et un motif seul avec O/A/P vides. Un historique volontairement différent permet de vérifier qu’il n’apparaît pas comme un examen actuel.

Le test audio automatisé utilise une voix française **synthétisée hors ligne**, injectée dans la capture Chromium, puis le vrai Whisper q8. Il inclut la relecture et la correction explicite de la transcription avant génération : les homophones et les noms reconnus restent susceptibles d’erreur. La note et sa trace de validation sont enregistrées dans une base navigateur isolée avec des patients fictifs, sans modifier la base SQLite du cabinet. Ce contrôle ne remplace pas un essai avec la voix du vétérinaire et le microphone réel dans WKWebView/Tauri.

Aucun poids Whisper ou Gemma n’est livré avec le dépôt. Les petites données OCR françaises et anglaises de la [phase Documents](local-documents-assistant.md) sont embarquées. Les tests du navigateur utilisent un serveur temporaire limité à `127.0.0.1` pour servir les fichiers du Bureau ; les requêtes extérieures sont bloquées. Le build Tauri vérifie la compilation et l’inclusion des runtimes, pas la compatibilité GPU sur chaque Mac.

Résultats après correction de la chaîne de rendu et intégration Documents, le 7 octobre 2026 : **272 tests sur 41 fichiers**, vérification TypeScript et ESLint ciblé réussis ; **26 contrôles des parcours Clinique/Patient/Documents**, **6 contrôles finaux de source et d’export** et **15 contrôles du cycle audio** réussis, sans erreur de console ni requête externe. Les trois cas de fidélité et la note du cycle audio passent dès la première génération, sans réparation. Le cycle audio utilise une voix française synthétisée et inclut une correction explicite de la transcription ; il ne démontre pas une reconnaissance vocale sans erreur au microphone physique. Les insertions et refus de sauvegarde des documents sont également testés sur SQLite réel en mémoire. L’unique build release macOS de fin de phase a réussi, avec les runtimes et données OCR présents dans le bundle. Les avertissements Vite et Rust existants ne bloquent pas ce build.

Le [rapport historique](../outputs/local-assistant-2026-10-07/report.json) conserve ses transcriptions de test et indique désormais sa limite : il montait `SoapPanel` isolé, sans vérifier ses parents. Les contrôles corrigés sont détaillés ci-dessus et dans la [documentation Documents](local-documents-assistant.md). Les fichiers de QA et captures temporaires de cette vérification sont conservés sous `/private/tmp/baitari-*` hors du dépôt.

## Compiler sur cette machine

Pour les itérations et les tests visuels, utiliser **`tauri dev` avec hot reload**. Effectuer un seul build release complet en clôture de phase, après validation de l’interface et de la logique.

Le build macOS a été vérifié avec la commande suivante (bundle `.app`, sans publication ni artefact de mise à jour signé) :

```sh
CARGO_PROFILE_RELEASE_STRIP=none npm run tauri:build -- --bundles app --config '{"bundle":{"createUpdaterArtifacts":false}}'
```

Cette option de compilation contourne l’erreur `mis-aligned LINKEDIT string pool` du chargement d’une macro SQLx sur la chaîne Rust/macOS locale. Elle conserve les symboles dans ce build de vérification. Le défaut de stripping est documenté dans [le suivi officiel Rust](https://github.com/rust-lang/rust/issues/157750).
