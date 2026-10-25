import { Bird, Cat, Dog, Fish, PawPrint, Rabbit, Rat, Turtle, type LucideIcon } from "lucide-react";

export type SpeciesTone = "dog" | "cat" | "nac" | "wild" | "other";

const SPECIES: { match: RegExp; icon: LucideIcon; tone: SpeciesTone }[] = [
  { match: /chien|canin/, icon: Dog, tone: "dog" },
  { match: /chat|f[ée]lin/, icon: Cat, tone: "cat" },
  { match: /lapin/, icon: Rabbit, tone: "nac" },
  { match: /rongeur|hamster|cobaye|cochon d'inde|rat|souris|furet/, icon: Rat, tone: "nac" },
  { match: /oiseau|perroquet|canari|perruche|volaille|poule/, icon: Bird, tone: "wild" },
  { match: /poisson/, icon: Fish, tone: "wild" },
  { match: /tortue|reptile|serpent|l[ée]zard/, icon: Turtle, tone: "wild" },
];

/** The fine-line species icon of the patient list, and its family's hue. */
export function speciesIcon(species?: string): { icon: LucideIcon; tone: SpeciesTone } {
  const normalized = (species ?? "").toLocaleLowerCase("fr-FR");
  const found = SPECIES.find((entry) => entry.match.test(normalized));
  return found ? { icon: found.icon, tone: found.tone } : { icon: PawPrint, tone: "other" };
}
