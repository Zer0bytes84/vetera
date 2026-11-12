#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { newJobId } from "./test-harness-plugin.mjs";

/**
 * Runs a script inside the app's window and prints what it returns. The app must be running with BAITARI_TEST_HARNESS=1
 * (see docs/TEST-HARNESS.md).
 *
 *   npm run harness -- job.js                run a file
 *   npm run harness -- --eval "return H.text()"
 *   npm run harness -- --errors              console errors and warnings since the page loaded
 *   npm run harness -- --errors --clear
 *
 * Options: --dir <folder>  (default $BAITARI_TEST_HARNESS_DIR or ./.test-harness)   --timeout <seconds> (default 60)
 * The script is the body of an async function: it receives the helpers as `H` and `return`s a JSON-able value.
 */

const args = process.argv.slice(2);
const take = (flag) => {
  const i = args.indexOf(flag);
  if (i === -1) return null;
  const [, value] = args.splice(i, 2);
  return value ?? null;
};
const has = (flag) => {
  const i = args.indexOf(flag);
  if (i === -1) return false;
  args.splice(i, 1);
  return true;
};
const fail = (message) => {
  console.error(message);
  process.exit(1);
};

const dir = path.resolve(take("--dir") ?? process.env.BAITARI_TEST_HARNESS_DIR ?? ".test-harness");
const timeout = Number(take("--timeout") ?? 60);
const evalCode = take("--eval");
const errorsOnly = has("--errors");
const clear = has("--clear");

let code;
if (errorsOnly) code = `return H.errors(${clear});`;
else if (evalCode !== null) code = evalCode;
else if (args[0]) {
  if (!existsSync(args[0])) fail(`Fichier introuvable : ${args[0]}`);
  code = readFileSync(args[0], "utf8");
} else fail("Usage : npm run harness -- <fichier.js> | --eval \"<code>\" | --errors [--clear]");

if (!existsSync(path.join(dir, "token"))) fail(`Pilote non lancé (pas de ${path.join(dir, "token")}). Démarrez l'app avec BAITARI_TEST_HARNESS=1.`);
const alive = existsSync(path.join(dir, "alive")) ? Date.now() - Number(readFileSync(path.join(dir, "alive"), "utf8")) : Infinity;
if (alive > 15_000) console.error(`Attention : aucune fenêtre n'a interrogé le pilote depuis ${Number.isFinite(alive) ? Math.round(alive / 1000) + " s" : "le démarrage"} (fenêtre fermée, rechargée ou pas encore ouverte).`);

const id = newJobId();
mkdirSync(path.join(dir, "jobs"), { recursive: true });
const tmp = path.join(dir, "jobs", `.${id}.tmp`);
writeFileSync(tmp, code);
renameSync(tmp, path.join(dir, "jobs", `${id}.js`));

const resultFile = path.join(dir, "results", `${id}.json`);
const end = Date.now() + timeout * 1000;
while (Date.now() < end) {
  if (existsSync(resultFile) && statSync(resultFile).size > 0) {
    const result = JSON.parse(readFileSync(resultFile, "utf8"));
    rmSync(resultFile, { force: true });
    console.log(JSON.stringify(result.ok ? result.value : { error: result.error }, null, 2));
    process.exit(result.ok ? 0 : 1);
  }
  await new Promise((r) => setTimeout(r, 200));
}
rmSync(path.join(dir, "jobs", `${id}.js`), { force: true });
fail(`Aucune réponse en ${timeout} s. La fenêtre est-elle ouverte, et rechargée depuis le démarrage du pilote ?`);
