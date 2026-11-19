# Pourquoi la 5.1.0 ne s'est pas installée sur le Mac, 18 novembre 2026

**Le fait de départ, relevé par l'utilisateur dans Paramètres > Nouveautés :** l'app installée sur le Mac est la **5.0.11**, la version annulée bâtie depuis `ad9ecd3`. Ce n'est pas la 5.1.0. Le panneau « 5.1.0 » vu ce soir était la notification de mise à jour.

## 1. Le serveur de mise à jour est sain

**Le flux :** `latest.json` de la release `v5.1.0` (publiée, marquée « Latest », copie dans ce dossier).
- Il donne la version `5.1.0`.
- Il pointe pour `darwin-aarch64` vers `v5.1.0/Baitari.app.tar.gz`.
- Il a le même format que le flux de la 5.0.10.

**Le paquet Mac `Baitari.app.tar.gz`,** téléchargé et vérifié (`outils/verifier-signature.py`) :
- **la signature est valide** avec la clé publique embarquée dans la 5.0.11 (`5A0E085A90A55646`). C'est la même clé que dans la 5.1.0. La vérification se fait comme le plugin : minisign, empreinte BLAKE2b, signature du commentaire de confiance comprise ;
- **la signature du `latest.json` est identique au `.sig` publié** ;
- **le paquet contient bien une 5.1.0** : `Info.plist` en 5.1.0, avec le même identifiant `com.baitari.vetera`.

Une 5.0.11 peut donc découvrir, télécharger et vérifier la 5.1.0. Rien ne bloque côté publication.

## 2. Ce qui s'est passé sur le poste

Les deux réglages de mise à jour ont été lus dans une copie de la base de l'app du Mac : `app_settings`, copie faite par l'API de sauvegarde SQLite en lecture seule, sans toucher à l'original.

| Clé | Valeur | Écrite le |
|---|---|---|
| `updates.dismissed_version` | `5.1.0` | 19/11 01:42:18 UTC, soit 20 h 42 à l'heure du Mac |
| `updates.last_checked_at` | 19/11 01:54:36 UTC | |

**Le circuit** (`src/services/updateService.ts`) :
- au démarrage, une notification « Baitari 5.1.0 est disponible », qui affiche les notes, avec « Installer » et « Plus tard » ;
- `dismissed_version = 5.1.0` est écrit dans deux cas :
  - **« Plus tard »** ;
  - **un échec de `downloadAndInstall()`.** L'app affiche alors « Vous pourrez réessayer au prochain lancement », ce qui est faux ;
- au démarrage suivant, une version refusée n'est plus notifiée ;
- **l'interface n'a aucune vérification manuelle.** `checkForAppUpdates` n'est appelée que par `startAppUpdateCheck`, au démarrage. Le paramètre `userInitiated`, qui ignorerait la version refusée, n'est utilisé nulle part.

**Conclusion :**
- à 20 h 42, la 5.1.0 a été soit reportée avec « Plus tard », soit tentée sans succès. Les deux laissent la même trace, et je ne peux pas les départager d'ici : la console de l'app n'est pas journalisée sur disque ;
- **depuis, l'app ne proposera plus jamais la 5.1.0 à ce poste.** Une version plus récente, comme la 5.1.1, sera proposée, puisque le refus est noté par numéro de version.

## 3. Ce qui n'est pas prouvé

- **Le bouton cliqué à 20 h 42 :** « Plus tard » ou un échec d'« Installer ». Seul l'utilisateur peut le dire.
- **L'endroit d'où tourne la 5.0.11** (`/Applications` ou un dossier de build) : le partage de la VM ne montre que le dossier personnel du Mac. Une app lancée depuis une image disque montée ne peut pas être remplacée par la mise à jour.
- **La 5.1.0 installée sur un Mac :** jamais vue ici.

## 4. Ce qui reste vrai pour la vraie 5.1.0

La panne du dossier patient, de Soins et d'Hospitalisation (bilan `../fix-dossier-patient-510/`) a été mesurée sur le code de la 5.1.0 assemblé, pas sur la 5.0.11. Les paquets publiés de la 5.1.0 contiennent les mêmes morceaux partagés, aux mêmes empreintes. La vraie 5.1.0 a donc très probablement la même panne, comme la 5.0.10. C'est probable, pas prouvé sur un poste.

**L'essai décisif :** le testeur qui a la vraie 5.1.0 ouvre un dossier patient, puis Soins.

## 5. Corrections proposées (sur ton mot)

1. **Débloquer le Mac maintenant,** au choix :
   - installer `Baitari_5.1.0_aarch64.dmg` depuis la release ;
   - ou attendre la version corrective, qui sera proposée normalement.
   - Vider le réglage dans la base est possible, mais c'est une écriture dans la vraie base : seulement si tu le décides.
2. **Dans la version corrective,** corriger le circuit de mise à jour :
   - un échec d'installation ne doit pas marquer la version comme refusée ;
   - ajouter une vérification manuelle dans Paramètres (`checkForAppUpdates({ userInitiated: true })`).
