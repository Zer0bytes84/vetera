# Lint 5.0.10 — cas dont la correction change un rendu

État : 0 avertissement `react-hooks/todo`, 51 erreurs, toutes de règles « compilateur ». Elles étaient **masquées**, pas nouvelles :
sur master, le compilateur abandonnait chacun de ces composants (try/finally, import(), etc.) et n'en analysait plus rien.
Une fois les composants rendus traduisibles, leurs vrais motifs sont visibles. Aucune ne peut se corriger **sans** décaler un rendu
ou un état : c'est pour cela que je m'arrête et que je demande l'aval.

Légende « effet » = ce que la correction change à l'écran ou à l'ordre des états. Risque : B (bas) / M (moyen).

## Famille A — état dérivé d'une autre donnée (8 sites)
Aujourd'hui : un effet corrige l'état après le rendu (un rendu intermédiaire avec la valeur périmée existe).
Proposition commune : calculer la valeur au rendu (`Math.min(page, total)`, `existe ? id : null`) ; pour « remettre à la page 1 quand le filtre change », mémoriser la clé de filtre dans l'état et réajuster pendant le rendu.
Effet : l'état final est identique ; le rendu intermédiaire périmé disparaît. Risque B.
- A1 `stock-workspace.tsx:634` page → 1 quand requête / catégorie / statut changent
- A2 `use-patients-page-model.tsx:233` page → 1 quand recherche / tri / espèce / statut changent
- A3 `use-patients-page-model.tsx:384` page bornée au nombre de pages
- A4 `use-finances-page-model.tsx:576` page des factures bornée
- A5 `use-finances-page-model.tsx:580` page du journal bornée
- A6 `use-patients-page-model.tsx:199` patient sélectionné disparu → null
- A7 `use-agenda-page-model.tsx:398` rendez-vous sélectionné disparu → null
- A8 `App.tsx:86` verrou « déjà démarré » (passe à true une fois) → réajusté pendant le rendu

## Famille B — formulaire/dialogue remis à zéro à l'ouverture (7 sites)
Aujourd'hui : un effet recopie les valeurs après l'ouverture (une image avec les anciennes valeurs peut s'afficher).
Proposition commune : initialiser depuis les props au montage et remonter le formulaire avec `key` (id de l'objet édité / compteur d'ouverture) ; ou réinitialiser dans le gestionnaire d'ouverture.
Effet : le formulaire est monté avec les bonnes valeurs dès la première image. **Point à vérifier au clic** : focus automatique et animation d'ouverture. Risque M.
- B1 `patients-shared.tsx:1604` nouveau patient : remise à zéro quand `open` passe à faux
- B2 `vaccination-dialog.tsx:76` préremplissage à l'ouverture + identifiant de brouillon
- B3 `weight-entry-dialog.tsx:91` préremplissage à l'ouverture
- B4 `prescription-templates.tsx:245` nom / édition / confirmation remis à zéro
- B5 `document-composer.tsx:41` préparation, id créé, relecture, erreur remis à zéro
- B6 `document-preview-dialog.tsx:39` document et états remis à zéro au changement d'identifiant
- B7 `document-preview-dialog.tsx:47` PDF remis à null quand le document change

## Famille C — consigne de navigation lue dans sessionStorage / focus (9 sites)
Aujourd'hui : à l'arrivée sur l'écran, un effet lit une consigne à usage unique (« ouvre ce patient / cette note / ce formulaire ») et la consomme.
Proposition : lecture dans l'initialiseur paresseux de `useState` pour l'état de départ (consigne présente au montage), garder l'effet seulement pour l'événement `vetera:*` ultérieur (écouteur, hors règle).
Effet : l'écran s'ouvre déjà sur le bon état (une image de moins). Si la consigne arrive **après** le montage, rien ne change (écouteur). Risque M : à rejouer dans l'app pour chaque consigne.
- C1 `Tasks.tsx:394` focus tâche (portée, vue, sélection)
- C2 `use-agenda-page-model.tsx:163` focus rendez-vous / patient
- C3 `patient-detail-page.tsx:301` note hors consultation à ouvrir
- C4 `patient-detail-page.tsx:365` vaccination en attente
- C5 `patient-detail-page.tsx:459` onglet remis sur « aperçu » quand le patient change → `key={patientId}` sur la page
- C6 `dashboard-page.tsx:109` « personnaliser » demandé depuis un autre écran
- C7 `care-page.tsx:289` historique du soin sélectionné (remise à zéro puis chargement)
- C8 `clinique-shared.tsx:546` heure de début de consultation (sessionStorage) → initialiseur paresseux
- C9 `patients-shared.tsx:1642` copie du propriétaire choisi dans le formulaire

## Famille D — chargement au montage dont la fonction pose un état avant son premier await (8 sites)
Aujourd'hui : `useEffect(() => { void load(); })` ; `load` fait `setLoading(true)` tout de suite → la règle y voit un setState synchrone.
Proposition : l'état de chargement est déjà `true` au départ → le retirer de l'appel initial ; les rechargements déclenchés par événement gardent leur `setLoading(true)`.
Effet : aucun, tant que l'état initial est bien « en chargement » (à vérifier site par site). Risque B à M.
- D1 `Parametres.tsx:319` load()
- D2 `use-finances-page-model.tsx:205` loadInvoices()
- D3 `use-finances-page-model.tsx:135` focus facture (isDetailLoading)
- D4 `use-finances-page-model.tsx:80` remise à zéro des prix quand la facture se ferme
- D5 `use-managed-documents.ts:28` refresh()
- D6 `LicenseGate.tsx:74` refresh(true)
- D7 `stay-billing.tsx:23` `setLoading(false)` hors Tauri
- D8 `invoice-pdf-preview.tsx:32` rendu PDF (`setRendering(true)`)

## Famille E — synchronisation avec un magasin externe (5 sites)
- E1 `Editor.tsx:138` emplacement de la barre d'outils (`getElementById`) → ref de rappel. Risque B.
- E2 `Editor.tsx:238` état de l'IA locale (déjà prêt / en chargement) → `useSyncExternalStore`. Même valeur, un rendu de moins. Risque B.
- E3 `patient-document-search.tsx:146` transcription dictée → requête : appeler depuis le callback de fin de dictée plutôt qu'un effet. Risque M (ordre avec `setResults([])`).
- E4 `consultation-documents-assistant.tsx:215` lecture de la note initiale : une seule fois, via initialiseur paresseux. Risque M.
- E5 `document-composer.tsx:45` `setPdf(null)` au début de l'effet de génération → clé d'effet + valeur dérivée. Risque M.

## Famille F — lecture de l'horloge ou d'une ref pendant le rendu (5 sites)
- F1 `activation-admin-page.tsx:1019` `Date.now()` dans un `useMemo` (licences expirées). Proposition : stocker l'instant du chargement avec les licences et l'utiliser ; le memo ne se recalcule de toute façon que quand les licences changent. Effet : quasi nul. Risque B.
- F2 `stay-detail.tsx:46` `Date.now()` dans le calcul des journées d'un séjour en cours. Proposition : horloge d'état mise à jour à la minute (`useNow`). Effet : le compteur peut maintenant changer à l'écran sans autre action (aujourd'hui il se fige jusqu'au prochain rendu). **Je ne le fais pas sans votre avis.** Risque M.
- F3 `patients-shared.tsx:549` `Date.now()` pour « prochain rendez-vous ». Même proposition que F2.
- F4 `soap-panel.tsx:323` `lastSaved.current` lu au rendu pour `dirty`. Proposition : doubler `lastSaved` par un état `savedPayload`. Effet : le bouton « Valider » / « Enregistrer » se met à jour exactement quand la sauvegarde aboutit (aujourd'hui, il dépend d'un rendu fortuit). Risque M, **touche un écran clinique**.
- F5 `health-card-dialog.tsx:63` instantané du carnet pris au rendu (ref + `new Date()`). Proposition : instantané en état, pris dans un effet. Effet : une image de plus avant la génération du PDF. Risque M.
