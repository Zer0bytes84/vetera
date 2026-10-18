# Audit design, phase 4 : corrections par page (Dossier patient, Agenda, Clinique)

Aucun commit. Vérifications : `npm run typecheck` 0 erreur, ESLint 0 erreur 0 avertissement, Vitest 116 fichiers et 906 tests réussis. Captures : `avant/` (version commitée bc531dc, servie à part) et `apres/`, thème clair Premium, 1440 px. Les données de démonstration des deux serveurs ne sont pas identiques (rendez-vous du jour différents), les comparaisons portent sur la structure.

## Dossier patient

1. **Huit onglets** : une seule ligne défilante. Les huit onglets restent accessibles : les flèches et les dégradés de bord (qui existaient mais étaient masqués en Premium) sont rétablis ; vérifié, un clic sur la flèche amène « Documents » à l'écran. Aucun onglet regroupé ni supprimé.
2. **Haut de page** : « Retour » passe avant le titre (nouvelle zone `back` de `PageHeader`), « Ouvrir les soins de ce patient » passe dans les actions de l'en-tête commun. Même comportement : Retour va à la liste des patients, l'autre bouton ouvre les soins filtrés sur ce patient (vérifié, y compris « Afficher tous les patients » et les onglets de la Clinique).
3. **Actions de saisie** : les accès restent (carte Poids, carte Vaccination, synthèse du dossier, graphique de poids, carnet de vaccination, liste de complétude) mais un seul libellé, « Ajouter une pesée » et « Ajouter un vaccin », remplace « + Pesée », « + Vaccin », « Nouvelle pesée », « Nouveau vaccin », « Enregistrer un vaccin ». Un seul style : bouton secondaire (contour) 32 px, au lieu d'un mélange de boutons pleins et à contour. Palette de commandes alignée.
4. **Identifiant technique** « #demo_pat » retiré. À sa place : « Puce … » et « Tatouage … » quand ils existent, sinon rien. Ces deux puces ne sont plus répétées parmi les pastilles du haut (une seule apparition). La date d'enregistrement reste.
5. **Notes générales** : texte simple, sans cadre ni fond. Le bouton « Modifier les informations » reste l'accès à l'édition.

## Agenda

1. **Deux listes** : le tableau du bas annonce son périmètre sous son titre, lié à la date choisie : « Rendez-vous des autres jours, hors journée du dimanche 18 octobre. » (Autres jours), « …de la journée du … » (Journée), « …terminés, tous jours confondus » (Terminés), « …à surveiller… » (Attention). L'onglet « Planning » devient « Autres jours » car c'est ce qu'il contient réellement (tout ce qui n'est ni terminé, ni à surveiller, ni de la journée choisie, y compris des jours passés : « À venir après aujourd'hui » aurait été inexact). Les filtres et le classement ne changent pas.
2. **Titres de section** : « Agenda des consultations », « N rendez-vous à coordonner » et « Planning des rendez-vous » sont à 18 px, graisse 500, même approche de lettre (mesuré).
3. **Actions en double** : « Nouveau rendez-vous » reste en bouton plein une seule fois (en-tête). Les deux autres accès (état vide du détail, état vide du tableau) passent en secondaire. « Aujourd'hui » : le bouton d'en-tête est secondaire, celui de la barre de date est une pastille d'état, inchangé.

## Clinique

1. **Onglets** : l'en-tête commun vient d'abord, les onglets Dossiers / Consultations / Soins / Hospitalisation juste dessous, sur les quatre sections (une seule barre à chaque fois, vérifié). Mécanisme : `PageSubnavContext` donne la barre à l'en-tête de la page affichée. Quand la page n'a pas l'en-tête commun (Soins filtrés sur un patient), la Clinique dessine la barre elle-même, donc la navigation ne disparaît jamais.
2. **Bas de page** : le bandeau « Dossier sélectionné » et la carte qui répétait le nom sont fusionnés en un seul bloc (libellé « Dossier sélectionné », nom, type, espèce, créneau, état). Sans sélection, le bandeau d'invite reste. Le propriétaire est représenté par ses initiales sur fond #F5F5F5 (nouveau composant `InitialsAvatar`) à la place de l'émoji.
3. **Tableau** : « Contrôle » reçoit sa puce comme les autres types (Consultation, Vaccin, Chirurgie, Urgence). Les boutons Démarrer / Ouvrir / Facturé ont la même largeur minimale (108 px).

## Limites

- « Terminé » (bouton désactivé en haut de la Clinique) n'était pas dans la liste de la phase 4, laissé tel quel.
- Les listes SQLite (soins, séjours, rappels médicaux) n'ont pas de données dans le navigateur : à revoir avec `npm run tauri:dev`.
- Les initiales remplacent l'émoji seulement dans la Clinique ; les autres pages (Équipe, dossier patient, Agenda) suivront en phase 4 si tu le valides.
