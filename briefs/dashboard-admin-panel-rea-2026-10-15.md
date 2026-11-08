# Dashboard Premium Baitari : analyse REA et contrat visuel

Date : 15 octobre 2026. Référence verrouillée par l’utilisateur : [Admin-panel](https://github.com/jubayer910/Admin-panel), [Analytics](https://admin-panel-three-puce.vercel.app/admin/analytics). Inspiration visuelle uniquement, aucun code ni jeu de données copié.

## Ressources

Observation directe de la démo dans Chromium à 1440 × 1000. Captures et mesures : `/private/tmp/baitari-dashboard-ref-20261015/`.

- Sidebar mesurée : 264 px, fond gris discret, inset horizontal 12 px, groupes espacés de 14 px. Libellés secondaires plus petits et plus clairs ; navigation active sur surface claire, rayon 8 px.
- Séparateur de la ligne de périodes : deux traits adjacents de 1 px, un sombre puis un clair. La démo utilise un inset sombre #dcdcdc et un inset blanc. Le trait est gravé, pas une bordure épaisse ni une ombre de carte.
- Analytics : une grille de métriques ouverte, valeurs dominantes, variations vertes ou rouges directement sous la valeur, commandes de période groupées au-dessus. Pas de cadres imbriqués ni d’icônes surdimensionnées.
- Démo : Geist, titre 26 px, titres de panneaux 15 px medium. Traduction imposée pour Baitari : SF Pro regular/medium, échelle exclusive 12/13/14/16/18/24 px, maximum 24 px. Ces exigences utilisateur priment sur la police et les tailles de la référence.
- Tokens Baitari de cette surface : #292929 fort, #5D5D5D courant, #7F7F7F secondaire, #F5F5F5 sélection, #F2F2F2 bordure. Le relief gravé emploie une ombre structurelle de #292929 transparent et sa lumière adjacente. En sombre, relief inversé et textes adaptés au contraste.
- Lucide authentique, trait 1, icônes 16/18 px alignées sur les libellés. La famille Hugeicons existante reste inchangée dans Classique et les autres modules.
- Mascottes, images et comportement du compagnon conservés à l’identique.

## Événements

- Un sélecteur commun : Aujourd’hui, 7 jours, 30 jours, 90 jours, 12 mois. Un seul état met à jour les trois cartes, sans modifier les données sources ni les autres rapports.
- Trésorerie : encaissements effectivement payés pendant la période, comparés aux encaissements payés pendant la période immédiatement précédente. Dépenses et net proviennent du même journal et de la même période.
- Suivi patients : patients distincts ayant une visite non annulée et non absente pendant la période, comparés à la période précédente. Aucune courbe ni variation fictive. Les dossiers créés et consultations terminées sont des lectures des mêmes données réelles.
- Actions à suivre : actions actuellement ouvertes dont l’échéance appartient à la période. Comparaison avec les actions encore ouvertes dont l’échéance appartient à la période précédente, explicitement libellée « échéances précédentes ». Il ne s’agit pas d’un historique reconstitué des statuts : aucun état passé n’est inventé. Les actions sans date et stocks actuels gardent leur portée explicite dans les liens/listes existants.
- Si la base précédente vaut zéro : variation indisponible présentée en texte neutre, jamais de faux +100 %. Zéro contre zéro : stable, sans pastille de succès décorative.
- Variations : hausse des encaissements et du suivi en vert, baisse en rouge ; pour les échéances ouvertes, hausse en rouge, baisse en vert. Sens et période sont lisibles sans dépendre de la seule couleur.
- Hover discret, focus clavier visible, chargement et erreur conservés par source. Les liens réutilisent la navigation actuelle.
- Toggle Classique/Premium existant : Classique par défaut en l’absence de préférence, choix explicite conservé, clair/sombre vérifiés. Aucun rebuild du système de thèmes.

## Agents et frontières

Le vétérinaire lit l’activité, accède aux dossiers et traite les priorités. L’assistant et la comptabilité n’ont aucun nouveau comportement. SQLite ne reçoit aucune migration ni opération de nettoyage destructive.

- Dashboard Premium : remplacer les trois modules de synthèse par une seule grille métrique cohérente. La vue classique de navigation et la journée clinique restent disponibles ; en Premium, la même synthèse commune évite les cartes dupliquées. Conserver les rapports et actions existants sous cette synthèse.
- Sidebar Premium : séparateurs gravés entre contenu/sidebar et groupes ; hiérarchie 12 px regular pour groupes, 14 px regular pour items, 14 px medium pour actif. Accès rapides conservés en bas, icônes et pastilles conservant leur signification.
- Classique : aucun nouveau sélecteur ou style appliqué, composants actuels conservés. Seules corrections transverses explicitement demandées : préférence par défaut, salutation accessible unique et retrait des données de test des lectures dashboard.
- TEST ZO : filtre de présentation strict sur ce marqueur et les relations de ces objets. Ne pas supprimer les patients, factures, mouvements ni historiques ; ne pas filtrer des données sur le seul mot « test ».
- Produits : chantier validé, aucune modification de son code ou de sa logique.

## Contrat de réalisation

Chemin code-led : référence déjà imposée et mesurée, pas de nouvelle direction ni de maquette générée.

Premier écran : une seule salutation, le choix de vue conservé, puis une ligne de périodes et trois métriques Trésorerie / Suivi patients / Actions à suivre, aérées mais compactes. Chiffres tabulaires 24 px medium ; titres 14 px medium ; explications 12/13 px regular. Traits gravés horizontaux et verticaux structurent l’ensemble sans cadres arrondis emboîtés. Les rapports existants suivent cette grille, avec la même hiérarchie et des contours fins en Premium.

Interaction signature : changement de période immédiat et commun aux trois cartes, indicateur actif discret, focus clavier stable. Pas d’animation qui floute le texte. Les préférences de mouvement réduit restent respectées.

Vérification : typecheck, lint sans avertissement, suite complète de tests, build frontend ; captures avant/après à 1440 px et 1280 px, clair/sombre, Classique/Premium, sidebar déployée/réduite et contrôle d’une hauteur desktop compacte. Revue finale indépendante et documentation du système après stabilisation.
