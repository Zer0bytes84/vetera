# Activation Baitari — protocole 2

Le serveur gère les licences et les postes. Il ne reçoit aucun dossier médical.
L’application vérifie les autorisations avec une clé publique P-256 intégrée lors de la compilation. La clé privée reste uniquement sur le serveur.

## Règles d’accès

- Activation : clé + courriel + identifiant d’installation.
- Autorisation signée pour **7 jours maximum**, sans dépasser l’expiration de la licence.
- Contrôle au démarrage, au retour en ligne, au retour dans l’application et toutes les 15 minutes lorsqu’elle reste ouverte.
- Sans réseau, seul un jeton signé encore valide autorise l’accès ; aucune échéance n’est prolongée localement.
- Une révocation ou suppression de poste connue bloque l’accès, y compris après redémarrage hors connexion.
- Une révocation ne peut pas être découverte immédiatement sans réseau : délai maximal égal à l’autorisation restante (7 jours).
- Le recul de l’horloge est détecté par rapport au jeton et à la dernière date observée. Cela ne constitue pas une protection absolue contre un utilisateur qui modifie volontairement le programme ou tous ses fichiers locaux.
- Une sauvegarde de cabinet ne copie plus l’identité du poste, conservée dans un fichier natif distinct.
- Les anciennes clés de 16 caractères sont acceptées ; les nouvelles utilisent 20 caractères aléatoires. Les anciens jetons nécessitent une migration en ligne. Un ancien poste peut devoir être libéré depuis l’administration si la limite est déjà atteinte.
- Le renouvellement de l’autorisation n’allonge jamais un abonnement expiré.

## Administration

Deux interfaces sont disponibles : Paramètres → À propos → Administration des licences dans Baitari, ou [https://baitari-activation.vercel.app/admin](https://baitari-activation.vercel.app/admin) sur le serveur hébergé.
Sur le site, saisissez le contenu du fichier privé `data/admin-token`. Le jeton est gardé uniquement en mémoire dans l’onglet ; il n’est pas écrit dans `localStorage` ni dans un cookie. La connexion est un jeton administrateur, sans compte ni mot de passe séparé.

On peut créer une licence, la révoquer et libérer un poste depuis sa fiche. Libérer un poste permet son remplacement, mais ne rend pas secrète une clé que son ancien utilisateur connaît. Révoquer la licence et en créer une nouvelle si cette clé est compromise.

Les clés de licence sont affichées **une seule fois** et stockées seulement sous forme d’empreintes HMAC. Conserver la clé privée de signature ET le secret HMAC lors d’un changement de serveur ; les perdre invalide respectivement les autorisations ou les clés existantes.

## Essais locaux

```sh
npm run activation:prepare
npm run activation-server
npm run tauri:dev
```

Le premier lancement prépare dans `activation-server/data/` :
- `admin-token` : accès administrateur, privé ;
- `server-secret` : secret HMAC des clés, privé ;
- `signing-private.pem` : clé de signature, privée ;
- `signing-public.txt` : clé publique à intégrer à l’application ;
- `licenses.json` : licences locales.

Vite lit automatiquement **uniquement la clé publique** en développement. Relancer Vite après la préparation initiale. Une seule instance du serveur fichier doit utiliser un même répertoire. Les écritures sont sérialisées et atomiques.

## Hébergement Vercel

Déployer **le répertoire `activation-server`** dans un projet dédié, sans déployer les données privées ni remplacer un site existant. La fonction `api/index.mjs` utilise PostgreSQL, jamais le système de fichiers éphémère de Vercel.

Connecter une base PostgreSQL (par exemple Neon) et définir côté serveur :

| Variable | Valeur |
| --- | --- |
| `DATABASE_URL` | Connexion PostgreSQL fournie par l’intégration, TLS activé |
| `ACTIVATION_ADMIN_TOKEN` | Contenu du fichier privé `admin-token` |
| `ACTIVATION_HASH_SECRET` | Contenu du fichier privé `server-secret` |
| `ACTIVATION_SIGNING_PRIVATE_KEY` | Contenu PEM complet de `signing-private.pem` |
| `ACTIVATION_ALLOWED_ORIGINS` | Facultatif : origines exactes séparées par des virgules |

Les tables `baitari_license_store` et `baitari_license_rate_limits` sont créées automatiquement. Les modifications de licences verrouillent la ligne PostgreSQL dans une transaction, ce qui protège la limite de postes même entre plusieurs fonctions concurrentes. Les limites de requêtes sont partagées entre instances et les adresses sont hachées.

Les origines Tauri usuelles et le serveur de développement `localhost:5180` sont autorisés par défaut. Ajouter explicitement une origine web si une autre interface doit appeler l’API.

Les états de licence locaux ne sont pas automatiquement transférés vers PostgreSQL. Une fois le serveur déployé et sa base vérifiée vide, exécuter depuis le dépôt :

```sh
node activation-server/migrate-remote.mjs --server=https://votre-projet-activation.vercel.app
```

Le script utilise localement `data/admin-token` et transfère les empreintes HMAC, états, dates et appareils via HTTPS. Les clés de licence en clair ne sont jamais présentes dans le fichier local et ne sont pas envoyées. L’endpoint n’accepte l’import qu’une fois, dans un stockage vide ; il refuse de remplacer toute licence existante.

## Compilation et publication de l’application

Configurer deux valeurs **publiques** dans `.env.local` et dans les variables du dépôt GitHub :

```dotenv
VITE_LICENSE_SERVER_URL=https://votre-projet-activation.vercel.app
VITE_LICENSE_PUBLIC_KEY=contenu_de_signing-public.txt
```

Les workflows GitHub lisent ces variables. Toute compilation de production sans URL HTTPS publique ou sans clé publique P-256 valide échoue volontairement. Ne jamais mettre un secret administrateur ou une clé privée dans une variable `VITE_*`.

## Vérification

```sh
npm run test:licenses
npx vitest run tests/services/license-lease.test.ts tests/services/license-runtime.test.ts
npx tsc -p tsconfig.app.json --noEmit
```

Les tests serveur utilisent des répertoires temporaires et des ports isolés. Ils couvrent signatures, redémarrage, expiration exacte, révocation, concurrence des postes, libération d’un poste et configuration de publication. Les tests client couvrent les signatures WebCrypto, le réseau indisponible, les jetons copiés ou modifiés, l’horloge et les refus persistants.
