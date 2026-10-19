import { describe, expect, it } from "vitest";
import { matchesEveryWord, selectedDossierSearchLabel } from "@/modules/agenda/quick-search";

describe("appointment quick search", () => {
  const index = "rex chien labrador karim messaoud 0555123456 karim@exemple.com";

  it("finds the dossier written back after a selection (patient + owner)", () => {
    expect(matchesEveryWord(index, "Rex Karim Messaoud")).toBe(true);
  });

  it("matches words in any order and ignores extra spaces", () => {
    expect(matchesEveryWord(index, "  messaoud   rex ")).toBe(true);
  });

  it("rejects a dossier when one word is missing", () => {
    expect(matchesEveryWord(index, "rex benali")).toBe(false);
  });

  it("returns no match for an empty query", () => {
    expect(matchesEveryWord(index, "   ")).toBe(false);
  });
});

describe("pre-filled label of the selected dossier", () => {
  it("writes the patient and the owner's real names", () => {
    expect(selectedDossierSearchLabel("Milo", { firstName: "Nadia", lastName: "Benali" })).toBe("Milo Nadia Benali");
  });

  it("never writes a placeholder when the owner has no name or is missing", () => {
    expect(selectedDossierSearchLabel("Pistache", { firstName: "", lastName: "  " })).toBe("Pistache");
    expect(selectedDossierSearchLabel("Pistache", undefined)).toBe("Pistache");
    // The label still finds the dossier in the quick search index.
    expect(matchesEveryWord("pistache chat européen 0550 00 00 00", selectedDossierSearchLabel("Pistache", { firstName: "", lastName: "" }))).toBe(true);
  });
});
