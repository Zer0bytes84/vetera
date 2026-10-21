# Module Produits : stock en mots, Commander et bandeaux d'échéance

Date : 21 octobre 2026. Commit local, aucun push.

## Indicateurs : chaque chiffre dit ce qu'il compte

- **Valeur du stock.** Le badge vert « Actif valorisé », accompagné d'une flèche de hausse, devient « Au prix d'achat », c'est-à-dire la façon dont la valeur est calculée. Aucune hausse n'était mesurée.
- **À réapprovisionner.**
  - Avant : « 2 », « 2 sous le seuil », puis « Priorité : » suivi du premier produit de la liste, qui n'était pas une vraie priorité.
  - Maintenant : les produits les plus en manque par rapport à leur seuil, « Perfuseur stérile : 4 sur 10 · Vaccin trivalent félin : 3 sur 5 ».
- **Péremptions à surveiller.**
  - « 1 lots à risque » devient « 1 produit sous 90 jours ».
  - Le détail donne le produit le plus proche et sa date en jours : « expire le 30 nov. 2026, dans 40 jours ».
  - La mention « Rotation FIFO requise sous 90 j » est retirée : elle ne correspondait à aucun calcul.
- **Catalogue actif.**
  - « Traçabilité active » est retirée : rien ne la mesurait.
  - Il reste ce que l'on sait : nombre de mouvements enregistrés, produits avec et sans suivi de stock.

## Catalogue (point 19 de l'étude)

- **Stock bas en mots** sous l'état : « 3 doses restantes, seuil 5 », « Plus rien en stock, seuil 5 ». L'unité prend un s au-delà de un.
- **« Commander » sur la ligne** de tout produit sous son seuil.
  - Le bouton ouvre Approvisionnements avec une commande préparée pour ce seul produit, avec la quantité qui manque et son dernier prix d'achat.
  - C'est la fonction existante « Depuis les alertes », réduite à un produit. Le brouillon reste à vérifier et à confirmer, comme avant.
- **Bandeaux d'échéance** au-dessus du tableau, pour les produits périmés (en rouge) ou qui expirent sous 90 jours (en ambre).
  - Exemple : « Vaccin trivalent félin · Expire le 30 nov. 2026, dans 40 jours · 3 doses à cette échéance ».
  - « Voir les lots » ouvre la fiche du produit.
  - Trois bandeaux au plus, puis « Tout afficher », qui filtre la liste. Ils se masquent quand le filtre « À surveiller » est déjà actif.

## Écart et vérification

- **« Commander » n'est vérifié qu'à moitié.** Dans le navigateur, le clic ouvre bien l'onglet Approvisionnements, mais cet onglet n'existe que dans l'application de bureau (`apres/produits-commander`). La commande préremplie reste à vérifier dans `npm run tauri:dev`, avec au moins un fournisseur actif.
- **Les seuils et la fenêtre de 90 jours** sont ceux déjà en place (`stock-alerts.ts`). Rien n'a changé dans les règles.

## Captures

Données de démonstration, 1440 × 900.
- `avant/` : indicateurs et catalogue.
- `apres/` :
  - catalogue en clair et en sombre ;
  - l'onglet ouvert par « Commander » dans le navigateur.

## Vérifications

- Typage : 0 erreur.
- ESLint : 0 problème.
- Vitest : 148 fichiers, 1 112 tests verts, dont 3 nouveaux (`tests/domain/stock-words.test.ts`).
