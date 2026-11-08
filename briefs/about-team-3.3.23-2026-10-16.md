# Restauration À propos, version 3.3.23

L’application installée et ouverte lors de la vérification était /Applications/Baitari.app en version 3.3.22. Les profils avaient été restaurés après sa compilation et n’étaient donc pas inclus dans ce DMG.

Restaurés depuis l’historique Git (parent de c912b29) : Zouhir Kherroubi, Dr Aissa Zeghouini, Karim Abderrahmani. Photos originales, rôles, descriptions et domaines de contribution conservés ; présentation responsive intégrée au style courant dans Paramètres > À propos, pour tous les utilisateurs. Les restrictions administrateur du centre d’activation restent appliquées.

Le numéro était fourni par getAppVersion via une variable d’environnement facultative avec un secours figé à 3.3.0. Il provient maintenant directement de la version du package, synchronisée aux manifests Tauri et Cargo lors de la compilation.

Vérifications : typecheck 0 erreur, lint 0 erreur / 0 avertissement, 740 tests dans 96 fichiers, 13 tests de licences. Sept contrôles UI sous Chromium et WebKit : numéro 3.3.23 visible, trois profils, trois photos décodées, absence de débordement horizontal et aucune erreur React.

Build Apple Silicon 3.3.23 générée localement. Aucun push, tag, release ni remplacement automatique de l’application en cours d’utilisation.
