import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LINE_ANIMAL_KEYS, LineMascotArt } from "@/components/mascot/line-mascots";

describe("mascottes au trait", () => {
  it.each(LINE_ANIMAL_KEYS)("%s : deux yeux mobiles, trois humeurs, le trait de la page de connexion", (animal) => {
    const svg = renderToStaticMarkup(<LineMascotArt animal={animal} clipId="t" />);
    // Pupils move inside the eyes; each eye has its open, happy and blink-ready groups.
    expect(svg.match(/class="lm-pupils"/g)).toHaveLength(2);
    expect(svg.match(/class="lm-eye-open"/g)).toHaveLength(2);
    expect(svg.match(/class="lm-eye-happy"/g)).toHaveLength(4);
    expect(svg).toContain('class="lm-brows"');
    expect(svg).toContain('stroke="var(--pet-ink)"');
    expect(svg).toContain('stroke-width="3"');
  });

  it("déborde du cercle ouvert, reste dedans replié", () => {
    expect(renderToStaticMarkup(<LineMascotArt animal="lapin" clipId="o" />)).toContain("url(#o-open)");
    expect(renderToStaticMarkup(<LineMascotArt animal="lapin" clipId="c" overflow={false} />)).toContain("url(#c-closed)");
  });
});
