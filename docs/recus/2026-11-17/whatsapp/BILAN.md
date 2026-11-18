# Bouton WhatsApp, 17 novembre 2026

Décidé le 23 octobre, annoncé « bientôt disponible » par la landing, il est maintenant livré, sans aucune API. Chaque bouton est un lien profond `wa.me` : il ouvre le WhatsApp de la clinique sur le numéro du propriétaire, avec un message déjà écrit. C'est l'humain qui relit, modifie s'il le veut et appuie sur Envoyer dans WhatsApp. Il n'y a ni envoi automatique, ni envoi en masse, ni file d'attente.

Le travail est sur la branche `chantier/whatsapp-2026-11-17`, préparée dans le worktree `~/work/whatsapp-wt`. Les commits sont locaux, rien n'est poussé.

## 1. Ce qui existait avant

La recherche de « wa.me » et de « whatsapp », insensible à la casse, ne trouve rien dans le code de l'app :
- ni dans les fichiers suivis ;
- ni dans l'historique de toutes les branches ;
- ni dans les messages de commit.

Hors de l'app, on ne le trouve que dans la landing (`~/work/baitari-landing`, « l'envoi par WhatsApp arrive dans une prochaine version ») et dans des instantanés de page de `.playwright-mcp/`, non suivis. Il n'y avait donc rien à signaler avant de construire.

## 2. Ce qui est ajouté

Il n'y a ni écran nouveau, ni entrée de navigation : un geste de plus, à deux endroits où le numéro du propriétaire est déjà affiché.

- **Fiche patient, bloc « Propriétaire »** (la page du patient et son aperçu latéral) :
  - une ligne « WhatsApp » sous la ligne du téléphone, avec l'icône Heroicons 20/solid `ChatBubbleOvalLeftEllipsis` ;
  - elle a les styles de la ligne du téléphone, sans bordure foncée ni ombre ajoutée. La mesure ne trouve aucune différence de style calculé entre les deux lignes, sur 17 propriétés, en clair comme en sombre.
  - Message : « Bonjour,⏎⏎Nous vous écrivons au sujet de Zoé l'Écureuil. »
- **Rappels** (vues En cours, À venir et Rappels du jour) :
  - un lien « WhatsApp » à côté du lien d'appel, dans le même style ;
  - seulement pour un rappel en cours dont l'animal est connu. Un rappel terminé ou annulé n'a pas de bouton.
  - Message : « Bonjour,⏎⏎Le rappel « Vaccin » de Rex est prévu le 17 novembre 2026.⏎Souhaitez-vous prendre rendez-vous ? ». Une échéance passée s'écrit au passé (« était prévu le 1er octobre 2026 »).
- **Ouverture :** par `openExternalLink`, le mécanisme que l'app utilise déjà pour les liens externes. Dans l'app de bureau, il passe par le plugin shell de Tauri (`plugin:shell|open`), qui confie l'adresse au système. Si l'ouverture échoue, la seule chose affichée est « WhatsApp n'a pas pu être ouvert. ».
- **Numéro inexploitable : aucun bouton.** C'est le cas d'un numéro vide, d'un texte comme « à rappeler » ou « 0555… (soir) », de deux numéros dans le champ, ou d'une longueur hors de 8 à 15 chiffres.

**Fichiers :**
- `src/lib/whatsapp.ts` : le numéro, le lien et les deux messages ;
- `src/components/whatsapp-link.tsx` : le bouton ;
- branchements dans `medical-record-summary.tsx`, `patient-detail-page.tsx`, `patient-peek-view.tsx` et `patient-reminders-panel.tsx` ;
- styles : les sélecteurs existants des lignes de contact, dans `medical-record.css` et `premium-workspace.css`, reçoivent `.medical-whatsapp-link`. C'est une liste de sélecteurs, donc la spécificité des liens existants ne change pas.

## 3. La règle du numéro

- **Chiffres seulement :** les espaces, y compris insécables, les points, les tirets, les barres obliques et les parenthèses tombent.
- **Indicatif écrit, indicatif gardé :** « +213 555 12 34 56 » donne `213555123456`. Un « 00 » en tête, le préfixe international, est lu comme un indicatif écrit : « 00213661223344 » donne `213661223344`.
- **Sinon, les chiffres tels quels, sans rien deviner :** « 0555 12 34 56 » donne `wa.me/0555123456`.

**Ce que ça donne sur la copie de la base de la VM : les 10 propriétaires ont un numéro sans indicatif écrit.** Ce sont 5 numéros de 10 chiffres, 2 de 11 et 2 de 12 sans 0 ni +, et 1 numéro national commençant par 0. Ce sont des comptes ; aucun numéro n'a été lu ni recopié. Leurs boutons ouvriront donc `wa.me/<chiffres locaux>`, et WhatsApp refusera très probablement ces numéros : il attend le format international. Voir la décision 1.

## 4. Cas testés

**Tests unitaires** (`tests/whatsapp.test.ts`, 34 cas, tous verts) :
- **12 formats lus :**
  - avec un +, et avec des espaces insécables ;
  - avec un 00 ;
  - avec un indicatif français ou américain, ce dernier entre parenthèses ;
  - nationaux, avec des points, des tirets ou des espaces ;
  - 9 chiffres, et 12 chiffres sans + ;
- **11 cas sans lien :**
  - un numéro vide, null ou fait d'espaces ;
  - un « + » seul ;
  - un mot, ou un commentaire ajouté au numéro ;
  - deux numéros dans le même champ ;
  - 7 chiffres ou 16 chiffres ;
  - un + au milieu du numéro ;
- **encodage :**
  - accents, « ’ », guillemets français, espaces insécables et retours à la ligne aller-retour exact ;
  - « & ? # + » restent dans le texte ;
  - aucun caractère brut dans le lien ;
- **gardes d'ouverture :** le lien passe le garde des liens externes de l'app sans modification. Il passe aussi le garde par défaut du plugin shell : l'expression `^((mailto:\w+)|(tel:\w+)|(https?://\w+)).+`, recopiée de `tauri-plugin-shell` 2.3.6 (`src/lib.rs`, `open_scope`), s'applique parce que l'app ne règle pas `open` dans `tauri.conf.json` ;
- **messages :**
  - le présent pour une échéance à venir ou du jour, le passé pour une échéance dépassée ;
  - « 1er » le premier du mois.

**Parcours au clic dans le banc navigateur** (`parcours.json`) :
- **Le banc :** la copie de la base de la VM, plus cinq propriétaires `ZZ-TEST`, horloge au 17 novembre 2026, thème Clean clair et sombre.
- **Méthode :** chaque bouton est cliqué ; `window.open` est remplacé par un enregistreur et toute requête vers wa.me ou whatsapp.com est bloquée et signalée. Aucune requête n'est partie.
- **Avec bouton :**

  | Animal | Numéro du dossier | Lien ouvert | Message |
  |---|---|---|---|
  | Zoé l'Écureuil | +213 555 12 34 56 | `wa.me/213555123456` | rappel à venir |
  | Médor | 00213661223344 | `wa.me/213661223344` | rappel en retard, au passé |
  | Rex | 0555 12 34 56 | `wa.me/0555123456` (format ambigu, chiffres tels quels) | rappel du jour |

  Les messages décodés sont identiques aux textes attendus, accents et retours à la ligne compris.
- **Sans bouton :** Minou (« à rappeler »), Pistache (aucun téléphone) et les deux rappels terminés de la copie.
- **Erreurs :** aucune erreur de console ni de page, en clair comme en sombre.
- **Vérifications :**
  - suite complète : 228 fichiers et 1 978 tests verts ;
  - lint sans avertissement sur les fichiers touchés ;
  - Ultracite propre sur les nouveaux fichiers, sans nouvelle remarque sur les fichiers existants touchés ;
  - CSS sans avertissement (lightningcss) ;
  - `tsc -b` : 15 erreurs, toutes préexistantes sur master, aucune dans les fichiers touchés.

**Captures** (`captures/`, clair et sombre) :
- la fiche de Zoé, avec la ligne WhatsApp ;
- la fiche de Minou, sans bouton ;
- une ligne de rappel en retard et une à venir.

## 5. Ce qui change de comportement

- **Le geste lui-même :** deux endroits gagnent un bouton, et rien d'autre ne bouge. La navigation, le reste de la fiche, le fonctionnement des rappels, l'export CSV et l'impression de la liste d'appels restent identiques ; ces deux exports lisent des champs nommés.
- **`OwnerContact` :** le composant reçoit un `animal` facultatif. Sans lui, il s'affiche comme avant.

## 6. Ce qui n'est pas prouvé

- **Ouverture dans la vraie app de bureau :** non faite dans la VM. Il n'y a plus de build Rust de Baitari sur la machine (aucun dossier `target`). Le recompiler est un build lourd, interdit tant que le serveur de la landing tourne sur le port 5301, qui devait rester allumé. Ce qui est prouvé : le chemin `plugin:shell|open` du code, le garde par défaut du plugin appliqué au lien, et le clic qui produit le bon lien dans le navigateur. À faire dès que l'app peut être relancée : un clic dans l'app activée de la VM, avec un faux `xdg-open` en tête du `PATH`.
- **WhatsApp Desktop sous Windows et WhatsApp Web :** à faire confirmer par les testeurs. Sous Windows, `https://wa.me/…` part au navigateur par défaut, et c'est la page de WhatsApp qui propose d'ouvrir l'application de bureau ou de continuer sur le Web.
- **Numéros sans indicatif :** l'accueil que WhatsApp réserve à `wa.me/0555123456` n'est pas vérifié (aucune requête n'a été envoyée). On s'attend à un refus du numéro.
- **macOS :** le même chemin par le système n'est pas vu.
- **Mode navigateur seul (développement) :** `openExternalLink` ouvre avec `noopener`, et le navigateur rend alors `null` même quand l'onglet s'ouvre. Hors de l'app de bureau, un clic peut donc afficher « WhatsApp n'a pas pu être ouvert. » alors que l'onglet est ouvert. C'est préexistant et commun à tous les liens externes, sans effet dans l'app de bureau. Non modifié.

## 7. À décider

1. **Indicatif par défaut.** Tous les numéros de la copie de la base sont sans indicatif. Proposition : un réglage visible de la clinique, « Indicatif pour WhatsApp : +213 », appliqué seulement aux numéros nationaux commençant par 0 et affiché dans l'infobulle du bouton. Ce serait un choix explicite, pas une supposition silencieuse. Non fait, parce que la règle du chantier l'interdisait.
2. **Ce qui passe par les serveurs de WhatsApp.** Le lien `https://wa.me/…` est d'abord ouvert par le navigateur sur le site de WhatsApp. Le numéro et le message pré-rempli (nom de l'animal, type de rappel, date) arrivent donc chez Meta, chiffrés en HTTPS, avant même qu'on appuie sur Envoyer. Il n'y a aucune API ni aucun compte, mais ce n'est pas « aucune donnée chez un tiers ».
   - **L'alternative :** le schéma `whatsapp://send?phone=…&text=…` ouvre directement l'application de bureau, sans passer par le Web.
   - **Son prix :** il échoue si WhatsApp n'est pas installé, et il faut élargir la permission « open » du plugin shell, limitée par défaut à http, https, mailto et tel.
3. **Contact secondaire :** son numéro n'a pas de bouton. Le brief visait le propriétaire.
4. **Nom de la clinique dans le message :** il n'y est pas, et le brief ne le demandait pas. Il peut être ajouté depuis les réglages de facturation.

## Refaire le banc

Les outils sont dans `outils/`. Étapes :
1. `VACUUM INTO` de `~/.config/com.baitari.vetera/baitari.db` vers `base-test.db`, à côté des outils. La copie de la base n'est jamais versionnée.
2. `python3 -I donnees-essai.py base-test.db`.
3. `base-vers-navigateur.py base-test.db store.json` : l'outil de la branche `banc/fable-fraicheur-2026-11-12`.
4. `npx vite --port 5211` dans le worktree.
5. `node parcours.mjs sortie` et `node styles.mjs`.
