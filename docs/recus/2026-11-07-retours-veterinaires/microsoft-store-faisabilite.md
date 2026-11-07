# Microsoft Store pour Windows : rapport de faisabilité

Date : 7 novembre 2026. **Rapport seulement : aucune publication, aucun compte créé, aucun fichier de build modifié.**

## En une phrase

C'est faisable par la voie **installateur EXE/MSI signé** avec ce qu'on a déjà (Tauri, NSIS, installateur hors ligne), à condition d'acheter un certificat de signature de code. Cette signature est de toute façon ce qui manque aujourd'hui : elle est la cause des alertes d'Edge et de SmartScreen, Store ou pas.

## Constat sur l'état actuel (lu dans le dépôt)

| Point | État | Conséquence |
| --- | --- | --- |
| Signature Windows | **Aucune.** `certificateThumbprint` est `null` et le workflow `release-updater.yml` ne signe rien côté Windows (seulement macOS, et seulement si les secrets existent). | Cause directe des avertissements Edge et SmartScreen que les vétérinaires ont vus. |
| Installateur | NSIS `*-setup.exe` et `*.msi`, WebView2 en mode `offlineInstaller`. | Déjà hors ligne : exigence du Store remplie. |
| Éditeur (`publisher`) | **Non renseigné.** Tauri le déduit de l'identifiant `com.baitari.vetera`, soit « baitari », identique au nom du produit « Baitari ». | Le guide Tauri indique qu'un éditeur identique au nom du produit rend la soumission invalide. À corriger avant tout. |
| Mise à jour | Greffon `tauri-plugin-updater`, manifeste `latest.json` sur les versions GitHub, mode `passive`. | Compatible avec la voie EXE/MSI (voir plus bas), à désactiver pour une voie MSIX. |
| Données | SQLite local, `sqlite:baitari.db`, dans le dossier de données de l'application. | Une version MSIX n'écrirait pas au même endroit (voir « Voie MSIX »). |
| Fiche | Catégorie `Medical`. La description longue dit « Aucune donnée ne quitte votre **Mac** ». | À réécrire pour Windows avant la fiche du Store. |

## Les deux voies du Store

### Voie A, recommandée : installateur EXE/MSI

Exigences (page officielle des exigences de paquet EXE/MSI) :

- le fichier est un `.exe` ou `.msi`, **hors ligne** (pas de programme d'installation qui télécharge), installation **silencieuse** (une fenêtre UAC est tolérée) ;
- le binaire et **tous ses fichiers exécutables (PE)** sont signés avec un certificat qui remonte à une autorité du programme de racines de confiance de Microsoft. **Un certificat auto-signé est refusé.** Le Store ne re-signe pas ;
- on héberge l'installateur nous-mêmes à une **URL HTTPS directe et versionnée**, dont le fichier ne change plus après soumission ;
- chaque nouvelle version = une **nouvelle URL versionnée à déposer dans le Partner Center**, donc une nouvelle certification ;
- un seul élément dans la liste des programmes installés (pas de logiciel tiers embarqué).

**Mise à jour.** Pour cette voie, Microsoft indique que les mises à jour sont « manuelles : l'application ou l'installateur s'en charge ». L'auto-mise à jour actuelle (GitHub) reste donc possible. Conséquence pratique : il faut tenir à jour **deux** choses à chaque version, la version GitHub pour l'auto-mise à jour et l'URL versionnée dans le Partner Center, sinon un utilisateur qui installe depuis le Store reçoit une version en retard avant de se mettre à jour lui-même.

**Commerce et licence.** Pour les applications Win32 non empaquetées, le guide Microsoft indique que le paiement et la licence passent par notre propre plateforme ou une plateforme tierce. Notre activation par clé et notre serveur de licences sont donc cohérents avec cette voie.

**Installateur Tauri.** Le guide officiel de Tauri décrit cette voie : installateur hors ligne signé, installation silencieuse (`/S` pour le NSIS, `/quiet` ou `/qn` pour le MSI), éditeur différent du produit.

### Voie B, non recommandée pour l'instant : MSIX

Avantages : Microsoft re-signe gratuitement, héberge le paquet, gère les mises à jour.

Obstacles propres à Baitari :

1. **Tauri ne produit pas de MSIX** officiellement (seulement EXE et MSI). Il existe des modèles communautaires, hors documentation officielle : outillage supplémentaire à maintenir.
2. **Les données des cabinets ne suivraient pas.** Une application MSIX écrit dans un espace virtualisé, différent du dossier utilisé par l'installateur actuel : un vétérinaire qui passerait de l'un à l'autre se retrouverait avec une base vide. Il faudrait une migration par export puis import.
3. **L'auto-mise à jour doit être retirée** de la version MSIX (c'est le Store qui met à jour).
4. **Le commerce.** La section 10.8 des règles du Store (transactions financières) est plus stricte pour les biens numériques vendus dans le produit : je n'ai pas pu confirmer qu'elle autorise notre activation par licence achetée ailleurs. Risque de refus à lever avant d'investir.
5. Une application Win32 empaquetée demande la capacité restreinte `runFullTrust`, à justifier dans le Partner Center.

## Ce que le Partner Center demande

- **Compte développeur** : un compte *particulier* ou *entreprise*, **non convertibles** l'un en l'autre. D'après la documentation actuelle, l'inscription est gratuite avec vérification d'identité (pièce officielle et selfie) pour un particulier, et vérification d'entreprise (numéro D-U-N-S recommandé, 2 à 5 jours ouvrés en revue manuelle) pour une entreprise. Des pages plus anciennes parlent d'un paiement unique de 99 USD : **le coût dépend du pays et du parcours, à vérifier à l'inscription.**
- **Choix à faire avant d'ouvrir le compte** : publier à titre personnel ou au nom d'une structure. C'est irréversible, et le nom d'éditeur affiché au public en dépend.
- **Fiche** : nom du produit réservé, description en français, captures d'écran, **adresse de politique de confidentialité**, questionnaire de classification d'âge, catégorie.
- **Certification** : jusqu'à environ trois jours ouvrés par soumission, d'après la documentation.

## Coûts connus

- Certificat de signature de code : la documentation Microsoft cite **150 à 300 USD par an** pour un certificat OV classique, ou **Azure Artifact Signing (environ 10 USD par mois)**. L'éligibilité à Azure Artifact Signing dépend du pays et du statut (particulier ou organisation) : **non vérifiée**.
- Compte Partner Center : voir ci-dessus.

## Ordre de travail proposé (rien n'est engagé)

1. **Décider** : signataire (particulier ou structure) et fournisseur du certificat. Tout le reste en dépend.
2. Renseigner `bundle.publisher`, réécrire la description pour Windows, corriger le copyright.
3. Signer le build Windows dans `release-updater.yml`, **y compris tous les `.exe` et `.dll` embarqués** (le Store exige que chaque fichier exécutable le soit : à lister sur un vrai build Windows, que je n'ai pas pu faire depuis cette machine Linux).
4. Tester l'installation silencieuse sur une machine Windows propre, puis la désinstallation, et vérifier la présence d'une seule entrée dans les programmes installés.
5. Publier chaque installateur à une URL versionnée stable (adresse de version GitHub) et s'engager à ne jamais remplacer le fichier.
6. Ouvrir le compte Partner Center, réserver le nom, rédiger la fiche et la politique de confidentialité.
7. Première soumission en mode non publié pour voir les retours de certification.

## Impact sur ce qui existe

- **Installateur actuel et site de téléchargement** : inchangés. Les deux canaux coexistent.
- **Auto-mise à jour** : conservée sur la voie A. Le seul changement est une étape de plus par version (l'URL du Partner Center).
- **Signature** : bénéfique tout de suite pour le téléchargement direct, indépendamment du Store. Microsoft précise que la réputation SmartScreen d'un nouveau certificat se construit avec le volume de téléchargements : les alertes peuvent donc persister quelque temps sur les premières versions.

## Ce que je n'ai pas pu confirmer

- Le comportement exact de SmartScreen pour une installation lancée par le Store à partir d'un EXE/MSI. Probablement sans l'alerte du navigateur puisque l'utilisateur ne télécharge rien depuis le web, mais la documentation ne le dit pas : **à constater lors de la première certification.**
- La liste des fichiers exécutables d'un build Windows (pas de poste Windows sous la main).
- L'éligibilité à Azure Artifact Signing et le coût réel du compte pour votre pays.
- La conformité de l'assistant d'IA et de la catégorie « Medical » aux règles du Store : à relire dans les règles avant la soumission.

## Sources

- [Tauri v2 : distribuer sur le Microsoft Store](https://v2.tauri.app/distribute/microsoft-store/)
- [Exigences de paquet pour une application MSI/EXE](https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msi/app-package-requirements)
- [Choisir une voie de distribution pour une application Windows](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/choose-distribution-path)
- [Créer une soumission pour une application MSI/EXE](https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msi/create-app-submission)
- [Ouvrir un compte développeur dans le Partner Center](https://learn.microsoft.com/en-us/windows/apps/publish/partner-center/open-a-developer-account)
- [Inscription gratuite pour les développeurs particuliers](https://learn.microsoft.com/en-us/windows/apps/publish/whats-new-individual-developer)
- [Règles du Microsoft Store](https://learn.microsoft.com/en-us/windows/apps/publish/store-policies)
- [Distribuer une application Win32 par le Store](https://learn.microsoft.com/en-us/windows/apps/distribute-through-store/how-to-distribute-your-win32-app-through-microsoft-store)
