# Dossiers médicaux — refonte du 5 octobre 2026

Mode : Operate. La consultation quotidienne guide la composition : identifier le patient, repérer les informations importantes, retrouver une visite et effectuer une action de suivi.

## Parcours

L’œil de la liste Patients ouvre désormais l’aperçu latéral commun au shell, plutôt que l’ancien dialogue à onglets. Le panneau montre l’identité et les alertes en permanence, puis trois sections : synthèse, visites, suivi préventif. Une action fixe ouvre le dossier détaillé.

Le dossier complet s’ouvre sur une synthèse. Le registre regroupe ensuite chronologie, ordonnances, hospitalisations, anesthésies, vaccinations, poids et documents. Le propriétaire et les notes générales sont dans une colonne latérale, qui passe sous le registre sur une largeur de contenu réduite. Les alertes restent avant les sections, les informations utiles à la prise en charge étant prioritaires.

## Règles propres à cette surface

- Identité commune entre aperçu et dossier complet : avatar réel ou icône d’espèce, nom, statut, espèce, race, sexe, âge, identifiant et date de création.
- Allergies et antécédents partagent un composant unique. Un champ vide est « non renseigné », pas une absence de risque confirmée.
- Surfaces card, bordures du thème, rayons de 14 px et une seule famille typographique. Nom de 26 px dans le dossier et 22 px dans l’aperçu ; titres de section de 14 px, contenu de 13 px.
- Sections du registre sous forme d’onglets soulignés, sans capsules décoratives. Flèches, Home et End déplacent la sélection et le focus ; un seul onglet appartient au parcours Tab.
- Les champs de suivi affichent chargement ou indisponibilité avant d’affirmer qu’aucun événement n’est enregistré. Les dépôts conservent leurs contrôles de récupération.
- Dates calendaires sans heure interprétées comme dates locales. Les timestamps de rendez-vous gardent leur heure et leur fuseau.
- Dernières visites = consultations terminées ou en cours ; le prochain rendez-vous figure séparément.
- Les actions existantes de consultation, ordonnance, hospitalisation, anesthésie, document, vaccination et pesée restent reliées aux composants et données existants. Le nouveau rendez-vous est préparé avec l’identifiant du patient.

## Validation

Vérification TypeScript effectuée et réussie. Une revue indépendante a identifié puis fait corriger les dates calendaires, les états de chargement, la navigation clavier des onglets et la sélection des visites récentes. La compilation de production Vite est réussie ; elle signale des avertissements de découpage de bundles PDF/éditeur sans bloquer la génération.

L’outil de contrôle de fenêtre signale « Sky Computer Use native pipe startup failed » et aucun navigateur connecté n’est disponible : cette session ne peut pas confirmer visuellement le rendu dans Tauri. Aucune donnée patient de démonstration n’a été insérée et aucun test automatisé n’a été ajouté.

Le système visuel existant est conservé ; DESIGN.md n’est pas remplacé pour cette refonte locale. Le chargeur Impeccable a signalé des métadonnées historiques dans PRODUCT.md ; elles ne sont pas modifiées dans le cadre de ce travail.
