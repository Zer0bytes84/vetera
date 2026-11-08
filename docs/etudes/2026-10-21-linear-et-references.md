# Peaufinage : étude de Linear et des références

Date : 21 octobre 2026. Session d'étude, aucun code modifié.

Cadre : le design de Baitari reste tel quel (thème Premium clair et sombre, mascottes). On vise le niveau de finition de Linear dans la mécanique, la densité et les interactions, module par module.

---

## 1. Linear, mécanisme par mécanisme

Étudié en le manipulant dans ton espace Linear (équipe Zouhir, 4 tickets d'accueil), en sombre puis en clair. Les mesures viennent des styles calculés et des animations enregistrées dans la page. Rien n'a été modifié dans ton espace : menus ouverts puis refermés par Échap, sélection vidée.

### 1.1 Les jetons

**Couleur, générée et non choisie.** Toute la palette est calculée en LCH à partir d'une teinte de base (272 en sombre, 282 en clair) avec une chroma presque nulle (0,4 à 1,5). Les gris sont donc très légèrement teintés, jamais neutres purs.

| Rôle | Sombre (luminance) | Clair (luminance) |
| --- | --- | --- |
| Fond de la feuille principale | 5,5 | 97,9 (pas de blanc pur) |
| Cadre autour de la feuille | 3 à 4 | 94,4 |
| Survol d'une ligne | 9,3 | 94,4 |
| Aperçu flottant | 9,2 | |
| Palette ⌘K | 12,7 | |
| Texte principal | 100 | 9,8 (pas de noir pur) |
| Texte secondaire | 90 | 19,6 |
| Texte tertiaire (identifiants, dates) | 62 | 39 |
| Texte quaternaire (désactivé) | 37 | 64,6 |
| Bordure | 9,8 / 14,2 / 16,3 | 95,2 / 88,5 / 84,4 |

- **En sombre, la profondeur vient de la luminosité**, sans ombre : plus un élément flotte haut, plus il est clair (feuille 5,5, aperçu 9,2, palette 12,7).
- **En clair, l'ombre est presque invisible** sous la feuille : 2 % et 4 % d'opacité.

**Typographie.** Inter Variable partout.
- Titres de ligne : 13 px en graisse 500.
- Identifiants et dates : 13 et 12 px en graisse **450**, une graisse intermédiaire que permettent les polices variables (Geist aussi).
- Les identifiants sont légèrement resserrés (-0,02 em).
- Titre de ticket : 24 px en 600.
- Palette ⌘K : 15 px. Le texte y est plus grand que dans les listes parce qu'on le lit en cherchant.

**Géométrie.**

| Élément | Mesure |
| --- | --- |
| Barre latérale | 244 px |
| Feuille principale | posée à 8 px du bord de la fenêtre, coins de 12 px, filet de **0,5 px** |
| Ligne de liste | 44 px (zone survolée 36 px) |
| En-tête de groupe | 36 px |
| Éléments de navigation | 28 px, coins de 8 px |
| Propriétés (statut, priorité) | pastilles de 28 px, rayon plein |
| Aperçu | 416 px, coins de 12 px |
| Palette ⌘K | 720 px, lignes de 46 px |
| Contrôles | coins de 8 px |
| Anneau de focus | 1 px dans la couleur d'accent |

**Vitesses (jetons nommés dans leur CSS).**

| Jeton | Valeur | Usage |
| --- | --- | --- |
| highlightFadeIn | **0 s** | l'apparition d'un survol est instantanée |
| highlightFadeOut | **150 ms** | sa disparition se fond |
| quickTransition | 100 ms | |
| regularTransition | 250 ms | |
| slowTransition | 350 ms | |

Les survols ne s'activent que sous `(any-hover: hover) and (any-pointer: fine)` : jamais au toucher.

### 1.2 Les mécanismes

1. **Survol asymétrique.**
   - **Ce qu'on mesure :** le fond survolé apparaît en 0 s et disparaît en 150 ms.
   - **L'effet :** l'interface répond tout de suite, et l'on ne voit pas de clignotement quand la souris traverse une liste.
2. **Survol en pastille inset.**
   - **Ce qu'on mesure :** le fond d'une ligne survolée est un pseudo-élément `::before` placé à 8 px de chaque bord, avec des coins de 8 px et un seul palier de ton. On le montre ou le cache par l'opacité, jamais par la mise en page.
   - **L'effet :** le survol ne bouge rien, il ne fait que révéler.
3. **Révélation au survol.** Une case à cocher (12 px, opacité 0) apparaît dans la marge gauche de la ligne survolée. Le même principe montre le bouton « effacer » d'un champ au survol ou au focus.
4. **Un seul curseur pour la souris et le clavier.**
   - **Ce qu'on observe :** la ligne survolée devient la ligne courante, et J/K (ou les flèches) partent de là. En revenant d'un ticket, la liste se rouvre sur la dernière ligne ouverte.
   - **L'effet :** on ne perd jamais sa place.
5. **Espace ouvre un aperçu.**
   - **Ce qu'on observe :** un panneau flottant de 416 px s'ouvre à droite, et la liste reste utilisable. Avec J/K, l'aperçu suit la sélection. Échap le ferme.
   - **Animation :** aucune, parce qu'il est ouvert au clavier.
6. **Entrée ouvre le détail.**
   - **Ce qu'on observe :** la page change sans transition. En haut à droite, un compteur « 3 / 4 » avec flèches permet de passer au ticket suivant sans revenir à la liste.
   - **La page de détail :** le contenu à gauche, une colonne de propriétés de 376 px à droite. Chaque propriété est un bouton qui ouvre son menu.
7. **Les menus de propriété.**
   - **Ce qu'on observe :** un champ de recherche en tête (« Change status… », avec le raccourci S), une icône par valeur, la valeur actuelle cochée et un chiffre de raccourci par ligne (1 à 6).
   - **Animation :** aucune, même ouvert à la souris.
8. **La palette ⌘K.**
   - **Contextuelle :** elle porte en pastille l'objet ouvert (« ZOU-2 Connect your tools »), et ses premières commandes portent sur lui. Chaque commande affiche son raccourci à droite.
   - **Aplatie :** taper « prio » propose directement « Set priority to High », sans sous-menu.
   - **Animation :** aucune à l'ouverture. Seule une petite indication annexe se fond en 150 ms.
9. **Sélection multiple.**
   - **Ce qu'on observe :** X coche la ligne courante et Maj+J étend la sélection. Les lignes cochées prennent une teinte d'accent très légère (chroma 6), et une barre flottante apparaît en bas : « 2 selected · Actions · ✕ ». Échap vide la sélection.
10. **Info-bulles.** Elles donnent le libellé et le raccourci (« Add filter · F »).
11. **Options d'affichage.**
    - **Ce qu'on observe :** liste ou tableau, regroupement, sous-regroupement, tri, plus chaque propriété affichable sous forme de pastille à activer.
    - **L'effet :** la densité est un choix de l'utilisateur, pas du designer.
12. **Chargement.** On voit d'abord la feuille vide, puis le contenu. Pas de rotation, pas de squelette animé.
13. **État vide.**
    - **Ce qu'on observe :** un bloc compact, avec une icône au trait, un titre, deux lignes qui expliquent ce qu'est l'objet, une action principale (avec son raccourci) et un lien vers la documentation.
    - **Ce qui manque volontairement :** pas d'illustration pleine page.
14. **Curseur.** Il reste la flèche par défaut sur les lignes et les boutons, comme une application native, sans main.
15. **Inventaire du mouvement.**
    - **Ce qu'on mesure :** durées entre 80 et 400 ms, presque toutes en `ease` ou `ease-out`. Les rares animations longues servent à des indicateurs d'activité, pas à l'interface.
    - **La règle qui s'en dégage :** ce qu'on refait cent fois par jour ne s'anime pas.

### 1.3 Ce que Linear confirme de la méthode d'Emil Kowalski

Ce qui est fréquent ou déclenché au clavier ne s'anime pas : listes, palette, menus, aperçu. L'animation est réservée aux changements d'état rares. La réponse au geste est immédiate, et seul le retour au repos se fond.

---

## 2. Écarts mesurés dans Baitari aujourd'hui

- **68** occurrences de `transition-all`, au lieu de propriétés nommées.
- **30** durées de 300 ms ou plus dans le CSS et les composants.
- **Aucun** survol réservé aux souris (`any-hover`) dans les modules : seuls 3 fichiers en tiennent compte.
- **159** curseurs « main » (`cursor-pointer`).
- Une **entrée en cascade** sur le tableau de bord (100 ms de décalage par rangée), rejouée à chaque séance.
- **Pas de navigation J/K** dans les listes, pas d'aperçu, pas de sélection multiple au clavier.

Déjà en place, et à garder :
- une palette ⌘K avec « Actions contextuelles », « Récents » et des suggestions cliniques ;
- les raccourcis ⌘K, ⌘N, ⌘J, ⌘F, ⌘R, ⌘, et N ;
- des info-bulles à raccourci (`ShortcutTooltip`) ;
- des jetons de mouvement (`MOTION.fast` 150 ms, `base` 220 ms).

---

## 3. Points transférables, classés par valeur pour Baitari

Valeur : ce que le geste fait gagner à un vétérinaire pressé, pondéré par le risque. Chaque point indique son origine et le module concerné. Tous s'appuient sur des données qui existent déjà : aucun chiffre n'est inventé.

### Niveau 1 : le socle commun, un seul chantier qui profite à tous les écrans

| # | Point | Origine | Modules |
| --- | --- | --- | --- |
| 1 | **Jetons de vitesse Linear** : survol 0 s à l'aller, 150 ms au retour ; 100, 250 et 350 ms pour le reste ; propriétés nommées au lieu de `transition-all` ; survols réservés à `(any-hover: hover) and (any-pointer: fine)` | Linear, Emil | Système de design, tous |
| 2 | **Aucune animation sur ce qui est fréquent ou déclenché au clavier** : palette, menus, aperçu, changement de page. L'entrée en cascade du tableau de bord est retirée | Linear, Emil | Coque, tableau de bord |
| 3 | **Survol en pastille inset** (un palier de ton, 8 px des bords, coins de 8) et **révélation au survol** des actions secondaires de la ligne | Linear, Untitled UI | Patients, Rappels, Produits, Finances, Documents |
| 4 | **Un seul curseur pour la souris et le clavier** : J/K, Entrée, Échap, et retour sur la dernière ligne ouverte | Linear | Mêmes listes |
| 5 | **Info-bulles libellé + raccourci** sur tous les boutons d'icône (le composant existe déjà) | Linear | Coque, barres d'outils |
| 6 | **États vides actionnables** : ce qu'est l'objet en deux lignes, l'action de démarrage avec son raccourci, la mascotte à la place de l'icône | Linear, Saasfactor | Tous les modules |

### Niveau 2 : les widgets du tableau de bord

| # | Point | Origine |
| --- | --- | --- |
| 7 | **« Maintenant » : un vrai bouton « Ouvrir Flux »** dans l'en-tête du widget, toujours visible. Le widget reste une synthèse, sans bouton sur les visites | Ta demande |
| 8 | **En-tête de widget unifié** : titre et période nommée à gauche (« 30 derniers jours »), total et écart à droite, contrôles du widget (période, ouvrir ↗) révélés au survol | bodt, Mega Charts, Outcrowd, Joseph Hall |
| 9 | **Indicateur complet** : valeur suivie de son unité en mot, écart accompagné de la valeur précédente (« +20 % · 25 la semaine dernière »), puis la part qui demande une action (« 4 non confirmés »). Barre vers un objectif seulement si la clinique en a fixé un | TimeTracker, Pietrasiak, Fireart, Joseph Hall |
| 10 | **Micro-histogramme** dans l'indicateur, avec seule la période en cours en couleur | Clinexa, Mega Charts |
| 11 | **Salle d'attente avec position et heure de passage estimée**, calculée à partir des durées réelles du journal de Flux et affichée comme estimation | Paperpillar, Vesper |
| 12 | **Mention « Mis à jour à 11 h 24 »** sur les widgets de données | Saasfactor |
| 13 | **Graphique** : réticule au survol qui met aussi en valeur la date de l'axe ; prévu hachuré, réalisé plein ; comparaison en pointillés | Dipa, Mega Charts, ChartMogul |

### Niveau 3 : par module, sur données existantes

| # | Point | Origine | Module |
| --- | --- | --- | --- |
| 14 | **Aperçu à droite sur Espace** (fiche animal : espèce, race, âge, propriétaire, prochain rendez-vous), qui suit la sélection | Linear, Terabit | Patients, Agenda |
| 15 | **Problèmes en cours en pastilles** sous le nom de l'animal (allergies et maladies chroniques déjà saisies), et **récemment consultés** | VetBasic, Vesper | Patients |
| 16 | **Une colonne par vétérinaire** avec son nombre de patients, créneaux bloqués hachurés, « + » au survol d'un créneau libre, heure actuelle dans la marge | Excited, Pietrasiak | Agenda |
| 17 | **Frise des soins du jour** (fait, dans 2 h, en retard) et **doses du jour en n/m** par animal hospitalisé | Pillio, Happy Tails | Soins & hospitalisation |
| 18 | **Groupes comptés** (En retard, Aujourd'hui, Demain), **sélection multiple** avec X et une barre d'actions flottante pour marquer plusieurs rappels faits | Panze, Linear | Rappels |
| 19 | **Stock bas en mots** (« 2 boîtes restantes ») avec « Commander » sur la ligne, et **bandeaux d'échéance** pour les péremptions proches | Schedulo, Pillio, Fleety | Produits |
| 20 | **Carte principale de caisse** qui porte le chiffre et ses actions (Encaisser, Clôturer), recettes par source avec une phrase de constat, **filtre vétérinaire partagé** par tous les widgets | iBanko, Clinexa, Shakuro Analytics | Finances |
| 21 | **Options d'affichage** : colonnes affichables en pastilles, regroupement, tri | Linear | Patients, Finances, Produits |
| 22 | **Palette aplatie** : taper « rappel » propose directement « Créer un rappel vaccin pour Rifka » quand un dossier est ouvert. Elle ne fait **jamais** avancer une visite : Flux reste le seul endroit pour ça | Linear, TalentOS | Coque |
| 23 | **Carte d'affluence** (heure × jour) et **charge du jour par vétérinaire** (« 6/8 », surcharge en rouge) | Schedulo | Tableau de bord (vue Analyse) |
| 24 | **Résultats d'analyse avec leur interprétation en mots** et constantes min–max par jour | Shakuro, Xenity | Dossier, hospitalisation |

### Écarté, et pourquoi

- **Le verre et le flou de fond** (Paperpillar) : du coût de rendu sans gain de lecture.
- **L'anatomie en 3D** (Shakuro) et **le radar** (Mega Charts) : décoratifs, ils n'aident pas à décider.
- **Les grands aplats de couleur et les dégradés** (Nixtio, Clinexa, iBanko) : ils contredisent Premium.
- **L'avatar du propriétaire avec la pastille de l'animal** (Nixtio) : agréable, mais faible valeur.
- **L'indicateur d'état du réseau en en-tête** (TalentOS) : il relève de la phase 4, chantier séparé.

---

## 4. Cadrage du thème optionnel « Clean »

Premium reste le thème par défaut. Clean s'active dans Paramètres, Apparence, à côté de Premium. Le mouvement et les mécanismes (sections 1 et 3) sont communs aux deux thèmes : Clean ne change que l'apparence.

### Jetons

| Jeton | Premium aujourd'hui | Clean proposé |
| --- | --- | --- |
| Cadre de la fenêtre | #F5F5F5 | #EEEEEF (luminance 94) |
| Feuille de travail | panneaux blancs sur le cadre | une seule feuille #FAFAFA (luminance 98), posée à 8 px du bord, coins de 12 px |
| Séparation des sections | filets gravés doubles (clair et ombre) | un seul filet #EBEBEB en 0,5 px sur écran rétina, 1 px sinon |
| Panneaux dans la feuille | encadrés | non encadrés : des sections séparées par un filet, sans boîte |
| Survol | variable selon les composants | un seul palier : #F0F0F0 en clair, +4 de luminance en sombre |
| Sélection | gris | teinte d'accent très légère (chroma 6) |
| Texte | #292929, #5D5D5D, #7F7F7F | les mêmes, plus un quatrième niveau #A6A6A6 réservé au désactivé et aux indications de saisie |
| Accent | noir #191919 en clair, violet en sombre | inchangé |
| Ombres | aucune au repos | aucune au repos ; menus et aperçu : la pile d'ombres douce de Linear |
| Sombre | #151515, #1E1E1E | paliers de luminosité : feuille 6, survol 10, flottants 10 à 13, sans ombre |

### Densité

| Élément | Premium | Clean |
| --- | --- | --- |
| Ligne de liste | variable (44 à 52 px) | 40 px, avec une option « compacte » à 32 px |
| Texte de ligne | 13 à 14 px | 13 px en 500, métadonnées 12 et 13 px en **450** |
| Marges des sections | 20 à 24 px | 16 px |
| Écart entre les rangées du tableau de bord | 48 px | 32 px |
| Navigation latérale | 32 à 34 px | 28 px |

### Rayons

| Élément | Premium | Clean |
| --- | --- | --- |
| Panneaux | 0 (coins droits) | sans objet (sections non encadrées) ; feuille et flottants à 12 |
| Contrôles et boutons | 8 | 8 |
| Survol de ligne | variable | pastille inset de 8 |
| Pastilles d'état | rayon plein | rayon plein |

### Typographie et identité

- Mêmes polices : Geist pour l'interface et Space Grotesk pour les titres et les grands chiffres. Les mascottes sont gardées.
- Une seule variante possible, à valider : dans Clean, les titres de section passeraient en Geist 600 et Space Grotesk ne servirait qu'aux grands chiffres, pour se rapprocher de l'esprit de Linear.

### Ce que demande la mise en œuvre (pour plus tard)

- **Le réglage existe déjà :** `normalizeVisualStyle` accepte « classic » et « premium ». On y ajoute « clean », avec un fichier `clean.css` qui redéfinit les mêmes variables que `premium.css`.
- **Les tests de charte :** les garde-fous `dashboard-charter` et `type-scale` doivent accepter le nouveau thème.
- **Les captures :** il faudra des captures avant/après des deux thèmes, en clair et en sombre, pour chaque module touché.

---

## 5. Ordre de greffe proposé

1. **Le socle** (points 1 à 6), en un seul chantier.
   - **Pourquoi d'abord :** il ne change aucun écran en profondeur mais rend toute l'app plus rapide au toucher, et c'est le prérequis des étapes suivantes.
   - **Vérification :** captures avant/après sur trois listes.
2. **Le tableau de bord** (points 7 à 13), en commençant par le widget « Maintenant ».
3. **Patients** (14, 15, 21).
4. **Agenda** (16).
5. **Soins & hospitalisation** (17, 24).
6. **Rappels** (18).
7. **Produits** (19).
8. **Finances** (20).
9. **Le thème Clean**, une fois les mécanismes en place, pour qu'il ne porte que l'apparence.
