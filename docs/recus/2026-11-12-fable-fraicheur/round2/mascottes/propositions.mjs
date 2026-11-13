// Trois propositions de mascottes, a part : rien ici n'est branche dans l'app.
// Meme main que les douze actuelles (src/components/mascot/line-mascots.tsx) : gros plan du visage
// dans une boite de 120 x 120, cadre circulaire centre en (60, 64) de rayon 46, un seul trait d'encre
// de 3, des aplats de papier, une ou deux formes noires, du rose pour les joues et la langue seulement.
// Chaque definition suit le format LineAnimal de l'app : si une proposition est retenue, son bloc se
// recopie tel quel dans LINE_ANIMALS (les chaines SVG deviennent du JSX).
// Usage : node propositions.mjs   -> ecrit svg/<animal>-<humeur>.svg (neuf fichiers autonomes)

export const FRAME = { cx: 60, cy: 64, r: 46 };
const INK = "var(--pet-ink, #292929)";
const PAPER = "var(--pet-paper, #ffffff)";
const PINK = "#f7a8b8";
const TONGUE = "#f3768d";
const SHOULDERS = "M14 126 C16 108 36 100 60 100 C84 100 104 108 106 126 Z";
const nose = (y) => `M55 ${y} C55 ${y - 3} 65 ${y - 3} 65 ${y} C65 ${y + 3} 62 ${y + 5} 60 ${y + 5} C58 ${y + 5} 55 ${y + 3} 55 ${y} Z`;

export const PROPOSITIONS = {
  chouette: {
    label: "Chouette",
    pourquoi: "Le regard : deux grands disques, la mascotte qui observe et réfléchit. Les rapaces sont des patients de la faune sauvage.",
    earL: `<path d="M40 48 L29 24 L52 39 Z" fill="${INK}"/>`,
    earR: `<path d="M80 48 L91 24 L68 39 Z" fill="${INK}"/>`,
    head: "M24 72 C24 50 40 38 60 38 C80 38 96 50 96 72 C96 94 80 106 60 106 C40 106 24 94 24 72 Z",
    // Les disques faciaux, puis les plumes du front et de la poitrine.
    marks: `<circle cx="44" cy="69" r="15.5" fill="${PAPER}" stroke-width="2.4"/><circle cx="76" cy="69" r="15.5" fill="${PAPER}" stroke-width="2.4"/><path d="M53 45 L60 54 L67 45" stroke-width="2.4"/><path d="M50 97 q3 4 6 0 M57 99 q3 4 6 0 M64 97 q3 4 6 0" stroke-width="2"/>`,
    muzzle: `<path d="M55.5 78 H64.5 L60 88 Z" fill="${INK}"/>`,
    eyeY: 69,
    eyeDx: 16,
    eyeScale: 1.3,
    mouthY: null,
    cheeks: true,
  },
  ane: {
    label: "Âne",
    pourquoi: "Les oreilles : une dressée qui sort du cadre, l'autre couchée. L'animal de travail des campagnes, patient et têtu, que l'on soigne aussi.",
    earL: `<path d="M45 46 C34 32 31 12 37 1 C47 11 54 29 55 42 Z" fill="${INK}"/><path d="M43.5 36 C39.5 28 38.5 18 40 11 C44.5 18 47.5 27 48.5 35 Z" fill="${PAPER}" stroke="none"/>`,
    // L'autre oreille est couchee sur le cote.
    earR: `<path d="M68 44 C73 30 91 22 109 27 C104 42 91 51 78 52 Z" fill="${INK}"/><path d="M77 42 C82 34 92 30 100 31 C96 39 89 44 81 46 Z" fill="${PAPER}" stroke="none"/>`,
    earPivot: [48, 44, 72, 46],
    head: "M34 64 C34 48 46 40 60 40 C74 40 86 48 86 64 L84 90 C84 102 74 110 60 110 C46 110 36 102 36 90 Z",
    // Le toupet, entre les oreilles.
    marks: `<path d="M50 47 C49 38 56 36 60 42 C64 36 71 38 70 47 C64 43 56 43 50 47 Z" fill="${INK}" stroke-width="2"/>`,
    muzzle: `<path d="M37 94 C37 83 47 79 60 79 C73 79 83 83 83 94 C83 104 73 110 60 110 C47 110 37 104 37 94 Z" fill="${PAPER}"/><ellipse cx="51.5" cy="90.5" rx="2.6" ry="3.4" fill="${INK}" stroke="none"/><ellipse cx="68.5" cy="90.5" rx="2.6" ry="3.4" fill="${INK}" stroke="none"/>`,
    eyeY: 66,
    eyeDx: 14,
    mouthY: 100,
  },
  furet: {
    label: "Furet",
    pourquoi: "Le masque : une forme noire qui se lit a 20 px. C'est le patient des nouveaux animaux de compagnie, curieux et joueur.",
    earL: `<path d="M36 54 C27 44 19 50 23 60 C26 66 33 64 39 60 Z" fill="${PAPER}"/>`,
    earR: `<path d="M84 54 C93 44 101 50 97 60 C94 66 87 64 81 60 Z" fill="${PAPER}"/>`,
    earPivot: [36, 58, 84, 58],
    head: "M27 74 C27 54 42 42 60 42 C78 42 93 54 93 74 C93 94 79 106 60 106 C41 106 27 94 27 74 Z",
    // Le masque, d'une tempe a l'autre.
    marks: `<path d="M30 67 C36 58 50 59 60 65 C70 59 84 58 90 67 C90 78 78 82 69 77 C65 75 63 73 60 73 C57 73 55 75 51 77 C42 82 30 78 30 67 Z" fill="${INK}" stroke="none"/>`,
    muzzle: `<path d="M47 89 C47 81 73 81 73 89 C73 97 66 101 60 101 C54 101 47 97 47 89 Z" fill="${PAPER}"/><path d="${nose(85)}" fill="${INK}"/>`,
    front: `<path d="M10 86 L36 89 M12 96 L36 93 M110 86 L84 89 M108 96 L84 93" stroke-width="2"/>`,
    eyeY: 69,
    eyeDx: 14,
    // Les deux yeux sont sur le masque : leur contour est en papier, sinon ils s'y perdent.
    eyeStroke: PAPER,
    mouthY: 94,
  },
};

export const HUMEURS = { neutral: "Neutre", happy: "Joyeux", thinking: "Réflexion" };

function eyes(a, mood) {
  const { eyeY: y, eyeDx: dx, eyeScale: k = 1, eyeStroke = INK } = a;
  let out = "";
  for (const [side, x] of [[-1, 60 - dx], [1, 60 + dx]]) {
    if (mood === "happy") {
      const arc = `M${x - 5 * k} ${y + 1.5} Q${x} ${y - 6 * k} ${x + 5 * k} ${y + 1.5}`;
      out += eyeStroke === INK ? `<path d="${arc}" stroke="${PAPER}" stroke-width="6"/><path d="${arc}"/>` : `<path d="${arc}" stroke="${eyeStroke}"/>`;
    } else {
      // Reflexion : le regard part vers le haut et le cote, comme dans l'app.
      const [gx, gy] = mood === "thinking" ? [1.7 * k, -1.9 * k] : [0, a.lids ? 1 : 0];
      out += `<ellipse cx="${x}" cy="${y}" rx="${5.6 * k}" ry="${6.2 * k}" fill="${PAPER}" stroke="${eyeStroke}" stroke-width="2.4"/><circle cx="${x + gx}" cy="${y + gy}" r="${3.1 * k}" fill="${INK}" stroke="none"/>`;
      if (a.lids && mood === "neutral") out += `<path d="M${x - 6.6} ${y - 2.2} H${x + 6.6}" stroke-width="2.6"/>`;
    }
    if (a.lids) out += `<path d="M${x + side * 6.5} ${y - 4} l${side * 3.5} -2.5 M${x + side * 4} ${y - 6.5} l${side * 2} -3.5" stroke-width="2"/>`;
  }
  if (mood === "thinking") {
    const b = 10 * k;
    out += `<path d="M${60 - dx - 5} ${y - b} L${60 - dx + 5} ${y - b - 0.5} M${60 + dx - 6} ${y - b - 1} Q${60 + dx} ${y - b - 6} ${60 + dx + 6} ${y - b - 2}" stroke="${eyeStroke}" stroke-width="2.4"/>`;
  }
  return out;
}

function mouth(y, mood) {
  if (y === null) return "";
  if (mood === "happy") return `<path d="M52 ${y - 1} Q60 ${y + 12} 68 ${y - 1} Z" fill="${INK}" stroke-width="2.4"/><path d="M55.5 ${y + 5} Q60 ${y + 2} 64.5 ${y + 5} Q60 ${y + 9} 55.5 ${y + 5} Z" fill="${TONGUE}" stroke="none"/>`;
  if (mood === "thinking") return `<path d="M57 ${y + 2} Q61 ${y - 0.5} 65 ${y + 2}" stroke-width="2.6"/>`;
  return `<path d="M54.5 ${y} Q60 ${y + 4.5} 65.5 ${y}" stroke-width="2.6"/>`;
}

/** Le SVG d'une proposition dans une humeur. `id` distingue les decoupes quand plusieurs SVG partagent une page. */
export function svg(key, mood = "neutral", id = `${key}-${mood}`) {
  const a = PROPOSITIONS[key];
  const showCheeks = a.cheeks || mood === "happy";
  const cheeks = showCheeks ? `<g fill="${PINK}" stroke="none" opacity="${mood === "happy" ? 1 : 0.7}"><circle cx="${60 - a.eyeDx - 3}" cy="${a.eyeY + 12 * (a.eyeScale ?? 1)}" r="5.5"/><circle cx="${60 + a.eyeDx + 3}" cy="${a.eyeY + 12 * (a.eyeScale ?? 1)}" r="5.5"/></g>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" overflow="visible" role="img" aria-label="${a.label}, ${HUMEURS[mood].toLowerCase()}">
  <defs><clipPath id="c-${id}"><circle cx="${FRAME.cx}" cy="${FRAME.cy}" r="${FRAME.r}"/><rect x="-40" y="-60" width="200" height="${FRAME.cy + 60}"/></clipPath></defs>
  <circle cx="${FRAME.cx}" cy="${FRAME.cy}" r="${FRAME.r}" fill="${INK}" fill-opacity="0.07"/>
  <g fill="none" stroke="${INK}" stroke-linecap="round" stroke-linejoin="round" stroke-width="3">
    <g clip-path="url(#c-${id})">
      <path d="${SHOULDERS}" fill="${PAPER}"/>
      ${a.back ?? ""}${a.earL ?? ""}${a.earR ?? ""}
      <path d="${a.head}" fill="${PAPER}"/>
      ${a.marks ?? ""}${cheeks}${eyes(a, mood)}${a.muzzle ?? ""}${mouth(a.mouthY, mood)}
    </g>
    ${a.front ?? ""}
  </g>
</svg>
`;
}

if (typeof process !== "undefined" && process.argv[1]?.endsWith("propositions.mjs")) {
  const { writeFileSync, mkdirSync } = await import("node:fs");
  const dir = new URL("./svg/", import.meta.url);
  mkdirSync(dir, { recursive: true });
  for (const key of Object.keys(PROPOSITIONS)) for (const mood of Object.keys(HUMEURS)) writeFileSync(new URL(`${key}-${mood}.svg`, dir), svg(key, mood));
  console.log("neuf fichiers ecrits dans svg/");
}
