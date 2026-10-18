# Audit design, phase 3 : composants communs et revue des dialogues

Aucun commit. Vérifications : `npm run typecheck` 0 erreur, ESLint 0 erreur 0 avertissement, Vitest 116 fichiers et 906 tests réussis (4 nouveaux). Captures : `avant/` et `apres/`, mêmes 26 noms, thème clair Premium, 1440 px. Thème sombre contrôlé par mesure (champs, onglets).

## A. Composants communs

### En-tête de page (`src/design-system/patterns/page-header.tsx`)
Tuile icône, titre 24 px, sous-titre 13 px, actions à droite. Appliqué à Patients, Agenda, Clinique, Rappels, Documents, Produits, Finances, Équipe, Soins, Hospitalisation, Dossier patient, Paramètres et Analyse financière. Chaque page garde ses actions, seulement rangées dans l’en-tête.

### Indicateurs (`src/components/section-cards.tsx`)
Chaque carte déclare la nature de son chiffre : variation, taux, nombre ou écart. Flèche seulement pour une variation ou un écart, couleur selon le sens (bon, mauvais), pourcentage masqué quand la base vaut zéro. Corrige « +2 % sous le seuil » (2 produits), « +100 % » fixes de Clinique et Finances. Mêmes règles sur le tableau de bord. Soins utilise le composant commun ; les anciennes règles `.care-summary` sont supprimées. Une bande de 2 ou 3 indicateurs occupe toute la largeur (avant : colonne vide en Premium).

### Onglets (`src/design-system/tabs.css`)
Deux variantes, choisies par `data-tabs-style` :
- **navigation** : soulignement 2 px #292929, texte 13 px, sélection #292929. Sections de la Clinique, Dossier / Historique, dossier clinique du patient (une seule ligne défilante au lieu de la grille 4 × 2), onglets Produits, états des Rappels (page et panneau), administration des licences.
- **segmenté** : fond #F5F5F5, élément actif blanc. Périodes du tableau de bord, vues de l’Agenda et filtres du planning, état des consultations, Factures / Journal et filtres du journal, filtres Documents, origine des rappels, filtres et affichage des Soins, sous-vues de l’Hospitalisation, filtres des modules cliniques, notifications, graphiques financiers, sous-vues du stock.

`TabsList` reçoit `tabsStyle` ; sans précision, `line` donne navigation et la valeur par défaut donne segmenté. Les icônes d’onglets prennent la couleur du texte. Contrôle à l’écran : 0 barre non rattachée sur les 11 pages, un seul élément actif par barre, texte 13 px partout.

### Champs de formulaire (`src/design-system/fields.css`)
Un style pour texte, nombre, date, heure, recherche, liste, liste native, combobox, groupe de champ et zone de texte : bordure 1 px #F2F2F2, plus foncée au survol, fond blanc, rayon 8 px, 36 px dans les pages, 40 px dans les dialogues et formulaires. Les zones de texte gardent leur hauteur. Les sélecteurs de date et de patient (`data-field`) suivent le même style. Mesuré : un seul style de champ par page et par dialogue.

### ErrorState (`src/design-system/patterns/error-state.tsx`)
Icône, message 13 px #5D5D5D, bouton « Réessayer », sans cadre propre (il prend celui de sa section). Remplace : lignes rouges de l’Agenda (soins et séjours), Soins, Rappels (page et panneau), widget Rappels médicaux (via `WidgetShell`), Hospitalisation, séjours du dossier patient, paramètres de facturation, registre des documents, approvisionnements. Les erreurs de saisie dans les formulaires restent en rouge : ce sont des alertes, pas des erreurs de chargement.

## B. Dialogues

- **Titres 24 px** (`src/design-system/dialogs.css` et composants de base) pour Dialog, AlertDialog, Sheet, Drawer ; description 13 px #5D5D5D. 12 surcharges de taille retirées chez les appelants (t-18, text-base, text-lg, text-2xl). Marge intérieure des dialogues simples : 24 px au lieu de 16.
- **« requis » gris 12 px** à la place des puces rouges « Obligatoire » (Nouveau patient) et des autres marques (« * », « (obligatoire) ») : Nouveau produit, Ajouter un membre, Planifier un soin, Admission, Nouvel emplacement, Ajouter un vaccin, annulation de facture, administration. « (Opt.) » retiré.
- **Puces d’état** « Nouveau contact » et « Animal à identifier » : neutres (#F5F5F5, #5D5D5D) au lieu d’orange et bleu.
- **Placeholders explicites** : « Nom de famille », « Prénom », « Nom de l’animal », « Numéro de mobile », « Adresse e-mail », « Prénom et nom », « Numéro de téléphone », « Au moins 6 caractères ». Constantes cliniques préfixées (« Ex. 38,5 », virgule décimale). « Ex: » et « ex: » deviennent « Ex. », « ... » devient « … ». Placeholders ajoutés là où il n’y en avait pas (Soin, Note, Motif d’admission, numéro de lot, fabricant). Tiret cadratin retiré d’un exemple d’hospitalisation.
- **Libellés** : « Stock minimum », « Prix d’achat (DA) », « Prix de vente (DA) », « (facultatif) » partout.
- **Nouveau rendez-vous** : la recherche rapide reste en tête ; « Client existant » et « Patient » sont repliés sous « Rechercher par propriétaire » (bouton, fermé à chaque ouverture). Tous les chemins restent disponibles. Indication obsolète « Format français : JJ/MM/AAAA » remplacée par « Choisissez le jour dans le calendrier. »

Dialogues mesurés à l’écran (titre 24 px, description 13 px, champs uniformes, 0 taille hors échelle, 0 texte tronqué) : Nouveau rendez-vous, Nouveau patient, Ajouter un membre, Nouveau produit, Nouvelle facture, Nouvelle écriture, Planifier un soin, Admission d’un patient, Ajouter un vaccin, Exporter le dossier en PDF. Les autres dialogues reçoivent les mêmes règles par les composants de base.

## Défauts corrigés en chemin

1. **Nouveau rendez-vous, « Aucun dossier trouvé »** avec un patient déjà choisi. Cause : choisir un dossier écrit « patient + propriétaire » dans la recherche rapide, et le filtre cherchait cette chaîne d’un bloc alors que l’espèce et la race s’intercalent dans l’index. Le défaut touchait aussi un clic sur un résultat. Correction : chaque mot doit être présent, dans n’importe quel ordre (`src/modules/agenda/quick-search.ts`, test `tests/modules/agenda/quick-search.test.ts`). Vérifié depuis le dossier de Bella : la carte du dossier s’affiche, sélectionnée.
2. **Choix de l’heure** : 12:00 et 18:00 apparaissaient dans deux groupes (Matin et Après-midi, Après-midi et Soir). La borne de fin n’est plus incluse, sauf pour le dernier groupe.
3. **Case à cocher invisible** (« série récurrente ») : bordure #F2F2F2 sur fond clair. Les cases et boutons radio non cochés ont une bordure lisible.
4. **Filtre Documents** : « Épinglés » coupé au bord de la colonne. Variante segmentée pleine largeur.

## Limites

- Données SQLite (soins, séjours, rappels médicaux, factures) : vues dans le navigateur, donc en état d’erreur sur les captures. C’est justement l’ErrorState qu’on y voit. À revoir avec `npm run tauri:dev` pour les listes remplies.
- Agenda : les erreurs des soins et des séjours restent deux lignes ErrorState voisines, pas un bandeau unique (il faudrait remonter l’état des deux modules).
- Rappels : « Types » reste parmi les onglets d’état (le déplacer serait un changement de place, hors règle d’or).
- Widgets du dossier patient (RDV aujourd’hui, Actions à suivre, Dernière consultation) : non convertis au composant d’indicateurs commun ; leur rendu est proche mais leur code reste séparé.
