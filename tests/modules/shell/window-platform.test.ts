import { readFileSync } from "node:fs";
import postcss from "postcss";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    isMaximized: vi.fn().mockResolvedValue(false),
    isFullscreen: vi.fn().mockResolvedValue(false),
    onResized: vi.fn().mockResolvedValue(() => undefined),
    setDecorations: vi.fn().mockResolvedValue(undefined),
  }),
}));

interface EnvOptions {
  tauri?: boolean;
  userAgent: string;
}

async function setupWindowControls({ tauri = true, userAgent }: EnvOptions) {
  vi.resetModules();
  const dataset: Record<string, string> = {};
  const host = {
    hidden: true,
    setAttribute: vi.fn(),
    querySelectorAll: () => [],
    querySelector: () => ({}),
  };

  vi.stubGlobal("document", {
    documentElement: { dataset },
    getElementById: (id: string) => (id === "window-controls" ? host : null),
  });
  vi.stubGlobal("navigator", { userAgent });
  vi.stubGlobal("window", {
    __TAURI__: tauri ? {} : undefined,
    setTimeout: vi.fn(() => 0),
  });
  vi.stubGlobal(
    "MutationObserver",
    class {
      observe() {}
    }
  );

  const mod = await import("@/modules/shell/window-controls");
  return { dataset, host, mod };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("détection de plateforme pour la coquille", () => {
  it("pose data-window-platform=macos sous macOS dans Tauri", async () => {
    const { dataset, mod } = await setupWindowControls({
      tauri: true,
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
    });

    mod.initWindowControls();
    expect(dataset.windowPlatform).toBe("macos");
    expect(dataset.windowControls).toBeUndefined();
  });

  it("pose data-window-platform=windows avec decorum sous Windows dans Tauri", async () => {
    const { dataset, host, mod } = await setupWindowControls({
      tauri: true,
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Edg/130.0.0.0",
    });

    mod.initWindowControls();
    expect(dataset.windowPlatform).toBe("windows");
    expect(dataset.windowControls).toBe("decorum");
    expect(host.hidden).toBe(false);
  });

  it("pose data-window-platform=linux uniquement dans Tauri sous Linux", async () => {
    const { dataset, mod } = await setupWindowControls({
      tauri: true,
      userAgent:
        "Mozilla/5.0 (X11; Ubuntu; Linux aarch64) AppleWebKit/605.1.15 (KHTML, like Gecko)",
    });

    mod.initWindowPlatform();
    expect(dataset.windowPlatform).toBe("linux");
    expect(dataset.windowControls).toBeUndefined();
  });

  it("ne pose pas data-window-platform dans le navigateur hors Tauri", async () => {
    const { dataset, mod } = await setupWindowControls({
      tauri: false,
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    });

    mod.initWindowPlatform();
    expect(dataset.windowPlatform).toBeUndefined();
  });

  it("n'assimile pas Android à Linux desktop", async () => {
    const { dataset, mod } = await setupWindowControls({
      tauri: true,
      userAgent:
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36",
    });

    mod.initWindowPlatform();
    expect(dataset.windowPlatform).toBeUndefined();
  });
});

describe("coquille : cadre rentré et coins arrondis réservés à macOS", () => {
  it("réserve le cadre --clean-sheet-inset et les coins arrondis de la feuille à data-window-platform=macos", () => {
    const clean = postcss.parse(readFileSync("src/design-system/clean.css", "utf8"));
    let defaultInset = "";
    let defaultRadius = "";
    let baseInsetPadding = "";
    let macosInsetPadding = "";
    const macosRoundedSelectors: string[] = [];
    const baseZeroRadiusSelectors: string[] = [];

    clean.walkRules((rule) => {
      if (rule.selector === ':root[data-skin="clean"]') {
        rule.walkDecls("--clean-sheet-inset", (decl) => {
          defaultInset = decl.value;
        });
        rule.walkDecls("--clean-sheet-radius", (decl) => {
          defaultRadius = decl.value;
        });
      }
      if (rule.selector.endsWith('[data-slot="sidebar-inset"]')) {
        rule.walkDecls("padding", (decl) => {
          if (rule.selector.includes('[data-window-platform="macos"]')) {
            macosInsetPadding = decl.value;
          } else {
            baseInsetPadding = decl.value;
          }
        });
      }
      if (
        rule.selector.endsWith('[data-slot="shell-scroll-panel"]') ||
        rule.selector.endsWith('[data-slot="app-header"]')
      ) {
        rule.walkDecls("border-radius", (decl) => {
          if (rule.selector.includes('[data-window-platform="macos"]')) {
            macosRoundedSelectors.push(rule.selector);
          } else if (decl.value === "0") {
            baseZeroRadiusSelectors.push(rule.selector);
          }
        });
      }
    });

    expect(defaultInset).toBe("8px");
    expect(defaultRadius).toBe("12px");
    expect(baseInsetPadding).toBe("0");
    expect(macosInsetPadding).toContain("var(--clean-sheet-inset)");
    expect(baseZeroRadiusSelectors.length).toBeGreaterThanOrEqual(2);
    expect(macosRoundedSelectors.length).toBeGreaterThanOrEqual(4);
  });

  it("réserve l'arrondi de #root à data-window-platform=macos dans index.css", () => {
    const index = postcss.parse(readFileSync("src/index.css", "utf8"));
    let baseRootRadius = "";
    let macosRootRadius = "";

    index.walkRules((rule) => {
      if (rule.selector === "#root") {
        rule.walkDecls("border-radius", (decl) => {
          baseRootRadius = decl.value;
        });
      }
      if (rule.selector === ':root[data-window-platform="macos"] #root') {
        rule.walkDecls("border-radius", (decl) => {
          macosRootRadius = decl.value;
        });
      }
    });

    expect(baseRootRadius).toBe("");
    expect(macosRootRadius).toBe("14px");
  });
});
