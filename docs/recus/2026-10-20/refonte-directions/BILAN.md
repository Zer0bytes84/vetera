# Refonte design, étape A : trois directions sur le tableau de bord

Date : 20 octobre 2026. Aucune ligne de code de l'application n'a été modifiée. Ce sont des maquettes HTML, rendues à 1440 × 900 (rétina), qui servent à choisir une direction.

## Données

- **Réel** : la copie de test de la base (instance de test `BAITARI_DATA_DIR`), lue en lecture seule le 20 octobre à 23 h 09. 5 visites, 4 terminées, Rifka à facturer, 14 000 DA encaissés dans la journée, 57 500 DA sur 30 jours, 4 000 DA à recouvrer.
- **Vide** : une clinique neuve, tous les tableaux vides.
- **Charge** : pire cas pour la mise en page. Les noms de la copie de test, plus des cas extrêmes (« Princesse Mia de la Vallée », « Benabderrahmane-Bouzidi Mohamed-Amine »), 22 visites, 2 hospitalisés, 4 alertes de stock. Un bandeau le signale sur chaque capture : ce ne sont pas des données de la clinique.

Tous les chiffres sont calculés par un seul modèle (`maquettes/model.js`) : les trois directions affichent exactement les mêmes valeurs.

## Fichiers

- `avant/` : l'existant (vue Analyse et vue Clinique, captures du 20 octobre).
- `a-registre-*`, `b-service-*`, `c-carnet-*` : pour chaque direction, `reel`, `sombre`, `vide`, `charge` ; le suffixe `-page` est la page entière.
- `maquettes/` : les maquettes elles-mêmes (ouvrir via un serveur local, par exemple `python3 -m http.server` dans ce dossier).
