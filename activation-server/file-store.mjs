import { readFile, writeFile, rename } from "node:fs/promises";
export async function createFileStore(storePath) {
  let store;
  try {
    store = JSON.parse(await readFile(storePath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    store = { licenses: {} };
  }
  if (!store.licenses || typeof store.licenses !== "object")
    throw new Error("Stockage des licences invalide.");
  let queue = Promise.resolve();
  return {
    read: async () => {
      await queue;
      return structuredClone(store);
    },
    transaction(change) {
      const task = queue.then(async () => {
        const next = structuredClone(store);
        const result = change(next);
        await writeFile(`${storePath}.tmp`, JSON.stringify(next, null, 2), {
          mode: 0o600,
        });
        await rename(`${storePath}.tmp`, storePath);
        store = next;
        return result;
      });
      queue = task.catch(() => {});
      return task;
    },
  };
}
