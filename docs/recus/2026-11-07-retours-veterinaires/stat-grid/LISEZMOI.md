# stat-grid (TuffUI) : installé et testé de bout en bout

Un seul composant demandé : `stat-grid`. Il s'appuie sur cinq pièces du registre, installées d'abord, une par une, chacune validée (typecheck, lint, son test, tests de charte) avant la suivante : `motion-tokens`, `surface`, `status-pill`, `progress-bar`, `rolling-number`.

## Fichiers
`src/lib/motion-tokens.ts` · `src/components/ui/{surface,status-pill,progress-bar,rolling-number,stat-grid}.tsx` · `tests/components/tuffui/*.test.tsx` (22 tests) · `src/design-system/tokens.css` (quatre noms de couleur rattachés à nos teintes).

## Adaptations (le thème n'est pas importé)
- **Jetons** : `brand`, `positive`, `negative`, `warning` pointent vers `--tone-blue/green/rose/amber` (contrastes déjà mesurés, clair et sombre, Clean et Premium). Le thème TuffUI écraserait `--surface` et `--surface-raised`, qui existent chez nous avec un autre sens : non importé.
- **Surfaces** : le cadre (`Shell`) est notre `bg-frame`, le panneau notre `bg-surface`.
- **Dépendances** : aucune nouvelle (`motion` était déjà là) ; icônes Phosphor remplacées par lucide.
- **Charte** : 11, 15 et 26 px ramenés à 12, 16 et 24 px (échelle du projet) ; textes lus par les lecteurs d'écran, nombres et pourcentages en français.
- Licence MIT de TuffUI : l'en-tête est conservé dans chaque fichier.

## Vérifié dans l'app (quatre thèmes, captures `stat-grid-*.png`)
Couleurs réelles (vert `#0f7a55` / `#34d399`, rose, bleu), chiffres de 24 px, rayon de 22 px du cadre, **clic** qui remonte la bonne statistique, **changement de valeur** (« 26 700 » vers « 13 905 » : chaque roue se place sur son chiffre), aucune erreur de console.

## Non fait, volontairement
Le composant n'est branché sur aucun écran : il remplace aucun widget existant. Prochaine pièce au choix.
