import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CLINIC_TAB_PENDING_KEY,
  takePendingClinicTab,
} from "../src/modules/clinique/clinic-tab-events";
import { PREMIUM_SHORTCUTS } from "../src/lib/visual-style";

const read = (path: string) => readFileSync(path, "utf8");

afterEach(() => vi.unstubAllGlobals());

describe("actions rapides", () => {
  const fab = read("src/modules/shell/components/quick-actions-fab.tsx");
  const css = read("src/modules/shell/quick-actions.css");

  it("garde les quatre raccourcis, chacun avec son icône", () => {
    expect(PREMIUM_SHORTCUTS.map((shortcut) => shortcut.id)).toEqual(["appointment", "consultation", "patient", "care"]);
    for (const shortcut of PREMIUM_SHORTCUTS) expect(fab).toMatch(new RegExp(`\\n\\s*${shortcut.id}: `));
    expect(fab).toContain("PREMIUM_SHORTCUTS.map");
  });

  it("ne bouge que par transform et opacité, et se calme en mouvement réduit", () => {
    expect(css).not.toMatch(/transition:[^;]*\b(top|bottom|right|width|height|margin)\b/);
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });
});

describe("barre latérale", () => {
  const sidebar = read("src/components/app-sidebar.tsx");

  it("pose Paramètres seul dans le footer, sans séparateur ni compte", () => {
    const footer = sidebar.slice(sidebar.indexOf("<SidebarFooter"), sidebar.indexOf("</SidebarFooter>"));
    expect(footer).toContain('aria-label="Paramètres"');
    expect(footer).not.toMatch(/border-t|SidebarSeparator|NavUser|Avatar/);
  });

  it("ne range plus les raccourcis dans la barre : ils vivent dans le bouton flottant", () => {
    expect(sidebar).not.toContain("premium-shortcuts");
  });
});

describe("sections de Soins & hospitalisation", () => {
  it("lit la section demandée une seule fois", () => {
    const storage = new Map<string, string>([[CLINIC_TAB_PENDING_KEY, "hospitalisation"]]);
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      removeItem: (key: string) => storage.delete(key),
    });
    expect(takePendingClinicTab()).toBe("hospitalisation");
    expect(takePendingClinicTab()).toBeNull();
  });
});
