# Spécification des rappels médicaux automatiques

Date : 16 octobre 2026

## Source et méthode REA

Le dépôt demandé `lsendel/openvpms` a été cloné dans `/tmp/openvpms-reminders-rea`. Il s’agit d’un projet parent ancien qui ne contient pas les modules métier. Pour examiner les mêmes concepts dans une arborescence exploitable, le miroir monorepo OpenVPMS a également été cloné dans `/tmp/openvpms-reminders-source-20261016`. L’analyse porte sur les archétypes et règles de rappels, sans copier leur code.

Révisions examinées : `lsendel/openvpms` à `ff37da5dee8930628c4e83962e6d7bda757a650b` ; miroir `Narimm/OpenVPMS` à `b9323779aa29c9ff9e9a40569f4c1db7d287a84f`. L’analyse REA repose sur la lecture statique des sources Java et des archétypes XML. Elle ne prétend pas décrire un parcours exécuté dans OpenVPMS.

### Ressources OpenVPMS

- `act.patientReminder` sépare la date de l’acte, la prochaine date de communication et l’échéance, lie patient, type, produit, auteur et clinicien, et expose `IN_PROGRESS`, `COMPLETED`, `CANCELLED`.
- `entity.reminderType` porte l’activation, l’intervalle par défaut et son unité, une fenêtre de sensibilité, une règle d’annulation, des groupes et un mode interactif.
- `entityRelationship.productReminder` associe un produit ou service à un type avec un intervalle spécifique. Cette relation permet à un acte facturé de déterminer son rappel.
- `ReminderRules` calcule les dates, classe les rappels `NOT_DUE`, `DUE`, `OVERDUE`, termine les rappels correspondants du même patient et du même type ou groupe, et crée les rappels reliés à un produit.
- Les processeurs de rappels construisent des files de travail, regroupent les contacts et produisent des listes ou exports.
- Le thème OpenVPMS associe `NOT_DUE` à une icône verte, `DUE` à une icône ambre et `OVERDUE` à une icône rouge. Baitari conserve le sens des états et adapte leur présentation : neutre, accent bleu et alerte.

Sources concrètes du miroir :

- `openvpms-archetypes/src/archetypes/org/openvpms/archetype/reminder/act.patientReminder.adl` : rattachements et dates de l’acte.
- `openvpms-archetypes/src/archetypes/org/openvpms/archetype/reminder/entity.reminderType.adl` : intervalle, unités, activation, sensibilité, mode interactif.
- `openvpms-archetypes/src/archetypes/org/openvpms/archetype/product/entityRelationship.productReminder.adl` : relation produit vers rappel.
- `openvpms-archetypes/src/java/org/openvpms/archetype/rules/patient/reminder/ReminderRules.java` et `ReminderStatus.java` : génération, classement et clôture.
- `openvpms-web/openvpms-web-workspaces/src/main/java/org/openvpms/web/workspace/reporting/reminder/PatientReminderProcessor.java`, `GroupedReminderProcessor.java` et `ReminderGenerator.java` : constitution et traitement des listes.
- `openvpms-web/openvpms-web-app/src/conf/style/default.stylesheet`, styles `reminder.NOT_DUE`, `reminder.DUE`, `reminder.OVERDUE` : code couleur.

### Événements OpenVPMS

1. Un produit ou service est enregistré dans un acte.
2. Les relations produit vers type déterminent les rappels candidats et leur échéance.
3. En mode interactif, l’utilisateur peut ajuster le rappel avant la sauvegarde.
4. Les rappels ouverts correspondants sont terminés lors du nouvel acte.
5. À la lecture, la fenêtre de sensibilité distingue pas encore dû, dû et en retard.
6. Le traitement alimente une file de communication et incrémente l’historique d’envoi.

### Agents OpenVPMS

- Le praticien déclenche le flux en enregistrant l’acte.
- L’administrateur configure les types, intervalles et groupes.
- Le moteur de règles calcule les échéances et les correspondances.
- L’équipe traite les files de rappels et les contacts.

## Adaptation Baitari

OpenVPMS propose davantage de canaux, de fenêtres et de traitements automatisés que le périmètre Baitari. Baitari retient quatre principes : type configurable, acte source traçable, proposition interactive et état dû calculé à la lecture. Les envois SMS, email, files serveur et traitements cloud sont exclus.

## Modèle local cible

### `reminder_types`

Le stockage existant est conservé et complété. L’API métier expose : identifiant, libellé, intervalle par défaut en mois et activation.

Types initiaux :

| Identifiant | Libellé | Intervalle initial |
|---|---|---:|
| vaccin | Vaccin | 12 mois |
| vermifuge | Vermifuge | 3 mois |
| controle_annuel | Contrôle annuel | 12 mois |
| soin_dentaire | Soin dentaire | 12 mois |
| autre | Autre | 12 mois |

Chaque valeur est administrable dans les paramètres. Le type Autre reste configurable et n’implique aucune détection automatique par libellé.

### `medical_reminders`

Colonnes fonctionnelles : `id`, `patient_id`, `client_id`, `type`, `intervalle_mois`, `echeance`, `statut`, `acte_source_id`, `note`, `motif_annulation`, `created_at`, `updated_at`, `completed_at`.

- `statut` vaut `en_cours`, `termine` ou `annule`.
- En retard n’est jamais stocké. Il est calculé lorsque `statut = en_cours` et `echeance` précède le jour local.
- `acte_source_id` rend la génération idempotente.
- `client_id` est enregistré avec le patient afin d’éviter une résolution ambiguë dans la liste d’appels.
- `intervalle_mois` copie la valeur confirmée au moment de la création. Une modification ultérieure du type ne réécrit pas l’historique.

L’historique existant est conservé et raccordé aux identifiants médicaux. La migration copie les anciennes lignes de `patient_reminders` en traduisant `traite` vers `termine`.

## Hook métier

`onMedicalActRecorded(act)` reçoit un acte normalisé : identifiant source, patient, client, type médical, date de réalisation, note éventuelle. Il :

1. charge le type actif ;
2. calcule une échéance proposée avec des mois calendaires ;
3. retourne une proposition sans écrire en base ;
4. laisse l’utilisateur accepter, modifier l’intervalle et la date, ou ignorer ;
5. crée le rappel uniquement après confirmation explicite ;
6. protège contre le doublon par `acte_source_id`.

La proposition est affichée après la validation de l’acte, afin que refuser le rappel ne bloque jamais l’enregistrement médical. La vaccination utilise directement le type vaccin. Les consultations clôturées et les soins validés utilisent une correspondance déterministe des libellés explicites : vaccin, vermifuge, contrôle annuel, bilan annuel, visite annuelle, détartrage et soins dentaires. Un contrôle ordinaire ne déclenche aucune proposition. Le type Autre et les types ajoutés restent disponibles dans la création médicale manuelle et dans le hook avec un type explicite.

## États et actions

Machine à états :

- `en_cours -> termine` ;
- `en_cours -> annule`, avec motif obligatoire ;
- reporter conserve `en_cours`, exige une nouvelle date et inscrit l’action dans l’historique ;
- aucun retour depuis un état terminal.

Quand un rappel est marqué terminé, l’interface propose un rappel suivant avec le même type et l’intervalle mémorisé, à compter de la date de traitement. L’utilisateur confirme, ajuste ou refuse. Il n’y a jamais de création silencieuse.

## Vues et hiérarchie

La page Rappels conserve les rappels manuels et les notifications locales. Elle ajoute un filtre principal Tous, Manuels, Médicaux. Les états en retard et dus aujourd’hui dominent la synthèse.

Un rappel médical affiche : patient, type, échéance, badge Médical, état visuel, propriétaire et téléphone. Le code couleur est réservé à l’information : neutre pour futur, accent pour aujourd’hui, alerte uniquement pour le retard.

La vue Rappels du jour contient les rappels dus ou en retard, un lien téléphonique tactile, l’impression et l’export CSV local. Aucun canal distant n’est proposé.

Le widget du tableau de bord affiche le nombre en retard, le nombre dus aujourd’hui et les trois prochaines échéances, avec un accès direct à Rappels.

## Contraintes de présentation

- Titres Space Grotesk, corps Geist.
- Icônes Lucide, trait 1.
- Cibles tactiles de 44 px au minimum.
- Textes uniquement en français et sans nom de table ou d’état technique.
- Aucun tiret cadratin.
- Les rappels manuels restent visibles et fonctionnels dans leurs vues actuelles.

## Critères de vérification

- Calcul des mois en fin de mois et année bissextile.
- Aucune écriture avant confirmation de la proposition.
- Idempotence par acte source.
- États terminaux immuables et annulation motivée.
- Retard dérivé du jour local.
- Acte vers proposition, confirmation vers rappel, traitement vers proposition suivante.
- Migration répétable et conservation des rappels manuels.
- Filtre Tous, Manuels, Médicaux, appel tactile, impression et CSV.
- Widget et navigation.
- Typecheck, lint sans avertissement, tous les tests, build frontend et captures exigées.

