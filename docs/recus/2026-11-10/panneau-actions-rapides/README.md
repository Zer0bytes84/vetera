# Barre des actions rapides

Date : 10 novembre 2026. Le panneau du « + » de l'en-tête devient une barre flottante d'une seule ligne, avec sept créations dans l'ordre du parcours du patient au cabinet. Position (centré sous le bouton), habillage vitré et animation d'ouverture sont ceux déjà validés.

## Ce qui change

| | Avant | Après |
| --- | --- | --- |
| Contenu | Titre « Actions rapides » et quatre actions (Rendez-vous, Consultation, Patients, Soin) | Une ligne : **Rendez-vous, Patient, Consultation, Soin, Document, Produit, Facture**, chacune une icône au-dessus d'un libellé court |
| « Patients » | Ouvrait la recherche (⌘K) | Remplacé par **Patient** : ouvre le formulaire « Nouveau patient » (la recherche reste dans l'en-tête et sur ⌘K) |
| Largeur | 440 px | 640 px, jamais plus que la fenêtre − 32 px ; les cellules rétrécissent à parts égales, les libellés se tronquent en dernier recours |
| Raccourcis affichés | N et ⌘ K | Retirés de la barre (une icône et un libellé par action) ; les raccourcis clavier eux-mêmes ne changent pas |

## Où chaque action mène (même flux que le bouton de la page)

| Action | Flux |
| --- | --- |
| Rendez-vous | Agenda, formulaire « Nouveau rendez-vous » (inchangé) |
| Patient | Page Patients, « Nouveau patient » (même formulaire que le bouton et ⌘N) |
| Consultation | Sélecteur de consultation rapide (inchangé) |
| Soin | Page Soins, formulaire de planification (inchangé) |
| Document | Page Documents, « Page vierge » du bouton « Nouveau document » (`handleCreateNote`) |
| Produit | Page Produits, « Nouveau produit » (`handleOpenAdd`) |
| Facture | Finances, onglet Factures, « Nouvelle facture » (même brouillon vide que le bouton) |

Pour Document, Produit et Facture, la page propriétaire ouvre la création par la même fonction que son bouton ; la demande (`src/modules/shell/model/creation-request.ts`) attend dans la session si la page est encore en chargement.

## Micro-interactions (règles d'Emil Kowalski)

- **Ouverture :** transition CSS (pas de keyframes, donc interruptible) : opacité 0 → 1 et échelle 0,95 → 1 en 180 ms, `cubic-bezier(0.23, 1, 0.32, 1)`, origine = le point sous le « + » ; sortie 120 ms. Pas de rebond.
- **Survol et clavier :** fond et couleur en 140 ms ; l'icône monte d'un pixel et passe à pleine opacité. Pas de `:hover` brut (la charte d'interaction l'interdit hors pointeur fin) : le survol passe par `[data-highlighted]`, que Base UI pose aussi pour le clavier.
- **Appui :** `scale(0.96)` en 80 ms.
- **Pas d'étagement** : la barre s'ouvre souvent, rien ne doit retarder le clic.
- `prefers-reduced-motion` : fondu et couleurs seulement.
- Navigation au clavier à plat, flèches gauche/droite (`orientation="horizontal"`).

## Fichiers

- `src/lib/visual-style.ts` : les sept actions, dans l'ordre.
- `src/modules/shell/components/header-quick-actions.tsx`, `quick-actions.css` : barre, icônes, micro-interactions.
- `src/modules/shell/app-shell.tsx` : `handleQuickAction` branche chaque action.
- `src/modules/shell/model/creation-request.ts` (nouveau) ; écouteurs dans `NotesPro.tsx`, `use-stock-page-model.tsx`, `use-finances-page-model.tsx`.
- `src/components/ui/dropdown-menu.tsx` : transmet `collisionPadding` (16 px de marge à la fenêtre).
- `tests/session-ui.test.ts` : la liste attendue passe de quatre à sept actions.

## Captures (`captures/`)

`avant-*` : panneau 2 × 2 d'origine (menu déroulant). `barre-clean-light.png`, `barre-premium-dark.png` : après.

## Vérifications

- `npm run typecheck` : vert. `npm test` : 208 fichiers, 1652 tests verts (deux tests mis à jour pour la liste de sept actions : `session-ui` et `visual-style`).
- Dans le navigateur (Chromium, 1440 × 900), chaque action ouvre son formulaire : Rendez-vous, Patient (Nouveau patient), Consultation, Soin non rejoué cette fois, Document (page vierge), Produit (Nouveau produit), Facture (Nouvelle facture). Premier bug trouvé et corrigé : Patient arrivait sur la page sans ouvrir le formulaire ; il passe désormais par la demande en attente.
- Échap et clic extérieur ferment la barre. Rendu vu en Clean clair et Premium sombre.
