# Paramètres : langage du dossier patient, contrôles de Yuri, « Mon cabinet »

8 novembre 2026. Captures dans `avant/` et `apres/` (Clean clair, Clean sombre, Premium clair, Premium sombre ; sections Profil, Apparence, Cabinet / Mon cabinet, Facturation, Sécurité). Les autres sections, en Clean clair, sont dans `apres/autres-sections/`. `apres/menu-avatar-mon-cabinet.png` montre le menu de l'avatar.

## 1. Langage visuel

Chaque section est une bande grise (le `Shell`, R20) avec son en-tête : icône propre à la section, titre, sous-titre. Dedans, un panneau blanc (R16), bordure nette sur les quatre côtés. Lignes de réglage séparées par un filet, formulaires à 24 px, sections espacées de 24 px, boutons en pilule. L'en-tête de page est celui de Patients : une ligne, « Paramètres : réglages du cabinet ».

Les briques sont dans `src/components/settings-section.tsx` : `SettingsSection`, `SettingsRow`, `SettingsBody`, `SettingsFooter`, `SettingsNotice`, `SettingsStack`. Couleurs : `--card-band`, `--card-inset`, `--border`. Aucun jeton TuffUI. Tailles de texte dans {12, 13, 14, 16, 18, 24}.

Disparu : le titre de section en double (`h2` + sous-titre) au-dessus des panneaux, remplacé par un `h2` lisible par les lecteurs d'écran seulement ; l'en-tête collé au bord gauche ; les marges de 14, 18, 20, 21, 26, 36, 58 px ; les surcharges Premium « Revue 3.3.20 » et « Crédits restaurés », devenues sans objet ; les règles Clean de `.settings-panel`, `.settings-profile-identity`, `.settings-content-heading`.

## 2. Réglages migrés vers les composants de Yuri

Installés à la main depuis `~/refs/tuffui`, même méthode que les widgets : `src/components/ui/choice-controls.tsx` (Switch, plus Checkbox, Radio, RadioGroup installés avec) et `src/components/ui/segmented-control.tsx`. Icônes en lucide, un test de rendu chacun dans `tests/components/tuffui/`.

**Switch (oui/non)**

| Réglage | Fichier | Clé de persistance (inchangée) |
|---|---|---|
| Donner vie au compagnon | `mascot-settings.tsx` | `baitari:mascot:v1` |
| Utiliser la nouvelle version de l'assistant | `ai-model-settings.tsx` | préférence du générateur (`setGeneratorPreference`) |
| Activer / désactiver un modèle de document (liste) | `document-template-manager.tsx` | base des modèles |
| Modèle actif (éditeur) | `document-template-manager.tsx` | base des modèles |
| Type de rappel actif (case à cocher native avant) | `patient-reminders-panel.tsx` | base des rappels |

**Segmented (choix en groupe)**

| Réglage | Avant | Clé de persistance (inchangée) |
|---|---|---|
| Thème (quatre choix) | `AppThemePicker`, quatre cartes | `theme-config` (`skin`) et `theme` |
| Mode (Clair, Auto, Sombre) | `ThemeModeToggle` | `theme` |
| Police (Clean seulement) | `settings-segmented` | `theme-config` (`cleanFont`) |
| Barre latérale (Automatique, Claire, Sombre) | `settings-segmented` | `baitari-sidebar-tone`, par utilisateur |
| Réduire la barre latérale | `settings-segmented` | `layout_collapsible_v7` |
| Tableau de bord (vue d'ensemble, journée clinique) | `<select>` natif | `dashboard.version` |
| Couleur du document (facture) | `settings-segmented` | `invoice_settings_v1` (`accent`) |

Vérifié dans le navigateur : chaque bascule écrit la même clé qu'avant (relevé du `localStorage` après clic), y compris la teinte de la barre latérale et la mascotte.

## 3. « Mon cabinet »

- Le menu de l'avatar a une entrée « Mon cabinet » (après « Mon profil »). Elle demande la section par `requestSettingsSection("mon-cabinet")` (`src/lib/settings-navigation.ts`) : la demande attend en session si Paramètres n'est pas monté, et un événement l'annonce si la page est déjà ouverte. Les deux cas ont été testés dans le navigateur.
- La section porte l'identité par `invoiceSettingsService` : nom, adresse, téléphone, courriel, identification professionnelle ou fiscale, logo. Ce sont exactement les champs déjà gérés, aucune clé nouvelle. `saveInvoiceSettings` écrit toujours `invoice_settings_v1`, `clinic_name`, `cabinet_name` et `practice_name`.
- « Cabinet & factures » devient « Facturation » : couleur, pied de page, aperçu PDF. Une ligne « Identité imprimée » renvoie vers Mon cabinet.
- Les deux panneaux relisent la valeur stockée avant d'enregistrer et n'écrivent que leurs propres champs (`identité` : 6 champs, `facturation` : 2), pour qu'aucun n'écrase l'autre avec une copie périmée. Vérifié : enregistrer la couleur et le pied de page laisse nom, téléphone et courriel intacts, et inversement.
- Le panneau de facturation n'est plus gardé monté caché : il se recharge à l'ouverture.
- « Configurer le cabinet » (Modèles de documents) mène à Mon cabinet.

## 4. Vérifications

- `tsc -b` propre, `eslint .` propre.
- Suite de tests : 205 fichiers, 1634 tests verts (1626 avant les changements, 8 ajoutés).
- Tests ajoutés : `tests/components/tuffui/choice-controls.test.tsx`, `segmented-control.test.tsx`, `tests/settings-navigation.test.tsx`.
- Quatre thèmes en captures : voir `apres/`.

## Ce qui n'a pas été touché

- Le fond des sections : mêmes composants métier (sauvegardes, IA, salles, réseau, rappels, modèles), mêmes données, mêmes services. Seuls leur cadre, leurs lignes de réglage et leurs contrôles oui/non ou en groupe ont changé.
- Les règles `.settings-segmented` de `clean.css` (famille des interrupteurs segmentés) : épinglées par `theme-clean-charter.test.ts`. Plus aucun composant ne les utilise ; à retirer avec leur test dans un lot à part.
- Les modes du réseau local (poste seul, principal, secondaire) : trois cartes avec description, restées en `RadioGroup` maison, pas des choix à une ligne.
- L'éditeur de modèle de document (fenêtre) et les fenêtres de confirmation des sauvegardes.
- Le Switch de la fiche produit (`stock-view.tsx`) : hors de la page Paramètres.
- `src/modules/shell/app-header.tsx` et `nav-user.tsx` : anciens menus de compte, plus montés.
- Les interrupteurs maison `src/components/ui/switch.tsx` et `checkbox.tsx` restent pour le reste de l'application.

## Limites

- Les rappels médicaux, les séjours et les sauvegardes sont en SQLite natif : dans le navigateur, « Rappels médicaux » montre l'état d'erreur et « Sauvegarde » reste grisé. Leur cadre est visible ; leur contenu n'a pas été vu avec des données réelles (seul `npm run tauri:dev` les montre).
- Le Switch de Yuri est plus grand que l'ancien (28 sur 48 px) et vert (`#34c759`, la couleur du composant) : c'est sa forme, non adaptée.
