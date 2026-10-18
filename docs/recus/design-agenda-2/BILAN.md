# Agenda refondu : ajustements

Aucun commit. Vérifications : `npm run typecheck` 0 erreur, ESLint 0 erreur 0 avertissement, Vitest 118 fichiers et 921 tests réussis.

Captures : `avant/` et `apres/`, thème clair Premium, 1440 px, plus le thème sombre et le mobile (375 px).

## Corrections

1. **Jour actuel** : le numéro est dans un cercle plein bleu (`--premium-blue`) avec le chiffre en blanc. La case est teintée de bleu à 8 %. Ce marqueur reste visible quand aujourd'hui est aussi le jour sélectionné.

2. **Casse** : les dates sont en minuscules dans tout l'Agenda.
   - Titre de la journée : « dimanche 18 octobre 2026 ».
   - Carte « Charge de la journée » et date du rendez-vous sélectionné.
   - Mois du calendrier : « octobre 2026 ».
   - Jours de la semaine : « lun. … dim. ».
   - Dates des listes « Autres jours » et « Terminés » : « dim. 18 oct. ».

3. **Espacement** : le titre de la journée a 24 px au-dessus. Il est aussi aligné à 24 px du bord gauche, comme la liste. Avant, le thème Premium le collait au bord du cadre.

4. **Calendrier en grille** (style Outlook) :
   - chaque jour est dans sa case, séparé des autres par un trait fin ;
   - la ligne des jours de la semaine forme une bande grise ;
   - les cases hors du mois sont grisées et la dernière semaine est complétée, pour garder des rangées entières ;
   - cases de 72 px de haut : numéro en haut à gauche, pastilles de couleur et nombre de rendez-vous en bas ;
   - le jour sélectionné est entouré d'un cadre de 2 px, sans le fond noir d'avant ;
   - le survol éclaircit la case.

   Sur mobile, seules les pastilles restent : le texte « RDV » est masqué faute de place.

## Inchangé

Tous les jours restent cliquables, ainsi que « Aujourd'hui » et les flèches de mois. Un clic sur un jour le sélectionne et affiche la liste en portée « Journée ». L'étiquette d'accessibilité d'aujourd'hui précise désormais « aujourd'hui ».
