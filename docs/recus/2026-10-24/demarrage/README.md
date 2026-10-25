# Écran de chargement au démarrage, minimaliste

Date : 24 octobre 2026. Commit local, aucun push. Retour d'Aïssa : les étapes techniques affichées à chaque lancement agaçaient.

## Avant

Au lancement, deux écrans se succédaient :
1. **« Préparation de votre espace »** : le logotype, une pastille avec un spinner, un halo vert. Les couleurs étaient codées en dur et le clair était imposé : en thème sombre, le mot « Baitari », écrit en blanc, devenait presque invisible (capture `avant/chargement-sombre`).
2. **« Vérification de votre licence · Connexion au serveur d'activation… »** : la carte de la porte de licence, affichée pendant toute la vérification, même quand tout va bien.

## Après

Un seul écran d'attente, `StartupSplash` (`src/components/startup-splash.tsx` et `.css`), utilisé pour les deux attentes :
- **contenu** : le fond de la charte (`--background`) et, au centre, la marque Baitari (le « b+ », 34 px), rien d'autre. Aucun texte visible ; un libellé « Chargement de Baitari » reste réservé aux lecteurs d'écran ;
- **pas de clignotement** : rien n'apparaît pendant les 300 premières millisecondes. Un démarrage rapide ne montre donc que le fond, puis l'app ;
- **animation choisie** : une respiration lente.
  - Au-delà de 300 ms, la marque apparaît en 240 ms (courbe de sortie douce).
  - Elle respire ensuite en boucle : opacité de 0,55 à 1 et échelle de 0,96 à 1, sur 1,8 s dans chaque sens (aller-retour de 3,6 s), courbe `ease-in-out`.
  - Seules l'opacité et la transformation sont animées.
  - **Mouvement réduit** : apparition en fondu, sans respiration ni changement d'échelle.

Mesuré dans le navigateur, thème sombre : opacité 0 à 100 et 250 ms, 0,53 à 450 ms, puis 0,58, 0,84 et 1 au fil de la respiration ; fond `#111214`, celui de la charte.

## Ce qui ne change pas

- **Vérifications de démarrage** : les mêmes, au même moment, avec les mêmes délais (lecture de la configuration, authentification, vérification de licence au lancement puis périodique). Seul l'affichage pendant l'attente change.
- **Erreur de licence** : si la vérification revient avec un refus (licence invalide, révoquée, poste libéré, hors connexion expiré), la carte « Licence de ce poste » s'affiche exactement comme avant, avec son message, son formulaire d'activation et « Vérifier l'activation existante ». L'écran d'attente n'apparaît que tant qu'aucune réponse n'est arrivée.
- **Échec de démarrage** : l'écran de récupération (`AppStartupRecoveryState`) prend le relais, inchangé.
- **Reste de l'app** : non touché.

## Captures

- `avant/chargement-clair`, `avant/chargement-sombre` : l'ancien écran (en sombre, il restait clair).
- `apres/chargement-clair`, `apres/chargement-sombre` : le nouvel écran.

Les captures sont prises en retardant volontairement le chargement du module de l'app dans le navigateur de test.

## Vérifications

- Typage : 0 erreur. ESLint : 0 problème.
- Vitest : 158 fichiers, **1 231 tests verts** (même compte).
- **Non vérifié** :
  - la porte de licence, inactive dans le navigateur de développement : le passage attente puis carte de licence n'a été contrôlé qu'à la lecture du code ;
  - la fenêtre Tauri.
