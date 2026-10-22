# Footer de la barre latérale

Date : 22 octobre 2026. Commit local, aucun push.

## Ce qui change

**Tous les séparateurs du footer sont retirés**, dans les quatre thèmes : il n'en reste aucun, vérifié par le relevé des filets avant et après. Avant, il y en avait trois empilés :
- un filet gravé au-dessus d'« Accès rapides » ;
- un filet gravé au-dessus du compte, avec un fond de bande ;
- en Premium, le cadre gravé quadrillé autour de la carte du compte.

L'espacement seul délimite le footer : 24 px au-dessus d'« Accès rapides », 16 px avant le bloc identité.

**Un bloc identité propre :**
- l'avatar (32 px), puis le nom et le rôle, chacun sur une seule ligne, sans retour à la ligne ni empilement ;
- le bloc entier ouvre le menu du compte, qui regroupe toutes les actions (Mon profil, Finances, Notifications, Paramètres) ;
- un « ⋯ » discret termine la ligne. Il s'efface quand le bloc fait moins de 220 px de large, pour que le rôle le plus long reste entier ;
- l'avatar est aligné sur les icônes d'« Accès rapides » et le « ⋯ » sur leurs pastilles (mesuré : 25 px et 25 px, 213 px et 212,5 px).

**Le rôle** reprend les libellés de Paramètres, désormais lus à un seul endroit (`src/lib/user-role.ts`). Les deux affichent donc le même texte, « Super Administrateur » compris.

**Les pastilles d'état** passent à 5 px et sont adoucies, leur teinte reste lisible.

## Ce qui ne change pas

- **Aucune fonction supprimée ni déplacée :** vérifié dans l'app, les quatre accès rapides, les quatre actions du menu, l'avatar et le bouton Paramètres en barre réduite sont tous là.
- **Aucun jeton modifié,** dans aucun thème, Premium compris : le diff ne touche aucune déclaration `--…`, seulement des règles de présentation.

**Écart nommé.** Premium change bien, mais seulement dans ce footer, comme demandé. Le reste de Premium n'est pas touché.

## Le rôle en entier

« Super Administrateur », le rôle le plus long, mesure 119 px. La barre ne descend pas sous 240 px de large.

| Largeur de la barre | Bloc | Rôle | « ⋯ » |
| --- | --- | --- | --- |
| 240 px (minimum) | 210 px | entier, une ligne | effacé |
| 260 px | 230 px | entier, une ligne | effacé |
| 360 px (maximum) | 330 px | entier, une ligne | visible |

Ta capture de l'app réelle le confirme : « Zouhir Kherroubi » et « Super Administrateur » tiennent chacun sur leur ligne.

## Captures

- `avant-apres.jpg` : le bas de la barre, avant et après, en Premium clair, Premium sombre, Clean clair et Clean sombre ;
- `super-administrateur-240px.jpg` : le rôle le plus long à la largeur minimale.

`DESIGN.md` est mis à jour : sa règle imposait encore le filet du footer.

## Vérifications

- **Vitest :** 153 fichiers, 1 179 tests verts.
- **Typage :** 0 erreur. **ESLint :** 0 problème.
