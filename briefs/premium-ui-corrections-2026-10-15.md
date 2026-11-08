# Corrections Premium du 15 octobre 2026

Mode : Operate. Référence conservée : Admin-panel, séparateurs gravés et bande hachurée. Aucun nouveau parcours métier, aucune modification des données.

## REA avant intervention

### Ressources

- Typographie demandée : Roobert Regular/Medium pour les titres, Geist pour le corps. Les fichiers du Bureau sont des essais, avec `Befonts-License.txt` indiquant « Personal Use Only ». Utilisation pour cette validation visuelle, remplacement par des fichiers licenciés avant distribution commerciale.
- Tokens Premium existants : surfaces grises, commandes principales noires en clair et bleu-violet en sombre selon la dernière capture validée, paire de traits `--rule-highlight` / `--rule-shadow`. Classique conserve ses tokens et ses polices.
- Précisions en cours : icônes sidebar portées à 20 px (raccourcis 18 px), trait Lucide 1 et alignement stable ; séparation verticale de deux pixels adjacents, blanc puis ombre. La bande du dashboard porte finalement le lien « Voir le planning du jour » avec flèche finale, à la demande de l’utilisateur.
- La journée clinique restaurée reprend ces mêmes cadres gravés et filtres, sans remplacer ses modules. Le slideout conserve sa forme de référence, agrandi à 22 px, sans contour permanent ; contour discret au survol et focus clavier maintenu.
- Derniers ajustements demandés : bienvenue à 32 px sur grand écran (24 px minimum), sous-texte à 14 px, fil d’Ariane aligné au cadre du dashboard. « Nouveau patient » conserve une bordure simple : suppression des ombres gravées cumulées du bouton.
- Composants existants : Button, Tabs, SearchableSelect, Input, Calendar. Réutilisation de leurs interactions et de leur navigation clavier.
- Écrans : dashboard, sidebar, Agenda, Clinique, Rappels, Documents. Mascottes conservées.

### Événements

- Le changement de vue du dashboard doit afficher le contenu clinique existant. Le retour anticipé Premium masquait cette branche : défaut fonctionnel de présentation à corriger en priorité.
- Les changements de période, dates, filtres, recherche, création et édition restent raccordés aux callbacks actuels.
- Survol, focus, actif et désactivé restent distincts. Un filtre Documents inactif ne doit pas paraître être un bouton principal.

### Agents

- Le vétérinaire repère le contexte de sa journée puis ouvre le planning ou une consultation.
- L’équipe prépare un rappel à partir de champs alignés et explicitement étiquetés.
- Le lecteur de documents distingue les commandes de création des filtres de bibliothèque.

## Diagnostic et décisions

| Écart | Cause | Correction prévue |
| --- | --- | --- |
| Police incohérente | Tokens Premium et fontes forcées propres au dashboard/sidebar | Tokens de rôle partagés, fichiers locaux Regular/Medium, Geist pour les données et le corps |
| Vue clinique invisible | Retour Premium inconditionnel | Réutiliser ClinicalDashboardView avec ses callbacks actuels |
| Badge et texte « connecté » | Copie redondante, état réseau non pertinent en local | Retirer le badge, indiquer le fonctionnement local dans la bande |
| Bienvenue trop courte, sous-texte sur deux lignes | Composition et mesure fixes | Salutation développée avec emoji, sous-texte continu, retour naturel sur petites largeurs |
| Textes sidebar mal formés | Contraintes de ligne/tailles et hiérarchie | Geist, hauteurs et lignes stables, français vérifié sans modifier les données |
| Séparateur sidebar ambigu | Plusieurs pseudo-éléments superposés | Un seul trait blanc et son ombre adjacente de 1 px |
| Agenda peu structuré | Titre sans retrait et commandes mélangées | En-tête, date et navigation groupés, vues gravées |
| Cadre Clinique tronqué | `overflow-hidden` coupe les traits à -10 px | Débordement visible du cadre, contenu de table conservant son propre conteneur |
| Toggles Clinique peu cohérents | Styles de sous-onglets arrondis génériques | Rangée gravée dédiée, compteurs lisibles, sélection explicite et clavier conservé |
| Rappel rapide déséquilibré | Champs de hauteurs et alignements différents | Grille adaptative, tailles et labels homogènes, détails séparés |
| Boutons Documents collés | `gap-0` et sélecteurs trop larges de boutons principaux | Espacements dédiés, filtres neutres, seule création en noir |

Hiérarchie : titres Roobert 24/18/16 px medium, corps Geist 14/13 px, métadonnées 12 px. Densité desktop stable, groupes espacés de 16/24 px, champs 36 px. Les lignes de commandes passent naturellement sur plusieurs rangées quand l’espace manque.

## Vérification prévue

Captures avant/après clair et sombre des cinq pages, accès et retour de la journée clinique, filtres au clavier, formulaire rappel et menus Documents. Typecheck, lint sans avertissement, suite Vitest et build frontend. La base de test reste isolée de la base du cabinet.

## Précision maillage et inspection REA

Demande : rétablir le maillage en losanges de la référence dans les bandes et les en-têtes de tableaux, y compris en sombre. Les lignes de données restent unies. Le pied de sidebar reprend ce même traitement.

- Observation REA du navigateur de référence : `ev_465504788b3133b66ed9ee9ab840fe8153c8032131221c5f75915ad6e3658edd` (cible `/admin`), `ev_bf52e004c4f59f6b0e4030f002f6023da611d7e8a3a1ab04adb9b23d864a5360` (DOM et ressources), capture `ev_4e90b816c325403987ec4527be4c50f8c00982b73da85a60f53ce1f7d0e9ac07`. L’inspection est passive, limitée à l’origine de la référence et à la fenêtre d’attachement. Elle confirme la ressource `footer-pattern-wide.svg`, sans observer les activités réseau antérieures.
- Relevé complémentaire des styles calculés dans le navigateur : motif local en répétition horizontale, hauteur 82 px, fond #EFEFEF en clair ; fond #1A1A1A et voile de 70 % en sombre. Le motif est présent dans les cellules d’en-tête, la bande d’actions et le pied de sidebar.
- Cause dans Baitari : `--band` prioritaire remplaçait le SVG existant par une hachure diagonale. Centraliser ce token dans `premium.css` et supprimer les deux redéfinitions du dashboard. Réutiliser le fichier local existant, aucune nouvelle dépendance ni requête réseau.
- Vérification : captures avant/après clair et sombre, motif chargé localement, lignes de données sans motif, bascule Classique inchangée.

## Lisibilité urgente des fenêtres et sélecteur de vue

- Le motif a été validé visuellement par l’utilisateur. Le sélecteur « Vue classique / Journée clinique » doit néanmoins garder un fond uni : il recevait une surface semi-transparente et laissait voir le motif de la bande. Fond opaque spécifique au groupe, sélection et comportement conservés.
- Cause des fenêtres transparentes confirmée dans le navigateur : le token Premium `--card: transparent` de la page était hérité par `.modal-medical-shell` et son corps. Fond calculé transparent en clair et sombre, pied de formulaire presque transparent en clair.
- Correction de présentation : redéfinir les tokens de carte et popover dans le contexte des fenêtres flottantes et leur attribuer `--surface` opaque ; corps, en-tête et pied restent opaques. Le flou reste réservé au voile derrière la fenêtre. Aucun champ, traitement ou condition de validation ne change ; Classique exclu des sélecteurs.
- Inspection REA complémentaire de `/admin/bookings` : `ev_30b5f4b33c5ba0b0bb3a9115895899cb8484add3c5841aa1193904869a458ac3`, motif retrouvé parmi les ressources du tableau.

## Transition clair / sombre restaurée

Demande de l’utilisateur : retrouver l’effet progressif des anciennes versions, comme une lumière qui s’allume. L’animation circulaire existe toujours dans `use-circular-transition.ts` et `circular-transition.css`, mais ThemeControl appelait directement le changement de thème. Rebrancher ce hook existant au clic du bouton, depuis la position du pointeur. Conserver l’animation d’origine (400 ms), sans nouvelle dépendance ni changement de palette. Activation clavier instantanée ; préférence de réduction des animations et absence d’API gérées par le hook existant. Vérifier les deux directions, la persistance, le mouvement et le repli sans animation dans Chromium et WebKit.

L’essai utilisateur a signalé un clignotement de la commande de thème : AnimatePresence animait simultanément deux icônes (opacité, réduction à 25 %, flou) pendant la révélation globale. Retirer uniquement cette seconde animation. Le bouton et une seule icône restent en place ; seule la révélation de la page assure la transition.

## Finances : sélecteur du registre et Analyse conservée

Dernière décision de l’utilisateur : conserver Analyse, la refaire proprement. Ne pas supprimer la route.

### Ressources
- Réutiliser les onglets Factures / Journal et leur état existant, les recherches, filtres et commandes. Un seul sélecteur dans l’en-tête partagé du registre, aligné à droite sur desktop, clavier conservé.
- Pour Analyse Premium : métriques et séries déjà calculées par `buildDashboardMetrics`, graphiques Recharts existants, tokens Roobert/Geist, bleu Baitari, surfaces et cadres gravés. Classic conserve sa présentation.
- Défaut de l’ancienne représentation : segmentation forfaitaire 65/25/10 et « Consultations facturées » alors que la valeur compte les rendez-vous du jour. En Premium, afficher les catégories réelles déjà disponibles dans `metrics.topCategories` et un libellé fidèle à `todayAppointments`. Aucun changement des écritures, règles d’émission ou calculs persistants.

### Événements
- Bascule Factures / Journal : même état et contenus, mise à jour de l’action de création conservée. Déplacement visuel uniquement.
- Analyse : conserver les deux graphiques existants, année pour les encaissements mensuels et 14 jours pour le flux net ; tooltip des montants, retour Finances, aucune nouvelle période ni donnée fictive.

### Agents
- Le vétérinaire passe du registre aux écritures sans perdre sa recherche ou ses filtres.
- Le lecteur de l’analyse distingue les périodes et montants réels, sans graphiques décoratifs ni pourcentages forfaitaires.

Validation : captures avant/après clair/sombre, navigation des onglets au clavier, recherche préservée, commandes de création, deux graphiques et montants vérifiés avec les données réelles sur copie isolée. Typecheck, lint sans avertissement, tests et build frontend après stabilisation.

## Bilan vérifié

- Typecheck : 0 erreur. ESLint : 0 erreur, 0 avertissement. Vitest : 710 tests réussis, 90 fichiers. Serveur de licences : 13 tests réussis. Build frontend : réussi ; démarrage à 275,9 kB gzip, sous le budget de 300 kB.
- Chromium et WebKit : 55 contrôles du périmètre initial, 40 contrôles maillage / fenêtres / sélecteur, 12 contrôles de la transition et de la stabilité de l’icône, 19 contrôles Finances. Ces suites se recouvrent ; leurs nombres ne représentent pas des scénarios uniques additionnables. Aucune erreur React.
- Finances : un sélecteur à droite du registre en Premium, navigation clavier, recherches préservées après bascule, formulaires de création accessibles. Analyse conservée et raccordée aux métriques existantes, sans segmentation fictive ; catégorie technique historique affichée en français. Les deux graphiques, retour au registre, formats de montants et largeurs 1000/600 px sont vérifiés. La présentation Classique a été conservée.
- Captures avant/après : galerie locale `premium-corrections-2026-10-15/index.html` dans le dossier de visualisations du chat. Reçu `verification-receipt.json` et journaux complets conservés à côté.
- Aucun changement de schéma, aucune écriture sur la base réelle du cabinet. Tests visuels sur copie isolée et export local des données réelles. Les dernières itérations sont destinées au mode dev ; aucun nouvel artefact macOS de ces dernières finitions n’est présenté comme livré.
