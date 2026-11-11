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
  const menu = read("src/modules/shell/components/header-quick-actions.tsx");
  const css = read("src/modules/shell/quick-actions.css");

  it("range les sept créations selon le parcours du patient, chacune avec son icône", () => {
    expect(PREMIUM_SHORTCUTS.map((shortcut) => shortcut.id)).toEqual([
      "appointment",
      "patient",
      "consultation",
      "care",
      "document",
      "product",
      "invoice",
    ]);
    for (const shortcut of PREMIUM_SHORTCUTS)
      expect(menu).toMatch(new RegExp(`\\n\\s*${shortcut.id}: `));
    expect(menu).toContain("PREMIUM_SHORTCUTS.map");
  });

  it("vit dans l'entête, au même endroit sur toutes les pages, et non plus en bouton flottant", () => {
    const shell = read("src/modules/shell/app-shell.tsx");
    expect(shell).not.toContain("QuickActionsFab");
    expect(shell.match(/<HeaderQuickActions/g)).toHaveLength(2); // une fois par peau, jamais selon la page
    expect(css).not.toMatch(/position:\s*absolute|quick-actions-fab/);
    expect(menu).toContain('aria-label="Actions rapides"');
  });
});

describe("barre latérale", () => {
  const sidebar = read("src/components/app-sidebar.tsx");

  it("pose le compte dans le footer, façon Catalyst, sans bouton Paramètres séparé", () => {
    const footer = sidebar.slice(
      sidebar.indexOf("<SidebarFooter"),
      sidebar.indexOf("</SidebarFooter>"),
    );
    expect(footer).toContain("AccountSidebarFooter");
    expect(footer).not.toContain('aria-label="Paramètres"');
    expect(footer).not.toMatch(/NavUser|SidebarSeparator/);
  });

  it("ne range plus les raccourcis dans la barre : ils vivent dans le « + » de l'entête", () => {
    expect(sidebar).not.toContain("premium-shortcuts");
  });
});

describe("sections de Soins & hospitalisation", () => {
  it("lit la section demandée une seule fois", () => {
    const storage = new Map<string, string>([
      [CLINIC_TAB_PENDING_KEY, "hospitalisation"],
    ]);
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      removeItem: (key: string) => storage.delete(key),
    });
    expect(takePendingClinicTab()).toBe("hospitalisation");
    expect(takePendingClinicTab()).toBeNull();
  });
});
