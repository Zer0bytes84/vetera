# Hospitalisation au standard des autres vues, 19 novembre 2026

**La branche :** `chantier/lot-hospitalisation-widgets-2026-11-19`, dans `~/work/lot-wt`, partie de master `0226fdc`.
- Commits locaux, rien n'est poussé, fusionné ni tagué.
- La partie « premières rangées de widgets » du lot a son propre bilan (`../premieres-rangees/`).

**La demande :** Hospitalisation, dernière vue restée sur l'ancienne interface, passe au standard actuel. **C'est de la présentation seulement.**

## 1. Avant

Captures dans `hospi-avant/`, en clair et en sombre, pour les quatre vues et le détail d'un séjour.
- **Cartes et blocs :** des cadres blancs cerclés d'un trait (`border-[#F2F2F2]`, plus des règles Clean dans `premium-workspace.css` qui ajoutaient une bordure de 1 px et des filets sous les en-têtes).
- **Ni bande grise ni bande « Chiffres clés ».**
- **L'action principale :** posée à côté des onglets.

## 2. Ce qui change

- **La bande « Chiffres clés » en tête,** comme dans Soins et sur les autres pages, avec trois cartes :
  - **Séjours actifs :** le détail admis, en cours et sorties prévues ;
  - **Places libres :** sur les emplacements en service ;
  - **Sorties prévues :** avec la prochaine (date, heure, patient).
  - Elles sont calculées à partir des séjours et des emplacements que la page lit déjà, sans nouvelle lecture.
- **L'action principale de la vue :** « Admettre un patient », ou « Créer un emplacement » dans la vue Emplacements, passe dans la bande, en pilule. C'est le même bouton, avec le même gestionnaire.
- **Les quatre vues** (Séjours, Occupation, Tournée, Emplacements) gardent leurs onglets segmentés.
- **Le contenu de chaque vue** est dans une bande grise avec son en-tête (icône Heroicons 20 pleine, titre, quelques mots) :
  - **Séjours :** les séjours forment un panneau blanc à lignes séparées ;
  - **Emplacements et Tournée :** les cartes sont posées sur la bande, sans trait ;
  - **Occupation :** l'occupation tient dans un panneau. Sa version compacte du Tableau de bord ne change pas.
- **Tournée :** la carte choisie se distingue par une teinte d'accent sur son fond, au lieu d'un trait de couleur. Son bouton « Soins et constantes » reste plein, comme avant.
- **Le détail d'un séjour :**
  - **l'en-tête** (patient, motif, journées) et chaque bloc deviennent une bande grise avec en-tête et panneau : Emplacement, Parcours du séjour, Constantes, Plans de soins, Soins du séjour, Historique, Contrôle à la sortie, Facturation ;
  - **« Ajouter un relevé »** passe à droite de l'en-tête Constantes ;
  - **les cadres des courbes** perdent leur trait au profit d'un fond léger.
- **Les pièces :**
  - **une brique :** `stay-section.tsx`, faite des composants existants `Shell`, `ShellHeader` et `Panel` ;
  - **le code de la page :** `stays-page.tsx` est réécrit lisiblement, avec les mêmes états, gestionnaires, textes et dialogues ;
  - **les règles retirées :** les règles Clean de l'ancienne interface (`premium-workspace.css`), qui ne visaient que ces cartes et ces blocs.

**À valider, parce que c'est ajouté et pas seulement déplacé :**
- la bande « Chiffres clés » et ses trois chiffres ;
- la place de la pilule ;
- la teinte de sélection dans la Tournée.

## 3. Les preuves

**Le banc :** l'application assemblée, avec une copie de la base du banc à laquelle on ajoute :
- quatre emplacements `ZZ-TEST` ;
- quatre séjours `ZZ-TEST` (admis, en cours, sortie prévue, sorti) ;
- trois relevés de constantes.

L'outil est `outils/sejours-essai.py`. Les lectures SQLite natives passent par cette copie, en lecture seule (`outils/banc.mjs`).

- **Aucun comportement modifié** (`controles-avant.json` et `controles-apres.json`, outil `outils/hospi-controles.mjs`). Tous les contrôles interactifs (boutons, champs, listes, onglets), avec leur libellé et leur état actif ou inactif, sont **identiques avant et après** :
  - dans les quatre vues ;
  - dans la Tournée avec un patient choisi ;
  - dans les quatre états du détail (admis, en cours, sortie prévue, sorti) ;
  - dans le dialogue d'admission.
  - Aucune erreur de console.
- **La finition** (`outils/hospi-mesure.mjs`), en clair et en sombre :
  - toutes les bandes font 22 px, sans bordure ni ombre ;
  - tous les panneaux font 16 px, sans bordure ;
  - plus aucun élément à trait hors des séparateurs de lignes (annulation du séjour, relevés) et des infobulles de graphique.
- **Les captures** sont dans `hospi-apres/`, en clair et en sombre.
- **Les contrôles :** typecheck 0, lint `--max-warnings=0` 0, **2 120 tests verts**.

## 4. Ce qui n'est pas prouvé ou reste ouvert

- **Les panneaux hors première rangée** (la liste, les emplacements, les blocs du détail) portent l'ombre générale des panneaux Clean du 13 novembre, comme ceux des autres vues. Le retrait de cette ombre partout est la décision en attente du bilan des premières rangées.
- **Les données réelles d'hospitalisation ne sont pas vues :** la copie de la base n'en a pas, d'où les cas `ZZ-TEST`. Les dialogues de plan de soins, de relevé et de transfert n'ont été ouverts que pour l'admission.
- **L'app de bureau n'a pas été vue,** et les thèmes autres que Clean non plus.
