import { HugeiconsIcon } from "@hugeicons/react";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { getSpeciesGlyph } from "../src/lib/species-icons";

const DUPLICATE_KEY_WARNING = /unique.*key|same key/i;

it("renders every species icon without React key warnings", () => {
  const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
  try {
    for (const species of [
      "Chien",
      "Chat",
      "Lapin",
      "Tortue",
      "Oiseau",
      "Poisson",
      undefined,
    ]) {
      const markup = renderToString(
        createElement(HugeiconsIcon, {
          icon: getSpeciesGlyph(species),
          strokeWidth: 1.5,
        })
      );
      expect(markup).toContain("<svg");
    }
    const keyWarnings = error.mock.calls.filter((args) =>
      args.some(
        (arg) => typeof arg === "string" && DUPLICATE_KEY_WARNING.test(arg)
      )
    );
    expect(keyWarnings).toEqual([]);
  } finally {
    error.mockRestore();
  }
});
