import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Building2 } from "lucide-react";
import { SETTINGS_TABS } from "@/lib/settings-navigation";
import { ReleaseHighlights } from "@/modules/release-notes/release-highlights";
import { publishedReleaseNotes, RELEASE_NOTES, releaseNoteFor, type ReleaseNote } from "@/modules/release-notes/release-notes";
import { LAST_SEEN_VERSION_KEY, markVersionSeen, readLastSeenVersion, releaseNoteToShow } from "@/modules/release-notes/release-seen";
import { getAppVersion } from "@/services/backupService";

const memory = () => {
  const store = new Map<string, string>();
  return { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
};
const note = (version: string, status: ReleaseNote["status"]): ReleaseNote => ({
  version,
  status,
  highlights: [{ icon: Building2, title: "Titre", text: "Texte." }],
});

describe("notes de version", () => {
  it("contient les notes de la 5.0.5 publiées, et la suite en brouillon", () => {
    const published = releaseNoteFor("5.0.5");
    expect(published?.status).toBe("published");
    expect(published?.highlights.map((h) => h.title)).toEqual([
      "Un assistant plus large et plus clair",
      "Paramètres et « Mon cabinet »",
      "Une analyse financière plus riche",
    ]);
    const drafts = RELEASE_NOTES.filter((n) => n.status === "draft");
    expect(drafts.flatMap((n) => n.highlights.map((h) => h.title))).toEqual([
      "Actions rapides au bout du +",
      "Des blocs plus doux",
    ]);
  });

  it("garde de trois à quatre nouveautés par version publiée, jamais de vocabulaire technique", () => {
    for (const n of publishedReleaseNotes()) {
      expect(n.highlights.length).toBeGreaterThanOrEqual(3);
      expect(n.highlights.length).toBeLessThanOrEqual(4);
      for (const h of n.highlights) expect(`${h.title} ${h.text}`).not.toMatch(/\b(API|SQLite|React|CSS|composant|token|jeton|bug|refactor)/i);
    }
  });

  it("ne montre ni n'archive jamais un brouillon", () => {
    expect(releaseNoteFor("5.0.6")).toBeNull();
    expect(publishedReleaseNotes().map((n) => n.version)).not.toContain("5.0.6");
  });

  it("la version du package a sa note publiée : la mise à jour montre bien quelque chose", () => {
    expect(releaseNoteFor(getAppVersion())).not.toBeNull();
  });
});

describe("quand la fenêtre s'affiche", () => {
  const notes = [note("5.0.6", "published"), note("5.0.5", "published"), note("5.0.7", "draft")];

  it("au premier lancement après une mise à jour : marqueur d'une version plus ancienne ou absent (installation d'avant la fonction)", () => {
    expect(releaseNoteToShow("5.0.6", "5.0.5", notes)?.version).toBe("5.0.6");
    expect(releaseNoteToShow("5.0.6", null, notes)?.version).toBe("5.0.6");
  });

  it("jamais réaffichée : marqueur égal à la version courante", () => {
    expect(releaseNoteToShow("5.0.6", "5.0.6", notes)).toBeNull();
  });

  it("jamais pour une version sans note publiée, ni pour un brouillon", () => {
    expect(releaseNoteToShow("5.0.7", "5.0.6", notes)).toBeNull();
    expect(releaseNoteToShow("5.0.8", "5.0.6", notes)).toBeNull();
  });
});

describe("le marqueur local", () => {
  it("retient la version vue, et la relit", () => {
    const storage = memory();
    expect(readLastSeenVersion(storage)).toBeNull();
    expect(markVersionSeen("5.0.5", storage)).toBe(true);
    expect(storage.getItem(LAST_SEEN_VERSION_KEY)).toBe("5.0.5");
    expect(readLastSeenVersion(storage)).toBe("5.0.5");
  });

  it("une installation neuve pose le marqueur : la fenêtre ne s'affiche pas", () => {
    const storage = memory();
    markVersionSeen("5.0.5", storage);
    expect(releaseNoteToShow("5.0.5", readLastSeenVersion(storage))).toBeNull();
  });

  it("si le stockage refuse d'écrire, on ne peut pas s'en souvenir : la fenêtre ne doit pas s'ouvrir", () => {
    const refusing = { getItem: () => null, setItem: () => { throw new Error("quota"); } };
    expect(markVersionSeen("5.0.5", refusing)).toBe(false);
    expect(markVersionSeen("5.0.5", null)).toBe(false);
  });
});

describe("la liste des nouveautés et l'archive", () => {
  it("affiche chaque nouveauté avec son titre et son texte", () => {
    const html = renderToStaticMarkup(<ReleaseHighlights note={releaseNoteFor("5.0.5")!} />);
    expect(html).toContain("Paramètres et « Mon cabinet »");
    expect(html).toContain("Une analyse financière plus riche");
  });

  it("ajoute la rubrique « Nouveautés » aux Paramètres", () => {
    expect(SETTINGS_TABS).toContain("nouveautes");
  });
});
