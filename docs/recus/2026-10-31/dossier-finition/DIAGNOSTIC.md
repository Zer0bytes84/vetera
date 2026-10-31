# Dossier patient : diagnostic avant finition

Patient observé : Kejounti, ID-0010 (`mqh9hyyisrbmj76o52q`), sur une copie de la base réelle, thème Clean, fenêtre de 1400 × 774 points, en clair et en sombre. Les captures « avant » sont dans `avant/`.

La question à laquelle l'écran répond d'abord : **« À qui ai-je affaire, et que dois-je savoir avant de le toucher ? »** Le nom, la référence et l'allergie doivent donc être lus en premier. Tout le reste vient après.

## 1. Hiérarchie générale

1. **Deux titres de même taille se disputent le haut.** « Dossier patient » (24 px, avec son icône) et le nom « Kejounti » (24 px, gras) ont le même poids. Le sous-titre répète en plus le nom du patient. Le titre de page est l'en-tête commun à toutes les pages ; je n'y touche pas, mais l'identité doit gagner par la graisse et le contraste, pas par la taille.
2. **La zone sécurité flotte hors du cadre.** L'allergie est un bandeau collé au bord des cartes. En dessous, « Traitement en cours » et « Contention » sont posés à nu sur le fond de page, sans carte. Leur bord gauche (388 px) ne s'aligne ni sur le contenu des cartes (423 px) ni sur rien d'autre. C'est le seul bloc de la page sans cadre, alors qu'il porte l'information la plus critique.
3. **Le plus grand chiffre de l'écran est un zéro.** Les deux cellules « RDV aujourd'hui » et « Actions à suivre » affichent un « 0 » à 24 px, en gras et à l'encre pleine. Ce sont les deux chiffres les plus forts du haut du dossier, et ils ne disent rien.
4. **Rythme vertical irrégulier.** L'écart entre les blocs varie de 16 à 24 px, et la zone sécurité colle aux cartes voisines sans marge propre.

## 2. Entête

5. **Une rangée de pastilles arc-en-ciel.** Sur une seule ligne : statut vert, espèce orange, sexe bleu, et en plus « Stérilisé » vert quand il s'applique. L'espèce et le sexe sont des faits, pas des états. Ils n'ont pas à porter de couleur. Le statut est la seule pastille qui mérite une teinte.
6. **Un point qui palpite en permanence.** La pastille « En bonne santé » porte un `animate-ping` qui ne s'arrête jamais. Un dossier au repos ne doit pas bouger, et la palpitation suggère une urgence qui n'existe pas.
7. **Avatar.** Une tuile de 72 px, teintée orange par l'espèce, avec une ombre intérieure : c'est l'icône dans un carré teinté. Elle prend plus de place que l'information qu'elle porte.
8. **Sept boutons en mur.** À 1400 px, les actions passent à la ligne sous l'identité. Elles ont toutes le même contour et ne sont séparées de l'identité par rien. L'entête se lit comme une barre d'outils posée sur une fiche. Ordre et nombre ne bougent pas ; il manque une séparation nette entre « qui » et « quoi faire ».
9. **La race est orpheline.** « Malinois » tombe seul sur sa ligne, sous le propriétaire, alors qu'il décrit l'animal et devrait suivre son nom.
10. **Mode sombre : le bouton primaire devient indigo** (#3b1fe5). Vérification faite, c'est l'accent `--clean-accent` du Clean sombre, voulu par le système (Linear sombre), qui sert aussi au bouton flottant. Je le garde : le dossier suit le système, il n'a pas à en sortir.

## 3. Zone sécurité

11. **Une barre gauche de 4 px et une étiquette « ALLERGIE » en capitales espacées.** Ce sont deux tics de tableau de bord. L'alerte doit sa force à son aplat rouge et à sa position, pas à un ornement.
12. **Traitement et contention en gris moyen sur gris.** Les valeurs sont en `--medical-muted` (13 px), les libellés en gris plus pâle. « Aucun » et « Non renseignée » sont lus au même niveau que « Amoxicilline 250 mg… » le serait. Une absence devrait être plus pâle qu'une valeur.

## 4. Repères

13. **Icônes dans des carrés teintés** (bleu, ambre) en tête de cellule, plus une flèche ↗ dans chacune des quatre cellules.
14. **La courbe de poids est un dégradé indigo** (#6366f1). C'est un dégradé et un violet, deux interdits, et c'est la seule teinte de donnée de la page.
15. **« Écart à vérifier »** est une pastille cerclée qui se lit comme un bouton.

## 5. Synthèse

16. **« ÉVALUATION » et « PLAN » en capitales espacées**, encore.
17. **Le type de visite « ● Consultation » est une pastille verte à point**, le même dessin que l'état « Terminé ». Le type de visite se lit donc comme un état.
18. **La colonne Prévention est vide sur 300 px.** Une ligne, « Aucun rappel prévu », puis un trou de la hauteur de la dernière consultation (le *panel-void* du guide).
19. **Le motif (« Ordonnance ») est en 16 px moyen, mais son gris** le met au même niveau que les métadonnées.

## 6. Chronologie

20. **Des pastilles cerclées bleu ciel sur chaque événement**, avec une bordure et une ombre. Toutes les consultations ont le même rond bleu, qui ne porte donc aucune information. C'est l'icône dans un cercle teinté, répétée sur toute une liste.
21. **« ● Terminé » en pastille verte sur neuf lignes sur dix.** L'état normal crie autant que l'exception. « Planifié » (bleu) se perd dans la série.
22. **« Consultation » en gras sur chaque ligne.** Le libellé le plus fort de l'événement est le moins informatif ; le motif (« Ordonnance », « Consultation rapide / Note médicale ») passe après lui, en gris.
23. **« Note clinique » est à 1300 px de son contenu**, au bord droit. Pour aller avec la date il faut traverser toute la largeur.
24. **Le fil est trop pâle** (`--medical-border`, #f2f2f2 sur blanc) : il disparaît presque, et les événements semblent flotter.
25. **Le titre « Chronologie » est séparé de la synthèse par un filet seulement**, au même niveau que « Dernière consultation ». La chronologie est la moitié du dossier ; elle n'a pas de début franc.

## 7. Informations permanentes

26. **Les valeurs sont plus grandes que tout le reste du bloc** : « À compléter » et « 16 juin 2026 » sont à 16 px ou plus, alors que les noms de la synthèse sont en 13-14 px.
27. **« Modifier les informations » est décalé de 16 px** par rapport à sa colonne (bouton fantôme avec son propre retrait).
28. **Quatre colonnes de hauteurs inégales** : une colonne de 2 lignes à côté d'une colonne de 6, d'où de grands vides.
29. **« 4/6 » en pastille verte** pour un dossier incomplet : le vert dit « bien » alors qu'il manque deux éléments.

## 8. Typographie et police

30. La police mesurée dans la page est **Inter Clean**, la police propre au thème Clean (`clean.css`). Geist n'est que la police de Premium sans Clean. Je ne force pas de police : le dossier suit le thème.
31. Tailles relevées : 12, 13, 14, 16 et 24, toutes dans l'échelle. Le problème n'est pas l'échelle mais la graisse et le gris : quatre gris différents portent du texte (`#292929`, `#5d5d5d`, `#7f7f7f`, et le gris de pastille).

## Ce que je change, par ordre d'effet

1. **La zone sécurité devient une carte** alignée sur les autres : l'allergie en bandeau rouge plein en haut, sans barre gauche ni capitales, puis traitement, contention et antécédents en colonnes. Une absence est en gris pâle, une valeur à l'encre.
2. **Couleur seulement sur ce qui est un état.** Espèce, sexe et stérilisation deviennent des étiquettes neutres. Le point de statut ne palpite plus. Le type de visite est neutre. Dans la chronologie, les états terminés (« Terminé », « Validée », « Administré », « Enregistrée ») deviennent du texte gris, et seules les exceptions gardent leur pastille.
3. **Chronologie** : des repères neutres et plus petits, un fil visible, le motif à l'encre et « Consultation » en gris, et une chronologie qui s'ouvre comme une section.
4. **Repères** : les zéros en gris, les icônes sans carré teinté, la courbe de poids à l'encre sans dégradé.
5. **Entête** : les actions sous un filet, comme une barre propre à la fiche ; la race suit le nom.
6. **Synthèse et informations permanentes** : étiquettes en casse normale, valeurs ramenées à 14 px, bouton aligné, complétude neutre tant qu'elle est incomplète.

Hors périmètre, constaté : le toast de licence couvre le bas de chaque capture.
