import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createPostgresStore} from './postgres-store.mjs';
const source=JSON.parse(await readFile(resolve(process.env.ACTIVATION_DATA_DIR||'activation-server/data','licenses.json'),'utf8'));
if(!source.licenses||typeof source.licenses!=='object')throw new Error('Source invalide.');
const storage=await createPostgresStore(process.env.DATABASE_URL||process.env.POSTGRES_URL);
try {
 await storage.transaction(current=>{
  if(Object.keys(current.licenses).length)throw new Error('Migration refusée : le serveur distant contient déjà des licences.');
  current.licenses=source.licenses;
 });
 console.log(`${Object.keys(source.licenses).length} licence(s) migrée(s), identifiants et révocations conservés.`);
} finally {await storage.close();}
