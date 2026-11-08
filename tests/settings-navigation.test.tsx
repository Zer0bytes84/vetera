import { renderToStaticMarkup } from "react-dom/server";
import { Building2 } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SettingsRow, SettingsSection } from "@/components/settings-section";
import {
  isSettingsTab,
  requestSettingsSection,
  SETTINGS_SECTION_EVENT,
  SETTINGS_SECTION_KEY,
  SETTINGS_TABS,
} from "@/lib/settings-navigation";

afterEach(() => vi.unstubAllGlobals());

describe("ouverture d'une section de Paramètres depuis ailleurs (menu de l'avatar)", () => {
  it("reconnaît « Mon cabinet » et refuse tout identifiant inconnu", () => {
    expect(SETTINGS_TABS).toContain("mon-cabinet");
    expect(isSettingsTab("mon-cabinet")).toBe(true);
    expect(isSettingsTab("cabinet")).toBe(true);
    expect(isSettingsTab("inconnu")).toBe(false);
    expect(isSettingsTab(null)).toBe(false);
  });

  it("garde la demande en session pour la page pas encore montée, et l'annonce à la page déjà ouverte", () => {
    const store = new Map<string, string>();
    const events: CustomEvent[] = [];
    vi.stubGlobal("window", {
      sessionStorage: { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => store.set(key, value) },
      dispatchEvent: (event: CustomEvent) => (events.push(event), true),
    });
    requestSettingsSection("mon-cabinet");
    expect(store.get(SETTINGS_SECTION_KEY)).toBe("mon-cabinet");
    expect(events.map((event) => [event.type, event.detail])).toEqual([[SETTINGS_SECTION_EVENT, "mon-cabinet"]]);
  });
});

describe("une section de Paramètres", () => {
  it("porte son icône, son titre et son sous-titre dans la bande grise, ses lignes dans le panneau blanc", () => {
    const html = renderToStaticMarkup(
      <SettingsSection icon={Building2} subtitle="Coordonnées du cabinet" title="Identité du cabinet">
        <SettingsRow detail="Un détail" title="Un réglage">
          <button type="button">Agir</button>
        </SettingsRow>
      </SettingsSection>,
    );
    expect(html).toContain("rounded-[20px]");
    expect(html).toContain("rounded-2xl");
    expect(html).toContain("Identité du cabinet");
    expect(html).toContain("Coordonnées du cabinet");
    expect(html).toContain("Un réglage");
    expect(html).toContain("Agir");
    expect(html).toContain('aria-labelledby="');
    expect(html).not.toContain("tuffui");
  });

  it("une ligne dont le titre est l'étiquette du contrôle le relie par htmlFor", () => {
    const html = renderToStaticMarkup(<SettingsRow htmlFor="x" title="Donner vie">{null}</SettingsRow>);
    expect(html).toContain('<label');
    expect(html).toContain('for="x"');
  });
});
