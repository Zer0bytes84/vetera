import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));
const arg = process.argv.find((value) => value.startsWith("--server="));
const base = (arg?.slice("--server=".length) || process.env.ACTIVATION_SERVER_URL || "")
  .replace(/\/$/, "");
if (!base || new URL(base).protocol !== "https:") {
  throw new Error("Indiquez un serveur HTTPS avec --server=https://…");
}

const [storeText, adminToken] = await Promise.all([
  readFile(join(root, "data", "licenses.json"), "utf8"),
  readFile(join(root, "data", "admin-token"), "utf8"),
]);
const localStore = JSON.parse(storeText);
const localLicenses = localStore?.licenses;
if (!localLicenses || typeof localLicenses !== "object")
  throw new Error("Le fichier local de licences est invalide.");
const licenseCount = Object.keys(localLicenses).length;
if (!licenseCount) throw new Error("Aucune licence locale à transférer.");

const headers = {
  "x-admin-token": adminToken.trim(),
  "content-type": "application/json",
};
async function readJson(path, options = {}) {
  const response = await fetch(base + path, {
    ...options,
    headers: { ...headers, ...(options.headers ?? {}) },
    cache: "no-store",
  });
  let payload = {};
  try {
    payload = await response.json();
  } catch {
    // Keep transport failures concise; never print request or credential data.
  }
  if (!response.ok)
    throw new Error(payload.error || `Le serveur a répondu ${response.status}.`);
  return payload;
}

await readJson("/v1/admin/verify");
const remote = await readJson("/v1/admin/licenses");
if (!Array.isArray(remote.licenses))
  throw new Error("Réponse inattendue du serveur distant.");
if (remote.licenses.length !== 0)
  throw new Error("La base distante n’est pas vide ; aucun transfert n’a été lancé.");

const result = await readJson("/v1/admin/migrate-import", {
  method: "POST",
  body: JSON.stringify({ licenses: localLicenses }),
});
if (result.imported !== licenseCount)
  throw new Error("Le serveur n’a pas confirmé toutes les licences.");
console.log(`${result.imported} licences transférées. Aucune clé en clair n’a été envoyée.`);
