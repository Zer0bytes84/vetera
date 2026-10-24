# Session UI : en-tête, barre latérale, actions rapides, liste des patients

Date : 24 octobre 2026. D'après le retour terrain d'Aissa (23 et 24 octobre) et tes retours en cours de session. Commit local, aucun push.

## Analyse REA (Référence, Écart, Action)

| Zone | Référence | Écart constaté avant | Action |
| --- | --- | --- | --- |
| En-tête | Linear et les logiciels usuels : compte en haut à droite, recherche visible au centre | Recherche réduite à une icône ; compte caché dans un menu « réglages » ; avatar dans la barre latérale | Champ de recherche centré de 32 px, avatar seul à droite qui ouvre le menu du compte |
| Barre latérale | Charles Postiaux (sidebar sombre sur thème clair) : pages seules, pied réduit à « Settings » sans filet ; densité de Linear | Pied chargé (compte, rôle) ; quatre « Accès rapides » permanents ; aucune sous-page | Pied réduit à l'icône Paramètres, sous-pages repliées sous leur page, raccourcis déplacés dans le « + » |
| Actions rapides | Un geste, aucune place au repos | Quatre lignes permanentes en bas de la barre | Bouton « + » flottant, menu au clic |
| Patients | Tailwind Plus, tableau « avec avatars et contenu sur plusieurs lignes », filets gris entre les lignes | Grand vide à droite (colonne d'actions invisible au repos), statuts pâles, survol peu lisible en sombre | Tableau pleine largeur, contenu sur deux lignes, badges teintés, « Ouvrir » explicite |

## La mécanique du « + » (à trancher à l'écran)

Le bouton est rond (44 px), en bas à droite de la feuille, toujours au même endroit. Un clic ouvre le menu : Rendez-vous (N), Consultation, Patients (⌘ K) et Soin. Le menu s'ouvre sans animation, comme tous les menus ; le « + » tourne en « × » en 150 ms.

Deux modes, et l'interrupteur est dans le menu lui-même (« Masquer pendant le défilement ») :

1. **Toujours visible** (par défaut).
   - Avantage : prévisible, on ne le cherche jamais.
   - Risque : il passe au-dessus du contenu pendant le défilement. Il ne masque jamais la fin d'une page : une réserve de 56 px en fin de contenu laisse la pagination et les derniers boutons sortir de dessous.
2. **Masquer pendant le défilement.**
   - Le « + » descend sous le bord quand on fait défiler vers le bas, et revient quand on remonte ou en fin de page.
   - Avantage : zéro recouvrement pendant la lecture.
   - Risque : il faut parfois remonter d'un cran pour le retrouver.

Le choix est mémorisé sur ce poste (`baitari.quick-actions.retract`).

## Ce qui change, point par point

### 1. En-tête

- **Recherche** : un champ blanc de 32 px, à la hauteur des boutons voisins, centré sur l'en-tête. Il affiche « Rechercher un patient, une page… » et ⌘ K, puis ouvre la même palette.
  - En dessous de 820 px de large, il redevient l'icône. Il ne déborde ni n'écrase le fil d'Ariane.
- **Avatar** : en haut à droite, 28 px, sur la marge de 24 px. La bulle donne le nom et le rôle.
  - Son menu reprend toutes les actions de l'ancienne carte de la barre latérale et de l'ancien menu « Paramètres et compte » : Mon profil, Notifications (avec le compte), Finances, Paramètres (⌘ ,) et Déconnexion.
- Premium reçoit le même en-tête.

### 2. Barre latérale

- **Pied** : l'icône Paramètres seule, alignée au pixel sur la colonne d'icônes (centre à 35 px), sans filet. L'espacement seul la sépare de la navigation.
- **Sous-pages**, repliées par défaut. Elles se déplient quand on ouvre leur page, ou via le chevron qui paraît au survol :
  - Soins & hospitalisation : Soins, Hospitalisation (onglet ouvert directement et marqué dans la barre) ;
  - Finances : Analyse financière.
- **Gestion du cabinet** reste toujours affichée, à ta demande.
- **Rythme** : lignes de 28 px (jeton inchangé) sur un pas de 34 px, 28 px entre les groupes. La navigation occupe la colonne au lieu de se tasser en haut.
- **Barre réduite** : toutes les pages et Paramètres restent en icônes.

### 3. Actions rapides

Le bouton « + » flottant décrit ci-dessus. Les quatre raccourcis sont conservés, avec les mêmes actions. Les accès rapides quittent la barre latérale.

### 4. Liste des patients

Refaite à ta demande dans l'esprit Tailwind Plus :

- **Colonnes** : Patient, Propriétaire, Statut, Dernière visite, Prochain rendez-vous, Ouvrir. Le tableau occupe toute la largeur, sans vide à droite.
- **Patient** : l'avatar d'espèce, le nom et un badge d'alerte (allergie en rouge, affection chronique en orange, « +n » au-delà). Dessous : espèce, race, sexe et âge.
  - L'âge n'est affiché que s'il est connu : fini la colonne de « Non renseigné ».
- **Icônes d'espèce** : avatars ronds teintés, icônes Lucide (chien, chat, lapin, rongeur, oiseau, poisson, tortue).
  - Une teinte par famille : chien orange, chat vert, NAC bleu, oiseaux et reptiles rouge.
- **Statut** : badges teintés avec liseré et point (vert, bleu, orange, gris), en couleurs de la charte (`--premium-*` mêlées à la surface). Aucune couleur codée en dur.
- **Filets** : gris clair entre chaque ligne, sur toute la largeur, lisibles aussi en sombre.
- **Affordance** : « Ouvrir › » sur chaque ligne. Au survol ou au curseur clavier :
  - la ligne prend un ton plus franc ;
  - « Ouvrir » passe en encre pleine et la flèche avance de 2 px ;
  - l'aperçu (œil, Espace ou A) apparaît.
- **Largeur réduite** : sur une feuille étroite, « Prochain rendez-vous » s'efface d'abord, puis « Dernière visite ».

## Ce qui ne change pas

- **Navigation clavier** : ↑ ↓ dans la liste, Entrée ouvre, Espace et A ouvrent l'aperçu, J ouvre l'assistant (vérifié), ⌘ K, ⌘ N, N et ⌘ ,.
- **Thèmes et mascottes** : aucun jeton de la charte modifié ; mascottes intouchées.
- **Recherche sémantique** : non touchée (modèle, index, calibrations, `DEFAULT_SEARCH_GENERATION`).
- **Aucun `transition-all`.** Les animations nouvelles ne portent que sur transform et opacité, et respectent le mouvement réduit.

## Écarts à valider

- **Menu « … » des pages de gestion retiré.** Il proposait Ouvrir, Partager et Supprimer sur Documents, Produits, Finances et Équipe, mais aucun de ces choix n'avait d'action : c'était un menu vide. Le chevron des sous-pages prend sa place.
- **Notifications dans le menu du compte.** Elles ouvrent le panneau des notifications (comme l'ancien menu de l'en-tête), et non plus la page Rappels (comme l'ancienne carte de la barre). Rappels reste dans la navigation.
- **`nav-user.tsx` et `nav-documents.tsx`** ne sont plus utilisés. Je ne les ai pas supprimés.
- **Les icônes d'espèce** ne sont refaites que dans la liste des patients. Flux, Agenda et le dossier gardent les anciennes. Les étendre sera un petit lot.

## Captures

Instance de test isolée (navigateur, licence et compte de test sur un serveur de licences local, données de démonstration), 1440 × 900 en rétina. Aucune donnée réelle n'a été lue ni modifiée. La mascotte est réglée sur « logo » des deux côtés pour comparer à l'identique.

- `avant/` : tableau de bord, en-tête, barre latérale, Patients et survol, en clair et en sombre.
- `apres/` : les mêmes vues, plus :
  - `fab-ouvert` : le menu des actions rapides ;
  - `compte-ouvert` : le menu de l'avatar ;
  - `sidebar-chevron-survol` : le chevron de Finances ;
  - `sidebar-sous-pages` : Soins & hospitalisation dépliée ;
  - `patients-survol-zoom` : l'affordance de ligne ;
  - `patients-fin-de-page` : la pagination dégagée du « + ».

## Vérifications

- **Typage** (`npx tsc -b`) : 0 erreur. **ESLint** : 0 problème.
- **Vitest** : 157 fichiers, **1 216 tests verts**, soit les 1 211 de départ et 5 nouveaux dans `tests/session-ui.test.ts` :
  - les raccourcis conservés ;
  - le pied de barre sans séparateur ;
  - les mouvements du « + » ;
  - la lecture unique de l'onglet demandé.
- **Navigateur** :
  - sous-pages dans les deux sens (Hospitalisation puis Soins) ;
  - barre réduite ;
  - en-tête étroit (1000 px) ;
  - Flux, sans défilement ajouté ;
  - Premium clair (en-têtes et pastilles non coupés).

## Note de reprise

- **Vérifié** : en navigateur (Chromium, instance isolée), en Clean clair et sombre, plus un contrôle en Premium clair.
- **Non vérifié** :
  - dans la fenêtre Tauri (`npm run tauri:dev`, WebKit) ;
  - le « + » sur Agenda et Documents avec beaucoup de contenu ;
  - le mode « Masquer pendant le défilement » au trackpad réel.
- **Prochaine étape proposée** : ta validation à l'écran, notamment le mode du « + », puis l'extension des avatars d'espèce à Flux, Agenda et au dossier.
