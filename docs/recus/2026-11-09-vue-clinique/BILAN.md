# Vue clinique : habillage aligné sur le reste (9 novembre 2026)

Seul l'habillage change ; aucune donnée ni fonctionnalité. Vérifié dans le navigateur, quatre thèmes (`avant/`, `apres/`).

- **Cause** : des règles héritées de `premium-workspace.css` et `clean.css` (cibles `.clinical-module`, `.visit-flow-card`) redessinaient chaque bloc en vieille carte encadrée et écrasaient les bandes. Supprimées.
- **Bandes grises avec rangée d'en-tête** pour tous les blocs : Maintenant, Planning des visites, Actions à suivre, Suivi des patients, Trésorerie, Tendances (tuile d'icône trait fin, titre, sous-titre, actions à droite). Tendances passe de carte repliable à bande ; son bouton Réduire/Explorer devient une pilule.
- **Cartes blanches** (`Panel` du design system) à l'intérieur ; échelle 12 entre cartes d'une même bande, 24 entre bandes (16 avant) ; colonnes côte à côte de même hauteur.
- **Boutons en pilule** : Ouvrir Flux, Réduire/Explorer, sélecteur 30/90 jours.
- **Chiffres** de totaux à 24 px, libellé 12 px dessous, comme les cartes de chiffres clés.
- **Maintenant** : le commutateur de vue (Vue d'ensemble / Journée clinique) reste à côté d'Ouvrir Flux.

Limite : les filtres segmentés internes (Toutes / À recevoir…) gardent leur style actuel, déjà celui du commutateur segmenté des autres écrans Clean.
