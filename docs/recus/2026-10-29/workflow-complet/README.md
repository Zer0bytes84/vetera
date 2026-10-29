# Cas clinique complet de bout en bout (29 octobre 2026)

Branche `feat/dictee-turbo-native`. Commits locaux, aucun push. Ce bilan est distinct de celui du lot 3.

## Résultat

| Étape | Avec le micro (run2) | Avec des notes écrites (run5, à ta demande) |
|---|---|---|
| 1. Créer le patient et son propriétaire | Passe | **Passe** |
| 2. Créer son rendez-vous dans l'Agenda | Passe | **Passe** |
| 3. « Ouvrir », puis la consultation démarre dans le Flux | Passe | **Passe** |
| 4. Dicter, ou écrire, les quatre rubriques | **Échec** : l'autorisation macOS du micro n'a pas été donnée | **Passe** : rubriques saisies au clavier dans le panneau de l'assistant |
| 5. Générer la note SOAP, la relire, la valider | Non jouée | **Passe** : vraie note générée par l'assistant en 15,4 s, puis validée |
| 6. Émettre la facture et exporter le PDF | Non jouée | **Passe** : `INV-2026-000018`, PDF `Facture-INV-2026-000018-1cgz2j2.pdf`, leurre intact |

**Reste à faire :** le passage au micro réel (étape 4 avec le micro). Il attend que tu autorises le micro pour l'app de test, ce soir (§ 6).

**Brèches trouvées :** 3, plus une observation (§ 4).

## 1. Conditions

- **App :** Baitari en build release, avec le scénario `scripts/eval-local-ai/capture-workflow.ts` embarqué : c'est l'app de mesure des sessions dictée. Elle est lancée par `open -n -a`, avec un HOME isolé.
- **Base :** une sauvegarde de la base réelle, faite en lecture seule. Au départ : 11 patients, 52 rendez-vous, 17 factures `INV-2026`, compteur à 18. La base réelle n'est pas touchée.
- **Modèles :** des copies APFS des modèles installés.
- **Pilotage :** chaque étape est cliquée dans la vraie interface, photographiée, puis mesurée en base.
- **Notes écrites :** les quatre rubriques sont celles du cas de référence `otite-max.json` (otite externe à Malassezia). Elles sont saisies dans le champ de dictée de l'assistant, comme un vétérinaire qui tape au lieu de dicter. Tout le reste du parcours est identique.
- **Leurre :** un fichier `Facture-INV-2026-000018.pdf` est déposé sur le Bureau isolé. C'est le nom qu'aurait proposé l'ancienne version, pour une autre facture. L'export ne doit pas l'écraser.
- **Panneau natif d'enregistrement :** il n'est pas piloté. Une transformation réservée aux builds de capture (`BAITARI_CAPTURE_SAVE_DIR`, dans `vite.capture.config.ts`) relève le nom qu'il proposerait, puis répond avec ce nom sur le Bureau isolé. L'export réel du PDF écrit donc bien le fichier.

## 2. Étape par étape (run5, notes écrites)

Les captures sont dans `captures-notes-ecrites/`, les mesures dans `mesures-notes-ecrites.json`, et les états de la base dans `base-avant.txt` et `base-apres.txt`.

| Étape | Capture | Ce qui est mesuré |
|---|---|---|
| 1. Patient | `1a`, `1b` | Max, chien berger allemand, propriétaire Testeur Camille, créé par le formulaire Patients. |
| 2. Rendez-vous | `2a`, `2b` | Rendez-vous `scheduled` à 09:00, motif « Se gratte l'oreille droite depuis trois jours. » |
| 3. « Ouvrir » | `3` | Le Flux s'ouvre sur « Consultation · Max ». Le statut passe de `scheduled` à `in_progress`. |
| 4. Rubriques | `4` | Les quatre rubriques du cas sont saisies dans le panneau de l'assistant. |
| 5. Note | `5a`, `5b` | Note générée en 15,4 s. Ce n'est pas la reprise mot pour mot de la saisie, mais une vraie génération. En base, `consultation_soaps` contient la note validée : évaluation « Otite externe droite… Malassezia ». |
| 6. Facture et PDF | `6a`, `6b` | Prix 3 000 DA, réglé 3 000 DA, puis « Encaisser et imprimer ». En base : `INV-2026-000018`, `issued`, 300 000 centimes, compteur passé à 19, visite `completed`. Le nom proposé est `Facture-INV-2026-000018-1cgz2j2.pdf` : la nouvelle empreinte est bien là. |
| PDF sur le Bureau | `bureau-apres.txt` | Deux fichiers : le leurre `Facture-INV-2026-000018.pdf`, intact (même empreinte md5 qu'avant), et le nouveau `…-1cgz2j2.pdf`. **Aucun écrasement.** |

## 3. Brèches cherchées, et ce qu'elles ont donné

| Sonde | Résultat |
|---|---|
| **Note validée, cherchée dans le dossier** | **Brèche B3** (§ 4). La Synthèse affiche bien l'évaluation (`7d`), mais la Chronologie affiche « Compte rendu non renseigné » (`7e`). |
| **Facture sur une consultation incomplète** | **Brèche B1** (§ 4). « Clôturer et facturer » est actif avant toute note. |
| **Statuts entre l'Agenda, le Flux et le dossier, après facturation** | Cohérents. Base `completed` ; carte de Max dans la colonne « Terminé » du Flux (`7a`) ; Agenda « 1 terminé · 0 en cours » (`7b`) ; Chronologie « Terminé » (`7e`). |
| **Nom du PDF stable d'un export à l'autre** | Stable. Réexporter la même facture propose le même nom, `…-1cgz2j2.pdf`, donc son propre fichier et jamais celui d'une autre facture. |
| **Recherche juste après la création** | Retrouvée. « Malassezia » trouve la note de Max par mot (score 0,47), et « infection de l'oreille due à des levures » la trouve par le sens (score 0,50) (`8a`, `8b`). Dans la palette, « Max » propose le dossier de Max, propriétaire Testeur (`8c`). |
| **Attribution des résultats** | Correcte. Les résultats sont attribués à Max, sans aucun résultat d'un autre patient contenant le texte de la note. |
| **Fuite vers un autre dossier** | Aucune. Le dossier de Rifka, en Synthèse, Chronologie et Documents, ne contient ni « Malassezia », ni « Testeur », ni le motif de Max (`8d`). En base, aucune note ni facture ne porte un autre patient que celui de sa visite. |
| **« Ouvrir » sur la visite facturée** | **Non concluant.** L'Agenda s'était remis en vue mois, et la sonde n'a pas atteint le menu de la ligne. Le statut est resté `completed`. Le cas « terminé, ciblé sans relance » avait été démontré par la session Agenda Ouvrir (`docs/recus/2026-10-29/agenda-ouvrir`). |

## 4. Brèches trouvées

### B1. On peut clôturer et facturer une consultation sans aucune note

- **Reproduction :**
  1. Agenda, nouveau rendez-vous, puis « Ouvrir ».
  2. Dans la consultation qui s'ouvre, sans rien écrire ni dicter, le bouton « Clôturer et facturer » est actif (mesure `enabled: true`).
- **Risque :** une visite facturée et passée en « Terminé » sans aucun compte rendu au dossier.
- **Non vérifié :** je ne suis pas allé jusqu'à émettre une facture sur une visite vide.
- **À trancher :** blocage, ou avertissement (« Aucune note pour cette visite. Facturer quand même ? »). Une urgence ou un acte simple peuvent légitimement se facturer avant la note : c'est une décision métier.

### B2. Si l'autorisation du micro n'arrive pas, le panneau attend sans fin et sans explication

- **Reproduction :**
  1. Une app sans autorisation du micro (première installation, ou autorisation retirée dans les réglages macOS).
  2. Assistant, puis « Dicter ».
- **Ce qu'on voit :** « Autorisation du microphone… » tourne sans fin (capture `captures/echec-4-dictee.jpg`, run2). Il n'y a ni délai, ni message disant d'aller dans Réglages Système, Confidentialité, Microphone, ni bouton pour annuler.
- **Risque :** sur le terrain, le vétérinaire croit que la dictée est en panne.

### B3. Note validée, mais la Chronologie dit « Compte rendu non renseigné »

- **Reproduction :**
  1. Une consultation avec une note SOAP validée : run5, évaluation « Otite externe droite… ».
  2. Dossier patient, onglet Synthèse : l'évaluation et le plan s'affichent.
  3. Onglet Chronologie : la même visite affiche « Compte rendu non renseigné » (capture `7e`).
- **Cause dans le code :** `src/modules/patients/components/patient-timeline.tsx`, dans `buildEntries`, construit le résumé à partir des champs du rendez-vous (`diagnosis`, `treatment`, `notes`). Elle ne lit jamais la note SOAP (`consultation_soaps`), alors que la Synthèse la lit (`getSoap`).
- **Risque :** le dossier se contredit, et l'historique, qui est la vue de recherche d'un antécédent, laisse croire que la visite n'a pas de compte rendu.
- **Correctif pressenti :** la Chronologie lit l'évaluation, ou à défaut le motif, de la note SOAP de la visite, comme la Synthèse. Il n'est pas appliqué : tu as demandé de documenter.

### Observation, non tranchée : l'heure par défaut d'un rendez-vous peut être déjà passée

Un rendez-vous créé vers 14 h, sans choisir d'heure, a reçu le créneau de 09:00. C'est peut-être voulu : le premier créneau de la journée. À voir avec Aissa avant d'en faire un défaut.

## 5. Incidents du scénario (pas de l'app)

Il m'a fallu cinq lancements. Aucun échec n'est venu de l'app, sauf l'attente du micro :

| Lancement | Arrêt | Cause |
|---|---|---|
| run1 | Étape 1 | Mon clic a touché un élément caché portant le même libellé, avant que la page soit prête. Le scénario clique maintenant seulement sur des éléments visibles, et réessaie. |
| run2 | Étape 4 | Autorisation macOS du micro absente (B2). |
| run3 | Étape 6 | L'interception de l'export par réaffectation de `__TAURI_INTERNALS__.invoke` est interdite en release (propriété en lecture seule). Elle est remplacée par la transformation de capture `BAITARI_CAPTURE_SAVE_DIR`. |
| run4 | Étape 6 | Ma requête de vérification lisait une colonne inexistante (`balance_amount`). La facture et le PDF étaient pourtant faits : `…-0afco8t.pdf`, leurre intact. |
| run5 | — | Complet. |

## 6. Pour finir le test au micro (ce soir)

1. **Toi :** autoriser le micro pour l'app de test, dans Réglages Système, Confidentialité et sécurité, Microphone. L'entrée s'appelle « Baitari » ; c'est la copie dans `~/Library/Caches/baitari-eval/mesure`, pas l'app installée.
2. **Moi :** relancer `workflow.sh` sans `ECRIT=1`. Le scénario joue les quatre rubriques par les haut-parleurs, le micro les entend, puis toutes les étapes et toutes les sondes sont rejouées.

**Attention :** chaque reconstruction de l'app de mesure change sa signature, et macOS redemande alors l'autorisation. Je ne reconstruirai pas avant ce test.

## 7. Fichiers

- `captures-notes-ecrites/` (run5) : `1a` à `8d`.
- `captures/` (run2, micro) : `1a` à `3`, et `echec-4-dictee`.
- `mesures-notes-ecrites.json` et `mesures.json` : mesures et brèches, au format machine.
- `journal-notes-ecrites.txt` et `journal.txt` : horodatage des étapes.
- `base-avant.txt`, `base-apres.txt`, `bureau-apres.txt` : la base et le Bureau isolé, avant et après.
- `scripts/eval-local-ai/capture-workflow.ts` : le scénario et ses sondes.
- `scripts/eval-local-ai/vite.capture.config.ts` : la transformation `BAITARI_CAPTURE_SAVE_DIR`, réservée aux builds de capture.
