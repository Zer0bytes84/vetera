# Cas clinique complet de bout en bout (29 octobre 2026)

Branche `feat/dictee-turbo-native`. Commit local, aucun push. Ce bilan est distinct de celui du lot 3.

## Résultat : arrêt à l'étape 4 (dictée)

| Étape | Verdict |
|---|---|
| 1. Créer le patient et son propriétaire | **Passe** |
| 2. Créer son rendez-vous dans l'Agenda | **Passe** |
| 3. « Ouvrir », puis la consultation démarre dans le Flux | **Passe** |
| 4. Dicter au micro par le panneau | **Échec, arrêt ici** : l'app attend l'autorisation macOS du micro, et personne ne l'a accordée |
| 5. Générer la note, la relire, la valider | Non jouée |
| 6. Émettre la facture et exporter le PDF | Non jouée |

Conformément à la consigne, rien n'a été contourné. Les étapes 5 et 6 et les sondes qui les suivent (statuts après facturation, note dans le dossier, recherche, fuite vers un autre dossier, nom du PDF) **n'ont pas été jouées**. Le scénario est prêt et les contient toutes : il suffit de le relancer une fois le micro autorisé (§ 4).

## 1. Conditions

- **App :** Baitari en build release, avec le scénario `scripts/eval-local-ai/capture-workflow.ts` embarqué. C'est l'« app de mesure » des sessions dictée, sans annulation d'écho, pour que le micro entende les haut-parleurs. Elle est lancée par `open -n -a`, avec un HOME isolé.
- **Base :** une sauvegarde de la base réelle, faite en lecture seule (52 rendez-vous, compteur de factures à 18). La base réelle n'est pas touchée.
- **Modèles :** des copies APFS des modèles installés.
- **Leurre :** un fichier `Facture-INV-2026-000018.pdf` est déposé sur le Bureau isolé. C'est le nom qu'aurait proposé l'ancienne version pour la prochaine facture. L'export ne doit jamais l'écraser. Il est resté intact, mais l'export n'a pas eu lieu.
- **Pilotage :** chaque étape est cliquée dans la vraie interface, photographiée par `screencapture -l`, puis mesurée en base (`mesures.json`). Le journal horodaté est dans `journal.txt`.

## 2. Étape par étape

### 1. Patient : passe

- **Parcours :** Patients, puis « Nouveau patient ». Propriétaire nouveau : Testeur Camille, 0555123456. Animal : Max, chien, berger allemand. Puis « Créer le dossier ».
- **Base :** patient `mvtuaj9z7yuqyygyyjd`, rattaché au propriétaire « Testeur Camille ».
- **Captures :** `1a-formulaire-patient`, puis `1b-patient-cree` (« Max · Dossier créé », avec « Voir le dossier » et « Créer un RDV »).
- **Incident de scénario, pas de l'app :** au premier lancement, mon clic sur « Nouveau patient » a touché un élément invisible portant le même libellé, avant que la page soit prête. Le scénario clique désormais seulement sur des éléments visibles, et réessaie.

### 2. Rendez-vous : passe

- **Parcours :** Agenda, puis « Nouveau rendez-vous ». Recherche « Max » : le dossier est proposé avec son propriétaire. Motif « Se gratte l'oreille droite depuis trois jours. », puis « Ajouter au planning ».
- **Base :** rendez-vous `mvtuaon9n45jqcozoqj`, statut `scheduled`.
- **Capture :** `2b-rdv-agenda`. L'Agenda affiche Max à 09:00, « Planifié », propriétaire Camille Testeur, Dr Karim Abdou.

### 3. « Ouvrir » dans le Flux : passe

- **Parcours :** ligne de Max, menu « … », puis « Ouvrir ». Le Flux s'ouvre sur « Consultation · Max », statut « En cours ».
- **Base :** le statut passe de `scheduled` à `in_progress`.
- **Capture :** `3-consultation-flux`.

### 4. Dictée : échec

- **Parcours :** « Assistant », puis « Dicter ». Le panneau affiche « Autorisation du microphone… » et ne passe jamais en écoute. Au bout de 2 minutes, le scénario s'arrête : `failed: 4-dictee: le micro n'écoute pas`.
- **Capture :** `echec-4-dictee`.
- **Cause :** l'app de mesure a été reconstruite pour ce test, ce qui change sa signature. macOS redemande donc l'autorisation du micro. Le dialogue système attend une réponse que je ne dois pas donner à ta place : c'est un réglage de sécurité.
- **Ce que ce n'est pas :** un défaut du code de dictée. Ce même chemin a fonctionné au micro réel lors des sessions dictée, avec une app autorisée.

## 3. Brèches cherchées

### Trouvées

**B1. On peut clôturer et facturer une consultation sans aucune note.**
- **Reproduction :** Agenda, nouveau rendez-vous, « Ouvrir ». Dans la consultation qui s'ouvre, sans rien écrire ni dicter, le bouton « Clôturer et facturer » est actif. Mesure : `enabled: true` (`mesures.json`, brèche `facture-sans-note`).
- **Risque :** une visite facturée et terminée sans compte rendu au dossier. Le cas n'a pas été poussé jusqu'à l'émission, l'étape 6 n'ayant pas été jouée.
- **À trancher :** blocage, ou simple avertissement (« Aucune note pour cette visite. Facturer quand même ? »). Une urgence ou un acte simple peuvent se facturer avant la note ; c'est une décision métier, pas un correctif évident.

**B2. Si l'autorisation du micro n'arrive pas, le panneau attend sans fin et sans explication.**
- **Reproduction :** une app sans autorisation du micro (première installation, ou autorisation retirée dans les réglages macOS). Assistant, puis « Dicter ».
- **Ce qu'on voit :** « Autorisation du microphone… » tourne indéfiniment. Aucun délai, aucun message disant d'aller dans Réglages Système, Confidentialité, Microphone, et aucun moyen d'annuler, sauf fermer le panneau.
- **Risque :** sur le terrain, le vétérinaire croit que la dictée est en panne.

### Observée, non tranchée

**O1. L'heure proposée par défaut pour un nouveau rendez-vous peut être déjà passée.** Le rendez-vous créé à 13:51 (heure du Mac) a reçu le créneau de 09:00 sans qu'on choisisse d'heure. Il n'y a peut-être pas de défaut : c'est le premier créneau libre de la journée, et le choix est peut-être voulu. À vérifier avec Aissa avant d'en faire un défaut.

### Prévues mais non jouées, faute d'étapes 5 et 6

Le scénario les contient et les mesurera au prochain lancement :
- **Statuts après facturation :** base, carte du Flux, ligne de l'Agenda et chronologie du dossier doivent dire la même chose.
- **« Ouvrir » sur la visite facturée :** elle doit être ciblée sans être relancée.
- **Note validée dans la Synthèse et la Chronologie du dossier.**
- **Recherche juste après la création :** « Malassezia » (par mot), « infection de l'oreille due à des levures » (par sens), et « Max » doit trouver le dossier, avec la bonne attribution du patient.
- **Fuite :** le dossier de Rifka ne doit rien montrer de Max. En base, aucune note ni facture d'un autre patient que celui de la visite.
- **PDF :** un nom de la forme `Facture-INV-2026-000018-<empreinte>.pdf`, stable d'un export à l'autre, et le leurre intact. Le panneau natif d'enregistrement n'est pas piloté : son appel est intercepté, et le nom qu'il aurait proposé est relevé.

## 4. Pour reprendre

1. **Toi :** autoriser le micro pour l'app de test, dans Réglages Système, Confidentialité et sécurité, Microphone. L'entrée s'appelle « Baitari ». C'est la copie dans `~/Library/Caches/baitari-eval/mesure`, pas l'app installée.
2. **Moi :** relancer `workflow.sh`. Le scénario reprend de zéro sur une nouvelle copie de la base et joue les étapes 1 à 6, puis toutes les sondes.

Si tu préfères ne pas accorder cette autorisation, il existe une autre voie. Le même enregistrement peut être transcrit par le même modèle, puis le texte injecté dans le panneau, comme pour la démonstration du lot 3. Mais ce n'est plus le micro qui écoute : tu as demandé de ne pas contourner sans le dire, et je ne le ferai pas sans ton accord.

## 5. Fichiers

- `captures/` : `1a`, `1b`, `2a`, `2b`, `3`, `echec-4-dictee`.
- `mesures.json` : mesures et brèches, au format machine.
- `journal.txt` : horodatage des étapes.
- `scripts/eval-local-ai/capture-workflow.ts` : le scénario de bout en bout et ses sondes.
