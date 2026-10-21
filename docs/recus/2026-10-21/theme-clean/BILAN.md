# Thème Clean

Date : 21 octobre 2026. Commits locaux, aucun push.

Clean est le troisième thème, à côté de Premium clair et Premium sombre. Le défaut reste Premium. Premium clair et Premium sombre n'ont pas changé d'un pixel (preuve plus bas). Aucun comportement, aucune fonction et aucun libellé existant ne change.

## Structure

- **Une couche de jetons au-dessus de Premium clair, sans composant dupliqué.** Clean pose `data-skin="clean"` sur la racine. Toutes ses règles sont dans `src/design-system/clean.css`, sous la seule portée `:root[data-skin="clean"]:not(.dark)` :
  - Premium clair n'a pas cet attribut, donc rien ne s'y applique ;
  - en mode sombre, Clean affiche exactement Premium sombre.
- **Aucun composant ne teste le thème.** Seuls le magasin de thème, le sélecteur et la page Paramètres connaissent la peau, et un test le vérifie.
- **Passer Clean par défaut = changer une seule valeur** : `DEFAULT_SKIN` dans `src/lib/theme-skin.ts`, de `"premium"` à `"clean"`.
  - Une installation où personne n'a choisi de thème n'enregistre aucune peau : elle suit cette valeur.
  - Un choix explicite fait dans Paramètres reste respecté.
- **Sélecteur.** Paramètres → Apparence → Affichage gagne une ligne « Thème » avec trois cartes : Premium clair, Premium sombre et Clean. Chaque carte porte une miniature de sa feuille.
  - Le choix règle la peau et le mode, puis persiste comme aujourd'hui (`theme-config` et `theme`).
  - Le mode Clair, Auto ou Sombre, le bouton soleil de l'en-tête et l'interrupteur « Style Premium » sont inchangés.
  - Vérifié au clic : Premium sombre, puis rechargement, puis Clean, puis rechargement. Le bon thème est coché et appliqué à chaque fois.

## Ce que Clean change

### Surfaces

- **Feuille et surfaces.** La feuille passe à **#FAFAFA**, y compris dans la sidebar. Les surfaces sont blanches et opaques.
- **Opacité.** Les deux éléments translucides de Premium deviennent pleins, sans flou :
  - la barre d'en-tête (blanc à 50 % avec flou de 28 px) ;
  - les en-têtes collants des tableaux.
- **Filets et survol.** Les filets gravés doubles deviennent un seul filet **#EBEBEB**, et le croisillon prolongé des cadres disparaît. Le bandeau à motif devient un fond uni **#F4F4F5**. Le survol est un seul palier **#F0F0F0**.
- **Hauteurs.** **40 px** en listes denses : la bibliothèque Documents passe de 49 px à 40 px. **32 px** en tableaux : les en-têtes passent de 38 px à 32 px, et les cellules prennent 6 px de marge haute et basse. Aucun autre espacement ne bouge.
  - Une ligne à plusieurs lignes de texte (nom, espèce et pastille d'un patient) garde la hauteur de son contenu, à partir de cette base.
- **Quatrième gris, #A6A6A6,** réservé au texte et aux icônes **désactivés**. L'élément reste net : son opacité, réduite en Premium, revient à 1. La charte vérifie qu'il n'a pas d'autre usage. Gros plan : `cote-a-cote/gris-desactive.jpg` (« Réinitialiser les filtres »).

### Sidebar

- **Libellés de section.** Petits et atténués : 12 px, #7F7F7F, en casse normale (« Espace de travail »). Le texte est le même.
- **Items.** Ils passent de 34 px à **30 px**, en 13 px et en #5D5D5D au repos. Le survol est #F0F0F0. La sélection est une teinte très légère de l'accent (#EBEBF0), au lieu de la carte blanche ombrée.
- **Inchangé :** libellés, ordre, fonctions, pastilles des accès rapides et cadre du compte (sans son croisillon).

### Icônes

- Trait de **1 px**, taille de **16 px** dans la navigation et les listes (20 px en Premium).
- Couleur atténuée (#7F7F7F) au repos, pleine (#292929) au survol et en sélection.
- La pastille d'espèce de la liste Patients passe à 28 px, avec une icône de 16 px.
- Aucune icône n'est remplacée ni ajoutée.

### Typographie

- **Polices.** Geist pour le corps, Space Grotesk pour les titres (inchangé).
- **Titres.** Graisse 600, interlettrage -0,02 em, #292929.
- **Texte courant et métadonnées.** Le texte courant est en #5D5D5D. Les métadonnées et le texte atténué sont en graisse 450, en #7F7F7F.
- **Libellés.** Les en-têtes de tableau, les sur-titres et les libellés de section passent de MAJUSCULES espacées à une casse normale, en 12 px 500.

### Widgets du tableau de bord (point 8)

- **Cartes.** Elles deviennent blanches, avec un filet de 1 px et des coins de 12 px.
  - L'en-tête de carte a 16 px de marge, son titre est en 14 px 600 et sa note en 12 px atténuée.
  - Le contenu, les calculs et l'ordre des widgets ne changent pas.
- **En-tête d'accueil.** Même contenu et même mascotte, sur une carte blanche. Le rythme est resserré (24 px au lieu de 30) et la hiérarchie alignée sur le thème. Rien n'est déplacé.
- **Commandes révélées au survol de la carte** : « Finances → », « Agenda → » et les « Voir tout → » des cartes À surveiller.
  - Elles sont invisibles au repos et apparaissent dès que la carte est survolée, à la souris seulement.
  - Gros plan : `cote-a-cote/widget-survol.jpg`. Mesure : opacité 0 sur les cinq liens au repos, 1 sur la seule carte survolée.

**Écart avec la demande, à valider.** Les cartes du tableau de bord n'ont **pas de menu ⋮** aujourd'hui. Je n'en ai pas inventé. Les commandes révélées sont les liens d'en-tête qui existaient déjà. Comme aucun menu ne peut servir de voie de secours :
- **au clavier**, elles apparaissent quand le focus entre dans la carte (Tab) ;
- **au tactile**, elles restent affichées.

Les masquer à ces deux endroits supprimerait une fonction.

« Ouvrir Flux » dans Maintenant reste toujours visible, comme décidé au point 7.

## Preuves que Premium n'a pas bougé

- **Empreinte de rendu.** C'est une empreinte calculée sur chaque élément de la page : couleurs, fonds, bordures, ombres, police, taille, graisse, interlettrage, marges, opacité, trait, flou et dimensions.
  - Je l'ai relevée **avant toute modification**, puis après. Elle est identique, au bit près :

    | Écran | Premium clair | Premium sombre |
    | --- | --- | --- |
    | Patients | 465 éléments `6f8890fa` | 464 éléments `155e0011` |
    | Tableau de bord | 670 éléments `4b2a9820` | 669 éléments `3465a8e0` |

  - Clean mis en mode sombre donne exactement les empreintes de Premium sombre.
  - Le dossier patient varie déjà d'un chargement à l'autre sans aucune modification. Il n'est donc pas comparable par cette méthode. Il est couvert par la règle suivante.
- **Charte (`tests/theme-clean-charter.test.ts`, 11 tests).** Chaque sélecteur de `clean.css` commence par `:root[data-skin="clean"]:not(.dark)`, ce qui garantit qu'aucune règle ne touche Premium. La même charte vérifie aussi :
  - les jetons (feuille, filet, survol, quatre gris) ;
  - les hauteurs de 40, 32 et 30 px ;
  - le trait de 1 px et la taille de 16 px des icônes de navigation ;
  - le gris désactivé, et rien d'autre ;
  - les commandes de widget masquées au repos et révélées au survol ou au focus, sous pointeur fin, dans Clean seulement ;
  - aucun composant forké ;
  - le défaut Premium, et la peau jamais posée en Classique ;
  - les trois thèmes du sélecteur.

## Ce qui ne change pas

- **Mascottes et identité Baitari :** le logo, les mascottes et les couleurs d'accent sont les mêmes.
- **Décision J/K :** hors de cette passe, toujours ouverte.

## Captures

1440 × 900, données de démonstration.
- `cote-a-cote/` : Premium clair à gauche, Clean à droite.
  - `tableau-de-bord`, `patients` et `dossier` : les mêmes écrans dans les deux thèmes ;
  - `sidebar` : gros plan de la sidebar dans les deux thèmes ;
  - `widget-survol` : Clean, carte au repos puis survolée ;
  - `gris-desactive` : le quatrième gris sur un bouton désactivé.
- `premium/` et `clean/` : les écrans en pleine taille, plus `clean/selecteur-de-theme.jpg` (Paramètres → Apparence, Clean coché).

## Vérifications

- Typage : 0 erreur.
- ESLint : 0 problème.
- Vitest : 150 fichiers, 1 129 tests verts, dont les 11 de la charte Clean. Les chartes existantes (survols sous pointeur fin, pas de `transition-all`, échelle typographique) passent avec le nouveau fichier.
