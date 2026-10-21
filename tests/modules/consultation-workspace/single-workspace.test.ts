import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

function files(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) files(path, out);
    else if (/\.tsx?$/.test(name)) out.push(path);
  }
  return out;
}

const sources = files("src").map((path) => ({ path, text: readFileSync(path, "utf8") }));

it("rend la consultation et la facturation depuis un seul poste de consultation", () => {
  const renderers = (tag: string) =>
    sources.filter(({ text }) => text.includes(`<${tag}`)).map(({ path }) => path);

  expect(renderers("ConsultationSessionDialog")).toEqual(["src/modules/consultation-workspace/consultation-workspace.tsx"]);
  expect(renderers("BillingDialog")).toEqual(["src/modules/consultation-workspace/consultation-workspace.tsx"]);
});

it("ouvre ce poste dans Flux, seul endroit où une visite avance", () => {
  const users = sources
    .filter(({ text }) => text.includes("<ConsultationWorkspace"))
    .map(({ path }) => path)
    .sort();
  expect(users).toEqual(["src/modules/flow-board/flow-board-page.tsx"]);
});

it("fait passer toute demande d'ouverture de visite par Flux", () => {
  const requesters = sources
    .filter(({ text }) => text.includes("vetera:pending-consultation-start"))
    .map(({ path }) => path);
  expect(requesters).toEqual(["src/modules/flow-board/open-in-flux.ts"]);
  const toClinique = sources.filter(({ text }) => /assign\("#\/clinique"\)|pending-clinical-tab/.test(text));
  expect(toClinique.map(({ path }) => path)).toEqual([]);
});
