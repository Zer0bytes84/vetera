// Close-up portraits drawn in the hand of the login page's peeking pets
// (Notion-style line drawings: one ink stroke, paper fills, one or two black
// shapes, pink only for cheeks and tongue). Every animal sits in the same
// 120 × 120 box: a circular frame centred at (60, 64), r 46. Ears, horns,
// crests and paws may leave the frame; the shoulders never do.
import type { ReactNode } from "react";

export const FRAME = { cx: 60, cy: 64, r: 46 } as const;
const INK = "var(--pet-ink)";
const PAPER = "var(--pet-paper)";
const PINK = "#f7a8b8";
const TONGUE = "#f3768d";
const SW = 3;

export type LineMood = "neutral" | "happy" | "thinking";

export interface LineAnimal {
  label: string;
  /** Behind the head: horns, mane, wool, spikes, shell. */
  back?: ReactNode;
  /** Ears, behind the head, each in its own group so it can twitch. */
  earL?: ReactNode;
  earR?: ReactNode;
  /** Pivot of each ear, for the twitch. */
  earPivot?: [number, number, number, number];
  head: string;
  /** On the head, under the eyes: patches, stripes, spots. */
  marks?: ReactNode;
  /** Over the lower face: snout, nose, beak. */
  muzzle?: ReactNode;
  /** In front of everything and never clipped: a paw, a beard. */
  front?: ReactNode;
  eyeY: number;
  eyeDx: number;
  pupil?: "dot" | "bar";
  /** Eyes drawn larger than the others' (the owl's discs); 1 by default. */
  eyeScale?: number;
  /** Eye outline when the eyes sit on a black patch (the ferret's mask): paper, or they are lost in it. */
  eyeStroke?: string;
  /** Mouth line height; null for a beak. */
  mouthY: number | null;
  cheeks?: boolean;
}

const HEAD_ROUND = "M28 72 C28 50 42 38 60 38 C78 38 92 50 92 72 C92 94 78 106 60 106 C42 106 28 94 28 72 Z";
const SHOULDERS = "M14 126 C16 108 36 100 60 100 C84 100 104 108 106 126 Z";
const nose = (y: number) =>
  `M55 ${y} C55 ${y - 3} 65 ${y - 3} 65 ${y} C65 ${y + 3} 62 ${y + 5} 60 ${y + 5} C58 ${y + 5} 55 ${y + 3} 55 ${y} Z`;

export const LINE_ANIMALS = {
  chien: {
    label: "Chien",
    earL: <path d="M36 48 C20 44 12 66 16 86 C18 96 30 98 34 88 C37 78 34 62 40 54 Z" fill={INK} />,
    // One ear flipped up, out of the frame.
    earR: <path d="M82 46 C86 30 98 16 110 10 C114 24 106 44 92 56 Z" fill={INK} />,
    earPivot: [36, 52, 84, 50],
    head: HEAD_ROUND,
    marks: <path d="M66 60 C78 55 87 63 85 74 C83 83 70 83 66 77 C62 71 62 63 66 60 Z" fill={INK} stroke="none" />,
    muzzle: (
      <>
        <path d="M45 88 C45 78 75 78 75 88 C75 98 67 102 60 102 C53 102 45 98 45 88 Z" fill={PAPER} />
        <path d={nose(84)} fill={INK} />
      </>
    ),
    eyeY: 70,
    eyeDx: 13,
    mouthY: 94,
  },
  chat: {
    label: "Chat",
    earL: (
      <>
        <path d="M32 58 L32 14 L60 40" fill={PAPER} />
        <path d="M38 46 L38 28 L50 39" strokeWidth={2.2} />
      </>
    ),
    earR: (
      <>
        <path d="M88 58 L88 14 L60 40" fill={PAPER} />
        <path d="M82 46 L82 28 L70 39" strokeWidth={2.2} />
      </>
    ),
    earPivot: [40, 50, 80, 50],
    head: "M25 74 C25 50 42 40 60 40 C78 40 95 50 95 74 C95 96 78 106 60 106 C42 106 25 96 25 74 Z",
    marks: <path d="M54 43 L56 53 M60 42 V53 M66 43 L64 53" strokeWidth={2.6} />,
    muzzle: <path d="M55 82 H65 L60 87.5 Z" fill={INK} />,
    front: <path d="M8 84 L38 87 M10 95 L38 91 M112 84 L82 87 M110 95 L82 91" strokeWidth={2} />,
    eyeY: 72,
    eyeDx: 14,
    mouthY: 90,
    cheeks: true,
  },
  lapin: {
    label: "Lapin",
    earL: (
      <>
        <path d="M44 44 C36 22 34 2 42 -6 C50 -10 58 10 55 42 Z" fill={PAPER} />
        <path d="M46 36 C42 22 42 8 45 2 C49 8 51 22 50 36 Z" fill={PINK} stroke="none" />
      </>
    ),
    // The right ear folds over, the way a lop's does.
    earR: (
      <>
        <path d="M67 42 C66 18 78 0 92 -2 C100 0 94 22 78 46 Z" fill={PAPER} />
        <path d="M72 36 C72 20 80 8 88 4 C90 12 84 26 76 38 Z" fill={PINK} stroke="none" />
      </>
    ),
    earPivot: [50, 42, 72, 42],
    head: HEAD_ROUND,
    muzzle: <path d="M56 82 C56 79 64 79 64 82 C64 85 61 87 60 87 C59 87 56 85 56 82 Z" fill={TONGUE} strokeWidth={2.2} />,
    eyeY: 70,
    eyeDx: 14,
    mouthY: 90,
    cheeks: true,
  },
  fennec: {
    label: "Fennec",
    earL: (
      <>
        <path d="M38 50 L6 2 L58 38 Z" fill={PAPER} />
        <path d="M30 34 L18 16" strokeWidth={2.2} />
      </>
    ),
    earR: (
      <>
        <path d="M82 50 L114 2 L62 38 Z" fill={PAPER} />
        <path d="M90 34 L102 16" strokeWidth={2.2} />
      </>
    ),
    earPivot: [44, 46, 76, 46],
    head: "M28 66 C28 48 44 40 60 40 C76 40 92 48 92 66 C92 82 74 104 60 106 C46 104 28 82 28 66 Z",
    marks: <path d="M29 72 C38 80 46 83 52 85 M91 72 C82 80 74 83 68 85" strokeWidth={2.4} />,
    muzzle: <path d={nose(91)} fill={INK} />,
    eyeY: 68,
    eyeDx: 13,
    mouthY: 99,
  },
  vache: {
    label: "Vache",
    back: (
      <>
        <path d="M44 44 C34 38 32 26 38 16 C42 24 47 32 52 40 Z" fill={PAPER} />
        <path d="M76 44 C86 38 88 26 82 16 C78 24 73 32 68 40 Z" fill={PAPER} />
      </>
    ),
    earL: <path d="M31 56 C19 52 6 58 8 66 C11 73 25 71 33 64 Z" fill={PAPER} />,
    earR: <path d="M89 56 C101 52 114 58 112 66 C109 73 95 71 87 64 Z" fill={PAPER} />,
    earPivot: [32, 60, 88, 60],
    head: "M30 66 C30 48 44 40 60 40 C76 40 90 48 90 66 L90 80 C90 92 78 104 60 104 C42 104 30 92 30 80 Z",
    marks: (
      <>
        <path d="M30 60 C35 51 48 53 47 61 C46 68 35 70 30 66 Z" fill={INK} stroke="none" />
        <path d="M54 41 C55 35 59 35 60 40 C61 35 66 36 65 42" strokeWidth={2.4} />
      </>
    ),
    muzzle: (
      <>
        <path d="M37 88 C37 80 46 78 60 78 C74 78 83 80 83 88 C83 98 74 104 60 104 C46 104 37 98 37 88 Z" fill="#f7c9d1" />
        <ellipse cx="51" cy="87" rx="2.6" ry="3.2" fill={INK} stroke="none" />
        <ellipse cx="69" cy="87" rx="2.6" ry="3.2" fill={INK} stroke="none" />
      </>
    ),
    eyeY: 66,
    eyeDx: 14,
    mouthY: 96,
  },
  cheval: {
    label: "Cheval",
    back: <path d="M46 44 C40 28 48 12 60 6 C58 17 64 21 71 13 C75 26 71 37 64 46 Z" fill={INK} />,
    earL: <path d="M42 46 L36 20 L52 38 Z" fill={PAPER} />,
    earR: <path d="M78 46 L84 20 L68 38 Z" fill={PAPER} />,
    earPivot: [44, 42, 76, 42],
    head: "M33 64 C33 46 46 38 60 38 C74 38 87 46 87 64 L85 92 C85 104 74 110 60 110 C46 110 35 104 35 92 Z",
    muzzle: (
      <>
        <path d="M39 95 C39 87 49 84 60 84 C71 84 81 87 81 95 C81 105 71 110 60 110 C49 110 39 105 39 95 Z" fill={PAPER} />
        <path d="M50 95 C51 92 54 92 54 95.5 M70 95 C69 92 66 92 66 95.5" strokeWidth={2.4} />
      </>
    ),
    eyeY: 64,
    eyeDx: 15,
    mouthY: 103,
  },
  mouton: {
    label: "Mouton",
    back: (
      <path
        d="M26 66 C15 60 17 44 29 42 C27 30 41 21 52 27 C56 17 71 17 75 27 C85 21 99 30 93 42 C105 44 106 60 94 66 Z"
        fill={PAPER}
      />
    ),
    earL: <path d="M34 70 C23 65 11 69 12 76 C15 81 27 79 35 74 Z" fill={INK} />,
    earR: <path d="M86 70 C97 65 109 69 108 76 C105 81 93 79 85 74 Z" fill={INK} />,
    earPivot: [34, 72, 86, 72],
    head: "M34 70 C34 52 46 46 60 46 C74 46 86 52 86 70 C86 92 74 106 60 106 C46 106 34 92 34 70 Z",
    // The fringe of wool over the forehead.
    marks: <path d="M38 56 C37 47 46 44 51 48 C54 41 66 41 69 48 C74 44 83 47 82 56" fill={PAPER} />,
    muzzle: <path d={nose(87)} fill={INK} />,
    eyeY: 70,
    eyeDx: 12,
    mouthY: 96,
  },
  chevre: {
    label: "Chèvre",
    back: (
      <>
        {/* Horns sweeping back and out, solid like the login dog's ears. */}
        <path d="M49 45 C42 31 32 19 16 16 C24 25 33 35 41 49 Z" fill={INK} />
        <path d="M71 45 C78 31 88 19 104 16 C96 25 87 35 79 49 Z" fill={INK} />
      </>
    ),
    earL: <path d="M35 58 C23 59 12 67 9 72 C20 75 31 70 37 64 Z" fill={PAPER} />,
    earR: <path d="M85 58 C97 59 108 67 111 72 C100 75 89 70 83 64 Z" fill={PAPER} />,
    earPivot: [36, 60, 84, 60],
    head: "M34 62 C34 48 46 42 60 42 C74 42 86 48 86 62 C86 80 76 98 60 100 C44 98 34 80 34 62 Z",
    muzzle: <path d={nose(84)} fill={INK} />,
    front: <path d="M54 98 C54 104 57 108 60 110 C63 108 66 104 66 98" fill={PAPER} />,
    eyeY: 66,
    eyeDx: 12,
    pupil: "bar",
    mouthY: 92,
  },
  hamster: {
    label: "Hamster",
    earL: (
      <>
        <path d="M38 48 C29 41 35 29 44 33 C49 35 49 42 46 47 Z" fill={PAPER} />
        <path d="M40 44 C36 40 39 35 43 37" stroke={PINK} strokeWidth={2.4} />
      </>
    ),
    earR: (
      <>
        <path d="M82 48 C91 41 85 29 76 33 C71 35 71 42 74 47 Z" fill={PAPER} />
        <path d="M80 44 C84 40 81 35 77 37" stroke={PINK} strokeWidth={2.4} />
      </>
    ),
    earPivot: [42, 44, 78, 44],
    head: "M22 76 C22 52 40 40 60 40 C80 40 98 52 98 76 C98 98 80 108 60 108 C40 108 22 98 22 76 Z",
    marks: <path d="M30 84 C36 92 44 94 50 92 M90 84 C84 92 76 94 70 92" strokeWidth={2.4} />,
    muzzle: <path d="M57 82 H63 L60 85.5 Z" fill={INK} />,
    // Both paws on a seed, in front of the frame.
    front: (
      <>
        <path d="M55.5 101 C55.5 93 64.5 93 64.5 101 C64.5 109 55.5 109 55.5 101 Z" fill="#e8b04a" />
        <path d="M44 107 C43 99 53 96 56 102 C58 108 48 113 44 107 Z" fill={PAPER} />
        <path d="M76 107 C77 99 67 96 64 102 C62 108 72 113 76 107 Z" fill={PAPER} />
      </>
    ),
    eyeY: 70,
    eyeDx: 14,
    mouthY: 89,
    cheeks: true,
  },
  perroquet: {
    label: "Perroquet",
    back: <path d="M54 42 C47 28 50 14 59 5 C59 15 63 21 70 16 C71 27 68 36 64 43 Z" fill={INK} />,
    head: "M31 70 C31 50 44 40 60 40 C76 40 89 50 89 70 C89 90 76 104 60 104 C44 104 31 90 31 70 Z",
    muzzle: (
      <>
        <path d="M49 78 C49 70 70 69 72 80 C74 92 67 100 60 103 C62 95 60 88 49 86 Z" fill={INK} />
        <path d="M52 87 C55 92 58 95 61 97" strokeWidth={2.4} />
      </>
    ),
    eyeY: 64,
    eyeDx: 15,
    mouthY: null,
    cheeks: true,
  },
  herisson: {
    label: "Hérisson",
    back: (
      <path
        d="M22 82 L11 71 L23 65 L13 53 L28 51 L22 37 L36 39 L36 24 L48 32 L52 17 L60 30 L68 17 L72 32 L84 24 L84 39 L98 37 L92 51 L107 53 L97 65 L109 71 L98 82 Z"
        fill={INK}
      />
    ),
    earL: <path d="M37 59 C32 52 37 46 43 50 Z" fill={PAPER} />,
    earR: <path d="M83 59 C88 52 83 46 77 50 Z" fill={PAPER} />,
    earPivot: [40, 54, 80, 54],
    head: "M32 76 C32 58 44 50 60 50 C76 50 88 58 88 76 C88 94 74 106 60 106 C46 106 32 94 32 76 Z",
    muzzle: <path d={nose(92)} fill={INK} />,
    eyeY: 76,
    eyeDx: 11,
    mouthY: 101,
    cheeks: true,
  },
  tortue: {
    label: "Tortue",
    back: (
      <>
        <path d="M6 64 C6 12 114 12 114 64 Z" fill={PAPER} />
        <path d="M30 64 L38 42 L60 35 L82 42 L90 64 M38 42 L26 31 M82 42 L94 31 M60 35 V24" strokeWidth={2.4} />
      </>
    ),
    head: "M36 76 C36 60 46 52 60 52 C74 52 84 60 84 76 C84 93 74 105 60 105 C46 105 36 93 36 76 Z",
    muzzle: <path d="M57 86 h0 M63 86 h0" strokeWidth={2.8} />,
    eyeY: 73,
    eyeDx: 11,
    mouthY: 94,
  },
  // Added on 13 November 2026, from the bench's proposals of the 12th (docs/recus/2026-11-12-fable-fraicheur/round2/mascottes).
  chouette: {
    label: "Chouette",
    earL: <path d="M40 48 L29 24 L52 39 Z" fill={INK} />,
    earR: <path d="M80 48 L91 24 L68 39 Z" fill={INK} />,
    head: "M24 72 C24 50 40 38 60 38 C80 38 96 50 96 72 C96 94 80 106 60 106 C40 106 24 94 24 72 Z",
    // The facial discs, then the feathers of the brow and the breast.
    marks: (
      <>
        <circle cx={44} cy={69} fill={PAPER} r={15.5} strokeWidth={2.4} />
        <circle cx={76} cy={69} fill={PAPER} r={15.5} strokeWidth={2.4} />
        <path d="M53 45 L60 54 L67 45" strokeWidth={2.4} />
        <path d="M50 97 q3 4 6 0 M57 99 q3 4 6 0 M64 97 q3 4 6 0" strokeWidth={2} />
      </>
    ),
    muzzle: <path d="M55.5 78 H64.5 L60 88 Z" fill={INK} />,
    eyeY: 69,
    eyeDx: 16,
    eyeScale: 1.3,
    mouthY: null,
    cheeks: true,
  },
  ane: {
    label: "Âne",
    earL: (
      <>
        <path d="M45 46 C34 32 31 12 37 1 C47 11 54 29 55 42 Z" fill={INK} />
        <path d="M43.5 36 C39.5 28 38.5 18 40 11 C44.5 18 47.5 27 48.5 35 Z" fill={PAPER} stroke="none" />
      </>
    ),
    // The other ear lies down on the side.
    earR: (
      <>
        <path d="M68 44 C73 30 91 22 109 27 C104 42 91 51 78 52 Z" fill={INK} />
        <path d="M77 42 C82 34 92 30 100 31 C96 39 89 44 81 46 Z" fill={PAPER} stroke="none" />
      </>
    ),
    earPivot: [48, 44, 72, 46],
    head: "M34 64 C34 48 46 40 60 40 C74 40 86 48 86 64 L84 90 C84 102 74 110 60 110 C46 110 36 102 36 90 Z",
    // The forelock, between the ears.
    marks: <path d="M50 47 C49 38 56 36 60 42 C64 36 71 38 70 47 C64 43 56 43 50 47 Z" fill={INK} strokeWidth={2} />,
    muzzle: (
      <>
        <path d="M37 94 C37 83 47 79 60 79 C73 79 83 83 83 94 C83 104 73 110 60 110 C47 110 37 104 37 94 Z" fill={PAPER} />
        <ellipse cx={51.5} cy={90.5} fill={INK} rx={2.6} ry={3.4} stroke="none" />
        <ellipse cx={68.5} cy={90.5} fill={INK} rx={2.6} ry={3.4} stroke="none" />
      </>
    ),
    eyeY: 66,
    eyeDx: 14,
    mouthY: 100,
  },
  furet: {
    label: "Furet",
    earL: <path d="M36 54 C27 44 19 50 23 60 C26 66 33 64 39 60 Z" fill={PAPER} />,
    earR: <path d="M84 54 C93 44 101 50 97 60 C94 66 87 64 81 60 Z" fill={PAPER} />,
    earPivot: [36, 58, 84, 58],
    head: "M27 74 C27 54 42 42 60 42 C78 42 93 54 93 74 C93 94 79 106 60 106 C41 106 27 94 27 74 Z",
    // The mask, from one temple to the other.
    marks: (
      <path
        d="M30 67 C36 58 50 59 60 65 C70 59 84 58 90 67 C90 78 78 82 69 77 C65 75 63 73 60 73 C57 73 55 75 51 77 C42 82 30 78 30 67 Z"
        fill={INK}
        stroke="none"
      />
    ),
    muzzle: (
      <>
        <path d="M47 89 C47 81 73 81 73 89 C73 97 66 101 60 101 C54 101 47 97 47 89 Z" fill={PAPER} />
        <path d={nose(85)} fill={INK} />
      </>
    ),
    front: <path d="M10 86 L36 89 M12 96 L36 93 M110 86 L84 89 M108 96 L84 93" strokeWidth={2} />,
    eyeY: 69,
    eyeDx: 14,
    // Both eyes sit on the mask: a paper outline, or they are lost in it.
    eyeStroke: PAPER,
    mouthY: 94,
  },
} satisfies Record<string, LineAnimal>;

export type LineAnimalKey = keyof typeof LINE_ANIMALS;
export const LINE_ANIMAL_KEYS = Object.keys(LINE_ANIMALS) as LineAnimalKey[];

/** Two eyes: open (pupils that move), happy (closed arcs), and the brows of thinking. */
function Eyes({ animal }: { animal: LineAnimal }) {
  const { eyeY: y, eyeDx: dx, pupil = "dot", eyeScale: k = 1, eyeStroke } = animal;
  const happy = (x: number) => `M${x - 5 * k} ${y + 1.5} Q${x} ${y - 6 * k} ${x + 5 * k} ${y + 1.5}`;
  const brow = 10 * k;
  return (
    <g className="lm-eyes">
      {[60 - dx, 60 + dx].map((x, side) => (
        <g className="lm-eye" data-side={side ? "r" : "l"} key={x}>
          <g className="lm-eye-open">
            <ellipse cx={x} cy={y} fill={PAPER} rx={5.6 * k} ry={6.2 * k} stroke={eyeStroke} strokeWidth={2.4} />
            {/* Tracking moves .lm-pupils, the mood moves .lm-gaze: two transforms, never fighting. */}
            <g className="lm-pupils">
              <g className="lm-gaze">
                {pupil === "bar" ? (
                  <rect fill={INK} height={2.6 * k} rx={1.3 * k} stroke="none" width={6 * k} x={x - 3 * k} y={y - 1.3 * k} />
                ) : (
                  <circle cx={x} cy={y} fill={INK} r={3.1 * k} stroke="none" />
                )}
              </g>
            </g>
          </g>
          {/* A paper edge first, so the arc reads on a dark patch too. */}
          <path className="lm-eye-happy" d={happy(x)} stroke={PAPER} strokeWidth={6} />
          <path className="lm-eye-happy" d={happy(x)} stroke={eyeStroke} />
        </g>
      ))}
      <path className="lm-brows" d={`M${60 - dx - 5} ${y - brow} L${60 - dx + 5} ${y - brow - 0.5} M${60 + dx - 6} ${y - brow - 1} Q${60 + dx} ${y - brow - 6} ${60 + dx + 6} ${y - brow - 2}`} stroke={eyeStroke} strokeWidth={2.4} />
    </g>
  );
}

function Mouth({ y }: { y: number }) {
  return (
    <g className="lm-mouth">
      <path className="lm-mouth-neutral" d={`M54.5 ${y} Q60 ${y + 4.5} 65.5 ${y}`} strokeWidth={2.6} />
      <g className="lm-mouth-happy">
        <path d={`M52 ${y - 1} Q60 ${y + 12} 68 ${y - 1} Z`} fill={INK} strokeWidth={2.4} />
        <path d={`M55.5 ${y + 5} Q60 ${y + 2} 64.5 ${y + 5} Q60 ${y + 9} 55.5 ${y + 5} Z`} fill={TONGUE} stroke="none" />
      </g>
      <path className="lm-mouth-thinking" d={`M57 ${y + 2} Q61 ${y - 0.5} 65 ${y + 2}`} strokeWidth={2.6} />
    </g>
  );
}

/**
 * One animal, drawn at its size by the caller's CSS. `overflow` lets ears,
 * horns and paws leave the frame; without it everything stays in the circle.
 * The groups carry stable class names (lm-figure, lm-ear, lm-pupils, lm-eye)
 * for the motion layer to move them with transforms only.
 */
export function LineMascotArt({
  animal,
  clipId,
  frame = true,
  overflow = true,
}: {
  animal: LineAnimalKey;
  clipId: string;
  frame?: boolean;
  overflow?: boolean;
}) {
  const art: LineAnimal = LINE_ANIMALS[animal];
  const pivot = art.earPivot ?? [40, 50, 80, 50];
  return (
    <svg className="lm-svg" overflow="visible" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id={`${clipId}-open`}>
          {/* The frame's lower half, and everything above its centre line. */}
          <circle cx={FRAME.cx} cy={FRAME.cy} r={FRAME.r} />
          <rect height={FRAME.cy + 60} width={200} x={-40} y={-60} />
        </clipPath>
        <clipPath id={`${clipId}-closed`}>
          <circle cx={FRAME.cx} cy={FRAME.cy} r={FRAME.r} />
        </clipPath>
      </defs>
      {frame ? <circle className="lm-frame" cx={FRAME.cx} cy={FRAME.cy} r={FRAME.r} /> : null}
      <g
        fill="none"
        stroke={INK}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={SW}
      >
        <g clipPath={`url(#${clipId}-${overflow ? "open" : "closed"})`}>
          <g className="lm-figure">
            <path d={SHOULDERS} fill={PAPER} />
            {art.back}
            {art.earL ? (
              <g className="lm-ear" data-side="l" style={{ transformOrigin: `${pivot[0]}px ${pivot[1]}px` }}>
                {art.earL}
              </g>
            ) : null}
            {art.earR ? (
              <g className="lm-ear" data-side="r" style={{ transformOrigin: `${pivot[2]}px ${pivot[3]}px` }}>
                {art.earR}
              </g>
            ) : null}
            <g className="lm-face">
              <path d={art.head} fill={PAPER} />
              {art.marks}
              {art.cheeks ? (
                <g className="lm-cheeks" fill={PINK} stroke="none">
                  <circle cx={60 - art.eyeDx - 3} cy={art.eyeY + 12 * (art.eyeScale ?? 1)} r={5.5} />
                  <circle cx={60 + art.eyeDx + 3} cy={art.eyeY + 12 * (art.eyeScale ?? 1)} r={5.5} />
                </g>
              ) : null}
              <Eyes animal={art} />
              {art.muzzle}
              {art.mouthY === null ? null : <Mouth y={art.mouthY} />}
            </g>
          </g>
        </g>
        {art.front ? (
          <g className="lm-front" clipPath={overflow ? undefined : `url(#${clipId}-closed)`}>
            {art.front}
          </g>
        ) : null}
      </g>
    </svg>
  );
}
