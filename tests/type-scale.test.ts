import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

// Charte: 12 / 13 / 14 / 16 / 18 / 24 px. Printed A4 layouts and the
// first-run screens keep their own sizes on purpose.
const ALLOWED = new Set([12, 13, 14, 16, 18, 24]);
const EXEMPT = /print-layout|SetupWizard|setup-wizard\.css|welcome-artwork\.css/;

function files(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) files(path, out);
    else if (/\.(tsx?|css)$/.test(name) && !EXEMPT.test(path)) out.push(path);
  }
  return out;
}

it("n’utilise aucune taille de texte libre hors de l’échelle de la charte", () => {
  const offenders: string[] = [];
  for (const path of files("src")) {
    const source = readFileSync(path, "utf8");
    if (!path.endsWith(".css")) {
      for (const match of source.matchAll(/text-\[(\d+(?:\.\d+)?)(px|rem)\]/g)) {
        const px = Number(match[1]) * (match[2] === "rem" ? 16 : 1);
        if (!ALLOWED.has(px)) offenders.push(`${path}: ${match[0]}`);
      }
    } else {
      // Emoji glyphs in the avatar picker are pictures, not text. So is the
      // glyph in the header's 36 px avatar disc (15 px, validated 2026-11-02).
      const css = source
        .replace(/\.settings-avatar-choice\s*\{[^}]*\}/g, "")
        .replace(/\.shell-account-trigger \.shell-account-avatar\s*\{[^}]*\}/g, "");
      for (const match of css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)(px|rem)/g)) {
        const px = Number(match[1]) * (match[2] === "rem" ? 16 : 1);
        if (!ALLOWED.has(px)) offenders.push(`${path}: ${match[0]}`);
      }
    }
  }
  expect(offenders).toEqual([]);
});
