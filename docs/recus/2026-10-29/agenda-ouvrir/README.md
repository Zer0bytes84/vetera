# Agenda « Ouvrir » porté depuis la copie (29 octobre 2026)

Branche `feat/dictee-turbo-native`. Commit local, aucun push.

**Source :** la copie du Bureau, en lecture seule, avec son correctif validé le 27 octobre. Ce correctif est non commité, sur sa base `2d3ff49`.

## Comportement

Dans l'Agenda, vue Liste, le menu « … » d'une ligne propose « Ouvrir ». Ce bouton n'ouvre plus le panneau de détail : il envoie la visite au Flux par `startInFlux`. Le Flux traite ensuite la demande avec `useFluxRequests`, inchangé :

| Rendez-vous | Effet dans le Flux |
|---|---|
| Neuf (planifié, confirmé, arrivé, en attente) | La visite passe en consultation (`in_progress`) et le poste de consultation s'ouvre. |
| Terminé | La carte est ciblée dans la colonne Terminé. Le statut ne change pas. |
| Déjà en consultation | Le poste s'ouvre. |

## Port, fichier par fichier

Les cinq fichiers ont **0 ligne d'écart** entre la base de la copie et l'original. Leur diff a été relu hunk par hunk : il ne contient que ce correctif. Il est appliqué tel quel, et les cinq fichiers sont maintenant identiques à ceux de la copie.

| Fichier | Changement |
|---|---|
| `src/app/config/view-registry.tsx` | `AgendaPage` reçoit `onNavigate`. |
| `src/modules/agenda/pages/agenda-page.tsx` | Transmet `onNavigate` au modèle. |
| `src/modules/agenda/hooks/use-agenda-page-model.tsx` | Ajoute `openAppointmentInFlux`, qui appelle `startInFlux(appointment.id, onNavigate)`. |
| `src/modules/agenda/components/agenda-view.tsx` | Passe `onOpenAppointment={openAppointmentInFlux}` à la liste. |
| `src/components/AgendaListView.tsx` | « Ouvrir » appelle `onOpenAppointment`, ou à défaut la sélection comme avant. |

`src/modules/flow-board/open-in-flux.ts` est identique dans la copie et dans l'original, et n'est pas touché.

**Ajouts propres à l'original :**
- le test `tests/modules/agenda/agenda-ouvrir.test.ts`, qui fige le chemin Agenda → Flux et la règle « démarrer seulement avant consultation » ;
- le scénario de démonstration `scripts/eval-local-ai/capture-agenda.ts`.

## Démonstration

L'instance de démonstration est isolée et utilise une sauvegarde de la base réelle, faite en lecture seule. Dans cette copie seulement, deux rendez-vous sont placés aujourd'hui :
- Dora, terminé, à 04:00 ;
- Mocha, planifié, à 11:00.

La base réelle est intacte.

| Cas | Captures | Mesure (`mesures.json`, `statuts.txt`) |
|---|---|---|
| Terminé (Dora) | `clean-light-termine-agenda-menu.jpg`, puis `clean-light-termine-flux.jpg` | Route `#/flux`, carte Dora ciblée dans Terminé, aucun poste ouvert. Statut `completed` avant et après. |
| Neuf (Mocha) | `clean-light-neuf-agenda-menu.jpg`, puis `clean-light-neuf-flux.jpg` | Route `#/flux`, poste « Consultation · Mocha » ouvert, « En cours ». Statut `scheduled` avant, `in_progress` après. |

Dans les deux cas, la demande est consommée : aucune clé ne reste en `sessionStorage`.

## Vérifications

- **Vitest :** 1 279 verts, dont les 2 nouveaux. Typecheck et ESLint à zéro.
- **Hors périmètre, non touchés :** dictée, widgets, ports, schéma, identifiant de l'app.
