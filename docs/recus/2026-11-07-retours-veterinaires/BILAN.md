# Retours des trois vétérinaires : tableau de bord, agenda, Microsoft Store

Date : 7 novembre 2026. Commité en local, non poussé. Aucune nouvelle fonctionnalité de fond, le harnais est resté de côté, aucune publication.

## Résultat

Le vétérinaire ouvre l'app : un bonjour, une seule rangée de quatre chiffres clés, un seul graphique à deux séries (recettes en dinars, consultations). Dans l'agenda, il arrive sur sa journée en gros plan, avec une couleur par type de rendez-vous, en jour, en semaine ou en mois.

Vérifications finales : **182 fichiers de tests, 1428 tests, tous verts** (1389 au départ, 39 ajoutés) ; `tsc -b` sans erreur ; `eslint src tests` sans avertissement ; graphe mis à jour (`graphify update .`, 8381 nœuds).

## Les quatre questions posées avant de commencer

| | Retenu | Pas retenu, et pourquoi |
| --- | --- | --- |
| **1. Ce qu'un premier plan ferait en plus** | Cas vide testé (période sans aucune donnée). Couleur jamais seule : chaque teinte accompagne une étiquette et une comparaison. Contrastes calculés. Vérification que deux chiffres affichés côte à côte s'accordent (voir équipe rouge). | Choisir les chiffres clés avec les vétérinaires : je n'y ai pas accès, j'ai gardé les quatre existants. Simulation de daltonisme : non faite. Mesure du temps pour retrouver le prochain rendez-vous : non faite. |
| **2. La matière brute** | Lecture du code et du schéma, pas des maquettes. Inventaire des doublons par lecture des composants. Comptage réel des blocs affichés dans le navigateur. Documentation officielle de Tauri et de Microsoft pour le Store. | Une base d'un vrai cabinet : non fournie, j'ai travaillé sur les données de démonstration et des jeux extrêmes. La capture des deux « Agenda » du testeur : je ne l'ai pas vue, je les ai retrouvés dans le code. |
| **3. Méthodes et outils** | Navigateur piloté par Playwright (installé hors du projet). Jeux de données extrêmes insérés pour les captures. Calcul de contraste WCAG. Tests unitaires de la logique (période choisie, placement des rendez-vous). | Recoupement par requête SQL directe : non fait (SQLite natif indisponible dans le navigateur). Je l'ai remplacé par la comparaison entre le chiffre clé et le graphique, qui a trouvé un vrai écart. |
| **4. Preuve extérieure à nous deux** | Les règles officielles de Microsoft pour le Store. Les contrastes, mesurés. | **Le test chronométré avec un vétérinaire n'a pas eu lieu** : c'est la vraie preuve, et elle reste à faire (voir « À faire »). |

## L'équipage

- **Designer produit** : une seule rangée de chiffres clés, un seul graphique, le bonjour seul en haut.
- **Ingénieur données** : période choisie par deux dates, borne des durées, comparaison avec la période d'avant, cohérence chiffre clé / graphique.
- **Designer d'interface** : teintes d'accent partagées par Clean et Premium, clair et sombre ; en-têtes et lignes de la grille de l'agenda.
- **Ingénieur calendrier** : grille horaire jour et semaine, axe du temps élastique, placement des rendez-vous qui se chevauchent.
- **Ingénieur de publication** : rapport Microsoft Store (fichier à part).
- **Équipe rouge** : voir plus bas.

## Chantier 1 : tableau de bord

- **Haut de page** : il ne reste que le bonjour et la date. La carte « Prochain rendez-vous », la phrase d'explication et le lien « Voir le planning du jour » sont retirés. **Les boutons « Nouvelle consultation » (raccourci N) et « Nouveau patient » et la bascule clinique/analyses sont conservés**, à droite du bonjour, parce qu'ils n'existent nulle part ailleurs et que votre règle est de ne rien perdre.
- **Une seule rangée de chiffres clés** (Trésorerie, Consultations, Patients suivis, Actions à suivre), visible sans défiler. J'avais d'abord ajouté une deuxième rangée ; le testeur a demandé une seule rangée, je l'ai retirée. « Reste à recouvrer » et « Taux de règlement » restent dans « Cette semaine ».
- **Sélecteur de dates** : les périodes rapides (Aujourd'hui, 7 jours, 30 jours, 90 jours, 12 mois) plus deux sélecteurs « du … au … ». La période choisie pilote les chiffres clés et le graphique. Les dates inversées sont remises dans l'ordre, une date illisible ne change rien, la durée est bornée à deux ans.
- **Un seul graphique fusionné** : recettes en dinars (échelle de droite, ligne sombre) et consultations (échelle de gauche, ligne bleue avec un repère par jour), même grille, bulle de survol à deux valeurs. Plus de bouton de bascule.
- **Période du graphique** : une petite icône calendrier, sans rangée de boutons. Elle ouvre un calendrier où l'on choisit un jour de début puis un jour de fin (deux clics, jamais une modification de l'ancienne plage). Le composant « Date Field de TuffUI » n'est pas dans le projet : j'ai utilisé le calendrier de l'app, qui sait choisir une plage.
- **Doublons supprimés** (audit de tous les widgets) :
  - le lien « Agenda » du widget d'activité, qui doublait celui de « Cette semaine » sur la même rangée (le doublon vu par le testeur) ;
  - la carte « Prochain rendez-vous » et « Voir le planning du jour », qui menaient aussi à l'agenda ;
  - dans « Gestion du cabinet », la tuile « Hospitalisations » (même page que « Soins & hospitalisation » et que la carte « Hospitalisés ») et la tuile « Bilan & Analyses » (même page que « Facturation & Devis ») ;
  - en vue clinique, le lien « Dossiers » quand la liste est vide (le bouton « Ouvrir les patients » y mène déjà).
- **Couleur** : cinq teintes (vert, bleu, violet, ambre, rose) définies comme jetons dans `tokens.css`, identiques en Clean et en Premium. Elles colorent l'icône de chaque chiffre clé, et le chiffre lui-même seulement quand il signale un avertissement (actions prioritaires : rose). Contrastes mesurés : au moins **4,89 pour 1** en clair et **7,62 pour 1** en sombre sur les surfaces réelles. Une exception à connaître : l'icône verte sur sa puce teintée, en clair, fait 4,28 pour 1, au-dessus des 3 pour 1 exigés pour une icône.
- **Calendrier (tous les sélecteurs de date)** : le jour courant est en bleu teinté, la plage choisie est teintée. En corrigeant cela, j'ai trouvé un défaut plus ancien : en Clean, une règle remettait à transparent toute case dont la classe contenait `bg-muted/50`, ce qui **rendait la sélection invisible dans tous les calendriers**. Corrigé dans `src/index.css`.

## Chantier 2 : agenda

- **Calendrier jour, semaine, mois**, ouvert sur le jour en gros plan. Barre de navigation : précédent, Aujourd'hui, suivant, et une icône pour sauter à n'importe quelle date.
- **Une couleur par type de rendez-vous** (Consultation, Vaccin, Chirurgie, Urgence, Contrôle), reprises des couleurs déjà définies dans l'app, avec une légende.
- **Chaque rendez-vous visible en entier** :
  - la plage des heures s'étend du premier au dernier rendez-vous (6 h à 20 h, ou davantage), sans défilement interne ;
  - **l'heure s'étend en hauteur** quand elle est chargée : dix rendez-vous entre 13 h et 14 h donnent une heure assez haute pour les dix, chacun sur sa ligne ; en semaine, l'axe est partagé, donc les autres jours suivent ;
  - deux rendez-vous simultanés restent côte à côte, au-delà ils s'empilent ;
  - **une ligne complète au minimum** pour tout bloc (heure et nom), même pour 5 minutes (le cas de Dora), avec la vraie heure de fin ;
  - **aucune infobulle native** sur les blocs : le clic ouvre la fiche de détail de l'app et la fait défiler à l'écran.
- **En-têtes** : bande de colonne dans le gris de sélection du système (#F5F5F5, blanc à 5 % en sombre), première cellule alignée sur la colonne des heures ; même traitement pour les noms de jours du mois. **Coins supérieurs au rayon des cartes (16 px)**, bas droit contre la grille, la grille entière dans un cadre fin au même rayon. Trait de la première heure, et marge d'air entre les libellés d'heures et le séparateur.
- **Compteurs des onglets** (« 57 » de « Terminés ») : centrés dans leur badge, mesure à l'appui (le centre du texte est celui du badge).
- La vue « Par vétérinaire » et la liste, déjà présentes, sont inchangées.

## Chantier 3 : Microsoft Store

Rapport dans `microsoft-store-faisabilite.md`. En bref : faisable par la voie **installateur EXE/MSI signé** ; la signature de code manque aujourd'hui (cause des alertes Edge et SmartScreen, Store ou pas) ; le champ éditeur doit être renseigné ; la voie MSIX est écartée pour l'instant (pas de MSIX natif dans Tauri, données qui ne suivraient pas, règle de commerce incertaine). **Aucune publication, aucun compte créé, aucun fichier de build modifié.**

## L'équipe rouge : attaques et issues

| Attaque | Issue |
| --- | --- |
| Silence : trois rendez-vous dont le patient n'existe plus | **A réussi.** Le chiffre clé affichait 6, le graphique 9, sans erreur. Le graphique applique maintenant la règle du chiffre clé : 6 et 6. |
| Journée à dix, vingt-cinq rendez-vous dans la même heure | Aucune perte, aucun recouvrement : testé (6, 8, 10, 25 simultanés) et mesuré dans le navigateur (0 recouvrement en vue jour et semaine). |
| Rendez-vous de 5 minutes (cas de Dora) | **A réussi une première fois** : il héritait de 36 minutes de bloc minimal (fausse fin, 115 px de haut). Corrigé : une ligne, vraie heure de fin. |
| Texte coupé sur les blocs courts | **A réussi** : interligne de 22 px dans un intérieur de 20 px. Corrigé, mesuré : 0 bloc coupé. |
| Rendez-vous qui passe minuit, annulé, sans fin lisible | Coupé à 24:00 / atténué / durée par défaut de 20 minutes. Testé. |
| Passages à l'heure d'été (journées de 23 et 25 heures) | Testé, restent dans 0 à 1440 minutes. |
| Période sans aucune donnée, dates inversées, date illisible | Zéros, aucune valeur « NaN » ou « Infinity », aucune erreur de page. |
| Petits écrans, 390 et 800 px | Aucun débordement horizontal de la page (tableau de bord, agenda jour et semaine). |
| Premier clic dans le calendrier du graphique sur une plage existante | **A réussi** : il modifiait la fin de l'ancienne plage et fermait. Corrigé : parcours en deux clics. |
| Sélection invisible dans les calendriers en Clean | **A réussi** (défaut ancien). Corrigé. |
| Cadre de la grille de l'agenda | **A réussi.** Le CSS de Premium retire bordure, rayon et fond à toute classe `bg-card` avec `!important` : mon cadre n'avait ni liseré ni arrondi, et seule la bande portait un rayon (un rayon de 8 px à l'origine, invisible à taille réelle). Mesuré avant (0 px, aucune bordure) et après (16 px, 1 px). Le cadre n'est plus un `bg-card`. |
| Le garde-fou « test de charte » (couleurs en dur) | A bloqué ma première version des teintes : déplacées dans les jetons. |
| Bouton supprimé qui était la seule entrée d'une page | Aucun : chaque tuile et lien retiré avait un équivalent vers la même page (liste ci-dessus) ; les actions du bonjour sont conservées. |

## Captures

Dossier `docs/recus/2026-11-07-retours-veterinaires/` :

- `avant/` : tableau de bord et agenda, quatre thèmes.
- `apres/` : tableau de bord et agenda, quatre thèmes ; agenda chargé (journée à dix rendez-vous à 13 h, un à 6 h, un à 19 h 30, un annulé, un à minuit) en jour, semaine et mois, quatre thèmes.
- `apres/entete-*.png` : l'entête avec la nouvelle icône de barre latérale, quatre thèmes.
- `icone-slideout/propositions.png` : les trois variantes étudiées.
- `iter/` : captures de travail en Clean, gardées en local, non versionnées.

## Remarques passagères du testeur

- **Icône à côté du titre de page** : agrandie à 24 px et alignée sur l'axe de l'icône de barre latérale du header (mesuré : 282 px contre 282 px en Clean, 290 contre 290 en Premium) ; la position du titre n'a pas bougé.
- **Nouvelle icône de barre latérale** : **appliquée**. Un rectangle aux coins arrondis dont le volet latéral est marqué par un trait (volet teinté quand la barre est ouverte, vide quand elle est repliée), sans chevron, au même trait que les autres icônes. Même emplacement, même action, même raccourci. Le bouton n'est plus un fantôme sans cadre en Clean : il porte la classe `topIcon` des autres boutons de l'entête. Mesuré identique à son voisin dans les deux thèmes (36 × 36, même rayon, même liseré, même fond, glyphe de 18 px). Les trois variantes étudiées sont dans `icone-slideout/propositions.png`.

## Écarts et limites

- **Tailwind Plus** : je n'ai pas accès aux composants calendrier de Tailwind Plus (il n'y en a pas dans le dépôt). Je n'ai pas pu regarder leur vue semaine : j'ai appliqué le comportement d'Outlook et de Google Agenda tel que vous l'avez décrit.
- **TuffUI** : absent du projet, remplacé par le calendrier de l'app.
- **« Cette semaine » et la rangée « À surveiller »** ne suivent pas la période choisie : leur sens est « maintenant » et leur titre le dit.
- **Une infobulle native reste** sur l'icône calendrier du graphique (attribut `title`) : votre consigne portait sur les blocs de l'agenda. À retirer si vous le voulez aussi là.
- **Pas vérifié sur l'app Tauri** : les séjours et les rappels médicaux sont en SQLite natif, donc vides dans le navigateur (le bandeau « Les séjours n'ont pas pu être chargés » y est ancien). Les captures viennent du navigateur avec les données de démonstration.
- **Vue mois** : chaque case nomme ses deux premiers rendez-vous puis « + N » (comme Outlook) ; la règle « tout est visible en entier » s'applique aux vues jour et semaine, où l'on voit les rendez-vous d'une heure. Un clic sur le jour ou sur l'en-tête ouvre la vue jour.
- **Premium** : la composition du haut de page a changé (le bandeau quadrillé du bonjour disparaît avec le haut de page, comme demandé).

## À faire

1. **Faire passer le test chronométré** par Aissa à un vétérinaire : « Quel est votre prochain rendez-vous ? Combien de consultations aujourd'hui ? ». C'est la preuve que ni vous ni moi ne pouvons fournir.
2. Décider du signataire (particulier ou structure) et du certificat de signature, premier pas du chantier Store et remède aux alertes de téléchargement.
3. Vérifier dans `npm run tauri:dev` les séjours et les rappels.
