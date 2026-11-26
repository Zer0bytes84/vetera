import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/plugin-updater", () => ({ check: vi.fn() }));
vi.mock("@tauri-apps/plugin-process", () => ({ relaunch: vi.fn() }));

import { UpdateCheckRow } from "@/components/update-check-row";

describe("Paramètres > À propos : la vérification manuelle des mises à jour", () => {
  it("une ligne « Mises à jour » avec le bouton « Rechercher une mise à jour »", () => {
    const html = renderToStaticMarkup(<UpdateCheckRow />);
    expect(html).toContain("Mises à jour");
    expect(html).toContain("Rechercher une mise à jour");
    expect(html).toContain('data-testid="update-check"');
  });

  it("le bouton demande une vérification à l'initiative de l'utilisateur, et la ligne est dans la section À propos", () => {
    expect(
      readFileSync("src/components/update-check-row.tsx", "utf8")
    ).toContain("checkForAppUpdates({ userInitiated: true })");
    const settings = readFileSync("src/components/Parametres.tsx", "utf8");
    const about = settings.slice(
      settings.indexOf('case "apropos":'),
      settings.indexOf("<AboutTeam />")
    );
    expect(about).toContain("<UpdateCheckRow />");
  });
});
