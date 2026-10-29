# Gemma 4 grisée en attendant son correctif (28 octobre 2026)

**Pourquoi.** Sur la release, Gemma 4 se charge, puis ne rend aucun jeton sur le Plan transcrit, jusqu'au délai de 480 s : l'étape « Note prête à relire » reste figée à « 0 caractères ». Le diagnostic est dans [port-dictee-original](../port-dictee-original/README.md), § 5.

**Ce qui change**

| Endroit | Comportement |
|---|---|
| `local-ai/generator-choice.ts` | `GEMMA4_SUSPENDED = true`. Tant qu'il vaut `true`, toute note est rédigée par Gemma 3, **y compris sur un poste qui avait choisi Gemma 4**. |
| Paramètres, carte « Nouvelle version de l’Assistant IA » | L'interrupteur « Utiliser la nouvelle version » est non cliquable (`disabled`), décoché et grisé, avec la mention « Temporairement indisponible : cette version est en cours de correction. L’assistant actuel rédige vos notes. » |
| Toast proposant la nouvelle version | N'est plus proposé tant que la version est suspendue : elle ne servirait à rien. |
| Toast « Nouvelle version installée » | Le bouton « Essayer » est retiré ; la mention d'indisponibilité est ajoutée. |

**Ce qui ne change pas**
- **Le code de Gemma 4** est intact.
- **Le téléchargement** reste possible depuis la carte des Paramètres (2 Go).
- **La préférence enregistrée** (`baitari.generator`) n'est ni effacée ni réécrite : elle est seulement ignorée.
- **Le banc de développement** peut toujours forcer Gemma 4 (`?generator=gemma4`) pour mettre au point le correctif.

**Réactiver.** Passer `GEMMA4_SUSPENDED` à `false`. Les postes qui avaient choisi Gemma 4 la retrouvent alors sans autre manipulation.

**Tests.** 1 263 verts (1 260 avant).
- Nouveaux : une préférence Gemma 4 donne Gemma 3 et reste stockée ; pas de proposition pendant la suspension ; interrupteur `disabled`, décoché, avec la mention.
- Les tests existants du comportement réactivé passent `suspended = false`.

Typecheck et ESLint à zéro. Pas de capture d'écran dans cette note.
