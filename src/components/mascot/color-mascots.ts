// Essai visuel (branche essai/mascottes-couleurs-2026-11-27) : les quinze compagnons en couleurs, générés à part,
// réduits en 512 × 512, fond blanc rendu transparent. Les dessins au trait (line-mascots) restent dans le code :
// USE_COLOR_MASCOTS à false, ou revenir sur master, rend les dessins au trait.
import ane from "@/assets/mascottes-couleurs/ane.png";
import chat from "@/assets/mascottes-couleurs/chat.png";
import cheval from "@/assets/mascottes-couleurs/cheval.png";
import chevre from "@/assets/mascottes-couleurs/chevre.png";
import chien from "@/assets/mascottes-couleurs/chien.png";
import chouette from "@/assets/mascottes-couleurs/chouette.png";
import fennec from "@/assets/mascottes-couleurs/fennec.png";
import furet from "@/assets/mascottes-couleurs/furet.png";
import hamster from "@/assets/mascottes-couleurs/hamster.png";
import herisson from "@/assets/mascottes-couleurs/herisson.png";
import lapin from "@/assets/mascottes-couleurs/lapin.png";
import mouton from "@/assets/mascottes-couleurs/mouton.png";
import perroquet from "@/assets/mascottes-couleurs/perroquet.png";
import tortue from "@/assets/mascottes-couleurs/tortue.png";
import vache from "@/assets/mascottes-couleurs/vache.png";
import type { LineAnimalKey } from "./line-mascots";

export const USE_COLOR_MASCOTS = true;

export const COLOR_MASCOTS: Record<LineAnimalKey, string> = {
  ane,
  chat,
  cheval,
  chevre,
  chien,
  chouette,
  fennec,
  furet,
  hamster,
  herisson,
  lapin,
  mouton,
  perroquet,
  tortue,
  vache,
};
