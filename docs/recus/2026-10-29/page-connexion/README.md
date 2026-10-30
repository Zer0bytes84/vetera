# Page de connexion : contour unique et refonte de la page

29 octobre 2026, branche `feat/dictee-turbo-native`.

## Causes de la régression

**Double contour des champs.** Il vient du commit `bc531dc` du 18 octobre (« design: audit phases 1 to 3 »). Ce commit a ajouté dans `src/design-system/fields.css` la règle globale qui unifie le style des champs. Sa liste de cibles inclut `input:not([data-slot]):is([type="email"], [type="password"], …)`, ce qui touche aussi les champs nus de la connexion (`.auth-field__input`). Or ces champs sont déjà enveloppés par `.auth-field`, qui dessine son propre cadre. Chaque champ affichait donc deux cadres :

- celui de l'enveloppe, avec 12 px de rayon ;
- celui de l'`input`, de 1 px avec 8 px de rayon, qui prenait aussi un anneau de 3 px au focus.

Mesure avant correctif, au focus du mot de passe : l'`input` a une bordure `1px solid rgb(93, 93, 93)` et une ombre de 3 px, à l'intérieur de l'enveloppe qui a déjà les siennes. Les deux commits du 29 octobre qui touchent `fields.css` (`69f989f`, `8c2640c`) n'y sont pour rien : ils n'ajoutent qu'une exemption limitée à `.soap-section-editor`.

**Panneau de gauche devenu plat.** Voici son historique :

- jusqu'au 13 septembre (`ab7249d`), un dégradé « shader » animé couvrait la page (`AuthShader` : halos flous et grain) ;
- du 13 septembre au 1er octobre (`c912b29`), une illustration florale l'a remplacé ;
- le commit `82ec47f` du 16 octobre (`auth-clinic.css`) a mis le fond uni `bg-background`, avec un titre de 24 px centré.

## Ce qui change

Les fichiers modifiés sont `src/components/Auth.tsx`, `src/components/auth-clinic.css` et le nouveau `src/components/auth-peeking-pets.tsx`. Les polices `src/assets/fonts/InstrumentSerif-*.ttf` (licence OFL) sont embarquées pour fonctionner hors ligne. `fields.css` n'est pas modifié.

- **Champs.** Une exemption avec six `:root`, sur le modèle de celle des blocs SOAP, annule le cadre global sur `.auth-clinic .auth-field__input`. Elle couvre le repos, le focus et le survol, ce dernier limité aux pointeurs fins comme le veut la charte. Seule l'enveloppe dessine le cadre, et l'`input` retrouve ses 48 px.
- **Panneau gauche.**
  - Le dégradé revient, repris de l'ancien `AuthShader` mais aux couleurs de la marque, avec du corail et de la lavande. Il est granuleux, à la manière des dégradés de Dribbble : bruit fractal en `overlay`.
  - Deux halos dérivent lentement, et une lumière douce suit la souris.
  - Le panneau va jusqu'au bord de la fenêtre : les boutons macOS se posent sur le dégradé, sans arête qui passe entre eux.
- **Typographie.**
  - Le titre est en Instrument Serif italique, la police de la landing : « Moins de paperasse, plus de pattes. ».
  - Deux pastilles inclinées et flottantes (stéthoscope, note) sont glissées dans la phrase.
  - Un surtitre en IBM Plex Mono rappelle l'étymologie (« de l'arabe bayṭarī, vétérinaire »).
  - Dans le paragraphe, les mots « patients » et « consultations » sont surlignés en couleur.
  - En bas du panneau, une ligne de rubriques fait écho au logo placé en haut.
  - Le bloc de texte est centré sur l'axe optique de la carte de droite.
  - Le pictogramme du logo est décalé de −8 px : son tracé commence 8 px à l'intérieur de son cadre de 44 px. Logo, surtitre, titre, paragraphe et rubriques partagent ainsi le même bord gauche (mesuré à 40 px sur 1024 px de large). Les marges du haut et du bas sont égales.
  - La jambe italique du « p » de « plus » dépassait à gauche de la boîte du titre. Le bloc animé (`motion.div`, en translation) forme un calque qui la rognait. Le titre reçoit une marge intérieure compensée par une marge négative : l'encre tient dans la boîte et le bord gauche reste à 40 px (captures `avant/titre-p-rogne.png`, `apres/titre-p-entier.png`).
- **Nom.** Sur cette page, le mot-symbole devient « bAItari ». « AI » est en Instrument Serif droite, dans le dégradé bleu-sarcelle du logo : son « I » à empattements ne peut pas se lire comme un « l ». Le composant `Logo` global n'est pas touché.
- **Carte de connexion.**
  - Elle passe en verre liquide : flou de 22 px saturé, rebord lumineux doublé d'un liseré intérieur et halo.
  - Derrière elle, un chien et un chat au trait, dans le style des illustrations de Notion, sortent la tête de ses bords. Deux silhouettes pleines, un chien bleu et un chat rose, la traversent : nettes dehors, dépolies sous le verre. Le trait s'inverse en sombre.
  - L'accueil devient « Ravi de vous *revoir.* », puis « Vos patients vous attendent, vos notes aussi. ». La création de compte affiche « Ouvrons votre *cabinet.* ».
- **Mouvement réduit.** Les halos, la lumière et les pastilles s'arrêtent. Avec la transparence réduite, la carte redevient opaque.
- **Inchangé.** Le parcours de connexion et de création de compte, les champs, les boutons et la validation ne bougent pas.

## Vérifications

- Mode web (Vite, port 5173), sur un compte de test créé dans le stockage du navigateur de prévisualisation. Fenêtre Tauri réelle : capture par `screencapture -l`, en lecture seule. La base réelle n'est jamais écrite.
- Au focus du mot de passe, l'`input` mesure 0 px de bordure, sans ombre, sur 48 px de haut. L'enveloppe porte seule le cadre.
- Formulaire « Nouveau patient » : le champ e-mail garde son cadre unique de 1 px et ses 40 px. Rien ne change hors de la connexion.
- `tsc -b`, `eslint .` et `npm test` passent (172 fichiers, 1325 tests), charte d'interaction et échelle typographique comprises.

## Captures

| | Avant | Après |
|---|---|---|
| Connexion, clair | `avant/connexion-clair-focus.jpg` | `apres/fenetre-tauri-clair.png` (fenêtre Tauri réelle) |
| Connexion, sombre | `avant/connexion-sombre-focus.jpg` | `apres/connexion-sombre.jpg` |
| Champs au focus, zoom | `avant/champs-*-focus-zoom.png` | `apres/champs-*-focus-zoom.png` |
| Formulaire dans l'app | | `apres/formulaire-nouveau-patient-clair.jpg`, `apres/formulaire-nouveau-patient-sombre.jpg` |

Les zooms des champs et les captures du formulaire datent du correctif des contours, avant la refonte visuelle. Les champs n'ont pas changé depuis. Dans le navigateur de prévisualisation masqué, les animations d'entrée restent figées : la capture sombre force leur état final.
