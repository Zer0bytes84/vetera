### Cas fictif de la phase 0 (boiterie)

Dictée transmise :

> Chien croisé labrador de sept ans, présenté pour boiterie du membre postérieur droit depuis trois jours, apparue après une promenade. Le propriétaire signale un appétit conservé et pas de vomissement. À l'examen, température 38,6, fréquence cardiaque 96, douleur à la palpation du grasset droit, tiroir antérieur douteux, pas d'amyotrophie. Suspicion de rupture partielle du ligament croisé crânial, diagnostic différentiel entorse. Je prévois des radiographies du grasset la semaine prochaine, repos strict en laisse courte, contrôle dans dix jours.

| Rubrique | Gemma 3, 1er essai | Gemma 3, note livrée | Gemma 4, 1er essai | Gemma 4, note livrée |
|---|---|---|---|---|
| Subjectif | Chien croisé labrador de sept ans, présenté pour boiterie du membre postérieur droit depuis trois jours, apparue après une promenade. Le propriétaire signale un appétit conservé et pas de vomissement. | **refusée** | Chien croisé labrador de sept ans, présenté pour boiterie du membre postérieur droit depuis trois jours, apparue après une promenade. Le propriétaire signale un appétit conservé et pas de vomissement. | **refusée** |
| Objectif | température 38,6, fréquence cardiaque 96, douleur à la palpation du grasset droit, tiroir antérieur douteux, pas d'amyotrophie. Suspicion de rupture partielle du ligament croânial, diagnostic différentiel entorse. Je prévois des radiographies du grasset la semaine prochaine, repos strict en laisse courte, contrôle dans dix jours. |  | température 38,6, fréquence cardiaque 96, douleur à la palpation du grasset droit, tiroir antérieur douteux, pas d'amyotrophie. |  |
| Évaluation | *(vide)* |  | Suspicion de rupture partielle du ligament croisé crânial, diagnostic différentiel entorse. |  |
| Plan | *(vide)* |  | Je prévois des radiographies du grasset la semaine prochaine, repos strict en laisse courte, contrôle dans dix jours. |  |

Issue : Gemma 3 refusée (Le format de réponse de l’assistant n’est pas conforme aux quatre sections SOAP attendues) ; Gemma 4 refusée (La réponse de l’assistant ne reprend pas fidèlement les observations dictées).

### Dictée réelle conservée (lapin, fièvre et vomissements)

Dictée transmise :

> S · Motif et antécédents Fier et vomissement du patient O · Examen clinique L'examen clinique a montré que le patient avait une fièvre aiguë et elle va misser. A · Évaluation Cause bactérienne P · Plan de soins antibiotique par une diarhée de Saint-Jose

| Rubrique | Gemma 3, 1er essai | Gemma 3, note livrée | Gemma 4, 1er essai | Gemma 4, note livrée |
|---|---|---|---|---|
| Subjectif | *JSON invalide* | **refusée** | S · Motif et antécédents Fier et vomissement du patient | S · Motif et antécédents Fier et vomissement du patient O · Examen clinique L'examen clinique a montré que le patient avait une fièvre aiguë et elle va misser. A · Évaluation Cause bactérienne P · Plan de soins antibiotique par une diarhée de Saint-Jose |
| Objectif |  |  | O · Examen clinique L'examen clinique a montré que le patient avait une fièvre aiguë et elle va misser. | *(vide)* |
| Évaluation |  |  | A · Évaluation Cause bactérienne | *(vide)* |
| Plan |  |  | P · Plan de soins antibiotique par une diarhée de Saint-Jose | *(vide)* |

Issue : Gemma 3 refusée (La réponse de l’assistant n’est pas un JSON SOAP valide) ; Gemma 4 acceptée au 2e essai.

### Note validée relue comme dictée (chien, insuffisance rénale)

Dictée transmise :

> Maladie infectieuse. Examens fait sur place le 17 octobre montrant une insuffisance renale. Insuffisance rénale. Médicaments prescrits sur ordonnance.

| Rubrique | Gemma 3, 1er essai | Gemma 3, note livrée | Gemma 4, 1er essai | Gemma 4, note livrée |
|---|---|---|---|---|
| Subjectif | Maladie infectieuse. Examens fait sur place le 17 octobre montrant une insuffisance renale. Insuffisance rénale. Médicaments prescrits sur ordonnance. | Maladie infectieuse. Examens fait sur place le 17 octobre montrant une insuffisance renale. Insuffisance rénale. Médicaments prescrits sur ordonnance. | Maladie infectieuse. Examens fait sur place le 17 octobre montrant une insuffisance renale. Insuffisance rénale. | Maladie infectieuse. Examens fait sur place le 17 octobre montrant une insuffisance renale. Insuffisance rénale. Médicaments prescrits sur ordonnance. |
| Objectif | Examens réalisé | *(vide)* | *(vide)* | *(vide)* |
| Évaluation | Maladie infectieuse | *(vide)* | *(vide)* | *(vide)* |
| Plan | Médicaments prescrits sur ordonnance | *(vide)* | Médicaments prescrits sur ordonnance. | *(vide)* |

Issue : Gemma 3 acceptée au 2e essai ; Gemma 4 acceptée au 2e essai.

### Note validée relue comme dictée (chien, allergie)

Dictée transmise :

> Allergie Pénicillines. Boutons sur le visage. Allergies. Médiament à prendre pendant 3 jours.

| Rubrique | Gemma 3, 1er essai | Gemma 3, note livrée | Gemma 4, 1er essai | Gemma 4, note livrée |
|---|---|---|---|---|
| Subjectif | Allergie Pénicillines. Boutons sur le visage. Allergies. | Allergie Pénicillines. Boutons sur le visage. Allergies. | Allergie Pénicillines. Boutons sur le visage. Allergies. | Allergie Pénicillines. Boutons sur le visage. Allergies. |
| Objectif | *(vide)* | *(vide)* | *(vide)* | *(vide)* |
| Évaluation | *(vide)* | *(vide)* | *(vide)* | *(vide)* |
| Plan | *(vide)* | Médiament à prendre pendant 3 jours. | *(vide)* | Médiament à prendre pendant 3 jours. |

Issue : Gemma 3 acceptée au 1er essai ; Gemma 4 acceptée au 1er essai.

