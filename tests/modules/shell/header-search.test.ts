import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HeaderSearch } from "@/modules/shell/components/header-search";

// The search moved from the sidebar to the header on 5 November 2026
// (docs/recus/2026-11-05/recherche-entete/). Only the container changed: the
// field opens the same command palette, with the same shortcut and engine.
const SHELL = readFileSync("src/modules/shell/app-shell.tsx", "utf8");
const SIDEBAR = readFileSync("src/components/app-sidebar.tsx", "utf8");

describe("recherche dans l'entête", () => {
  it("est un bouton qui ouvre la palette, annoncé avec ⌘K / Ctrl+K", () => {
    const markup = renderToStaticMarkup(createElement(HeaderSearch, { onOpen: () => undefined, open: false }));
    expect(markup).toContain('class="shell-header-search-field"');
    expect(markup).toContain('aria-haspopup="dialog"');
    expect(markup).toContain('aria-keyshortcuts="Meta+K Control+K"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain("Rechercher un patient, une page…");
    expect(markup).toMatch(/<kbd class="shell-header-search-key">(⌘K|Ctrl K)<\/kbd>/);
    const open = renderToStaticMarkup(createElement(HeaderSearch, { onOpen: () => undefined, open: true }));
    expect(open).toContain('aria-expanded="true"');
  });

  it("ouvre exactement la palette d'avant : même état, même raccourci", () => {
    expect(SHELL).toContain("<HeaderSearch onOpen={() => setPaletteOpen(true)} open={paletteOpen} />");
    // The ⌘K / Ctrl+K handler and the palette itself are untouched.
    expect(SHELL).toMatch(/setPaletteOpen\(\(current\) => !current\)/);
    expect(SHELL).toContain("onClose={() => setPaletteOpen(false)}");
  });

  it("vit à droite de l'entête : après le fil d'Ariane, avant les outils", () => {
    const toggle = SHELL.indexOf("<HeaderSidebarToggle />");
    const crumb = SHELL.indexOf("<HeaderBreadcrumb");
    const search = SHELL.indexOf("<HeaderSearch ");
    const tools = SHELL.indexOf("shell-toolbar-actions");
    expect(toggle).toBeGreaterThan(0);
    expect(crumb).toBeGreaterThan(toggle);
    expect(search).toBeGreaterThan(crumb);
    expect(tools).toBeGreaterThan(search);
    // Un séparateur fin entre la recherche et les outils.
    expect(SHELL.slice(search, tools)).toContain('className="shell-header-divider"');
  });

  it("n'a plus de champ dans la barre latérale", () => {
    expect(SIDEBAR).not.toMatch(/onSearch|Ouvrir la palette de commandes|SearchIcon/);
    expect(SHELL).not.toContain("onSearch=");
  });

  it("garde le bouton de la barre latérale : même action, même raccourci, un séparateur après", () => {
    const toggle = readFileSync("src/modules/shell/components/header-sidebar-toggle.tsx", "utf8");
    expect(toggle).toContain("onClick={toggleSidebar}");
    expect(toggle).toContain('shortcut="⌘ B"');
    // Le séparateur est posé par l'entête, entre le bouton et le fil d'Ariane.
    const from = SHELL.indexOf("<HeaderSidebarToggle />");
    const to = SHELL.indexOf("<HeaderBreadcrumb");
    expect(SHELL.slice(from, to)).toContain('className="shell-header-divider"');
  });
});
