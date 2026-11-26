// Chargeur Node pour importer les modules TypeScript purs de src/ sans build :
// "@/x" -> src/x, imports relatifs sans extension -> .ts. À lancer avec
// node --experimental-strip-types --import ./alias-loader.mjs
import { register } from "node:module";
register(new URL("./alias-hooks.mjs", import.meta.url));
