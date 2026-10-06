import type { IconSvgElement } from "@hugeicons/react";
import BirdIcon from "@hugeicons/core-free-icons/BirdIcon";
import FishSymbolIcon from "@hugeicons/core-free-icons/FishSymbolIcon";

// Veterinary subjects absent from the free catalog. Authored on the same
// 24px grid and rendered by Hugeicons at the shared 1.5px stroke width.
export const CatGlyph: IconSvgElement = [
  [
    "path",
    { key: "cat-head", d: "M4 10V3l6 4h4l6-4v7c1 2 1 5 0 7-2 3-6 4-8 4s-6-1-8-4c-1-2-1-5 0-7Z" },
  ],
  [
    "path",
    {
      key: "cat-face",
      d: "M8 12h.01M16 12h.01M10 15l2 2 2-2M12 17v2M3 14l4 1M3 18l4-1M21 14l-4 1M21 18l-4-1",
    },
  ],
];
export const DogGlyph: IconSvgElement = [
  [
    "path",
    {
      key: "dog-head",
      d: "M7 8c0-3 2-5 5-5s5 2 5 5v8c0 3-2 5-5 5s-5-2-5-5V8ZM7 5 4 6c-2 3-3 8-1 10 1 1 3 0 4-1M17 5l3 1c2 3 3 8 1 10-1 1-3 0-4-1",
    },
  ],
  ["path", { key: "dog-face", d: "M9 11h.01M15 11h.01M10 15l2 2 2-2M12 17v2" }],
];
export const RabbitGlyph: IconSvgElement = [
  [
    "path",
    {
      key: "rabbit-head",
      d: "M8 11C5 6 5 2 7 2s3 4 3 8M14 10c0-6 1-8 3-8s2 5-1 9M5 15c0-3 3-5 7-5s7 2 7 5-3 6-7 6-7-3-7-6Z",
    },
  ],
  ["path", { key: "rabbit-face", d: "M9 14h.01M15 14h.01M10 17l2 1 2-1M12 18v2" }],
];
export const TurtleGlyph: IconSvgElement = [
  ["ellipse", { key: "turtle-shell", cx: 11, cy: 12, rx: 7, ry: 6 }],
  [
    "path",
    {
      key: "turtle-details",
      d: "m8 7 3 2 4-1M4 12h4l3-3 4 4 2-1M8 12v4l3 2M15 13l-2 4M17 10c1-4 5-3 5 0s-3 4-5 3M6 7 4 5M6 17l-2 2M15 7l1-2M15 17l1 2M4 12H2",
    },
  ],
];
export const PawPrintGlyph: IconSvgElement = [
  [
    "path",
    {
      key: "paw-pad",
      d: "M12 11c-2 0-3 2-4 4s-3 2-3 4c0 3 5 1 7 1s7 2 7-1c0-2-2-2-3-4s-2-4-4-4Z",
    },
  ],
  ["ellipse", { key: "paw-toe-left", cx: 4, cy: 9, rx: 2, ry: 3 }],
  ["ellipse", { key: "paw-toe-inner-left", cx: 9, cy: 5, rx: 2, ry: 3 }],
  ["ellipse", { key: "paw-toe-inner-right", cx: 15, cy: 5, rx: 2, ry: 3 }],
  ["ellipse", { key: "paw-toe-right", cx: 20, cy: 9, rx: 2, ry: 3 }],
];

export function getSpeciesGlyph(species?: string): IconSvgElement {
  const value = species?.toLocaleLowerCase("fr") ?? "";
  if (value.includes("chien")) return DogGlyph;
  if (value.includes("chat")) return CatGlyph;
  if (value.includes("lapin")) return RabbitGlyph;
  if (value.includes("oiseau")) return BirdIcon;
  if (value.includes("poisson")) return FishSymbolIcon;
  if (value.includes("tortue") || value.includes("reptile")) return TurtleGlyph;
  return PawPrintGlyph;
}
