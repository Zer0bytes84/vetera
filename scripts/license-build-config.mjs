import { createPublicKey } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export function validateLicenseBuild(url, publicKey) {
  let endpoint;
  try {
    endpoint = new URL(url);
  } catch {
    throw new Error(
      "VITE_LICENSE_SERVER_URL doit être une adresse HTTPS publique."
    );
  }
  if (
    endpoint.protocol !== "https:" ||
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash ||
    /^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[|.*\.localhost$)/i.test(
      endpoint.hostname
    )
  ) {
    throw new Error(
      "La version distribuée nécessite un serveur HTTPS public, sans identifiants ni paramètres dans l’URL."
    );
  }
  try {
    const key = createPublicKey({
      key: Buffer.from(publicKey || "", "base64"),
      format: "der",
      type: "spki",
    });
    if (
      key.asymmetricKeyType !== "ec" ||
      key.asymmetricKeyDetails?.namedCurve !== "prime256v1"
    )
      throw new Error();
  } catch {
    throw new Error(
      "VITE_LICENSE_PUBLIC_KEY doit contenir la clé publique P-256 du serveur (signing-public.txt)."
    );
  }
}

export function licenseBuildConfig(command, env, root) {
  const url =
    env.VITE_LICENSE_SERVER_URL ||
    (command === "serve" ? "http://127.0.0.1:8787" : "");
  let key = env.VITE_LICENSE_PUBLIC_KEY || "";
  if (command === "serve" && !key) {
    try {
      key = readFileSync(
        resolve(root, "activation-server/data/signing-public.txt"),
        "utf8"
      ).trim();
    } catch {
      /* The UI explains how to configure activation. */
    }
  }
  if (command === "build") validateLicenseBuild(url, key);
  return {
    "import.meta.env.VITE_LICENSE_SERVER_URL": JSON.stringify(url),
    "import.meta.env.VITE_LICENSE_PUBLIC_KEY": JSON.stringify(key),
  };
}
