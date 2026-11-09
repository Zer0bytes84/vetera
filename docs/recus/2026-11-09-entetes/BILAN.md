# En-tête de l'app et en-têtes de pages (9 novembre 2026)

Tableau de bord inchangé (rangée de bienvenue et widgets). Vérifié dans le navigateur, quatre thèmes (Clean/Premium × clair/sombre), 12 pages chacun : `apres/`. « Avant » : Clean clair seulement (`avant/`).

## A. Barre du haut
Gauche : icône slideout, puis le fil d'Ariane « Page : section » (13 px, gris, section en gris plus foncé). Dans un dossier : « Patients : Rex », « Patients » cliquable (retour à la liste). Tableau de bord : « Tableau de bord » seul. Droite : recherche ⌘K (largeur inchangée), séparateur fin, +, thème, assistant, notifications, séparateur existant, avatar. L'icône de recherche compacte est supprimée (fenêtre minimale 1024 px).

Mécanique : chaque page publie son titre et sa note via `usePageCrumb` (`src/modules/shell/page-crumb.ts`) ; la barre les lit (`header-breadcrumb.tsx`). Le texte garde donc les notes dynamiques (« 1 visite aujourd'hui », « 5 références · 38 130 DA en stock »).

## B. Pages
Rangée de titre supprimée partout sauf au tableau de bord ; `pt-8` retiré : la page démarre par sa première bande. Le bouton d'action principal est dans la **première bande grise** (« Chiffres clés »), à droite, en pilule complète (`SectionCards` → prop `actions`) : Patients, Agenda, Rappels, Équipe, Produits, Finances (Analyse + Nouvelle facture/écriture), Soins (Planifier un soin), Documents.

## Écarts à connaître
- **Hospitalisation** et **Flux** n'ont pas de bande : « Admettre un patient » est à droite de la rangée d'onglets ; Flux garde son « Planifier un soin » existant.
- **Documents** hors bibliothèque (assistant, modèles, note ouverte) : pas de bande, les boutons gardent une rangée fine à droite (ils servent à revenir à la bibliothèque).
- Dossier patient : l'en-tête d'identité (Rex, ID, statut) est conservé ; ce n'est pas la rangée « Page : section ».
- « Avant » capturé en Clean clair seulement. Cartes, tableaux, données : non touchés.
