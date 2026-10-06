import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { HugeiconsIcon } from "@hugeicons/react";
import { expect, it, vi } from "vitest";
import { getSpeciesGlyph } from "../src/lib/species-icons";

it("renders every species icon without React key warnings", () => {
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    for (const species of ["Chien", "Chat", "Lapin", "Tortue", "Oiseau", "Poisson", undefined]) {
      const markup = renderToString(createElement(HugeiconsIcon, {
        icon: getSpeciesGlyph(species),
        strokeWidth: 1.5,
      }));
      expect(markup).toContain("<svg");
    }
    const keyWarnings = error.mock.calls.filter(args => args.some(arg => typeof arg === "string" && /unique.*key|same key/i.test(arg)));
    expect(keyWarnings).toEqual([]);
  } finally {
    error.mockRestore();
  }
});
