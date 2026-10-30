# Page d'activation au design de la page de connexion

30 octobre 2026, branche `feat/dictee-turbo-native`. Bilan de clôture, écrit après coup : le commit est du matin, ce bilan et le rejeu des portes datent de 8 h 41.

## Commit

- `92798fa` « fix: page d'activation au design de la page de connexion » (6 fichiers, +301 −368). Commit local, sans push.

## Ce qui a changé

L'assistant de première configuration (`src/components/SetupWizard.tsx`) reprend la mise en page de la connexion refaite la veille (voir `docs/recus/2026-10-29/page-connexion/`).

- **Panneau gauche partagé.** Le fond de marque, le mot-symbole « bAItari », le bloc animé et la ligne de rubriques sortent de `Auth.tsx`. Ils vont dans le nouveau `src/components/auth-brand-panel.tsx`, sous le nom `AuthBrandPanel`. Le fond vitré de droite, avec le chien et le chat, y devient `AuthGlassBackdrop`. Les deux écrans utilisent ces deux composants. `Auth.tsx` garde exactement son contenu : seul le balisage est déplacé.
- **Texte du panneau gauche (activation).**
  - Surtitre : « Configuration locale · deux étapes ».
  - Titre en Instrument Serif italique : « Un démarrage calme, un suivi précis. ».
  - Paragraphe : « licence » et « accès » sont surlignés.
  - Rubriques : « Données locales / Prêt au quotidien / Accès personnel ». Elles remplacent les trois cartes d'avantages de l'ancien panneau.
- **Carte de droite.**
  - C'est la même carte vitrée que la connexion (`auth-panel`).
  - L'étiquette d'étape est en IBM Plex Mono (`auth-clinic-step-label`).
  - Le titre suit la même forme que l'accueil de la connexion : « Activez *Baitari.* », puis « Créez votre *accès.* ».
  - Deux pastilles d'étape s'affichent dans le coin (`auth-steps`, `auth-step`).
- **Champs.** Les champs reprennent `auth-label`, `auth-field` et `auth-field__input` de la connexion. Ils profitent donc de l'exemption du cadre global : un seul contour par champ. Le libellé « Adresse email » devient « E-mail professionnel ».
- **Mots de passe.** À l'étape 2, les deux champs sont empilés au lieu d'être côte à côte. La case « Afficher les mots de passe » devient un bouton « Afficher / Masquer » dans le premier champ. Ce bouton agit toujours sur les deux champs.
- **Erreurs.** Elles s'affichent dans un bandeau `role="alert"` animé, aux couleurs `destructive`. Ce bandeau remplace l'ancien bandeau rouge codé en dur.
- **Bouton principal.** Il n'y en a plus qu'un pour les deux étapes : « Vérifier et continuer », puis « Ouvrir mon espace ». Il est en `bg-primary`, comme celui de la connexion.
- **Pied de carte.**
  - Étape 1 : « Pas encore de licence ? La demander par courriel », qui appelle toujours le même `createLicenseRequestMailto`.
  - Étape 2 : « Modifier la licence », qui ramène à l'étape 1.
- **Fichiers.**
  - `src/components/setup-wizard.css` est retiré.
  - `src/components/auth-clinic.css` reçoit 27 lignes pour l'étiquette et les pastilles d'étape.
- **Inchangé.**
  - La logique d'activation : validation de la licence, création du compte, `onComplete`, état des étapes. Le diff ne touche pas les lignes 1 à 150 du composant, hors imports et constantes de style supprimées.
  - Le composant `Logo` global.

## Portes

Rejouées sur l'arbre de travail au moment de ce bilan, avec `92798fa` en tête de branche :

- `npx tsc -b` : 0 erreur.
- `npx eslint .` : 0 erreur, 0 avertissement.
- `npx vitest run` : 172 fichiers, 1325 tests, tous verts. `tests/type-scale.test.ts` couvre `SetupWizard.tsx` (échelle typographique). Aucun test ne vérifie le parcours d'activation lui-même.

## Capture

- `docs/recus/2026-10-29/uniformisation-nom-icone/activation-meme-design-que-connexion.jpg` (1400 × 860). Elle montre l'étape 1, thème clair, fenêtre large. Elle a été rangée dans le dossier de la session « nom et icône » et date du même commit.

## Ce qui n'est pas vérifié

- **Thème sombre.** Aucune capture de l'activation en sombre.
- **Étape 2.** Aucune capture de « Créez votre accès » : licence vérifiée, bouton « Afficher / Masquer », retour « Modifier la licence ».
- **Bandeau d'erreur.** Il n'est montré ni avec une licence refusée ni avec des mots de passe différents.
- **Fenêtre étroite (moins de 1024 px).** Le panneau gauche disparaît et un logo s'affiche en tête de carte. Ce cas n'est pas regardé.
- **Activation de bout en bout.** Aucune vraie clé n'a été saisie et aucun compte créé avec le nouvel écran. Le parcours est supposé intact parce que la logique n'est pas touchée, mais il n'a pas été rejoué.
- **Mouvement et transparence réduits.** Le cas n'est pas vérifié sur cet écran. Les règles viennent de `auth-clinic.css`, déjà vérifiées pour la connexion.
- **CSS orphelin.**
  - `src/components/welcome-artwork.css` (7 sélecteurs `.setup-intro` et `.setup-welcome`) et `src/index.css:4624` (`.setup-welcome`) ciblent encore les anciennes classes.
  - Plus aucun élément ne porte ces classes : ces règles sont mortes mais sans effet.
  - Elles n'ont pas été retirées, pour rester dans le périmètre.
- **Marque.** Le titre dit « Activez *Baitari.* » (via `APP_NAME`), alors que le mot-symbole au-dessus dit « bAItari ». Le logo bleu de `Logo.tsx` reste différent de l'icône de l'app : c'est le point ouvert noté dans `uniformisation-nom-icone/README.md`.
