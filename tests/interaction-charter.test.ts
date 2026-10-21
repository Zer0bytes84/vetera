import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import postcss from "postcss";
import { describe, expect, it } from "vitest";
import { nextCursorIndex } from "@/hooks/useListCursor";

const files = (dir: string, ext: RegExp): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path, ext) : ext.test(name) ? [path] : [];
  });

describe("charte d'interaction", () => {
  it("définit les vitesses : apparition immédiate, retour en 150 ms", () => {
    const tokens = readFileSync("src/design-system/tokens.css", "utf8");
    expect(tokens).toContain("--speed-highlight-in: 0ms;");
    expect(tokens).toContain("--speed-highlight-out: 150ms;");
    expect(tokens).toContain("--row-hover: #f5f5f5;");
  });

  it("n'anime jamais toutes les propriétés", () => {
    const offenders = files("src", /\.(tsx?|css)$/).filter((file) =>
      /transition-all\b|transition:\s*all\b/.test(readFileSync(file, "utf8"))
    );
    expect(offenders).toEqual([]);
  });

  it("réserve les survols CSS aux pointeurs fins", () => {
    const loose: string[] = [];
    for (const file of files("src", /\.css$/)) {
      postcss.parse(readFileSync(file, "utf8")).walkRules((rule) => {
        if (!rule.selector.includes(":hover")) return;
        for (let parent = rule.parent; parent; parent = parent.parent) {
          if (parent.type === "atrule" && /hover/.test((parent as postcss.AtRule).params)) return;
        }
        loose.push(`${file}: ${rule.selector.slice(0, 60)}`);
      });
    }
    expect(loose).toEqual([]);
  });

  it("ouvre menus et palette sans animation", () => {
    const css = readFileSync("src/design-system/interaction.css", "utf8");
    for (const slot of ["dropdown-menu-content", "popover-content", "select-content", "context-menu-content"]) {
      expect(css).toContain(`[data-slot="${slot}"]`);
    }
    expect(css).toContain('[data-slot="dialog-content"]:has([data-slot="command"])');
  });
});

describe("curseur de liste", () => {
  it("descend et remonte sans sortir de la liste", () => {
    expect(nextCursorIndex("ArrowDown", -1, 3)).toBe(0);
    expect(nextCursorIndex("ArrowDown", 2, 3)).toBe(2);
    expect(nextCursorIndex("ArrowUp", -1, 3)).toBe(2);
    expect(nextCursorIndex("ArrowUp", 0, 3)).toBe(0);
    expect(nextCursorIndex("ArrowUp", 2, 3)).toBe(1);
  });
});
