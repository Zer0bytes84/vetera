# Documents de consultation — local et relu

Les deux parcours sont accessibles depuis **Documents** dans la note SOAP et depuis **Documents → Assistant documents**. L’assistant reste en ligne, dans une colonne utilisant les composants Message/Bubble et Marker du projet. Il n’ouvre ni Sheet ni Drawer.

## Préparer un document

1. Ouvrir une consultation. Valider la note SOAP avec **Valider et enregistrer** dans la dictée, ou **Valider la note pour les documents** dans la saisie manuelle.
2. Ouvrir **Documents**, choisir **Créer un document**, puis un modèle d’ordonnance, de certificat ou de compte-rendu.
3. **Préparer le document** remplit les champs à partir des quatre sections validées et de l’identité du patient. Les rubriques absentes restent vides. La préparation utilise une substitution déterministe, sans ajout de diagnostic, de traitement ni calcul de dose par un modèle.
4. Compléter et corriger le texte. Les médicaments, doses, voies, fréquences, portée du certificat et signature restent à vérifier ou à renseigner par le vétérinaire. Le module d’ordonnance existant reste disponible pour ses calculs déterministes.
5. Cocher l’attestation de relecture puis **Valider et enregistrer le document**. Toute modification du texte ou du titre annule cette attestation. Une modification de la note SOAP source bloque un document déjà préparé, même si la modification intervient dans une autre fenêtre.
6. Retrouver le document dans la bibliothèque Documents et le dossier du patient. **Exporter le PDF validé** produit un PDF local paginé.

Dans **Documents → Modèles**, un administrateur peut créer, modifier ou restaurer les modèles. Les champs disponibles sont proposés dans l’interface. Les champs inconnus ou mal fermés sont refusés. Une modification de modèle ne change pas un document déjà enregistré.

## Lire les documents existants

1. Choisir **Lire un document**. Sélectionner une note ou une pièce jointe du dossier du patient, ou **Lire un fichier local** pour un PDF/JPG/PNG/WebP.
2. Les PDF textuels sont extraits avec PDF.js. Une page scannée ou une image passe par la reconnaissance de texte locale, avec les données françaises et anglaises embarquées. Le texte de chaque page est affiché et modifiable : comparer les noms, nombres, unités et signes à l’original.
3. Poser une question puis **Rechercher les passages**. Le modèle local sélectionne des extraits. Le code vérifie le numéro de page et la présence exacte de chaque extrait dans le texte reconnu ; les nombres et unités modifiés sont refusés. Une seule reprise est autorisée si la réponse ne respecte pas le format.
4. Les réponses sont des citations de la source, pas des diagnostics ni des recommandations. Sur un document long, les passages pertinents sont sélectionnés avant l’inférence ; l’interface signale si cette sélection est partielle. Le texte complet demeure disponible.
5. **Préparer une note de lecture**, relire et valider explicitement avant l’enregistrement. Il est aussi possible de préparer la note directement depuis le texte reconnu, sans modèle de langage. Aucun extrait, brouillon ou fichier importé pour lecture n’est enregistré automatiquement.

Limites explicites : 12 Mo par fichier, 20 pages par PDF et 60 000 caractères reconnus. Un dépassement bloque la lecture au lieu de tronquer silencieusement le document. La reconnaissance peut se tromper, notamment sur les documents manuscrits ou flous ; la relecture du vétérinaire reste indispensable.

## Architecture et données

- Les modèles Whisper/Gemma restent importés depuis le disque. La reconnaissance de documents utilise Tesseract 7 avec `tessdata_fast` français/anglais intégrés au build, ainsi que les runtimes et ressources PDF.js. Aucun CDN ni service cloud n’est sollicité pour ces parcours.
- Le worker de reconnaissance possède ses propres ressources dès sa création, y compris pendant l’initialisation. Annulation, erreur et dépassement de délai terminent le worker. La reconnaissance est terminée et libérée avant le chargement du modèle de lecture ; le verrou commun interdit deux modèles simultanés.
- Les réponses du modèle sont validées en JSON et contre le texte source. Le document est traité comme des données, jamais comme des instructions. Aucune posologie n’est calculée.
- La migration SQLite **019** ajoute `document_templates`. Les documents validés utilisent la table existante `notes`, avec le patient, le vétérinaire et la provenance dans `tags.clinicalDocument` : consultation, source SOAP exacte ou pages lues, modèle utilisé et date de validation.
- L’insertion relit la note source à l’intérieur de la transaction SQLite. Les anciens documents, modèles et modules cliniques restent conservés.
- Les fichiers OCR embarqués sont épinglés dans `resources/local-ocr/manifest.json`, avec leurs tailles et empreintes SHA-256 ; leur licence Apache 2.0 est conservée dans le même dossier.

Références : [installation locale Tesseract.js](https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md), [API Tesseract.js](https://github.com/naptha/tesseract.js/blob/master/docs/api.md), [données de langue](https://github.com/tesseract-ocr/tessdata_fast), [Message](https://ui.shadcn.com/docs/components/base/message), [Marker](https://ui.shadcn.com/docs/components/base/marker).

## Vérifications

Les tests de domaine couvrent la validation de la source, les champs absents, les valeurs et comparateurs, les citations inventées, la sécurité HTML et les limites de taille. Les tests de persistance exécutent les migrations réelles dans une base SQLite en mémoire et vérifient les écritures après relecture, le refus d’une source modifiée et l’absence de modification silencieuse du SOAP. Les tests du worker couvrent l’annulation pendant son initialisation et le dépassement de délai.

Le contrôle du navigateur part des vraies pages Clinique, Patient et Documents, avec des patients fictifs. Il vérifie les ancêtres DOM de l’assistant, les trois types de documents, les modèles personnalisés, la lecture réelle de PDF textuels et scannés et d’images, les réponses de Gemma local, l’export PDF et les modes clair/sombre et étroit. La génération SOAP est simulée dans ce contrôle UI ; le cycle audio avec les deux vrais modèles est vérifié séparément. Ces contrôles ne remplacent pas un essai au microphone physique dans WKWebView/Tauri.
