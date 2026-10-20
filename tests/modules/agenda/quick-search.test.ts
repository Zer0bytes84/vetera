import { describe, expect, it } from "vitest";
import { matchesEveryWord, selectedDossierSearchLabel, findDossiers } from "@/modules/agenda/quick-search";

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

describe("findDossiers", () => {
  const owners = new Map([
    ["o1", { firstName: "hmed", lastName: "kherroubi", phone: "7676789046" }],
    ["o2", { firstName: "Samia", lastName: "Benali", phone: "0550000000" }],
  ]);
  const patients = [
    { name: "Boby", ownerId: "o1", species: "Chien", breed: "Berger Allemand" },
    { name: "Boby", ownerId: "o2", species: "Chien", breed: "Caniche" },
    { name: "Loulou", ownerId: "o1", species: "Chat" },
  ];

  it("distingue deux animaux du même nom par leur propriétaire", () => {
    expect(findDossiers(patients, owners, "boby benali").map((m) => m.owner?.lastName)).toEqual(["Benali"]);
    expect(findDossiers(patients, owners, "boby").map((m) => m.owner?.lastName)).toEqual(["kherroubi", "Benali"]);
  });

  it("trouve par téléphone ou espèce, et rien sans recherche", () => {
    expect(findDossiers(patients, owners, "7676789046 chat").map((m) => m.patient.name)).toEqual(["Loulou"]);
    expect(findDossiers(patients, owners, "   ")).toEqual([]);
  });
});
