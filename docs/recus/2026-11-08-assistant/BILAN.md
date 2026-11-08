# Panneau assistant : composants de Yuri, plus large, plus sobre

8 novembre 2026. Captures : `quatre-themes/` (Clean et Premium, clair et sombre, à 1440 × 900 : panneau fermé, ouvert, en dictée, en attente de validation) et `largeurs/` (13 pouces serré à 1280 × 800, grand écran à 1920 × 1080).

## Composants installés, où ils servent

Installés à la main depuis `~/refs/tuffui` dans `src/components/ui/`, icônes lucide, textes français, jamais sous 12 px, couleurs adaptées dès le départ à nos jetons (`brand`, `positive`, `negative`, `warning` = nos teintes ; la jauge prend `--tone-*` au lieu des sept hexadécimaux de TuffUI). Aucune donnée de démo. Un en-tête d'adaptation dans chaque fichier dit ce qui diffère du registre.

| Composant | Où il est utilisé |
|---|---|
| `streaming-message` | Les messages de l'assistant dans la dictée : l'invite d'accueil et la question de chaque rubrique. Signé « Assistant IA ». Sans copier ni régénérer, sans sources (rien ne sort de la machine). |
| `agent-composer` | Le champ de dictée : champ qui s'agrandit, menu des @mentions de patients (mêmes touches : flèches, Entrée, Tab, Échap), boutons de dictée dans son pied, ⌘ + Entrée pour continuer. Ni modes, ni modèles, ni fichiers joints, ni file de messages. |
| `agent-status` | L'écoute en cours (avec le vrai niveau du micro et le chronomètre), l'attente d'autorisation du micro, la préparation du micro, la préparation de la note (remplace `AssistantActivity`). |
| `tool-call-block` | La recherche dans les dossiers : une ligne repliée « Recherche dans les dossiers », durée, nombre de passages, détails au dépli. Mots, jamais JSON ni nom d'outil. |
| `tool-approval-queue` | Les reformulations proposées par l'assistant, une par rubrique, « votre dictée » contre « formulation proposée » : accepter, garder ma dictée, annuler. |
| `confirmation-card` | L'enregistrement de la note SOAP : une carte, avec les alertes de la note (traitements conservés mot pour mot, éviction). |
| `agent-question` | La sortie quand l'assistant a refusé de rédiger : une question à options (relire ma dictée comme note, corriger une rubrique), à la place des boutons dispersés. |
| `prompt-suggestions` | Les suggestions de la recherche (puces). |
| `context-window-meter` | La jauge segmentée et son compteur, en bas du champ de dictée, en caractères sur la limite de la dictée. Reste en permanence. |

Dépendances installées avec eux : `action-button`, `tooltip-hint`, `key-hint`, `loader` (et `segmented-control`, `choice-controls`, déjà là). Tests : `tests/components/tuffui/assistant-cards.test.tsx` et `assistant-surfaces.test.tsx`.

## Largeur

Le panneau passe de 460 / 520 px à 552 / 624 px (+ 20 %), plafonné par la fenêtre : `clamp(460px, 46vw, 624px)` à partir de 1024 px, `clamp(420px, 55vw, 552px)` en dessous. Le contenu du shell est poussé de la même largeur (variable `--assistant-width`, `src/index.css`). À 1280 px le panneau fait 589 px et le dossier garde ~490 px à côté ; à 1440 px, 624 px et ~570 px de dossier ; à 1920 px, 624 px.

## Validation : le flux n'a pas changé, il est mieux gardé

- Rien ne s'enregistre sans « Valider et enregistrer la note » (clic ou ⌘ + Entrée dans une rubrique).
- Nouveau garde, demandé : tant qu'une reformulation de l'assistant n'a pas été examinée, la carte annonce « N reformulations à examiner avant d'enregistrer » et `save()` refuse aussi, même par le clavier. Accepter garde la formulation ; refuser remet les mots du vétérinaire pour cette rubrique ; annuler remet la proposition.
- Aucune écriture automatique, aucune donnée hors de la machine : aucun appel réseau ajouté.

## Éléments retirés du panneau, et pourquoi

Aucune fonction réelle perdue.

- **Compteur de mots** : la jauge segmentée dit déjà la longueur de la dictée.
- **« Patient : X » et « Note existante » au bas de la dictée** : le patient est dans l'en-tête, la note existante dans la carte de validation.
- **« Revenir à… » et « Passer cette rubrique »** : « Revenir » doublait les boutons « Modifier » de chaque réponse ; « Passer » doublait « Continuer » (continuer avec une rubrique vide passe à la suivante).
- **Compteur « n / 6 000 » sous chaque rubrique** : la limite est tenue par le champ lui-même.
- **Bandeau « Relecture & Validation SOAP » et son badge « Validation unique »** : le titre est celui de la carte.
- **Ligne « Aucune modification proposée par l'assistant »** : l'absence de file le dit.
- **Liste des quatre rubriques dans la carte de validation** : remplacée par une ligne « N rubriques renseignées sur 4 ».
- **Cartes encadrées autour des messages et des rubriques** : texte aligné sur le bord du champ.
- **Onglet « Validation SOAP »** : n'apparaît que lorsqu'il y a une note à relire (deux onglets avant).
- **Texte d'accueil** réduit à une phrase.

## Espacements du champ de dictée

Échelle 12 / 24 : marge extérieure du panneau 12 px (20 avant), champ sans bande grise autour, texte à 12 px du bord, pied du champ à 12 px, boutons espacés de 12 px, libellé de rubrique, champ et boutons sur le même bord. La progression des rubriques est une barre de quatre segments avec « Rubrique 1 sur 4 ».

## Noms techniques

Le panneau dit « Assistant IA » et « Dictée vocale » (la ligne « Assistant de rédaction » de la fenêtre des modèles devient « Assistant IA »). Le message d'échec de l'installation de la recherche ne cite plus de dossier ni de modèle.

## Ce qui n'a pas été touché

- Le câblage des modèles : le modèle actuel reste actif, l'autre reste grisé « Temporairement indisponible » (`NewAssistantCard`, `GEMMA4_SUSPENDED`).
- La recherche (version actuelle), son index, ses filtres, le passage trouvé mis en avant (surligné) et « Insérer ».
- Les clés de persistance (langue de la dictée, préférences, etc.), le hook de dictée, la génération, la logique des @mentions.
- L'en-tête du panneau (mascotte, patient, replier, modèles, fermer).

## Limites

- Les captures « en dictée » et « en attente de validation » viennent du navigateur, qui n'a ni moteur de dictée ni modèle de rédaction : le micro et la génération y sont remplacés par un bouchon injecté par le script de capture (texte de test, niveau de micro fixe), jamais par du code livré. Le vrai micro et la vraie génération ne se voient que dans `npm run tauri:dev`.
- À 1280 px de large, la carte de validation et la file des reformulations occupent près de la moitié de la hauteur quand quatre reformulations sont à examiner ; la liste défile au-dessus.
- La jauge garde la forme de Yuri (vingt cases, chiffres en police à chasse fixe).

## Vérifications

`tsc -b` et `eslint .` propres ; suite de tests verte (207 fichiers, 1646 tests, dont 12 ajoutés pour ces composants). Le test existant sur l'attente du micro a guidé une correction : le libellé d'origine « Autorisation du microphone… » est conservé.
