# Panneau de l'assistant : dictée guidée alignée, icône d'espèce du patient

Date : 24 octobre 2026. Commit local, aucun push.

## Ce qui change

**Bords communs** (Clean) : la bulle de la rubrique (S · Motif et antécédents), le libellé « Section 1/4 », le champ, les textes « Précédent » et « Passer cette rubrique », le bloc « Dictée de consultation » et le bouton « Continuer » partagent les deux mêmes bords, ceux de la colonne du panneau. Mesuré à 1440 px : 941 et 1 420 px pour tous.

Ce qui les décalait :
- les cartes d'accueil et de dictée, sans bordure ni fond dans Clean, gardaient un rembourrage de 12 à 14 px ;
- la bulle s'arrêtait à 92 % de la largeur ;
- la zone qui défile gardait 4 px de marge plus la barre de défilement. La barre est maintenant masquée ; on fait toujours défiler à la molette ou au pavé tactile.

**« Précédent » et « Passer cette rubrique »** : leurs mots se posent sur les bords de la colonne, et leur fond au survol déborde de 8 px de chaque côté.

**Le champ** :
- un seul liseré, celui de la charte : le halo de 3 px des champs (`fields.css`) est retiré pour ce champ ;
- au focus, le même liseré passe au gris discret ;
- coins de 10 px, comme les cartes ;
- plus de poignée de redimensionnement : la hauteur est fixe.

**Icône d'espèce du patient** :
- c'est la même petite icône au trait fin que dans la liste des patients : chien, chat, lapin, rongeur, oiseau, poisson, tortue, ou une patte par défaut ;
- elle est placée à côté du nom du patient dans le sous-titre de l'en-tête (« Rex · Traitement local ») et dans le pied (« Patient : Rex ») ;
- elle fait 14 px, dans le gris discret, alignée sur le texte ;
- les deux écrans lisent la même table d'espèces, qui vit maintenant dans `src/lib/species-icon.ts`.

La mascotte reste uniquement dans l'en-tête du panneau.

## Ce qui ne change pas

Textes, texte indicatif, boutons Dicter et langue, compteurs, navigation des rubriques, dictée, validation SOAP et cas similaires : inchangés. Seules les variables de la charte sont utilisées.

## Point connu, non traité ici

À 900 px de haut, quand le bloc « Modèles IA sur cet ordinateur » est affiché, le bas du champ passe sous le bord de la zone qui défile jusqu'à ce qu'on fasse défiler. C'était déjà le cas avant.

## Captures

Dossier d'un patient ouvert, panneau ouvert par J, champ actif, en clair et en sombre :
- `panneau-*` : le panneau entier ;
- `champ-*` : le détail de la bulle, du champ et de la navigation.

## Vérifications

- Typage : 0 erreur. ESLint : 0 problème.
- Vitest : 158 fichiers, **1 231 tests verts** (même compte).
- Non vérifié dans la fenêtre Tauri (WebKit).
