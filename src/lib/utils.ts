import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// The charte's named sizes (src/design-system/type-scale.css) are font sizes:
// cn("text-sm", "t-13") keeps only the last one, like any other size pair.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ t: ["12", "13", "14", "16", "18", "24"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
