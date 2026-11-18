# Bouton WhatsApp, 17 novembre 2026

Décidé le 23 octobre, annoncé « bientôt disponible » par la landing. Mis à jour le même jour avec les deux décisions de l'utilisateur :
- **indicatif** : +213 pour les numéros nationaux ;
- **lien** : lien direct `whatsapp://` vers l'application, sans passage par le site wa.me.

**Correction du soir, après le test réel de l'utilisateur :** le bouton de la fiche patient est trop caché, un vétérinaire ne va pas le chercher dans une ligne de contact. Le flux principal devient le rendez-vous, là où il travaille toute la journée (section 2 bis) :
- **dans l'Agenda,** « Relance WhatsApp » dans le menu d'actions du rendez-vous, au même niveau que « Annuler le rendez-vous » ;
- **dans les Rappels,** le rendez-vous remonte 1 heure avant son heure, avec le même bouton ;
- **le message** est un rappel de rendez-vous : l'animal, la date et l'heure, sur un ton de relance courtoise.

La ligne WhatsApp de la fiche patient reste en place, comme accès secondaire de contact. Rien n'est supprimé.

Le bouton ouvre l'application WhatsApp installée sur le poste de la clinique, sur le numéro du propriétaire, avec un message déjà écrit. C'est l'humain qui relit, modifie s'il le veut et appuie sur Envoyer dans WhatsApp. Il n'y a ni API, ni compte développeur, ni envoi automatique, ni envoi en masse, ni file d'attente. Le numéro et le message ne passent par aucun site web : le lien est confié au système, qui le donne à l'application. **Si WhatsApp n'est pas installé, le lien ne mène nulle part**, et il n'y a volontairement aucun repli vers wa.me.

Branche `chantier/whatsapp-2026-11-17`, préparée dans le worktree `~/work/whatsapp-wt`. Les commits sont locaux, rien n'est poussé.

## 1. Ce qui existait avant

La recherche de « wa.me » et de « whatsapp », insensible à la casse, ne trouve rien dans le code de l'app : ni dans les fichiers suivis, ni dans l'historique de toutes les branches, ni dans les messages de commit. Hors de l'app, on ne le trouve que dans la landing et dans des instantanés de page de `.playwright-mcp/`, non suivis.

## 2. Ce qui est ajouté

Il n'y a ni écran nouveau, ni entrée de navigation : un geste de plus, à deux endroits où le numéro du propriétaire est déjà affiché, et une ligne de réglage.

- **Fiche patient, bloc « Propriétaire »** (la page du patient et son aperçu latéral) :
  - une ligne « WhatsApp » sous la ligne du téléphone, avec l'icône Heroicons 20/solid `ChatBubbleOvalLeftEllipsis` ;
  - elle a les styles de la ligne du téléphone, sans bordure foncée ni ombre ajoutée. La mesure ne trouve aucune différence de style calculé entre les deux lignes, sur 17 propriétés, en clair comme en sombre.
  - Message : « Bonjour,⏎⏎Nous vous écrivons au sujet de Zoé l'Écureuil. »
- **Rappels** (vues En cours, À venir et Rappels du jour) :
  - un lien « WhatsApp » à côté du lien d'appel, dans le même style ;
  - seulement pour un rappel en cours dont l'animal est connu.
  - Message : « Bonjour,⏎⏎Le rappel « Vaccin » de Rex est prévu le 17 novembre 2026.⏎Souhaitez-vous prendre rendez-vous ? ». Une échéance passée s'écrit au passé (« était prévu le 1er octobre 2026 »).
- **Paramètres > Mon cabinet, ligne « Indicatif pour WhatsApp » :**
  - elle affiche +213, avec l'explication : « Ajouté aux numéros des propriétaires qui commencent par 0 : 0555 12 34 56 devient +213 555 12 34 56. Les numéros qui portent déjà un indicatif ne changent pas. »
  - **Elle n'est pas modifiable pour l'instant**, puisque seul +213 est décidé. La valeur affichée et la valeur appliquée viennent de la même constante, `WHATSAPP_COUNTRY_CODE` dans `src/lib/whatsapp.ts`, et ne peuvent donc pas diverger. La rendre modifiable demandera une liste de choix et une clé enregistrée dans les réglages.
- **Le lien :** `whatsapp://send?phone=<chiffres>&text=<message encodé>`, ou sans `&text=` si le message est vide.
- **Ouverture :** par `openExternalLink`, le mécanisme que l'app utilise déjà pour les liens externes. Dans l'app de bureau, il passe par le plugin shell de Tauri (`plugin:shell|open`), qui confie le lien au système. Si l'ouverture échoue, la seule chose affichée est « WhatsApp n'a pas pu être ouvert. ».
- **Numéro inexploitable : aucun bouton.** C'est le cas d'un numéro vide, d'un texte comme « à rappeler » ou « 0555… (soir) », de deux numéros dans le champ, ou d'une longueur hors de 8 à 15 chiffres.

## 2 bis. Le flux principal : la relance du rendez-vous

Elle reprend toute la mécanique de la section 2 : le numéro du propriétaire de l'animal, la règle +213, le lien direct `whatsapp://`, la même garde d'ouverture et le même message d'échec. L'envoi reste manuel : rien n'est envoyé automatiquement, il n'y a aucune API.

- **Qui peut être relancé :** un rendez-vous encore à venir, c'est-à-dire « Planifié » ou « Confirmé », dont l'animal est connu et dont le propriétaire a un numéro exploitable. Un rendez-vous arrivé, en salle d'attente, en cours, terminé, annulé ou absent n'est pas relancé. Sans numéro exploitable, pas de bouton, comme partout.
- **Agenda, menu d'actions du rendez-vous** (`src/components/AgendaListView.tsx`, la liste unique des rendez-vous de l'Agenda) :
  - une entrée « Relance WhatsApp », entre « Modifier » et « Marquer absent », donc au même niveau que « Annuler le rendez-vous » ;
  - elle a la forme des autres entrées du menu, en texte seul ;
  - les autres entrées et leur ordre ne changent pas.
- **Rappels, « Rendez-vous dans l'heure »** (`src/modules/agenda/components/appointment-relances.tsx`, monté dans `src/components/Tasks.tsx`) :
  - un groupe en tête de la vue « Aujourd'hui », avec le filtre « Tous » ;
  - une ligne par rendez-vous : l'animal et l'heure, le propriétaire, son téléphone et le motif, avec le bouton « Relance WhatsApp » ;
  - un rendez-vous sans numéro exploitable y apparaît quand même, sans bouton, avec « Téléphone non renseigné » ou le texte du champ, pour qu'on puisse appeler ;
  - la ligne a la forme des rappels automatiques de la page : pastille, badge, texte. Aucune bordure foncée ni ombre n'est ajoutée.
- **Quand il remonte :** de 1 heure avant l'heure du rendez-vous, incluse, jusqu'à l'heure du rendez-vous, exclue. À 14 h 30, la relance d'un rendez-vous de 14 h 30 s'en va. Une relance après l'heure n'est plus un rappel.
- **Sans recharger la page :**
  - la page calcule le prochain moment où une relance remonte ou s'en va (`nextRelanceChange`, `src/lib/appointment-relance.ts`) et relit l'horloge à ce moment-là, 25 ms après ;
  - elle relit aussi l'horloge au moins une fois par minute, en cas de mise en veille, et dès que la fenêtre redevient visible.
- **Rien n'est enregistré :** la relance est lue à partir des rendez-vous. Il n'y a ni table, ni migration, ni écriture, et l'enregistrement d'un rendez-vous ne change pas.
  - L'ancienne table `reminders` (rappels de 15, 30, 60 ou 1 440 minutes, affichés en « Planning ») n'est pas utilisée et n'est pas touchée.
  - Y écrire aurait changé l'enregistrement des rendez-vous.
- **Le message :** « Bonjour,⏎⏎Nous vous rappelons le rendez-vous de Rex le mercredi 18 novembre 2026 à 14 h 30.⏎En cas d'empêchement, merci de nous prévenir.⏎⏎À bientôt. »
  - L'heure est écrite à la française, dans l'heure locale de la clinique : « 14 h 30 », ou « 9 h » pour une heure pile.
  - Le premier du mois s'écrit « 1er ».
  - Le nom de la clinique n'y figure pas (voir la section 8).

## 3. La règle du numéro

- **Chiffres seulement :** les espaces, y compris insécables, les points, les tirets, les barres obliques et les parenthèses tombent.
- **Indicatif écrit, indicatif gardé, sans changement :** « +213 555 12 34 56 » donne `213555123456`, « +33 6 12 34 56 78 » donne `33612345678`. Un « 00 » en tête, le préfixe international, compte comme un indicatif écrit : « 00213661223344 » donne `213661223344`.
- **Numéro national, qui commence par un seul 0 : le 0 tombe et 213 vient devant.**
  - « 0555 12 34 56 » donne `213555123456` ;
  - « 0661 22 33 44 » donne `213661223344` ;
  - « 0770 98 76 54 » donne `213770987654` ;
  - « 021 23 45 67 » (fixe) donne `21321234567`.
  - Si le résultat dépassait 15 chiffres, le maximum international, il n'y aurait pas de bouton.
- **Ni +, ni 00, ni 0 :** les chiffres tels quels, rien n'est deviné. Par exemple « 213555123456 » ou « 555123456 ».

**Sur la copie de la base de la VM**, les 10 propriétaires ont un numéro sans indicatif écrit. Ce sont des comptes ; aucun numéro n'a été lu ni recopié.
- **Le seul numéro qui commence par 0** prend maintenant +213.
- **Les 9 autres** (5 de 10 chiffres, 2 de 11 et 2 de 12, sans 0 ni +) restent tels quels, comme décidé. Leurs liens n'aboutiront que si ces chiffres forment déjà un numéro international. À vérifier sur les vraies fiches.

## 4. La garde d'ouverture : `whatsapp://` en plus, ni plus ni moins

**Format admis :** une seule forme de lien WhatsApp est admise, `WHATSAPP_APP_LINK` :
- l'écran d'envoi ;
- un numéro de 8 à 15 chiffres ;
- éventuellement un texte, avec seulement les caractères que produit `encodeURIComponent` ;
- rien d'autre.

**Les deux gardes élargies :**
- **Module d'ouverture de l'app** (`src/modules/documents/lib/open-external.ts`) : il accepte ce format en plus des adresses web et des courriels. Le garde des liens enregistrés dans la bibliothèque (`normalizeLinkUrl`) n'est pas modifié et reste fermé à `whatsapp://`.
- **Plugin shell de l'app de bureau** (`src-tauri/tauri.conf.json`, `plugins.shell.open`) : jusqu'ici l'app utilisait le motif par défaut du plugin, `^((mailto:\w+)|(tel:\w+)|(https?://\w+)).+`. Il est remplacé par ce même motif, auquel s'ajoute en alternative le format WhatsApp exact. Le plugin l'entoure de `^…$`.

**Seule différence hors WhatsApp :** une adresse qui contient un retour à la ligne est maintenant refusée par le plugin, alors que le motif d'origine, non ancré en fin, l'aurait acceptée. Le garde de l'app refusait déjà ces adresses, puisque `normalizeLinkUrl` rejette tout espace.

## 5. Cas testés

**Tests du lien** (`tests/whatsapp.test.ts`, **94 cas, tous verts**) :
- **Lecture du numéro, 17 formats :**
  - 7 avec un indicatif écrit, dont + avec des espaces insécables, 00, l'indicatif français et l'indicatif américain entre parenthèses ;
  - 8 nationaux algériens : 0555, 0661, 0770, avec des points, des tirets ou des espaces insécables, et un fixe 021 ;
  - 2 sans 0 ni +.
  - Plus la valeur du réglage (+213) et la limite des 15 chiffres.
- **Sans lien, 11 cas :**
  - un numéro vide, null ou fait d'espaces ;
  - un « + » seul ;
  - un mot, ou un commentaire ajouté au numéro ;
  - deux numéros dans le même champ ;
  - 7 chiffres ou 16 chiffres ;
  - un + au milieu du numéro.
- **Le lien `whatsapp://` :**
  - le format exact ;
  - le numéro relu dans le lien, pour 0555, 0661, 0770, +213 et 00213 ;
  - accents, « ’ », guillemets français, espaces insécables et retours à la ligne aller-retour exact, avec un lien en ASCII seul ;
  - « & ? # + = » restent dans le texte, et le lien ne porte que les paramètres `phone` et `text` ;
  - sans message, la conversation seule ;
  - aucune adresse web de WhatsApp (wa.me, api.whatsapp.com, web.whatsapp.com) dans le code du bouton, du lien et du module d'ouverture : il n'y a pas de repli.
- **Garde du module d'ouverture :**
  - les liens construits sont acceptés ;
  - 17 variantes sont refusées : un autre écran WhatsApp, un numéro trop court ou trop long, un + dans le numéro, un espace ou un retour à la ligne brut, un paramètre en plus ou dans le désordre, un #, des majuscules, `whatsapp:` sans `//`, un drapeau ajouté, `-i`, `/R`, `file:`, `javascript:` et `sms:` ;
  - le garde de la bibliothèque reste fermé ;
  - `openExternalLink` ouvre le lien WhatsApp, refuse les 17 variantes et continue d'ouvrir le web et les courriels.
- **Garde du plugin shell, motif lu dans `tauri.conf.json`** : les liens construits sont acceptés, les 17 variantes refusées, et hors WhatsApp le verdict est le même que le motif par défaut sur 10 adresses témoins.

**Même garde, vérifiée par le moteur Rust du plugin** (`garde-shell-rust.txt`, outil `outils/regex-rust/`) :
- **le programme :** un petit programme compilé à part, avec la même version du moteur d'expressions régulières que l'app (`regex` 1.12.2). Il applique le motif de `tauri.conf.json` comme le plugin, `Regex::new(format!("^{v}$"))`. Ce n'est pas une recompilation de l'app.
- **53 cas, 0 écart :**
  - les 28 liens WhatsApp construits par la vraie fonction sont acceptés : 7 numéros × 4 messages ;
  - les 17 variantes sont refusées ;
  - les 8 autres adresses, hors WhatsApp, reçoivent le même verdict que le motif d'origine du plugin. Par exemple `tel:+213…`, refusé avant comme après.

**Parcours au clic dans le banc navigateur** (`parcours.json`) :
- **Le banc :** la copie de la base de la VM, plus cinq propriétaires `ZZ-TEST`, horloge au 17 novembre 2026, thème Clean clair et sombre.
- **Méthode :** `window.open` est remplacé par un enregistreur, et toute requête vers wa.me ou whatsapp.com est bloquée et signalée. Aucune n'est partie.
- **Avec bouton :**

  | Animal | Numéro du dossier | Lien ouvert | Message |
  |---|---|---|---|
  | Zoé l'Écureuil | +213 555 12 34 56 | `whatsapp://send?phone=213555123456&text=…` | rappel à venir |
  | Médor | 00213661223344 | `whatsapp://send?phone=213661223344&text=…` | rappel en retard, au passé |
  | Rex | 0555 12 34 56 | `whatsapp://send?phone=213555123456&text=…` (+213 de la clinique) | rappel du jour |

  Les messages décodés sont identiques aux textes attendus.
- **Sans bouton :** Minou (« à rappeler »), Pistache (aucun téléphone) et les deux rappels terminés de la copie, dont le nom est masqué dans `parcours.json`.
- **Le réglage :** la ligne « Indicatif pour WhatsApp » est présente une seule fois dans Mon cabinet et affiche +213.
- **Erreurs :** aucune erreur de console ni de page, en clair comme en sombre.

**Relance du rendez-vous** (`tests/appointment-relance.test.ts`, **25 cas, tous verts**) :
- **La fenêtre d'une heure, à la seconde :**
  - absente à 61 min avant et à 60 min 1 s avant ;
  - présente à 60 min pile avant, à 59 min, à 30 min, à 1 min et à 1 s avant ;
  - partie à l'heure pile et 15 min après.
- **Les statuts :** relance pour « Planifié » et « Confirmé » ; aucune pour arrivé, en attente, en cours, terminé, annulé ou absent. Une heure illisible ne remonte jamais.
- **Le déclenchement :**
  - le délai jusqu'au prochain changement, pour un ou plusieurs rendez-vous, sans compter les annulés ;
  - une journée simulée depuis 9 h, en suivant ces délais : la relance apparaît à 13:30:00 pile et disparaît à 14:30:00.
- **Le message :** le texte exact, « 9 h », « 8 h 05 » et « 1er » ; dans le lien `whatsapp://`, l'aller-retour exact et l'acceptation par les deux gardes, celle de l'app et le motif de `tauri.conf.json`.

**Relance au clic dans le banc navigateur** (`relance.json`, outil `outils/relance.mjs`) :
- **Le banc :**
  - le même banc, avec cinq rendez-vous `ZZ-TEST` le 18 novembre 2026 (`outils/rendez-vous-essai.py`) ;
  - l'horloge de la page pilotée par Playwright (`page.clock`), sans recharger la page entre deux mesures.
- **Les rendez-vous :**

  | Animal | Heure | Statut | Numéro |
  |---|---|---|---|
  | Rex | 14 h 30 | planifié | 0555 12 34 56 |
  | Minou | 14 h 45 | planifié | « à rappeler » |
  | Zoé l'Écureuil | 15 h | confirmé | +213 555 12 34 56 |
  | Médor | 14 h 15 | annulé | 00213661223344 |
  | Pistache | 14 h 20 | arrivé | aucun |

- **Le déclenchement, page Rappels ouverte :**

  | Heure de la page | « Rendez-vous dans l'heure » |
  |---|---|
  | 13:29:00 | absent |
  | 13:29:59 | absent |
  | 13:30:00 | Rex, avec bouton |
  | 13:59:59 | Rex, Minou sans bouton |
  | 14:00:01 | Rex, Minou, Zoé |
  | 14:29:59 | Rex, Minou, Zoé |
  | 14:30:00 | Minou, Zoé : Rex est parti |

  Médor (annulé) et Pistache (arrivé) ne remontent jamais.
- **Le clic sur la relance de Rex :**
  - le bouton s'appelle « Relance WhatsApp à ZZ-TEST Léa Martin » ;
  - il ouvre `whatsapp://send?phone=213555123456&text=…`, avec +213 de la clinique ;
  - le message décodé est le texte attendu.
- **Les autres vues :** le groupe n'apparaît pas avec les filtres « Manuels » et « Médicaux », ni dans la vue « À venir ».
- **Agenda, menu d'actions :**
  - **Rex et Zoé :** « Relance WhatsApp » entre « Modifier » et « Marquer absent ». Le clic ouvre le bon lien (`213555123456` pour les deux) avec le message du rendez-vous, « à 14 h 30 » ou « à 15 h ».
  - **Minou (pas de numéro exploitable), Médor (annulé) et Pistache (arrivé) :** pas d'entrée. Leurs autres entrées sont celles d'avant.
- **Erreurs :** aucune erreur de console ni de page, en clair comme en sombre.
- **Non-régression :** le parcours de la fiche, des rappels médicaux et du réglage a été rejoué. Son résultat est identique à celui d'avant la correction.

**Vérifications :**
- suite complète : 229 fichiers et 2 063 tests verts ;
- lint sans avertissement sur les fichiers touchés ;
- Ultracite sans remarque sur les nouveaux fichiers, et des comptes identiques avant et après sur les fichiers existants touchés ;
- CSS sans avertissement (lightningcss) ;
- `tsc -b` : 15 erreurs, toutes préexistantes sur master, aucune dans les fichiers touchés.

**Captures** (`captures/`, clair et sombre) :
- la fiche de Zoé, avec la ligne WhatsApp ;
- la fiche de Minou, sans bouton ;
- une ligne de rappel en retard et une à venir ;
- la ligne de réglage « Indicatif pour WhatsApp » ;
- le menu d'actions du rendez-vous de Rex dans l'Agenda, avec « Relance WhatsApp » (`agenda-menu-relance-*`). Le nom du vétérinaire, qui vient de la vraie base, est remplacé à l'écran par « Vétérinaire masqué » avant la capture ;
- le groupe « Rendez-vous dans l'heure » des Rappels à 13 h 30, avec Rex (`rappels-relance-1330-*`).

## 6. Ce qui change de comportement

- **Le geste lui-même :** deux endroits gagnent un bouton et Mon cabinet gagne une ligne. La navigation, le reste de la fiche, le fonctionnement des rappels, l'export CSV et l'impression de la liste d'appels restent identiques.
- **Les deux gardes d'ouverture** acceptent le format `whatsapp://send?…` décrit plus haut, et rien d'autre de nouveau. Le plugin refuse désormais en plus une adresse qui contient un retour à la ligne (voir la section 4).
- **`OwnerContact` :** le composant reçoit un `animal` facultatif. Sans lui, il s'affiche comme avant.
- **Relance du rendez-vous :**
  - le menu d'actions de l'Agenda gagne une entrée ;
  - la vue « Aujourd'hui » des Rappels gagne un groupe en tête, seulement quand un rendez-vous est dans l'heure.
  - Les compteurs des onglets et de l'en-tête des Rappels ne comptent pas ces relances : ils sont inchangés.
- **`WhatsAppLink` :** deux réglages facultatifs, le texte visible et l'action annoncée, ont « WhatsApp » et « Écrire sur WhatsApp » comme valeurs par défaut. La fiche et les rappels médicaux s'affichent donc comme avant.

## 7. Ce qui n'est pas prouvé

**La relance à l'heure dite, dans la vraie app : non prouvée.**
- **Ce qui est prouvé :** le calcul, à la seconde, par les tests ; l'apparition sans recharger, dans le banc navigateur avec une horloge pilotée.
- **Ce qui ne l'est pas :**
  - l'horloge réelle d'un poste, sur une heure entière, dans l'app de bureau ;
  - une fenêtre réduite ou en arrière-plan : le webview peut ralentir les minuteries, mais la page relit l'horloge au retour de la fenêtre ;
  - la mise en veille du poste ;
  - un changement d'heure du système.
- **Ce n'est pas une notification :** la relance apparaît dans la page Rappels. Si personne ne regarde cette page, rien ne prévient : aucun son, aucun toast, aucun badge, et les compteurs ne bougent pas.
- **Rien ne retient qu'une relance a été envoyée :** l'envoi se fait dans WhatsApp, l'app n'en sait rien. La relance reste affichée jusqu'à l'heure du rendez-vous, même après le clic.
- **Le menu de l'Agenda, dans l'app de bureau :** non vu. Il passe par le même `openExternalLink` que le bouton de la fiche, qui n'est lui non plus pas vu dans l'app de bureau.

**Le reste, comme pour le bouton de la fiche :**


- **Ouverture dans la vraie app de bureau :** non faite. Il n'y a plus de build Rust de Baitari dans la VM, et la recompilation attend le mot de l'utilisateur. Le motif ajouté à `tauri.conf.json` n'entre dans l'app qu'à la compilation : il n'a donc encore tourné dans aucune app.
  - **Ce qui est prouvé :** le chemin du code jusqu'à `plugin:shell|open`, et le motif appliqué par la même version du moteur Rust.
  - **Pas encore prouvé :**
    - que Tauri lit bien `plugins.shell.open` à la compilation ;
    - que le système confie `whatsapp://` à l'application.
- **WhatsApp Desktop sous Windows :** l'application doit déclarer le schéma `whatsapp://` auprès de Windows. Les testeurs devront confirmer :
  - qu'elle s'ouvre sur la bonne conversation ;
  - avec le message pré-rempli, accents et retours à la ligne compris.
- **WhatsApp non installé :** comportement non vu, et différent selon le système. Windows peut proposer de chercher une application dans le Store ; Linux ne rien faire. Dans tous les cas, il n'y a ni repli vers wa.me ni requête vers un site. Si le plugin renvoie une erreur, le module d'ouverture essaie ensuite `window.open`, comme pour tout lien externe. Ce que la fenêtre de l'app fait alors d'un lien `whatsapp://`, et donc si le message « WhatsApp n'a pas pu être ouvert. » s'affiche, n'est pas vu.
- **macOS et Linux** avec WhatsApp installé : non vus.
- **Les 9 numéros sans 0 ni + de la copie de la base :** on ne sait pas s'ils sont déjà au format international.
- **Mode navigateur seul (développement) :** `window.open` avec `noopener` rend `null` même quand l'ouverture a lieu. Un clic peut donc y afficher le message d'échec à tort. C'est préexistant, sans effet dans l'app de bureau, et non modifié.

## 8. Décisions

- **Prises le 17 novembre :**
  - l'indicatif +213 pour les numéros qui commencent par 0 ;
  - le lien direct `whatsapp://`, sans wa.me et sans repli ;
  - le soir, après le test réel : le flux principal devient le rendez-vous (menu de l'Agenda et relance 1 heure avant dans les Rappels). La ligne de la fiche reste, comme accès secondaire.
- **Restent ouvertes :**
  - le numéro du contact secondaire, qui n'a pas de bouton ;
  - le nom de la clinique dans le message ;
  - un réglage d'indicatif modifiable, quand un autre pays sera décidé ;
  - **pour la relance :**
    - la garder affichée après l'heure du rendez-vous, par exemple pour un retard ;
    - la compter dans les compteurs et le badge des Rappels ;
    - la signaler par une notification ;
    - retenir qu'elle a été envoyée.

## Refaire le banc

Les outils sont dans `outils/`.
1. `VACUUM INTO` de `~/.config/com.baitari.vetera/baitari.db` vers `base-test.db`, à côté des outils. La copie de la base n'est jamais versionnée.
2. `python3 -I donnees-essai.py base-test.db`.
3. `base-vers-navigateur.py base-test.db store.json` : l'outil de la branche `banc/fable-fraicheur-2026-11-12`.
4. `npx vite --port 5211` dans le worktree, puis `node parcours.mjs sortie` et `node styles.mjs`.
5. Relance du rendez-vous :
   - `python3 -I rendez-vous-essai.py store.json store-rdv.json` ;
   - avec Vite lancé, `node relance.mjs sortie-relance`.
6. Garde Rust :
   - copier `src/lib/whatsapp.ts` en `whatsapp-copie.ts` ;
   - `node --experimental-strip-types cas-rust.ts > cas-rust.json` ;
   - dans `regex-rust/` : `cargo build --offline -j1` ;
   - `target/debug/verif-garde-shell <tauri.conf.json> < cas-rust.json`.
