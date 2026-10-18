import { describe, expect, it } from "vitest";
import { matchesEveryWord } from "@/modules/agenda/quick-search";

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
