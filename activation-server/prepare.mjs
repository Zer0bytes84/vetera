import { createActivationServer } from './server.mjs';
await createActivationServer();
console.log('Configuration prête. Clé publique : activation-server/data/signing-public.txt. Jeton administrateur : activation-server/data/admin-token. Aucun secret affiché.');
