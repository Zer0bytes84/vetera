import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// The document page can pass typecheck/dev while a manual chunk cycle breaks
// evaluation in the packaged app. Check its emitted static import graph.
export function assertDocumentBundle(manifest) {
  const root = Object.keys(manifest).find(key => manifest[key].file?.includes('/NotesPro-'));
  if (!root) throw new Error('Le module Documents est absent du bundle.');
  const complete = new Set();
  function visit(key, path) {
    if (path.includes(key)) throw new Error(`Dépendance circulaire Documents : ${[...path, key].join(' → ')}`);
    if (complete.has(key)) return;
    if (!manifest[key]) throw new Error(`Module manquant : ${key}`);
    for (const dependency of manifest[key].imports ?? []) visit(dependency, [...path, key]);
    complete.add(key);
  }
  visit(root, []);
  return complete.size;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const count = assertDocumentBundle(JSON.parse(readFileSync('dist/.vite/manifest.json', 'utf8')));
  console.log(`Documents : ${count} modules vérifiés, aucune dépendance circulaire.`);
}
