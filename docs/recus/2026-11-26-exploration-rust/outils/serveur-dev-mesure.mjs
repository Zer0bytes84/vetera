// Serveur Vite de développement pour la mesure IPC : configuration du projet, mais cache
// d'optimisation hors du node_modules partagé (cacheDir) et pilote de test activé par l'environnement.
// Lancer depuis la racine : BAITARI_TEST_HARNESS=1 BAITARI_TEST_HARNESS_DIR=<dossier> node <ce fichier> <cacheDir>
import { createServer } from "vite";
const server = await createServer({ configFile: "vite.config.ts", configLoader: "runner", cacheDir: process.argv[2], server: { port: 5180, strictPort: true, host: "127.0.0.1" } });
await server.listen();
server.printUrls();
