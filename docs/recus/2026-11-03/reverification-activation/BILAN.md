# Revérification de l'activation et lenteur à la navigation

Le 03/11/2026. Le problème signalé : l'app revérifie l'activation très souvent, parfois en quelques secondes, et la navigation paraît lente.

## Comment j'ai mesuré

Les mesures viennent de l'application réelle, en `tauri dev` sur le Mac, avec la base réelle et en ligne. Je n'ai lancé aucune requête sur la base moi-même : seule l'appli a lu ses propres données.

Une sonde réservée au mode dev a été injectée par rechargement à chaud. Elle écrivait des durées dans `~/Library/Caches/baitari-eval/perf-probe.jsonl` :

- chaque étape de `checkLicenseAccess` ;
- l'attente et la durée de chaque opération SQLite lente (≥ 50 ms) ;
- les montages et démontages du Gate et ce qu'il affiche ;
- chaque navigation (clic → affichage → file SQLite vide).

Un pilote de navigation, lui aussi réservé au dev, rejouait le même trajet : 2 tours de 9 pages de la sidebar, 3 s par page. Il simulait un retour de focus et une reconnexion, et pouvait recharger l'appli. **La sonde et le pilote ont été retirés avant le commit.** Les mesures brutes sont dans `mesures.jsonl` : seulement des durées et des noms de fonctions, aucune donnée de patient.

Une mesure n'a de sens que si la fenêtre est visible. Masquée, WebKit suspend l'affichage et ralentit les minuteries : un premier clic a alors affiché 124 s ou 719 s. Ces points sont exclus.

## Ce que coûte une vérification (46 vérifications mesurées)

| Étape | Mesuré | Remarque |
| --- | --- | --- |
| Lecture de la licence (SQLite) | 4 à 4 840 ms | Presque tout ce temps est de l'**attente dans la file SQLite unique**. L'exécution réelle prend quelques ms. |
| Code machine (`license_installation_id`, Rust) | 0 à 11 ms | Mis en cache après le premier appel. C'est le seul appel Rust : la vérification de signature et le réseau sont en JS. |
| Vérification de signature (WebCrypto) | 1 à 163 ms | Le haut de la fourchette est au démarrage. |
| Appel réseau `/v1/verify` | 250 à 670 ms en général, **2 945 ms** une fois (15:15:56) | Timeout de 10 s avant ce changement. |
| Écriture de `lastSeen` (SQLite) | 1 à 108 ms | Même file que tout le reste. |
| Total | 41 ms à **5 107 ms** | Le maximum vient d'une vérification lancée au démarrage pendant le chargement des pages (4 840 ms d'attente SQLite). |

En mode hors ligne, la coupure réelle n'a pas été mesurée (voir plus bas).

## La cause mesurée

1. **Une revérification ne bloquait pas la navigation, en ligne et sans erreur.** Pendant la série « avant », il y a eu 12 vérifications, dont 5 en ligne. Le Gate est toujours resté sur « app », sans écran d'attente. Le seul effet visible était l'état `busy`, sans rendu global de l'appli : les enfants du Gate gardent la même référence.
2. **Les secondes viennent de la file SQLite unique**, par où passent toutes les lectures et écritures de l'appli. Pendant les rafales de chargement, une opération y attend jusqu'à 5,3 s. La licence y ajoute une lecture et une écriture à chaque vérification, et attend son tour comme le reste. Elle ne cause pas ces rafales.
3. **Défaut 1, la double vérification au démarrage.** Au-dessus du Gate, le seul `<Suspense>` est celui de `App.tsx`. Quand `AppShell` (chargé en différé) suspend, React 19 masque l'arbre et **arrête puis relance les effets du Gate**. Le Gate relançait alors une vérification forcée en ligne et réinitialisait son minuteur. Mesuré le 03/11 à 14:56 : première vérification en 322 ms, puis une seconde de 5 107 ms.
4. **Défaut 2, l'appli démontée sur une simple erreur.** Une revérification qui échoue localement (base verrouillée, IPC après une mise en veille) renvoyait `allowed: false`. Le Gate remplaçait alors toute l'appli par l'écran de licence, puis la remontait à la vérification suivante, avec perte de l'état et rechargement de toutes les données. Ce chemin vient de la lecture du code. Il n'a pas été provoqué pendant les mesures.
5. **Fréquence** : une vérification toutes les 60 s, plus une en ligne à chaque retour de focus après 60 s, plus une à chaque événement `online`.

## Le correctif

- **Une vérification complète par processus, au démarrage.** Le dernier accès accordé est gardé en mémoire (`getCachedLicenseAccess`). Un remontage du Gate repart de cet accès, sans écran d'attente ni nouvelle vérification.
- **Revérifications en arrière-plan uniquement** (`recheckLicenseInBackground`), sans état `busy`. Un verdict identique ne provoque aucun rendu.
  - Vérification locale du bail au plus toutes les **5 min** (minuteur, retour de focus).
  - Vérification auprès du serveur au plus toutes les **15 min**. Exception : à la reconnexion, si le bandeau hors ligne est affiché, le serveur est interrogé tout de suite.
  - **Timeout réseau de 4 s** en arrière-plan. Le démarrage et les boutons « Réessayer » ou « Vérifier » gardent 10 s.
- **Une vérification qui n'a pas pu s'exécuter ne décide rien** (`transient`). Elle garde l'accès déjà accordé, sans jamais dépasser le bail signé ni le terme de la licence.
- **Hors ligne** : une vérification locale ne fait plus disparaître le bandeau, qui reste jusqu'à ce que le serveur réponde. C'est ce qui permet la nouvelle tentative à la reconnexion.
- **Une demande de vérification en ligne n'est plus absorbée** par une vérification locale déjà en cours. Elle est relancée juste après.

Fichiers : `src/services/licenseRuntime.ts`, `src/components/LicenseGate.tsx`, `src/services/licenseActivationService.ts` (timeout paramétrable). Pas de changement Rust.

## Le modèle de sécurité ne change pas

- Le bail signé est toujours vérifié au démarrage, avec la clé publique figée au build. Un redémarrage refait toujours la vérification complète, car le cache n'existe qu'en mémoire.
- **Révocation** : un code définitif du serveur (`REVOKED`, `EXPIRED`, etc.) s'applique à la vérification en ligne suivante, au plus 15 min d'utilisation plus tard. Avant ce changement, c'était aussi 15 min au minuteur, mais plus souvent en pratique grâce au retour de focus.
- **Bail écoulé, licence expirée, horloge reculée** : détectés localement au plus tard 5 min après, et `getCachedLicenseAccess` refuse de lui-même un accès dont le bail est passé.
- Aucun prolongement local du bail et aucun contournement. La grâce hors ligne (`offlineUntil`, 7 jours signés) est inchangée.

## Mesures avant et après (même trajet, fenêtre visible)

| | Avant | Après |
| --- | --- | --- |
| Navigation, clic → affichage (médiane / max) | 119 / 322 ms (n = 15) | 101 / 181 ms (n = 17) |
| Navigation, clic → données chargées (médiane / max) | 274 / 776 ms | 195 / 576 ms |
| Vérifications pendant la série | 12, dont 5 en ligne | 0 (focus et reconnexion simulés : rien n'était dû) |
| Passages à `busy` du Gate pendant la série | 12 | 0 |
| Vérifications au démarrage | 2, en ligne (322 ms puis 5 107 ms) | 1, en ligne (688 ms) ; le remontage du Gate ne relance plus rien |
| Revérifications d'arrière-plan observées ensuite | – | locales à 15:05 et 15:10 (41 à 43 ms), en ligne à 15:15 (2 960 ms, réseau lent) : aucune n'a changé l'affichage |

L'écart de navigation entre avant et après reste modeste, car la licence ne bloquait pas la navigation dans ces conditions. Le gain mesuré porte sur trois points : le démarrage, la disparition des vérifications pendant l'usage, et l'absence d'effet d'une vérification lente sur l'interface.

## Tests

- `npm run typecheck` : vert.
- `npm test` : 1 372 tests verts sur 1 373. Le seul rouge est hérité de 5e1d78a et sans lien avec ce changement : `type-scale`, `font-size: 15px` sur l'avatar de l'entête (voir `../visibilite-icones/BILAN.md`).
- 7 tests ajoutés dans `tests/services/license-runtime.test.ts` :
  - cache borné par le bail ;
  - planification à 5 et 15 min et timeout de 4 s ;
  - révocation appliquée en arrière-plan ;
  - erreur de lecture qui garde l'accès, mais pas au-delà du bail ;
  - bandeau hors ligne conservé jusqu'à la réponse du serveur ;
  - demande en ligne pendant une vérification locale.
- Pas de `cargo check` : le Rust n'a pas changé.

## Ce qui n'est pas prouvé

- **Windows (WebView2)** : rien n'a été mesuré. La file SQLite, React 19 et le Gate sont les mêmes, mais les durées, en particulier le réseau et le disque, peuvent différer.
- **Build de production** : mesures en `tauri dev` seulement. En production, le chargement d'`AppShell` est plus rapide, donc la fenêtre où le Gate est masqué au démarrage est plus courte. Les 2 s entre la fin de la vérification et l'affichage de l'appli, mesurées en dev, sont le chargement du module, pas la licence.
- **Hors ligne réel** : le Wi-Fi n'a pas été coupé. Le comportement hors ligne (bandeau, nouvelle tentative à la reconnexion, timeout de 4 s) est couvert par les tests, pas par une mesure. La reconnexion n'a été simulée que par l'événement `online`.
- **Le défaut 2** (appli démontée sur une erreur de vérification) vient de la lecture du code et est couvert par un test. Il n'a pas été observé dans l'appli : aucune erreur n'est survenue pendant les mesures.
- **Les « quelques secondes » ressenties** : dans les mesures, la plus longue est l'attente de 5,3 s dans la file SQLite pendant les chargements. Ce correctif retire la contribution de la licence à cette file pendant l'usage, mais pas la file elle-même. Si la lenteur persiste à la navigation, la piste suivante est la sérialisation de toutes les lectures SQLite, à traiter à part.
- **Le remontage au démarrage** par le `<Suspense>` d'`App.tsx` existe toujours. Il n'a simplement plus d'effet sur la licence. Je n'ai pas ajouté de frontière `<Suspense>` autour d'`AppShell`.
