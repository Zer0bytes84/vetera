# Premium par défaut : reprise des anciennes préférences

Premium était déjà le défaut d’une installation neuve, mais les anciens stockages contenant visualStyle=classic étaient conservés sans migration. Cela pouvait réafficher l’ancien style lors d’un test navigateur sur une origine déjà utilisée.

Ajout d’une migration unique `baitari-premium-default-v1` dans getThemeConfig : passage à Premium des anciennes configurations, conservation des autres paramètres. Une première installation démarre aussi en Premium. saveThemeConfig marque les choix explicites comme postérieurs à cette migration ; le toggle Classique/Premium reste fonctionnel et les changements ultérieurs sont conservés.

Aucun compte, mot de passe, donnée clinique ou licence modifié. Même logique partagée par le navigateur et Tauri. Correctif actif en développement ; pas de nouveau build natif, push, tag ou release.

Vérifications : typecheck 0, lint 0/0, 769 tests réussis dans 99 fichiers. Chromium et WebKit : 12 contrôles, dont installation neuve et ancien stockage Classic, puis retour explicite à Classic et à Premium après rechargement.
