# Baitari - Audit de reference (aout 2026)

## Objet

Cet audit fixe le point de depart avant la phase de stabilisation produit. Il se base sur le code source actuel, les migrations SQLite, la configuration Tauri et les controles de qualite executes localement.

## Etat valide

- Stack desktop moderne et adaptee: React, TypeScript, Vite, Tailwind, Tauri 2 et SQLite local.
- `npm run build:strict` passe sans erreur TypeScript ni erreur de build.
- La base SQLite utilise WAL, une file d'ecriture et des mecanismes de reparation d'integrite.
- Les briques cliniques existent deja: proprietaires, patients, rendez-vous, SOAP, ordonnances, vaccinations, hospitalisation, anesthesie, rappels et journal d'audit.
- L'application est deja local-first et peut fonctionner sans dependance cloud obligatoire.

## Risques a traiter avant un pilote clinique

### Donnees et securite

1. Les migrations sont dupliquees entre le code TypeScript et des fichiers SQL. Une seule source versionnee doit piloter les evolutions de schema.
2. `src-tauri/vetera.db` est versionne dans Git. Il faut verifier qu'il ne contient aucune donnee reelle, puis le retirer du depot et le remplacer par une base de demonstration reproductible.
3. Les permissions de fichiers Tauri couvrent actuellement des emplacements tres larges. Elles doivent etre reduites aux dossiers necessaires aux sauvegardes et exports.
4. Les roles existent, mais les permissions ne sont pas centralisees ni appliquees de facon uniforme au niveau des services metier.

### Parcours metier

1. Le chemin critique est presque couvert, mais la facturation repose sur des transactions generiques. Les factures, paiements partiels, annulations et remboursements doivent devenir des entites de premier rang.
2. Les statuts de rendez-vous sont encore trop courts pour un flux de clinique complet: planifie, confirme, arrive, en attente, en consultation, termine, annule, absent.
3. Les proprietaires et patients doivent etre consolides autour de fiches fiables avant d'ajouter davantage de tableaux de bord ou de variantes visuelles.

### Qualite et maintenabilite

1. Aucun framework de tests automatise n'est configure. Il faut commencer par les services SQLite et les cas metier du parcours critique.
2. `npm run lint` reussit mais remonte 53 avertissements, principalement des imports ou etats inutilises et des dependances de hooks. Ce n'est pas bloquant aujourd'hui, mais ce ne doit pas rester la norme d'une version pilote.
3. Plusieurs ecrans sont devenus des monolithes: Agenda, Clinique, Patients, Parametres et Assistant IA depassent largement 1 000 lignes. Leur extraction doit etre progressive, module par module, sans refonte globale risquee.
4. Le bundle WebLLM est tres lourd pour les postes Windows modestes. Le modele local doit etre charge uniquement a la demande et isole du chemin de demarrage.
5. La marque est encore incoherente dans certains artefacts (`Vetera` et `Baitari`). Cette dette de nommage doit etre resolue avant la prochaine distribution publique.

## Constats de performance

- Le build produit plusieurs paquets lourds, dont le fournisseur WebLLM a lui seul depasse 6 Mo minifies.
- Les vues sont deja partiellement chargees a la demande, ce qui est une bonne base.
- Les gains les plus utiles sur un PC Windows modeste viendront du chargement differe de l'IA locale, du nettoyage des variantes de dashboard non utilisees, et de la reduction des dependances chargees par le shell initial.

## Regle de sortie pour le pilote

Le pilote ne commence que lorsque le flux suivant est demonstrable avec des donnees persistantes et testees:

`Proprietaire -> Patient -> Rendez-vous -> Consultation SOAP -> Ordonnance -> Facture -> Paiement -> Rappel`

Chaque etape doit produire une trace d'audit, gerer les erreurs previsibles et survivre a une fermeture ou restauration de l'application.
