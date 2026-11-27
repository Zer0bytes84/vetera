import { describe, expect, it } from "vitest";
import { mascotFaceUrls } from "@/components/mascot/color-mascot-faces";
import { FACE_VARIANTS } from "@/components/mascot/mascot-face";
import { MASCOT_CHOICE_KEYS } from "@/lib/mascot-preferences";

// Every companion has its seven expressions beside its base, named by animal key without accents.

describe("the expressions of the colour companions", () => {
  it.each(MASCOT_CHOICE_KEYS)("are all there for %s", (animal) => {
    const urls = mascotFaceUrls(animal);
    expect(urls).not.toBeNull();
    for (const variant of FACE_VARIANTS) {
      expect(urls?.[variant]).toMatch(
        new RegExp(`${animal}-${variant}\\.webp`)
      );
    }
  });
});
