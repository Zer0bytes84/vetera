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

it("ouvre ce même poste dans Clinique et dans Flux", () => {
  const users = sources
    .filter(({ text }) => text.includes("<ConsultationWorkspace"))
    .map(({ path }) => path)
    .sort();
  expect(users).toEqual([
    "src/modules/clinique/components/clinique-view.tsx",
    "src/modules/flow-board/flow-board-page.tsx",
  ]);
});
